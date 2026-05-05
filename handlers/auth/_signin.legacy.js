/**
 * GET /api/auth/signin (LEGACY - not deployed by Vercel; see src/app/api/auth/signin/route.ts)
 * Redirects to Google OAuth2 with state + PKCE (authorization code flow).
 * Query: callbackUrl (optional) – where to land after sign-in.
 */

import {
  getOrigin,
  getRedirectUri,
  generateState,
  generatePKCE,
  setCookie,
  getPKCECookieName,
  getPKCEMaxAge,
} from './lib.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const clientId = process.env.GOOGLE_WEB_APP_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return res.status(503).json({ error: 'Auth not configured', hint: 'Set GOOGLE_WEB_APP_CLIENT_ID' })
    }

    const callbackUrl = req.query.callbackUrl || `${getOrigin(req)}/account`
    const state = generateState()
    const { code_verifier, code_challenge } = generatePKCE()
    const redirectUri = getRedirectUri(req)

    const pkcePayload = JSON.stringify({ state, code_verifier, callbackUrl, redirect_uri: redirectUri })
    setCookie(res, getPKCECookieName(), Buffer.from(pkcePayload).toString('base64url'), getPKCEMaxAge())
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    })

    const url = `${GOOGLE_AUTH_URL}?${params.toString()}`
    return res.redirect(302, url)
  } catch (err) {
    console.error('[auth/signin]', err)
    return res.status(500).json({ error: 'Sign-in failed', hint: err.message })
  }
}
