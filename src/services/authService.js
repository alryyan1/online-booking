import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
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
import { auth, db } from './firebase'
import { COLLECTIONS, ROLES, SUPER_ADMIN_EMAILS } from '../utils/constants'

export const loginWithEmail = async (identifier, password) => {
  // 1. Try Firebase Auth (if identifier contains @)
  if (identifier.includes('@')) {
    try {
      return await signInWithEmailAndPassword(auth, identifier, password)
    } catch (err) {
      if (err.code !== 'auth/invalid-email' && err.code !== 'auth/user-not-found') {
        throw err
      }
      // Fallback to username search if email login fails but might be a username
    }
  }

  // 2. Try Username search in Firestore
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('userName', '==', identifier),
    where('userPassword', '==', password)
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    const userData = snap.docs[0].data()
    // Return a structure that looks like a user credential but indicates it's custom
    return {
      user: {
        uid: snap.docs[0].id,
        email: userData.email || identifier,
        displayName: userData.userName,
        isCustom: true,
      },
      userData,
    }
  }

  // 3. Final failure
  throw { code: 'auth/invalid-credential' }
}

export const registerPatient = async (email, password, displayName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), {
    uid: credential.user.uid,
    email,
    displayName,
    role: ROLES.PATIENT,
    createdAt: serverTimestamp(),
  })
  return credential
}

export const logout = () => signOut(auth)

export const getUserRole = async (user) => {
  if (!user) return { role: null, facilityId: null }

  // Check super admin
  if (SUPER_ADMIN_EMAILS.includes(user.email)) {
    return { role: ROLES.SUPER_ADMIN, facilityId: null }
  }

  // Check facility admin
  const q = query(
    collection(db, COLLECTIONS.FACILITIES),
    where('adminEmail', '==', user.email)
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    return { role: ROLES.FACILITY_ADMIN, facilityId: snap.docs[0].id }
  }

  // Check USERS collection for other roles (Patient, Call Center)
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
  if (userDoc.exists()) {
    const userData = userDoc.data()
    const role = userData.role || (userData.userType === 'callCenter' ? ROLES.CALL_CENTER : ROLES.PATIENT)
    const facilityId = userData.centerId || null
    return { role, facilityId }
  }

  return { role: ROLES.PATIENT, facilityId: null }
}
