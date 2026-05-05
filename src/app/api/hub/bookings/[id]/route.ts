/**
 * GET /api/hub/bookings/[id] — Get one Booking with venue, member, table, ticket, payment.
 * PATCH /api/hub/bookings/[id] — Update status and/or notes (specialNotes).
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateTicketSoldCount, doesStatusChangeAffectSoldCount } from "@/lib/services/ticket-sold-count";

export const dynamic = "force-dynamic";

const bookingStatusValues = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "NO_SHOW",
] as const;

const patchBodySchema = z.object({
  status: z.enum(bookingStatusValues).optional(),
  notes: z.string().max(10000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const booking = await (db as any).booking.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        member: { select: { id: true, email: true, name: true } },
        table: { select: { id: true, name: true, inclusions: true, availableAddOns: true } },
        ticket: { select: { id: true, name: true, inclusions: true } },
        promoter: { select: { id: true, tier: true, referralCode: true, user: { select: { name: true } } } },
        payment: true,
        addOns: true,
      },
    });
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }
    // Shape response to match list API (promoter + commission fields)
    const data = {
      ...booking,
      promoter: booking.promoter
        ? {
            id: booking.promoter.id,
            name: booking.promoter.user?.name ?? "Promoter",
            tier: booking.promoter.tier,
            referralCode: booking.promoter.referralCode,
          }
        : null,
    };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[api/hub/bookings/[id]] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { status, notes } = parsed.data;
    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.specialNotes = notes.trim() || null;
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update (status or notes)" },
        { status: 400 }
      );
    }
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const existing = await (db as any).booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if status change affects sold count
    const statusChanged = status !== undefined && status !== existing.status;
    const affectsSoldCount = statusChanged && doesStatusChangeAffectSoldCount(existing.status, status);

    const booking = await (db as any).booking.update({
      where: { id },
      data: data as any,
    });

    // Update ticket sold count if status change affects it
    if (affectsSoldCount && existing.ticketId) {
      try {
        await updateTicketSoldCount(existing.ticketId);
      } catch (error) {
        console.error(`Failed to update sold count for ticket ${existing.ticketId}:`, error);
        // Don't fail the booking update if sold count update fails
      }
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (err) {
    console.error("[api/hub/bookings/[id]] PATCH:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
