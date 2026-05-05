import { Resend } from 'resend'

const SUPPORT_EMAIL = 'support@prestix.vip'
// When set (e.g. to your Resend account email), overrides recipient so unverified accounts can test
const DEFAULT_FROM = 'prestix.vip Contact <onboarding@resend.dev>'

function sanitize(str, maxLen = 2000) {
  if (typeof str !== 'string') return ''
  return str.slice(0, maxLen).replace(/[<>]/g, '')
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const origin = req.headers.origin || req.headers.referer || ''
  const allowedOrigins = [
    'https://prestix.vip',
    'https://www.prestix.vip',
    /^https:\/\/.*\.vercel\.app$/,
    'http://localhost:5173',
    'http://localhost:3000',
  ]
  const corsAllowed = allowedOrigins.some((o) =>
    typeof o === 'string' ? origin === o : o.test(origin)
  )
  res.setHeader('Access-Control-Allow-Origin', corsAllowed ? origin : 'https://prestix.vip')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set')
    return res.status(503).json({
      error: 'Email is not configured',
      hint: 'Add RESEND_API_KEY in Vercel project Environment Variables and redeploy.',
    })
  }

  const resend = new Resend(apiKey)
  const fromAddress =
    process.env.CONTACT_FROM_EMAIL && process.env.CONTACT_FROM_NAME
      ? `${process.env.CONTACT_FROM_NAME} <${process.env.CONTACT_FROM_EMAIL}>`
      : DEFAULT_FROM

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const name = sanitize(body.name || '', 200)
    const email = sanitize(body.email || '', 320)
    const message = sanitize(body.message || '', 10000)
    const newsletter = Boolean(body.newsletter)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' })
    }

    const subject = `[prestix.vip Contact] ${name ? `${name} – ` : ''}${email}`
    const html = `
      <p><strong>From:</strong> ${name || '(not provided)'}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Newsletter signup:</strong> ${newsletter ? 'Yes' : 'No'}</p>
      <hr />
      <p>${(message || '(no message)').replace(/\n/g, '<br>')}</p>
    `

    const toAddress = process.env.RESEND_TEST_TO || SUPPORT_EMAIL
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      replyTo: email,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      const isValidationError =
        error.statusCode === 403 ||
        (error.name && String(error.name).toLowerCase() === 'validation_error')
      const message =
        isValidationError && error.message
          ? error.message
          : error.message || 'Check Resend dashboard and domain verification.'
      return res.status(isValidationError ? 400 : 500).json({
        error: 'Failed to send message',
        hint: message,
      })
    }

    return res.status(200).json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Contact API error:', err)
    return res.status(500).json({
      error: 'Something went wrong',
      hint: err.message || 'Check Vercel function logs.',
    })
  }
}
