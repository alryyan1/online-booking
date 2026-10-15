import axios from 'axios'
import { getDayName } from '../utils/bookingUtils'

const API_BASE_URL = 'https://api-4ef7za53za-uc.a.run.app'

const getShiftLabel = (s) => {
  if (s === 'morning') return 'صباحاً'
  if (s === 'evening') return 'مساءً'
  return s || ''
}

/**
 * Sends an SMS via the Cloud Function proxy → Airtel Sudan.
 */
export const sendSMS = async (phone, message) => {
  console.log(`[NotificationService] Triggering SMS to ${phone}...`)
  try {
    const res = await axios.post(`${API_BASE_URL}/sms`, { phone, message })
    console.log(`[NotificationService] SMS Success:`, res.data)
    return res.data
  } catch (err) {
    console.error(`[NotificationService] SMS Error:`, err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Sends a WhatsApp template message via the Cloud Function proxy.
 * All facilities send from one shared WhatsApp number (template: booking_message).
 * The Cloud Function adds the facility name and phone from the facility doc.
 */
export const sendWhatsApp = async ({ facilityId, phone, patientName, doctorName, specializationName, dayName, date, shift }) => {
  console.log(`[NotificationService] Triggering WhatsApp (Booking) to ${phone}...`)
  try {
    const res = await axios.post(`${API_BASE_URL}/whatsapp`, {
      facilityId,
      phone,
      type: 'booking',
      patientName,
      patientPhone: phone,
      doctorName,
      specializationName,
      dayName,
      date,
      period: getShiftLabel(shift),
    })
    console.log(`[NotificationService] WhatsApp Success:`, res.data)
    return res.data
  } catch (err) {
    const error = err.response?.data?.error || err.message
    console.error(`[NotificationService] WhatsApp Error:`, error)
    return { ok: false, error }
  }
}

/**
 * Builds the SMS booking confirmation message.
 */
export const buildBookingMessage = ({ facilityName, patientName, patientPhone, doctorName, specializationName, date, shift, centerPhone }) => {
  const label = getShiftLabel(shift)
  const dayName = date ? getDayName(new Date(`${date}T00:00:00`)) : ''
  const doctor = specializationName ? `${doctorName || ''} (${specializationName})` : (doctorName || '')
  return [
    'تم حجز موعد بنجاح',
    '',
    `اسم المركز: ${facilityName || ''}`,
    `اسم المريض: ${patientName || ''}`,
    `رقم الهاتف: ${patientPhone || ''}`,
    `الطبيب: ${doctor}`,
    `وقت الحجز: ${[dayName, date, label].filter(Boolean).join(' - ')}`,
    '',
    `للإستفسار يمكنك التواصل مع المركز على الرقم: ${centerPhone || ''}`,
  ].join('\n')
}

/**
 * Builds the SMS cancellation message.
 */
export const buildCancelMessage = ({ patientName, doctorName, date, shift, facilityName }) => {
  const label = getShiftLabel(shift)
  const center = facilityName || 'مركز الرومي الطبي'
  return `عذرا ${patientName} ، تم الغاء حجزك مع دكتور ${doctorName} بتاريخ ${date} ${label} لظروف طارئة .\n\n${center}`
}

/**
 * Sends a WhatsApp cancellation template message via the Cloud Function proxy.
 */
export const sendCancelWhatsApp = async ({ facilityId, phone, patientName, doctorName, date, shift }) => {
  console.log(`[NotificationService] Triggering WhatsApp (Cancel) to ${phone}...`)
  try {
    const res = await axios.post(`${API_BASE_URL}/whatsapp`, {
      facilityId,
      phone,
      type: 'cancel',
      patientName,
      doctorName,
      date,
      period: getShiftLabel(shift),
    })
    console.log(`[NotificationService] WhatsApp Cancel Success:`, res.data)
    return res.data
  } catch (err) {
    const error = err.response?.data?.error || err.message
    console.error(`[NotificationService] WhatsApp Cancel Error:`, error)
    return { ok: false, error }
  }
}
