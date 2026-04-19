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
    userName: displayName, // Backward compatibility
    role,
    createdAt: serverTimestamp(),
  }
  if (facilityId) {
    data.facilityId = facilityId
    data.centerId = facilityId
  }
  await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), data)
  return credential
}

/**
 * Creates a new Auth user without signing out the currently logged-in admin.
 * Uses a temporary secondary Firebase app instance.
 */
export const adminRegisterUser = async (email, password, displayName, role, facilityId = null, userPhone = '') => {
  const secondaryApp = initializeApp(firebaseConfig, 'Secondary')
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const data = {
      uid: credential.user.uid,
      email,
      displayName,
      userName: displayName, // Backward compatibility
      userType: role, // Mapping for consistency
      role,
      userPhone,
      createdAt: serverTimestamp(),
      facilityId: facilityId,
      centerId: facilityId,
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
  if (!user) return { role: null, facilityId: null, facilityName: null }

  // Always read Firestore user doc for facilityId + facilityName
  let firestoreFacilityId = null
  let firestoreFacilityName = null
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
    if (userDoc.exists()) {
      const d = userDoc.data()
      firestoreFacilityId = d.facilityId || d.centerId || null
      firestoreFacilityName = d.facilityName || d.facilityname || null
    }
  } catch { /* ignore */ }

  // If facilityName not stored on user doc, look it up from the facility
  if (firestoreFacilityId && !firestoreFacilityName) {
    try {
      const facDoc = await getDoc(doc(db, 'medicalFacilities', firestoreFacilityId))
      if (facDoc.exists()) firestoreFacilityName = facDoc.data().name || null
    } catch { /* ignore */ }
  }

  // 1. Check Firebase custom claims
  try {
    const tokenResult = await user.getIdTokenResult(true)
    const claimRole = tokenResult.claims.role
    if (claimRole) {
      return { role: claimRole, facilityId: firestoreFacilityId, facilityName: firestoreFacilityName }
    }
  } catch { /* fall through */ }

  // 2. Fall back to Firestore role field
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
    if (userDoc.exists()) {
      const d = userDoc.data()
      const role = d.role || ROLES.PATIENT
      return { role, facilityId: firestoreFacilityId, facilityName: firestoreFacilityName }
    }
  } catch { /* ignore */ }

  return { role: ROLES.PATIENT, facilityId: null, facilityName: null }
}
