import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from '../utils/constants'

// ─── Central allDoctors collection ────────────────────────────────────────────

const centralRef = () => collection(db, 'allDoctors')

const getNextNumericId = async (collectionPath) => {
  const snapshot = await getDocs(collection(db, collectionPath))
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

export const getCentralDoctors = async () => {
  const snap = await getDocs(centralRef())
  const docs = snap.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: data.id !== undefined ? data.id : d.id,
      docId: d.id
    }
  })
  return docs
}

export const getCentralDoctorById = async (doctorId) => {
  const snap = await getDoc(doc(db, 'allDoctors', doctorId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export const createCentralDoctor = async (data) => {
  if (!data.name?.trim()) throw new Error('اسم الطبيب مطلوب')
  if (!data.specialization) throw new Error('يجب اختيار التخصص')

  const id = await getNextNumericId('allDoctors')
  await setDoc(doc(db, 'allDoctors', id), {
    id: parseInt(id, 10),
    name: data.name.trim(),
    specialization: data.specialization,
    subSpecialization: data.subSpecialization ?? '',
    phoneNumber: data.phoneNumber?.trim() ?? '',
    createdAt: serverTimestamp(),
  })
}

export const updateCentralDoctor = (doctorId, data) =>
  updateDoc(doc(db, 'allDoctors', doctorId), data)

export const deleteCentralDoctor = (doctorId) =>
  deleteDoc(doc(db, 'allDoctors', doctorId))

// ─── Per-facility subcollection (kept for booking/appointments) ───────────────

const doctorsRef = (facilityId) =>
  collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.DOCTORS)

export const getDoctors = async (facilityId) => {
  const q = query(doctorsRef(facilityId), orderBy('name', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getAvailableDoctors = async (facilityId) => {
  const q = query(doctorsRef(facilityId), where('available', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getDoctorById = async (facilityId, doctorId) => {
  // Try facility subcollection first, fallback to central
  const snap = await getDoc(
    doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.DOCTORS, doctorId)
  )
  if (snap.exists()) return { id: snap.id, ...snap.data() }
  return getCentralDoctorById(doctorId)
}

export const createDoctor = (facilityId, data) =>
  addDoc(doctorsRef(facilityId), {
    ...data,
    available: true,
    createdAt: serverTimestamp(),
  })

export const updateDoctor = (facilityId, doctorId, data) =>
  updateDoc(
    doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.DOCTORS, doctorId),
    data
  )

export const deleteDoctor = (facilityId, doctorId) =>
  deleteDoc(
    doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.DOCTORS, doctorId)
  )
