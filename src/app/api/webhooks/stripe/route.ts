import { NextResponse } from "next/server";
import { handleStripeWebhook } from "handlers/stripe-webhook.js";
import { setMembershipForUser } from "@/lib/membership-activate";
import { confirmBookingAfterStripePayment } from "@/lib/services/booking-confirm-payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? null;
  const { status, body } = await handleStripeWebhook(rawBody, signature, {
    setMembership: (userId: string, tier: string, billingPeriod: string) =>
      setMembershipForUser(userId, tier, billingPeriod),
    confirmBooking: (bookingId: string, session: { payment_intent?: string }) =>
      confirmBookingAfterStripePayment(bookingId, session),
  });
  return NextResponse.json(body ?? {}, { status });
}
