/**
 * Entity Generation Configuration
 *
 * Controls how auto-generation plugins handle specific entities,
 * including Stripe payment flow integration.
 *
 * When an entity is marked as Stripe payment enabled:
 * - Admin create page shows a notice that paid records use Stripe checkout
 * - API route generation includes JSDoc pointing to /api/payment/create-intent
 * - App state sync can detect Stripe entities from schema (paymentIntentId, etc.)
 */

/** Models that use Stripe Payment Intents for paid creation */
export const STRIPE_PAYMENT_ENTITIES: readonly string[] = [
  'VenueBooking', // Tickets and table reservations via /api/payment/create-intent
  // Add Order, Subscription, etc. when Stripe flow is implemented for them
] as const;

/** Schema field names that indicate Stripe payment integration */
export const STRIPE_PAYMENT_FIELDS = [
  'paymentIntentId',
  'stripePaymentId',
  'stripeChargeId',
] as const;

/**
 * Check if a model uses Stripe payment flow for paid creation
 */
export function usesStripePayment(modelName: string): boolean {
  return (STRIPE_PAYMENT_ENTITIES as readonly string[]).includes(modelName);
}

/**
 * Detect Stripe payment entity from schema fields (for app-state-sync)
 */
export function hasStripePaymentFields(fields: string[]): boolean {
  const fieldSet = new Set(fields.map((f) => f.toLowerCase()));
  return STRIPE_PAYMENT_FIELDS.some((f) => fieldSet.has(f.toLowerCase()));
}

/**
 * Get notice text for admin create page when entity uses Stripe
 */
export function getStripePaymentCreateNotice(modelName: string): string {
  switch (modelName) {
    case 'VenueBooking':
      return 'Paid ticket and table bookings are created via the event/venue booking flow using Stripe checkout. Use this form only for free or manually-created bookings.';
    default:
      return `Paid ${modelName} records are created via Stripe payment flow. Use this form only for free or manually-created records.`;
  }
}

/**
 * Get short comment for API route when entity uses Stripe
 */
export function getStripePaymentRouteComment(modelName: string): string {
  switch (modelName) {
    case 'VenueBooking':
      return 'For paid TICKET/TABLE bookings use POST /api/payment/create-intent. This route: GET list, POST manual/free create.';
    default:
      return 'For paid creation use POST /api/payment/create-intent.';
  }
}
