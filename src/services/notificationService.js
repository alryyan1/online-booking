/**
 * SMS via local admin-api proxy (port 3001).
 * The proxy forwards to Airtel Sudan — avoids browser CORS restrictions.
 */

const PROXY_URL = 'http://localhost:3001/sms'

/**
 * Sends an SMS via the local proxy → Airtel Sudan.
 * @returns {{ ok: boolean, apiMsgId?: number, error?: string }}
 */
export const sendSMS = async (phone, message) => {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    })
    return await res.json()
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Sends a WhatsApp template message via the local proxy → Meta Cloud API.
 * Template variables: {{1}} patientName, {{2}} doctorName, {{3}} date, {{4}} shift
 * @returns {{ ok: boolean, msgId?: string, error?: string }}
 */
export const sendWhatsApp = async ({ phone, patientName, doctorName, date, shift }) => {
  try {
    const res = await fetch('http://localhost:3001/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, patientName, doctorName, date, shift }),
    })
    return await res.json()
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Builds the SMS booking confirmation message.
 */
export const buildBookingMessage = ({ patientName, doctorName, specialtyName, date, time, shift }) =>
  `مرحباً ${patientName}، تم تأكيد حجزك لدى د. ${doctorName} (${specialtyName}) بتاريخ ${date} - ${shift} الساعة ${time}.`

/**
 * Builds the SMS cancellation message.
 */
export const buildCancelMessage = ({ patientName, doctorName, date }) =>
  `عزيزي ${patientName}، نأسف لإبلاغك بأنه تم إلغاء حجزك لدى د. ${doctorName} بتاريخ ${date}. للاستفسار يرجى التواصل معنا.`

/**
 * Sends a WhatsApp cancellation template message via the local proxy.
 * Template variables: {{1}} patientName, {{2}} doctorName, {{3}} date
 */
export const sendCancelWhatsApp = async ({ phone, patientName, doctorName, date }) => {
  try {
    const res = await fetch('http://localhost:3001/whatsapp-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, patientName, doctorName, date }),
    })
    return await res.json()
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
