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
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from '../utils/constants'

// ==========================================
// Types & Interfaces
// ==========================================

export interface Facility {
  id: string;
  name?: string;
  available?: boolean;
  order?: number;
  [key: string]: any;
}

export interface Specialization {
  id: string;
  specName?: string;
  name?: string; // Sometimes DB uses name, sometimes specName
  isActive?: boolean;
  order?: number;
  [key: string]: any;
}

export interface Shift {
  start: string;
  end: string;
}

export interface WorkingDay {
  morning?: Shift;
  evening?: Shift;
}

export interface Doctor {
  id: string;
  docName?: string; // DB uses docName or name
  name?: string;
  phoneNumber?: string;
  photoUrl?: string;
  isActive?: boolean;
  workingSchedule?: Record<string, WorkingDay | null>;
  [key: string]: any;
}

export interface InsuranceCompany {
  id: string;
  name?: string;
  [key: string]: any;
}

// ==========================================
// Base References
// ==========================================

/**
 * Returns the CollectionReference for Medical Facilities.
 */
const facilitiesRef = () => collection(db, COLLECTIONS.FACILITIES)

// ==========================================
// Facility Operations
// ==========================================

/**
 * Retrieves all medical facilities from Firestore ordered by 'order' ascending.
 * @returns {Promise<Facility[]>} A list of all facilities.
 */
export const getAllFacilities = async (): Promise<Facility[]> => {
  const q = query(facilitiesRef(), orderBy('order', 'asc'))
  const snap: QuerySnapshot<DocumentData> = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Facility)
}

/**
 * Retrieves only the available medical facilities from Firestore.
 * @returns {Promise<Facility[]>} A list of available facilities.
 */
export const getAvailableFacilities = async (): Promise<Facility[]> => {
  const q = query(
    facilitiesRef(),
    where('available', '==', true),
    orderBy('order', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Facility)
}

/**
 * Retrieves a single facility by its unique ID.
 * @param {string} facilityId - The ID of the facility to fetch.
 * @returns {Promise<Facility | null>} The facility data or null if not found.
 */
export const getFacilityById = async (facilityId: string): Promise<Facility | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.FACILITIES, facilityId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Facility
}

/**
 * Creates a new medical facility.
 * @param {Record<string, any>} data - The configuration data for the new facility.
 * @returns {Promise<string>} The new facility document ID.
 */
export const createFacility = async (data: Record<string, any>): Promise<string> => {
  const docRef = await addDoc(facilitiesRef(), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Updates an existing medical facility.
 * @param {string} facilityId - The ID of the facility to update.
 * @param {Record<string, any>} data - The fields to update.
 * @returns {Promise<void>}
 */
export const updateFacility = (facilityId: string, data: Record<string, any>): Promise<void> =>
  updateDoc(doc(db, COLLECTIONS.FACILITIES, facilityId), data)

/**
 * Deletes a medical facility from Firestore.
 * @param {string} facilityId - The ID of the facility to delete.
 * @returns {Promise<void>}
 */
export const deleteFacility = (facilityId: string): Promise<void> =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId))

// ==========================================
// Specializations
// ==========================================

/**
 * Retrieves all specializations for a given facility.
 * @param {string} facilityId - The parent facility ID.
 * @returns {Promise<Specialization[]>} The list of specializations.
 */
export const getSpecializations = async (facilityId: string): Promise<Specialization[]> => {
  const snap = await getDocs(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS)
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Specialization)
}

/**
 * Adds a simple specialization by name to a facility.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} name - The name of the specialization.
 * @returns {Promise<any>} Document reference of the newly created specialization.
 */
export const addSpecialization = (facilityId: string, name: string): Promise<any> =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS),
    { name }
  )

/**
 * Creates a detailed specialization in a facility.
 * @param {string} facilityId - The parent facility ID.
 * @param {Record<string, any>} data - The full configuration payload.
 * @returns {Promise<any>}
 */
