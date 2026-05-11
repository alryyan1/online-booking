import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const COLLECTION = 'medicalSpecialties'
const ref = () => collection(db, COLLECTION)

const getNextNumericId = async () => {
  const snapshot = await getDocs(ref())
  let maxId = 0
  for (const d of snapshot.docs) {
    let idNum = parseInt(d.id, 10)
    if (isNaN(idNum)) {
      const field = d.data().id
      idNum = typeof field === 'number' ? field : parseInt(field, 10)
    }
    if (!isNaN(idNum) && idNum > maxId) maxId = idNum
  }
  return String(maxId + 1)
}

export const getSpecialties = async () => {
  const snap = await getDocs(ref())
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: data.id !== undefined ? data.id : d.id,
      docId: d.id,
    }
  })
}

export const createSpecialty = async (data) => {
  if (!data.name?.trim()) throw new Error('اسم التخصص مطلوب')
  const id = await getNextNumericId()
  await setDoc(doc(db, COLLECTION, id), {
    id: parseInt(id, 10),
    name: data.name.trim(),
    description: data.description?.trim() ?? '',
    active: data.active ?? true,
    createdAt: serverTimestamp(),
  })
}

export const updateSpecialty = (docId, data) =>
  updateDoc(doc(db, COLLECTION, String(docId)), data)

export const deleteSpecialty = (docId) =>
  deleteDoc(doc(db, COLLECTION, String(docId)))
