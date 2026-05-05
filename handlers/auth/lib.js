/**
 * Shared auth helpers for Google OAuth2 (authorization code + PKCE)
 * and credential (email/password) auth. Session is JWT in httpOnly cookie.
 */

import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const SALT_LEN = 16
const KEY_LEN = 64

const SESSION_COOKIE = 'prestix.session'
const PKCE_COOKIE = 'prestix.pkce'
const PKCE_MAX_AGE = 600 // 10 min
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export function getOrigin(req) {
  const url = process.env.NEXTAUTH_URL
  
  // ✅ CRITICAL: Validate NEXTAUTH_URL is not a database URL or Neon OAuth server
  // If NEXTAUTH_URL is set to a database URL (e.g., Neon, Supabase), it will cause redirects to fail
  // Also check for Neon OAuth server ports (e.g., localhost:42883)
  if (url) {
    const isDatabaseUrl = url.includes('postgresql://') || 
                         url.includes('postgres://') ||
                         url.includes('mysql://') ||
                         url.includes('mongodb://') ||
                         url.includes('neon.tech') ||
                         url.includes('console.neon')
    
    // ✅ CRITICAL: Block Neon OAuth server redirects (localhost:42883, etc.)
    const isNeonOAuthServer = url.includes('localhost:42883') ||
                              url.includes('127.0.0.1:42883') ||
                              url.includes(':42883') ||
                              (url.includes('/oauth/callback') && url.includes('localhost'))
    
    if (isDatabaseUrl || isNeonOAuthServer) {
      console.error('[auth/lib] ❌ CRITICAL: NEXTAUTH_URL is set to a database URL or Neon OAuth server instead of app URL!')
      console.error('   NEXTAUTH_URL:', url.substring(0, 50) + '...')
      console.error('   This will cause redirects to fail. Use your app URL (e.g., http://localhost:3000)')
      console.error('   ⚠️ If you see redirects to localhost:42883, check for running Neon MCP Server or CLI tools')
      // Fall through to use request headers instead
    } else {
      return url.replace(/\/$/, '')
    }
  }
  
  // Fallback: Use request headers to determine origin
  const host = req.headers['x-forwarded-host'] || req.headers['host']
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
  const origin = `${proto}://${host}`
  
  // ✅ CRITICAL: Block Neon OAuth server ports in fallback origin
  if (origin.includes(':42883') || origin.includes('localhost:42883')) {
    console.error('[auth/lib] ❌ CRITICAL: Request origin appears to be Neon OAuth server (localhost:42883)!')
    console.error('   This suggests a Neon MCP Server or CLI tool is intercepting requests')
    console.error('   Origin:', origin)
    console.error('   ⚠️ SOLUTION: Stop any running Neon MCP Server or CLI tools')
    // Return a safe fallback instead
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }
  
  return origin
}

export function getRedirectUri(req) {
  return `${getOrigin(req)}/api/auth/callback/google`
}

export function generateState() {
  return randomBytes(32).toString('hex')
}

export function generatePKCE() {
  const code_verifier = randomBytes(32).toString('base64url')
  const code_challenge = createHash('sha256').update(code_verifier).digest('base64url')
  return { code_verifier, code_challenge }
}

export function setCookie(res, name, value, maxAge, sameSite = 'lax') {
  const isProd = process.env.NODE_ENV === 'production'
  // Use SameSite=None for PKCE so the cookie is sent when Google redirects back (cross-site). Requires Secure.
  const effectiveSameSite = name === PKCE_COOKIE && isProd ? 'None' : sameSite
  const secure = isProd ? '; Secure' : ''
  res.setHeader('Set-Cookie', [
    `${name}=${value}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=${effectiveSameSite}${secure}`,
  ].join(','))
}

export function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`)
}

/** Get the secret used for signing JWTs (must be set in production). */
export function getSessionSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || null
}

export async function createSessionToken(payload) {
  const secretVal = getSessionSecret()
  if (!secretVal) throw new Error('[auth] Missing NEXTAUTH_SECRET or AUTH_SECRET')
  const secret = new TextEncoder().encode(secretVal)
  const jti = randomBytes(16).toString('hex')
  const safePayload = {
    jti,
    sub: payload.sub != null ? String(payload.sub) : undefined,
    id: payload.id != null ? String(payload.id) : undefined,
    email: payload.email != null ? String(payload.email) : undefined,
    name: payload.name != null ? String(payload.name) : undefined,
    image: payload.image != null ? String(payload.image) : undefined,
  }
  return new SignJWT(safePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret)
}

export async function getSessionFromRequest(req) {
  const result = await getSessionFromRequestWithRevoked(req)
  return result.payload
}

/**
 * Like getSessionFromRequest but also returns whether the token was revoked.
 * Use in session handler to clear cookie when revoked so client stops sending it.
 * 
 * ✅ CRITICAL: Checks both NextAuth cookie names (AppKit/SIWE) and legacy prestix.session cookie
 * to support both authentication methods.
 */
export async function getSessionFromRequestWithRevoked(req) {
  const cookieHeader = req.headers.cookie || ''
  
  // ✅ CRITICAL: Check for NextAuth cookie names first (AppKit/SIWE authentication)
  // NextAuth uses different cookie names based on environment:
  // - Development (HTTP): next-auth.session-token
  // - Production (HTTPS/Vercel): __Secure-next-auth.session-token
  const isSecure =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXTAUTH_URL?.startsWith('https://') === true ||
    !!process.env.VERCEL
  
  const nextAuthCookieName = isSecure 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token'
  
  // Try NextAuth cookie first (AppKit/SIWE). NextAuth uses JWE; only getToken() decodes it.
  const nextAuthMatch = cookieHeader.match(new RegExp(`${nextAuthCookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]+)`))
  if (nextAuthMatch) {
    const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    if (!secretVal) return { payload: null, revoked: false }
    try {
      const { getToken } = await import('next-auth/jwt')
      const reqWithCookies = {
        cookies: {
          get: (name) => (name === nextAuthCookieName ? { value: nextAuthMatch[1] } : undefined),
        },
      }
      const payload = await getToken({ req: reqWithCookies, secret: secretVal })
      if (!payload) return { payload: null, revoked: false }
      // revoked-sessions-store retired; revocation enforced in getCurrentUser (ZenStack)
      return { payload, revoked: false }
    } catch {
      return { payload: null, revoked: false }
    }
  }

  // Fallback: legacy prestix.session cookie (Google OAuth/credentials) is JWS (jose).
  const legacyMatch = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  if (!legacyMatch) return { payload: null, revoked: false }

  const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secretVal) return { payload: null, revoked: false }
  try {
    const secret = new TextEncoder().encode(secretVal)
    const { payload } = await jwtVerify(legacyMatch[1], secret)
    // revoked-sessions-store retired; revocation enforced in getCurrentUser (ZenStack)
    return { payload, revoked: false }
  } catch {
    return { payload: null, revoked: false }
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE
}

export function getPKCECookieName() {
  return PKCE_COOKIE
}

export function getPKCEMaxAge() {
  return PKCE_MAX_AGE
}

/** Hash password for storage. Returns "salt:hash" in hex. */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_LEN).toString('hex')
  const hash = await scryptAsync(password, salt, KEY_LEN)
  return salt + ':' + (hash && hash.toString('hex'))
}

/** Verify password against stored "salt:hash" string. */
export async function verifyPassword(password, stored) {
  if (!stored || !password) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const derived = await scryptAsync(password, salt, KEY_LEN)
  return derived && derived.toString('hex') === hash
}
