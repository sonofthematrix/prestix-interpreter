/**
 * GET /api/hub/bookings — List Booking. Optional: ?venueId=, ?memberId=, ?status=
 *
 * Access control:
 * - PLATFORM_ADMIN: all bookings (or filtered by venueId, memberId)
 * - Venue host (owner, staff, or assigned host): bookings for their venue(s)
 * - Regular member: only their own bookings (memberId == current user)
 *
 * POST /api/hub/bookings — Create Booking
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { updateTicketSoldCount } from "@/lib/services/ticket-sold-count";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Sign in required" },
        { status: 401 }
      );
    }

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    }) as any;

    const venueId = request.nextUrl.searchParams.get("venueId")?.trim() || undefined;
    const memberIdParam = request.nextUrl.searchParams.get("memberId")?.trim() || undefined;
    const status = request.nextUrl.searchParams.get("status")?.trim() || undefined;

    const where: Record<string, unknown> = {};

    // Admin: see all (optionally filtered by venueId, memberId)
    if (user.role === "PLATFORM_ADMIN") {
      if (venueId) where.venueId = venueId;
      if (memberIdParam) where.memberId = memberIdParam;
    } else {
      // Venue host: venues where user is owner, staff, or assigned host
      const ownedVenues = await db.venueProfile.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const staffVenues = await db.venueStaff.findMany({
        where: { userId: user.id, isActive: true },
        select: { venueId: true },
      });
      const hostProfile = await db.hostProfile.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      const hostVenueAssignments = hostProfile
        ? await db.venueHostAssignment.findMany({
            where: { hostId: hostProfile.id, isActive: true },
            select: { venueId: true },
          })
        : [];
      const venueIds = [
        ...ownedVenues.map((v: { id: string }) => v.id),
        ...staffVenues.map((s: { venueId: string }) => s.venueId),
        ...hostVenueAssignments.map((a: { venueId: string }) => a.venueId),
      ];
      const uniqueVenueIds = [...new Set(venueIds)];

      if (uniqueVenueIds.length > 0) {
        // Venue host: only bookings for their venue(s)
        where.venueId = venueId && uniqueVenueIds.includes(venueId)
          ? venueId
          : { in: uniqueVenueIds };
      } else {
        // Regular member: only their own bookings
        let memberId = user.id;
        if (user.email) {
          const byId = await db.booking.count({ where: { memberId: user.id } });
          if (byId === 0) {
            const u = await db.user.findFirst({
              where: { email: { equals: user.email, mode: "insensitive" } },
              select: { id: true },
            });
            if (u) memberId = u.id;
          }
        }
        where.memberId = memberId;
      }
    }

    if (venueId && !where.venueId) where.venueId = venueId;
    if (status) where.status = status;

    const bookings = await db.booking.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        member: { select: { id: true, email: true, name: true } },
        table: { select: { id: true, name: true } },
        ticket: { select: { id: true, name: true } },
        promoter: { select: { id: true, tier: true, referralCode: true, user: { select: { name: true } } } },
      },
      orderBy: { bookingDate: "desc" },
    });

    const list = bookings.map((b: any) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      bookingType: b.bookingType,
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      guestCount: b.guestCount,
      totalAmount: b.totalAmount,
      currency: b.currency,
      status: b.status,
      venue: b.venue,
      member: b.member,
      table: b.table,
      ticket: b.ticket,
      promoter: b.promoter
        ? { id: b.promoter.id, name: b.promoter.user?.name ?? "Promoter", tier: b.promoter.tier, referralCode: b.promoter.referralCode }
        : null,
      // Commission fields
      venueShare: b.venueShare,
      commissionPool: b.commissionPool,
      promoterEarning: b.promoterEarning,
      platformPassive: b.platformPassive,
      platformFee: b.platformFee,
      totalPlatformRevenue: b.totalPlatformRevenue,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("[api/hub/bookings] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list bookings" },
      { status: 500 }
    );
  }
}

const addOnSchema = z.object({
  name: z.string(),
  category: z.string().default('OTHER'),
  quantity: z.number().min(1).max(99),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  currency: z.string().default('AUD'),
});

const createBookingSchema = z.object({
  memberId: z.string().optional(),
  venueId: z.string(),
  bookingType: z.enum(['TABLE_RESERVATION', 'EVENT_TICKET']),
  tableId: z.string().optional(),
  ticketId: z.string().optional(),
  bookingDate: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  guestCount: z.number().min(1).max(20),
  baseAmount: z.number().min(0).optional(),
  addOnsAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  currency: z.string().default('AUD'),
  addOns: z.array(addOnSchema).optional(),
  specialNotes: z.string().optional(),
  status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'NO_SHOW']).default('PENDING_PAYMENT'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid booking data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const memberId = parsed.data.memberId;
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: "memberId is required. Please sign in to book." },
        { status: 400 }
      );
    }

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const baseAmount = parsed.data.baseAmount ?? parsed.data.totalAmount;
    const addOnsAmount = parsed.data.addOnsAmount ?? 0;
    const totalAmount = parsed.data.totalAmount;

    // Generate unique booking number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    const bookingNumber = `PX-${dateStr}-${random}`;

    const bookingData = {
      memberId,
      venueId: parsed.data.venueId,
      bookingType: parsed.data.bookingType,
      tableId: parsed.data.tableId,
      ticketId: parsed.data.ticketId,
      bookingNumber,
      bookingDate: new Date(parsed.data.bookingDate),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      guestCount: parsed.data.guestCount,
      baseAmount,
      addOnsAmount,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount,
      currency: parsed.data.currency,
      specialNotes: parsed.data.specialNotes,
      status: parsed.data.status,
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

    if (parsed.data.addOns?.length) {
      await (db as any).bookingAddOn.createMany({
        data: parsed.data.addOns.map((a: { name: string; category: string; quantity: number; unitPrice: number; totalPrice: number; currency: string }) => ({
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

    if (booking.status === 'CONFIRMED' && booking.ticketId) {
      try {
        await updateTicketSoldCount(booking.ticketId);
      } catch (error) {
        console.error(`Failed to update sold count for new booking ${booking.id}:`, error);
      }
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (err) {
    console.error("[api/hub/bookings] POST:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
