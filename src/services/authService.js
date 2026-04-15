import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getAuth,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { auth, db, firebaseConfig } from './firebase'
import { COLLECTIONS, ROLES } from '../utils/constants'

export const loginWithEmail = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password)
}

export const registerUser = async (email, password, displayName, role = ROLES.PATIENT, facilityId = null) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const data = {
    uid: credential.user.uid,
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
  }
  if (facilityId) data.facilityId = facilityId
  await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), data)
  return credential
}

/**
 * Creates a new Auth user without signing out the currently logged-in admin.
 * Uses a temporary secondary Firebase app instance.
 */
export const adminRegisterUser = async (email, password, displayName, role, facilityId = null) => {
  const secondaryApp = initializeApp(firebaseConfig, 'Secondary')
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const data = {
      uid: credential.user.uid,
      email,
      displayName,
      userType: role, // Mapping for consistency
      role,
      createdAt: serverTimestamp(),
    }
    if (facilityId) {
      data.facilityId = facilityId
      data.centerId = facilityId
    }

    // Save profile to main Firestore
    await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), data)

    // Sign out from secondary app to clean up session
    await signOut(secondaryAuth)
    return credential.user
  } finally {
    // Clean up secondary app
    await deleteApp(secondaryApp)
  }
}

export const logout = () => signOut(auth)

export const getUserRole = async (user) => {
  if (!user) return { role: null, facilityId: null }

  // 1. Check Firebase custom claims (set via admin API → SystemUsers page)
  try {
    const tokenResult = await user.getIdTokenResult(true)
    const claimRole = tokenResult.claims.role
    if (claimRole) {
      // For facility admin claim, also resolve their facilityId from Firestore
      if (claimRole === ROLES.FACILITY_ADMIN) {
        const q = query(collection(db, COLLECTIONS.FACILITIES), where('adminEmail', '==', user.email))
        const snap = await getDocs(q)
        return { role: claimRole, facilityId: snap.empty ? null : snap.docs[0].id }
      }
      return { role: claimRole, facilityId: null }
    }
  } catch { /* token read failed, fall through */ }

  // 2. Check Firestore users collection (call center / patient stored with role field)
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
  if (userDoc.exists()) {
    const userData = userDoc.data()
    const role = userData.role || (userData.userType === 'callCenter' ? ROLES.CALL_CENTER : ROLES.PATIENT)
    const facilityId = userData.facilityId || userData.centerId || null
    return { role, facilityId }
  }

  return { role: ROLES.PATIENT, facilityId: null }
}
