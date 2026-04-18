/**
 * Local Admin API server — runs alongside `npm run dev`
 * Exposes Firebase Auth user list to the React super admin UI.
 *
 * Start with:  npm run admin-api
 * Listens on:  http://localhost:3001
 */

import { createRequire } from 'module'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Load .env into process.env
const envPath = resolve(__dirname, '../.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#')) {
      const val = rest.join('=').trim()
      // Strip VITE_ prefix so server code uses same .env file
      const serverKey = key.trim().replace(/^VITE_/, '')
      if (!process.env[serverKey]) process.env[serverKey] = val
    }
  })
}

const keyPath = resolve(__dirname, '../serviceAccountKey.json')

if (!existsSync(keyPath)) {
  console.error('\n❌  serviceAccountKey.json not found at project root.')
  console.error('   Firebase Console → Project Settings → Service Accounts → Generate new private key\n')
  process.exit(1)
}

const admin = (await import('firebase-admin')).default
const serviceAccount = require(keyPath)

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const listAllUsers = async (nextPageToken, acc = []) => {
  const result = await admin.auth().listUsers(1000, nextPageToken)
  const users = [
    ...acc,
    ...result.users.map((u) => ({
      uid: u.uid,
      email: u.email || null,
      displayName: u.displayName || null,
      phoneNumber: u.phoneNumber || null,
      photoURL: u.photoURL || null,
      emailVerified: u.emailVerified,
      disabled: u.disabled,
      customClaims: u.customClaims || {},
      createdAt: u.metadata.creationTime,
      lastSignIn: u.metadata.lastSignInTime || null,
      providers: u.providerData.map((p) => p.providerId),
    })),
  ]
  return result.pageToken ? listAllUsers(result.pageToken, users) : users
}

