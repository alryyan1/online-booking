import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const COLLECTION = 'medicalSpecialties'
const ref = () => collection(db, COLLECTION)

export const getSpecialties = async () => {
  const snap = await getDocs(ref())
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: data.id !== undefined ? data.id : d.id,
      docId: d.id
    }
  })
}

export const createSpecialty = (data) =>
  addDoc(ref(), { ...data, createdAt: serverTimestamp() })

export const updateSpecialty = (id, data) =>
  updateDoc(doc(db, COLLECTION, id), data)

export const deleteSpecialty = (id) =>
  deleteDoc(doc(db, COLLECTION, id))
