/**
 * In-memory user store for email/password auth.
 * For production, replace with MongoDB, Vercel KV, or another persistent store.
 * This store does not persist across serverless invocations (e.g. Vercel).
 */

const usersByEmail = new Map()

export function getUserByEmail(email) {
  if (!email || typeof email !== 'string') return null
  return usersByEmail.get(email.toLowerCase().trim()) || null
}

export function createUser({ email, passwordHash, name }) {
  const key = email.toLowerCase().trim()
  if (usersByEmail.has(key)) return null
  const user = {
    id: 'cred-' + key + '-' + Date.now(),
    email: key,
    name: name || key.split('@')[0],
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  usersByEmail.set(key, user)
  return user
}
