import axios from 'axios'

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
 */
export const sendWhatsApp = async ({ phone, patientName, doctorName, date, shift }) => {
  const label = getShiftLabel(shift)
  console.log(`[NotificationService] Triggering WhatsApp (Booking) to ${phone}...`)
  try {
    const res = await axios.post(`${API_BASE_URL}/whatsapp`, {
      phone,
      template: 'booking',
      parameters: [patientName, doctorName, date, `(${label})`]
    })
    console.log(`[NotificationService] WhatsApp Success:`, res.data)
    return res.data
  } catch (err) {
    console.error(`[NotificationService] WhatsApp Error:`, err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Builds the SMS booking confirmation message.
 */
export const buildBookingMessage = ({ patientName, doctorName, specialtyName, date, time, shift }) => {
  const label = getShiftLabel(shift)
  return `مرحباً ${patientName}، تم تأكيد حجزك لدى د. ${doctorName} (${specialtyName}) بتاريخ ${date} - ${label} الساعة ${time}.`
}

/**
 * Builds the SMS cancellation message.
 */
export const buildCancelMessage = ({ patientName, doctorName, date, shift }) => {
  const label = getShiftLabel(shift)
  return `عذرا ${patientName} ، تم الغاء حجزك مع دكتور ${doctorName} بتاريخ ${date} ${label} لظروف طارئة .\n\nمركز الرومي الطبي`
}

/**
 * Sends a WhatsApp cancellation template message via the Cloud Function proxy.
 */
export const sendCancelWhatsApp = async ({ phone, patientName, doctorName, date, shift }) => {
  const label = getShiftLabel(shift)
  console.log(`[NotificationService] Triggering WhatsApp (Cancel) to ${phone}...`)
  try {
    const res = await axios.post(`${API_BASE_URL}/whatsapp`, {
      phone,
      template: 'cancel_appointment',
      parameters: [patientName, doctorName, date, label]
    })
    console.log(`[NotificationService] WhatsApp Cancel Success:`, res.data)
    return res.data
  } catch (err) {
    console.error(`[NotificationService] WhatsApp Cancel Error:`, err.message)
    return { ok: false, error: err.message }
  }
}
