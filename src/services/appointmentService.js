import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  writeBatch,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS, APPOINTMENT_STATUS } from '../utils/constants'
import axios from 'axios'

// --- إعدادات Proxy (Firebase Cloud Functions) ---
const API_BASE_URL = 'https://api-4ef7za53za-uc.a.run.app'

const appointmentsRef = (facilityId) =>
  collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS)

export const getAppointments = async (facilityId) => {
  const q = query(appointmentsRef(facilityId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

const PAGE_SIZE = 50

export const getAppointmentsPaginated = async (facilityId, afterDoc = null) => {
  const constraints = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)]
  if (afterDoc) constraints.push(startAfter(afterDoc))
  const q = query(appointmentsRef(facilityId), ...constraints)
  const snap = await getDocs(q)
  return {
    appointments: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === PAGE_SIZE,
  }
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
    where('date', '==', date)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      time: data.time || data.timeSlot
    }
  })
}

export const bookAppointment = async (facilityId, appointmentData) => {
  const { doctorId, date, timeSlot } = appointmentData
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

export const updateAppointmentStatus = async (facilityId, appointmentId, status, user = null) => {
  const apptRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, appointmentId)
  const apptSnap = await getDoc(apptRef)
  const updateData = { status }
  if (status === APPOINTMENT_STATUS.CANCELED) {
    updateData.canceledAt = serverTimestamp()
    updateData.canceledById = user?.uid || ''
    updateData.canceledByName = user?.displayName || user?.email || 'مستخدم غير معروف'
  }
  await updateDoc(apptRef, updateData)
  if (apptSnap.exists()) {
    const data = apptSnap.data()
    if (data.centralSpecialtyId && data.doctorId) {
      const doctorAppRef = doc(
        db, COLLECTIONS.FACILITIES, facilityId,
        COLLECTIONS.SPECIALIZATIONS, data.centralSpecialtyId,
        COLLECTIONS.DOCTORS, data.doctorId,
        COLLECTIONS.APPOINTMENTS, appointmentId
      )
      try { await updateDoc(doctorAppRef, updateData) } catch { }
    }
    const timeVal = data.timeSlot || data.time
    if (data.doctorId && data.date && timeVal && typeof timeVal === 'string') {
      const slotId = `${data.doctorId}_${data.date}_${timeVal.replace(':', '-')}`
      const slotRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SLOTS, slotId)
      try { await updateDoc(slotRef, { status }) } catch { }
    }
  }
}

// تأكيد حجز (نسخة المرفق + نسخة الطبيب) مثل التطبيق
export const confirmAppointment = async (facilityId, appointment, user) => {
  const specializationId = appointment.centralSpecialtyId || appointment.specializationId
  if (!specializationId) throw new Error('معرف التخصص غير موجود')
  if (!appointment.doctorId) throw new Error('معرف الطبيب غير موجود')

  const facilityBookingRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, appointment.id)
  const doctorBookingRef = doc(
    db, COLLECTIONS.FACILITIES, facilityId,
    COLLECTIONS.SPECIALIZATIONS, specializationId,
    COLLECTIONS.DOCTORS, appointment.doctorId,
    COLLECTIONS.APPOINTMENTS, appointment.id
  )

  const updateData = {
    isConfirmed: true,
    status: APPOINTMENT_STATUS.CONFIRMED,
    confirmedAt: serverTimestamp(),
    confirmedByName: user?.displayName || user?.email || 'مستخدم غير معروف',
    confirmedById: user?.uid || '',
  }

  const batch = writeBatch(db)
  batch.update(facilityBookingRef, updateData)
  batch.update(doctorBookingRef, updateData)
  await batch.commit()
}

export const deleteAppointment =(facilityId, appointmentId) =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, appointmentId))

export const createCallCenterAppointment = async (facilityId, data) => {
  // 1. معالجة رقم الهاتف ليكون بصيغة 249...
  let phone = data.patientPhone.trim();
  if (phone.startsWith('0')) {
    phone = '249' + phone.substring(1);
  } else if (!phone.startsWith('249')) {
    phone = '249' + phone;
  }

  // 2. نفس مسارات التطبيق: نسخة عند الطبيب ونسخة عند المرفق بنفس الـ id
  const doctorAppRef = doc(collection(
    db, COLLECTIONS.FACILITIES, facilityId,
    COLLECTIONS.SPECIALIZATIONS, data.centralSpecialtyId,
    COLLECTIONS.DOCTORS, data.doctorId,
    COLLECTIONS.APPOINTMENTS
  ));
  const facilityAppRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, doctorAppRef.id);
  const counterRef = doc(db, COLLECTIONS.FACILITIES, facilityId, 'counters', 'appointments');

  // 3. Transaction لتوليد رقم الحجز التسلسلي وتجنب التضارب
  const bookingNumber = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const nextNumber = (counterSnap.exists() ? counterSnap.data().lastBookingNumber || 0 : 0) + 1;

    transaction.set(counterRef, { lastBookingNumber: nextNumber }, { merge: true });

    const appointmentDoc = {
      ...data,
      bookingNumber: nextNumber,
      patientPhone: phone,
      status: APPOINTMENT_STATUS.CONFIRMED,
      isConfirmed: true,
      confirmedAt: serverTimestamp(),
      confirmedById: data.createdById || '',
      confirmedByName: data.createdByName || '',
      patientId: null,
      createdAt: serverTimestamp(),
    };
    transaction.set(doctorAppRef, appointmentDoc);
    transaction.set(facilityAppRef, appointmentDoc);
    return nextNumber;
  });

  return { id: facilityAppRef.id, bookingNumber };
}
