import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from '../utils/constants'

const ref = () => collection(db, COLLECTIONS.USERS)

export const getAllUsers = async () => {
  const snap = await getDocs(ref())
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getUsersByFacility = async (facilityId) => {
  const q = query(ref(), where('centerId', '==', facilityId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const createFacilityUser = (data) =>
  addDoc(ref(), {
    ...data,
    isOnline: false,
    photoUrl: '',
    lastLoginAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

export const updateFacilityUser = (userId, data) =>
  updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...data,
    updatedAt: serverTimestamp(),
  })

export const deleteFacilityUser = (userId) =>
  deleteDoc(doc(db, COLLECTIONS.USERS, userId))

// Local Admin API helpers (requires npm run admin-api)
const ADMIN_API = 'https://us-central1-hospitalapp-681f1.cloudfunctions.net/api'

export const deleteAuthUser = async (uid) => {
  const res = await fetch(`${ADMIN_API}/auth-users/${uid}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete auth user')
  }
  return res.json()
}
