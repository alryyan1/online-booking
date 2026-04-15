/**
 * Local Admin API server — runs alongside `npm run dev`
 * Exposes Firebase Auth user list to the React super admin UI.
 *
 * Start with:  npm run admin-api
 * Listens on:  http://localhost:3001
 */

import { createRequire } from 'module'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

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

process.on('uncaughtException', (err) => console.error('❌ Uncaught:', err))
process.on('unhandledRejection', (err) => console.error('❌ Unhandled rejection:', err))

const server = app.listen(3001, () => {
  console.log('\n✅  Admin API running at http://localhost:3001')
  console.log('   GET  /auth-users       — list all Firebase Auth users')
  console.log('   PATCH /auth-users/:uid — update role / disabled\n')
})

server.on('error', (err) => console.error('❌ Server error:', err))
