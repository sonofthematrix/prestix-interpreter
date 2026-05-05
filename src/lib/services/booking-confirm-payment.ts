/**
 * Confirms a booking after successful Stripe Checkout payment.
 * Updates booking status to CONFIRMED, creates BookingPayment, and updates ticket sold count.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { updateTicketSoldCount } from "./ticket-sold-count";

export interface StripeCheckoutSession {
  id?: string;
  payment_intent?: string;
  amount_total?: number;
  currency?: string;
}

/**
 * Confirms a booking after Stripe checkout.session.completed.
 * @returns true if successful
 */
export async function confirmBookingAfterStripePayment(
  bookingId: string,
  session: StripeCheckoutSession
): Promise<boolean> {
  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const booking = await (db as any).booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      console.error("[booking-confirm-payment] Booking not found:", bookingId);
      return false;
    }

    if (booking.status !== "PENDING_PAYMENT") {
      console.warn("[booking-confirm-payment] Booking already confirmed:", bookingId);
      return true;
    }

    const totalAmount = Number(booking.totalAmount) ?? 0;
    const currency = booking.currency ?? "AUD";

    await (db as any).booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });

    await (db as any).bookingPayment.create({
      data: {
        bookingId,
        amount: totalAmount,
        currency,
        rail: "STRIPE_CARD",
        status: "COMPLETED",
        stripePaymentIntentId: session.payment_intent ?? null,
        processedAt: new Date(),
      },
    });

    if (booking.ticketId) {
      try {
        await updateTicketSoldCount(booking.ticketId);
      } catch (err) {
        console.error("[booking-confirm-payment] Failed to update ticket sold count:", err);
      }
    }

    return true;
  } catch (err) {
    console.error("[booking-confirm-payment]", err);
    throw err;
  }
}
