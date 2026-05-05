/**
 * POST /api/hub/bookings/checkout-session
 *
 * Creates a booking with PENDING_PAYMENT and a Stripe Checkout Session.
 * Returns { url } to redirect the user to Stripe. On payment success, webhook
 * confirms the booking and creates BookingPayment.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const addOnSchema = z.object({
  name: z.string(),
  category: z.string().default("OTHER"),
  quantity: z.number().min(1).max(99),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  currency: z.string().default("AUD"),
});

const createBookingSchema = z.object({
  memberId: z.string(),
  venueId: z.string(),
  bookingType: z.enum(["TABLE_RESERVATION", "EVENT_TICKET"]),
  tableId: z.string().optional(),
  ticketId: z.string().optional(),
  bookingDate: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  guestCount: z.number().min(1).max(20),
  baseAmount: z.number().min(0),
  addOnsAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  currency: z.string().default("AUD"),
  addOns: z.array(addOnSchema).optional(),
  specialNotes: z.string().optional(),
});

/**
 * Convert frontend amount to Stripe unit_amount.
 * Frontend sends: smallest unit (cents for AUD/USD, whole for IDR/JPY/KRW).
 * Stripe expects: minor unit for each currency.
 * - Two-decimal (AUD, USD, IDR): amount in cents / 0.01 units. IDR is two-decimal in Stripe.
 * - Zero-decimal (JPY, KRW): amount = charge amount directly.
 * IDR: App stores 4,000,000 (whole rupiah). Stripe expects 400,000,000 (4M * 100).
 */
function toStripeAmount(amount: number, currency: string): number {
  const zeroDecimal = ["JPY", "KRW", "VND", "CLP", "ISK", "UGX"].includes(currency.toUpperCase());
  if (zeroDecimal) {
    return Math.round(amount);
  }
  // Two-decimal: IDR, AUD, USD, etc. Frontend sends whole units for IDR; cents for AUD/USD.
  // For IDR we store whole rupiah → multiply by 100 for Stripe.
  // For AUD/USD we store cents → pass through.
  const wholeUnitCurrencies = ["IDR"];
  if (wholeUnitCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount * 100);
  }
  return Math.round(amount);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Sign in required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid booking data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const data = parsed.data;
    const baseAmount = data.baseAmount ?? data.totalAmount;
    const addOnsAmount = data.addOnsAmount ?? 0;
    const totalAmount = data.totalAmount;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    const bookingNumber = `PX-${dateStr}-${random}`;

    const bookingData = {
      memberId: data.memberId,
      venueId: data.venueId,
      bookingType: data.bookingType,
      tableId: data.tableId,
      ticketId: data.ticketId,
      bookingNumber,
      bookingDate: new Date(data.bookingDate),
      startTime: data.startTime,
      endTime: data.endTime,
      guestCount: data.guestCount,
      baseAmount,
      addOnsAmount,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount,
      currency: data.currency,
      specialNotes: data.specialNotes,
      status: "PENDING_PAYMENT" as const,
      venueShare: totalAmount * 0.875,
      commissionPool: totalAmount * 0.1,
      promoterEarning: 0,
      platformPassive: totalAmount * 0.1,
      platformFee: totalAmount * 0.025,
      totalPlatformRevenue: totalAmount * 0.125,
    };

    const booking = await (db as any).booking.create({
      data: bookingData as any,
    });

    if (data.addOns?.length) {
      await (db as any).bookingAddOn.createMany({
        data: data.addOns.map((a: { name: string; category: string; quantity: number; unitPrice: number; totalPrice: number; currency: string }) => ({
          bookingId: booking.id,
          name: a.name,
          category: a.category,
          quantity: a.quantity,
          unitPrice: a.unitPrice,
          totalPrice: a.totalPrice,
          currency: a.currency,
        })),
      });
    }

    const amountCents = toStripeAmount(totalAmount, data.currency);
    const currency = data.currency.toLowerCase();
    const productName = data.bookingType === "TABLE_RESERVATION"
      ? `Table Reservation — ${bookingNumber}`
      : `Event Ticket — ${bookingNumber}`;

    const origin = request.headers.get("origin") || request.headers.get("referer") || "";
    const host = request.headers.get("host") || "prestix.vip";
    const baseUrl = origin.startsWith("http")
      ? new URL(origin).origin
      : (host.includes("localhost") ? `http://${host}` : `https://${host}`);
    const successUrl = `${baseUrl}/hub/bookings/${booking.id}?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/hub/bookings/new?canceled=1`;

    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: productName,
              description: `${data.bookingDate} at ${data.startTime} · ${data.guestCount} guest${data.guestCount !== 1 ? "s" : ""}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: booking.id,
        type: "booking",
      },
      customer_email: (user as { email?: string })?.email || undefined,
    });

    if (!session.url) {
      return NextResponse.json(
        { success: false, error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { url: session.url, bookingId: booking.id, sessionId: session.id },
    });
  } catch (err) {
    console.error("[api/hub/bookings/checkout-session]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create checkout" },
      { status: 500 }
    );
  }
}
