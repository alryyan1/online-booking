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

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

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

  // Patient
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
  if (userDoc.exists()) {
    return { role: ROLES.PATIENT, facilityId: null }
  }

  return { role: ROLES.PATIENT, facilityId: null }
}