app.get('/auth-users', async (_req, res) => {
  try {
    const users = await listAllUsers()
    res.json({ users })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /auth-users/:uid — update role (custom claim) and/or disable state
app.patch('/auth-users/:uid', async (req, res) => {
  const { uid } = req.params
  const { role, disabled } = req.body
  try {
    const updates = {}
    if (disabled !== undefined) updates.disabled = disabled

    if (Object.keys(updates).length) await admin.auth().updateUser(uid, updates)
    if (role !== undefined) await admin.auth().setCustomUserClaims(uid, { role })

    const updated = await admin.auth().getUser(uid)
    res.json({
      uid: updated.uid,
      email: updated.email || null,
      displayName: updated.displayName || null,
      disabled: updated.disabled,
      customClaims: updated.customClaims || {},
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /auth-users — create a new user with role
app.post('/auth-users', async (req, res) => {
  const { email, password, displayName, role } = req.body
  try {
    const user = await admin.auth().createUser({
      email,
      password,
      displayName,
    })
    if (role) {
      await admin.auth().setCustomUserClaims(user.uid, { role })
    }
    res.status(201).json({ uid: user.uid, email: user.email, displayName: user.displayName })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /auth-users/:uid — permanent account cancellation
app.delete('/auth-users/:uid', async (req, res) => {
  const { uid } = req.params
  try {
    await admin.auth().deleteUser(uid)
    res.json({ success: true, message: `User ${uid} deleted` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /sms — proxy to Airtel Sudan (avoids browser CORS)
app.post('/sms', async (req, res) => {
  const { phone, message } = req.body
  const apiKey  = process.env.AIRTEL_SMS_API_KEY
  const sender  = process.env.AIRTEL_SMS_SENDER || 'Booking'

  if (!apiKey) return res.status(500).json({ ok: false, error: 'AIRTEL_SMS_API_KEY not set in server env' })
  if (!phone || !message) return res.status(400).json({ ok: false, error: 'phone and message required' })

  const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '')
    if (d.startsWith('249')) return d
    if (d.startsWith('0'))   return '249' + d.slice(1)
    return '249' + d
  }

  try {
    const airtelRes = await fetch('https://www.airtel.sd/api/rest_send_sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({
        sender,
        messages: [{ to: normalizePhone(phone), message, MSGID: String(Date.now()) }],
      }),
    })
    const body = await airtelRes.json()
    console.log('Airtel SMS response:', JSON.stringify(body))

    if (body.status === 'failed') {
      const reason = body.results?.[0]?.reason || body.detail || 'unknown error'
      return res.status(200).json({ ok: false, error: reason })
    }
    const result = body.results?.[0]
    if (result?.status === 'sent') return res.json({ ok: true, apiMsgId: result.apiMsgId })
    return res.json({ ok: false, error: result?.reason || 'not sent' })
  } catch (err) {
    console.error('SMS proxy error:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /whatsapp — proxy WhatsApp template message to Meta Cloud API
app.post('/whatsapp', async (req, res) => {
  const { phone, patientName, doctorName, date, shift } = req.body
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID
  const accessToken   = process.env.WA_ACCESS_TOKEN
  const templateName  = process.env.WA_TEMPLATE_NAME

  if (!phoneNumberId || !accessToken || !templateName) {
    return res.status(500).json({ ok: false, error: 'WhatsApp env vars not configured' })
  }

  const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '')
    if (d.startsWith('249')) return d
    if (d.startsWith('0'))   return '249' + d.slice(1)
    return '249' + d
  }

  try {
    const waRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(phone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'ar' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patientName },
                { type: 'text', text: doctorName },
                { type: 'text', text: date },
                { type: 'text', text: shift },
              ],
            },
          ],
        },
      }),
    })
    const body = await waRes.json()
    console.log('WhatsApp HTTP status:', waRes.status)
    console.log('WhatsApp response:', JSON.stringify(body, null, 2))
    if (body.messages?.[0]?.id) return res.json({ ok: true, msgId: body.messages[0].id })
    const err = body.error || {}
    return res.json({
      ok: false,
      error: err.message || 'unknown error',
      code: err.code,
      fbtrace_id: err.fbtrace_id,
      httpStatus: waRes.status,
    })
  } catch (err) {
    console.error('WhatsApp proxy error:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /whatsapp-cancel — proxy WhatsApp cancellation template to Meta Cloud API
app.post('/whatsapp-cancel', async (req, res) => {
  const { phone, patientName, doctorName, date } = req.body
  const phoneNumberId  = process.env.WA_PHONE_NUMBER_ID
  const accessToken    = process.env.WA_ACCESS_TOKEN
  const templateName   = process.env.WA_CANCEL_TEMPLATE_NAME || 'cancel_appointment'

  if (!phoneNumberId || !accessToken) {
    return res.status(500).json({ ok: false, error: 'WhatsApp env vars not configured' })
  }

  const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '')
    if (d.startsWith('249')) return d
    if (d.startsWith('0'))   return '249' + d.slice(1)
    return '249' + d
  }

  try {
    const waRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(phone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'ar' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patientName },
                { type: 'text', text: doctorName },
                { type: 'text', text: date },
              ],
            },
          ],
        },
      }),
    })
    const body = await waRes.json()
    console.log('WA cancel response:', JSON.stringify(body))
    if (body.messages?.[0]?.id) return res.json({ ok: true, msgId: body.messages[0].id })
    const err = body.error || {}
    return res.json({ ok: false, error: err.message || 'unknown error', code: err.code })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

process.on('uncaughtException', (err) => console.error('❌ Uncaught:', err))
process.on('unhandledRejection', (err) => console.error('❌ Unhandled rejection:', err))

const server = app.listen(3001, () => {
  console.log('\n✅  Admin API running at http://localhost:3001')
  console.log('   GET  /auth-users       — list all Firebase Auth users')
  console.log('   PATCH /auth-users/:uid — update role / disabled\n')
})

server.on('error', (err) => console.error('❌ Server error:', err))
