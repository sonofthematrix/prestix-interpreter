/**
 * Creates a Stripe Checkout Session for membership purchase.
 * POST body: { tier, billingPeriod }
 * Returns: { url } to redirect the user to Stripe Checkout.
 * After payment, Stripe sends checkout.session.completed to the webhook;
 * the webhook reads metadata (userId, tier, billingPeriod) and calls setMembership.
 */

import Stripe from 'stripe';
import { getSessionFromRequest } from './auth/lib.js';

const VALID_TIERS = ['essential', 'pro', 'event_organizer', 'elite'];
const VALID_BILLING = ['monthly', 'yearly'];

// Amounts in USD cents (matches become-a-member page). yearly is ~25% off.
const TIER_CENTS = {
  essential: { monthly: 2500, yearly: 22500 },
  pro: { monthly: 6900, yearly: 62100 },
  event_organizer: { monthly: 19900, yearly: 179100 },
  elite: { monthly: 50000, yearly: 450000 },
};

function originAllow(origin) {
  if (!origin) return false;
  if (process.env.NODE_ENV === 'development') return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/(www\.)?prestix\.vip$/.test(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/(www\.)?prestixapp\.vercel\.app$/.test(origin)) return true;
  return false;
}

export default async function handler(req, res) {
  const origin = (req.headers && (req.headers.origin || req.headers.referer)) || '';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', originAllow(origin) ? origin : 'https://prestix.vip');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' });
  }

  // Prefer session injected by Next.js route (getCurrentUser) so auth works on Vercel
  const payload = req.session || (await getSessionFromRequest(req));
  const userId = payload && (payload.sub || payload.id);
  if (!userId) {
    return res.status(401).json({ error: 'Sign in required' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const tier = VALID_TIERS.includes(body.tier) ? body.tier : null;
  const billingPeriod = VALID_BILLING.includes(body.billingPeriod) ? body.billingPeriod : null;

  if (!tier || !billingPeriod) {
    return res.status(400).json({
      error: 'tier and billingPeriod are required (essential|pro|event_organizer|elite, monthly|yearly)',
    });
  }

  const amounts = TIER_CENTS[tier];
  if (!amounts) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  const amountCents = billingPeriod === 'yearly' ? amounts.yearly : amounts.monthly;
  const productName = `PRESTIX.vip Membership — ${tier} (${billingPeriod})`;

  const baseUrl = (req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http') + '://' + (req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000');
  const successUrl = `${baseUrl}/become-a-member?success=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/become-a-member?canceled=1`;

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: productName,
              description: billingPeriod === 'yearly' ? 'Billed annually' : 'Billed monthly',
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: String(userId),
        tier,
        billingPeriod,
      },
      customer_email: payload.email || undefined,
    });

    if (!session.url) {
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[stripe create-checkout]', err);
    return res.status(500).json({
      error: err.message || 'Failed to create checkout session',
    });
  }
}