export const createSpecialization = (facilityId: string, data: Record<string, any>): Promise<any> =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS),
    { ...data, createdAt: serverTimestamp() }
  )

/**
 * Updates an existing specialization within a facility.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} specId - The specialization ID.
 * @param {Record<string, any>} data - Fields to update.
 * @returns {Promise<void>}
 */
export const updateSpecialization = (facilityId: string, specId: string, data: Record<string, any>): Promise<void> =>
  updateDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId), data)

/**
 * Deletes a specialization from a facility.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} specId - The specialization ID.
 * @returns {Promise<void>}
 */
export const deleteSpecialization = (facilityId: string, specId: string): Promise<void> =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId))

// ==========================================
// Doctors under a specialization
// ==========================================

/**
 * Retrieves all doctors belonging to a specific specialization.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} specId - The parent specialization ID.
 * @returns {Promise<Doctor[]>} The list of doctors.
 */
export const getDoctorsBySpec = async (facilityId: string, specId: string): Promise<Doctor[]> => {
  const snap = await getDocs(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS)
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doctor)
}

/**
 * Adds a new doctor to a specific specialization.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} specId - The parent specialization ID.
 * @param {Record<string, any>} data - The doctor's profile data.
 * @returns {Promise<any>}
 */
export const addDoctorToSpec = (facilityId: string, specId: string, data: Record<string, any>): Promise<any> =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS),
    { ...data, createdAt: serverTimestamp() }
  )

/**
 * Updates an existing doctor's profile or schedule within a specialization.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} specId - The parent specialization ID.
 * @param {string} doctorId - The doctor ID.
 * @param {Record<string, any>} data - Fields to update.
 * @returns {Promise<void>}
 */
export const updateDoctorInSpec = (facilityId: string, specId: string, doctorId: string, data: Record<string, any>): Promise<void> =>
  updateDoc(
    doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS, doctorId),
    data
  )

/**
 * Deletes a doctor from a specialization.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} specId - The parent specialization ID.
 * @param {string} doctorId - The doctor ID.
 * @returns {Promise<void>}
 */
export const deleteDoctorFromSpec = (facilityId: string, specId: string, doctorId: string): Promise<void> =>
  deleteDoc(
    doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SPECIALIZATIONS, specId, COLLECTIONS.DOCTORS, doctorId)
  )

// ==========================================
// Insurance Companies
// ==========================================

/**
 * Retrieves all insurance companies accepted by a facility.
 * @param {string} facilityId - The parent facility ID.
 * @returns {Promise<InsuranceCompany[]>}
 */
export const getInsuranceCompanies = async (facilityId: string): Promise<InsuranceCompany[]> => {
  const snap = await getDocs(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE)
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InsuranceCompany)
}

/**
 * Adds an insurance company by name.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} name - Insurance company name.
 * @returns {Promise<any>}
 */
export const addInsuranceCompany = (facilityId: string, name: string): Promise<any> =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE),
    { name }
  )

/**
 * Creates a detailed insurance company entry for a facility.
 * @param {string} facilityId - The parent facility ID.
 * @param {Record<string, any>} data - Full insurance data payload.
 * @returns {Promise<any>}
 */
export const createFacilityInsurance = (facilityId: string, data: Record<string, any>): Promise<any> =>
  addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE),
    { ...data, createdAt: serverTimestamp() }
  )

/**
 * Updates an insurance company's details.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} insId - The insurance ID.
 * @param {Record<string, any>} data - Fields to update.
 * @returns {Promise<void>}
 */
export const updateFacilityInsurance = (facilityId: string, insId: string, data: Record<string, any>): Promise<void> =>
  updateDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE, insId), data)

/**
 * Removes an insurance company from a facility.
 * @param {string} facilityId - The parent facility ID.
 * @param {string} insId - The insurance ID.
 * @returns {Promise<void>}
 */
export const deleteFacilityInsurance = (facilityId: string, insId: string): Promise<void> =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.INSURANCE, insId))
