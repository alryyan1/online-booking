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
import axios from 'axios'

// --- إعدادات WhatsApp (Meta API) ---
const WHATSAPP_TOKEN = 'EAAapSj9k2sABRIVNLKtomho0lxjbXkH9JXm1Asgzosmz0x3nsOAlDdzRauNcJOgYNwUfXzRz5xCetT0SqgKZAeJZAD2h92NaUnrXWDOiFyjdZAaStoF1d36EPgwzAxZC6UmihhYyGZCyx2JdlDIBvpl2JTTvNFdTPYi215N0GiS2XhmoHULg9F6WK6iwd7ZBklXgZDZD'
const PHONE_NUMBER_ID = '1151556284697196'

// --- إعدادات SMS (Airtel Sudan REST API) ---
const SMS_USERNAME = 'jawda'
const SMS_PASSWORD = 'Alryyan1#'
const SMS_SENDER = 'Jawda'
const SMS_REST_URL = 'https://www.airtel.sd/api/rest_send_sms/'

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

export const updateAppointmentStatus = async (facilityId, appointmentId, status) => {
  const apptRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, appointmentId)
  const apptSnap = await getDoc(apptRef)
  await updateDoc(apptRef, { status })
  if (apptSnap.exists()) {
    const { doctorId, date, timeSlot } = apptSnap.data()
    const slotId = `${doctorId}_${date}_${timeSlot.replace(':', '-')}`
    const slotRef = doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.SLOTS, slotId)
    try { await updateDoc(slotRef, { status }) } catch { }
  }
}

export const deleteAppointment = (facilityId, appointmentId) =>
  deleteDoc(doc(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS, appointmentId))

export const createCallCenterAppointment = async (facilityId, data) => {
  // 1. معالجة رقم الهاتف ليكون بصيغة 249...
  let phone = data.patientPhone.trim();
  if (phone.startsWith('0')) {
    phone = '249' + phone.substring(1);
  } else if (!phone.startsWith('249')) {
    phone = '249' + phone;
  }

  // 2. حفظ الموعد في Firestore أولاً
  const appointmentDoc = {
    ...data,
    patientPhone: phone,
    status: APPOINTMENT_STATUS.PENDING,
    isConfirmed: false,
    patientId: null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.FACILITIES, facilityId, COLLECTIONS.APPOINTMENTS),
    appointmentDoc
  );

  const shiftLabel = data.period === 'morning' ? 'الفترة الصباحية' : 'الفترة المسائية';

  // --- [إرسال WhatsApp] ---
  try {
    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: "booking",
        language: { code: "ar" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: data.patientName },      // {{1}}
              { type: "text", text: data.doctorName },       // {{2}}
              { type: "text", text: data.date },             // {{3}}
              { type: "text", text: `(${shiftLabel})` }      // {{4}}
            ]
          }
        ]
      }
    };

    await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      whatsappPayload,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log("WhatsApp sent successfully");
  } catch (error) {
    console.error("WhatsApp API Error:", error.response?.data || error.message);
  }

  // --- [إرسال SMS نصية عبر REST API الجديد] ---
  try {
    const smsText = `مرحباً ${data.patientName}، تم حجز موعدك مع د. ${data.doctorName} بتاريخ ${data.date} (${shiftLabel}). نتمنى لكم الشفاء العاجل.`;

    const smsPayload = {
      username: SMS_USERNAME,
      password: SMS_PASSWORD,
      phone_number: phone,
      message: smsText,
      sender: SMS_SENDER
    };

    const response = await axios.post(
      SMS_REST_URL,
      smsPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("SMS REST sent successfully:", response.data);
  } catch (error) {
    // في حالة استمرار مشكلة الـ CORS من المتصفح، سيظهر الخطأ هنا
    console.error("SMS REST API Error:", error.response?.data || error.message);
  }

  return docRef;
}