import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from '../utils/constants'

const facilitiesRef = () => collection(db, COLLECTIONS.FACILITIES)

export const getAllFacilities = async () => {
  const q = query(facilitiesRef(), orderBy('order', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getAvailableFacilities = async () => {
  const q = query(
    facilitiesRef(),
    where('available', '==', true),
    orderBy('order', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getFacilityById = async (facilityId) => {
  const snap = await getDoc(doc(db, COLLECTIONS.FACILITIES, facilityId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export const createFacility = async (data) => {
  const docRef = await addDoc(facilitiesRef(), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export const updateFacility = (facilityId, data) =>
  updateDoc(doc(db, COLLECTIONS.FACILITIES, facilityId), data)

export const deleteFacility = (facilityId) =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId))

// Specializations
export const getSpecializations = async (facilityId) => {
  const snap = await getDocs(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS)
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const addSpecialization = (facilityId, name) =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS),
    { name }
  )

export const createSpecialization = (facilityId, data) =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS),
    { ...data, createdAt: serverTimestamp() }
  )

export const updateSpecialization = (facilityId, specId, data) =>
  updateDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId), data)

export const deleteSpecialization = (facilityId, specId) =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId))

// Doctors under a specialization
export const getDoctorsBySpec = async (facilityId, specId) => {
  const snap = await getDocs(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS)
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const addDoctorToSpec = (facilityId, specId, data) =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS),
    { ...data, createdAt: serverTimestamp() }
  )

export const updateDoctorInSpec = (facilityId, specId, doctorId, data) =>
  updateDoc(
    doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS, doctorId),
    data
  )

export const deleteDoctorFromSpec = (facilityId, specId, doctorId) =>
  deleteDoc(
    doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS, doctorId)
  )

// Insurance companies
export const getInsuranceCompanies = async (facilityId) => {
  const snap = await getDocs(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE)
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const addInsuranceCompany = (facilityId, name) =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE),
    { name }
  )

export const createFacilityInsurance = (facilityId, data) =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE),
    { ...data, createdAt: serverTimestamp() }
  )

export const updateFacilityInsurance = (facilityId, insId, data) =>
  updateDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE, insId), data)

export const deleteFacilityInsurance = (facilityId, insId) =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE, insId))
