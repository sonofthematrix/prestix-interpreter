/**
 * Handles Stripe webhook events. Uses raw body and stripe-signature for verification.
 * On checkout.session.completed:
 * - If metadata.type === 'booking' and metadata.bookingId: call opts.confirmBooking (ZenStack).
 * - Else if metadata.userId/tier/billingPeriod: call opts.setMembership (membership).
 * Call from Next.js route with raw request body and opts.
 */

import Stripe from 'stripe';

const VALID_TIERS = ['essential', 'pro', 'event_organizer', 'elite'];
const VALID_BILLING = ['monthly', 'yearly'];

/**
 * @param {string} rawBody - Raw request body (string)
 * @param {string | null} signature - stripe-signature header
 * @param {{ setMembership?: (userId: string, tier: string, billingPeriod: string) => Promise<boolean>, confirmBooking?: (bookingId: string, session: object) => Promise<boolean> }} opts
 * @returns {{ status: number; body?: object }}
 */
export async function handleStripeWebhook(rawBody, signature, opts = {}) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set');
    return { status: 503, body: { error: 'Webhook not configured' } };
  }

  if (!rawBody || !signature) {
    return { status: 400, body: { error: 'Missing body or signature' } };
  }

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return { status: 400, body: { error: 'Invalid signature' } };
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata || {};

    // Booking checkout: metadata.type === 'booking' and metadata.bookingId
    if (meta.type === 'booking' && meta.bookingId) {
      const confirmBooking = opts.confirmBooking;
      if (!confirmBooking) {
        console.error('[stripe-webhook] confirmBooking required for booking checkout');
        return { status: 503, body: { error: 'Webhook not configured' } };
      }
      try {
        const ok = await confirmBooking(meta.bookingId, session);
        if (!ok) {
          console.error('[stripe-webhook] confirmBooking failed for', meta.bookingId);
          return { status: 500, body: { error: 'Webhook processing failed' } };
        }
      } catch (err) {
        console.error('[stripe-webhook] confirmBooking error:', err);
        return { status: 500, body: { error: 'Webhook processing failed' } };
      }
      return { status: 200, body: { received: true } };
    }

    // Membership checkout: metadata.userId, tier, billingPeriod
    const { userId, tier, billingPeriod } = meta;
    if (userId && VALID_TIERS.includes(tier) && VALID_BILLING.includes(billingPeriod)) {
      const setMembershipImpl = opts.setMembership;
      if (!setMembershipImpl) {
        console.error('[stripe-webhook] setMembership required (pass from Next.js route)');
        return { status: 503, body: { error: 'Webhook not configured' } };
      }
      try {
        const ok = await setMembershipImpl(userId, tier, billingPeriod);
        if (!ok) {
          console.error('[stripe-webhook] setMembership failed for', userId);
        }
      } catch (err) {
        console.error('[stripe-webhook] setMembership error:', err);
        return { status: 500, body: { error: 'Webhook processing failed' } };
      }
      return { status: 200, body: { received: true } };
    }

    // Unknown metadata - acknowledge to avoid retries
    console.warn('[stripe-webhook] checkout.session.completed with unknown metadata:', meta);
  }

  return { status: 200, body: { received: true } };
}
