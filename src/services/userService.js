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

export const getUsersByFacility = async (facilityId) => {
  const q = query(ref(), where('centerId', '==', facilityId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const createFacilityUser = (data) =>
  addDoc(ref(), { ...data, createdAt: serverTimestamp() })

export const updateFacilityUser = (userId, data) =>
  updateDoc(doc(db, COLLECTIONS.USERS, userId), data)

export const deleteFacilityUser = (userId) =>
  deleteDoc(doc(db, COLLECTIONS.USERS, userId))
