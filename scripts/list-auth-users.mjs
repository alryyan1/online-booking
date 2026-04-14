/**
 * list-auth-users.mjs
 *
 * Lists all Firebase Auth users for this project.
 *
 * SETUP (one-time):
 *   1. Firebase Console → Project Settings → Service Accounts
 *   2. Click "Generate new private key" → save as serviceAccountKey.json in project root
 *   3. npm run list-users
 *
 * The serviceAccountKey.json is in .gitignore — never commit it.
 */

import { createRequire } from 'module'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const listAllUsers = async (nextPageToken) => {
  const result = await admin.auth().listUsers(1000, nextPageToken)
  return [
    ...result.users.map((u) => ({
      uid: u.uid,
      email: u.email || '—',
      displayName: u.displayName || '—',
      emailVerified: u.emailVerified,
      disabled: u.disabled,
      createdAt: u.metadata.creationTime,
      lastSignIn: u.metadata.lastSignInTime || '—',
      provider: u.providerData.map((p) => p.providerId).join(', ') || 'password',
    })),
    ...(result.pageToken ? await listAllUsers(result.pageToken) : []),
  ]
}

console.log('\n🔑  Fetching Firebase Auth users...\n')

const users = await listAllUsers()

if (users.length === 0) {
  console.log('No Firebase Auth users found.')
  process.exit(0)
}

// Pretty table output
const col = (str, width) => String(str).padEnd(width).slice(0, width)

console.log(
  col('UID', 30) +
  col('Email', 36) +
  col('Display Name', 24) +
  col('Verified', 10) +
  col('Disabled', 10) +
  col('Provider', 14) +
  'Created At'
)
console.log('─'.repeat(140))

users.forEach((u) => {
  console.log(
    col(u.uid, 30) +
    col(u.email, 36) +
    col(u.displayName, 24) +
    col(u.emailVerified ? '✓' : '✗', 10) +
    col(u.disabled ? '✓' : '✗', 10) +
    col(u.provider, 14) +
    u.createdAt
  )
})

console.log(`\n✅  Total: ${users.length} Firebase Auth user(s)\n`)

process.exit(0)
