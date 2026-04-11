import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS, APPOINTMENT_STATUS } from '../utils/constants'

const appointmentsRef = (facilityId) =>
  collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS)

export const getAppointments = async (facilityId) => {
  const q = query(appointmentsRef(facilityId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getAppointmentsByStatus = async (facilityId, status) => {
  const q = query(
    appointmentsRef(facilityId),
    where('status', '==', status),
    orderBy('date', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getPatientAppointments = async (facilityId, patientId) => {
  const q = query(
    appointmentsRef(facilityId),
    where('patientId', '==', patientId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getBookedSlots = async (facilityId, doctorId, date) => {
  const q = query(
    appointmentsRef(facilityId),
    where('doctorId', '==', doctorId),
    where('date', '==', date),
    where('status', 'in', [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED])
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data().timeSlot)
}

export const bookAppointment = async (facilityId, appointmentData) => {
  const { doctorId, date, timeSlot } = appointmentData

  // Use sentinel slot document to prevent double-booking
  const slotId = `${doctorId}_${date}_${timeSlot.replace(':', '-')}`
  const slotRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SLOTS, slotId)

  return runTransaction(db, async (transaction) => {
    const slotSnap = await transaction.get(slotRef)

    if (slotSnap.exists() && slotSnap.data().status !== APPOINTMENT_STATUS.CANCELED) {
      throw new Error('SLOT_TAKEN')
    }

    const apptRef = doc(collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS))

    transaction.set(apptRef, {
      ...appointmentData,
      status: APPOINTMENT_STATUS.PENDING,
      createdAt: serverTimestamp(),
    })

    transaction.set(slotRef, {
      appointmentId: apptRef.id,
      status: APPOINTMENT_STATUS.PENDING,
      doctorId,
      date,
      timeSlot,
    })

    return apptRef.id
  })
}

export const updateAppointmentStatus = async (facilityId, appointmentId, status) => {
  const apptRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, appointmentId)
  const apptSnap = await getDoc(apptRef)

  await updateDoc(apptRef, { status })

  // Update slot sentinel
  if (apptSnap.exists()) {
    const { doctorId, date, timeSlot } = apptSnap.data()
    const slotId = `${doctorId}_${date}_${timeSlot.replace(':', '-')}`
    const slotRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SLOTS, slotId)
    try {
      await updateDoc(slotRef, { status })
    } catch {
      // slot doc may not exist for legacy appointments
    }
  }
}

export const deleteAppointment = (facilityId, appointmentId) =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, appointmentId))
