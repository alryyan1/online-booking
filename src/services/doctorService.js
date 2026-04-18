import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
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
  console.log('Fetched central doctors:', docs.length, docs.slice(0, 2))
  return docs
}

export const getCentralDoctorById = async (doctorId) => {
  const snap = await getDoc(doc(db, 'allDoctors', doctorId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export const createCentralDoctor = (data) =>
  addDoc(centralRef(), { ...data, createdAt: serverTimestamp() })

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
