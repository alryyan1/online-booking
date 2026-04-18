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

const COLLECTION = 'insuranceCompanies'
const ref = () => collection(db, COLLECTION)

export const getInsuranceCompanies = async () => {
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

export const createInsuranceCompany = (data) =>
  addDoc(ref(), { ...data, createdAt: serverTimestamp() })

export const updateInsuranceCompany = (id, data) =>
  updateDoc(doc(db, COLLECTION, id), data)

export const deleteInsuranceCompany = (id) =>
  deleteDoc(doc(db, COLLECTION, id))
