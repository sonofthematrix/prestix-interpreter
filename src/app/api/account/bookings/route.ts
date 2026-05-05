/**
 * GET /api/account/bookings — Current user's bookings.
 * Query: ?upcoming=1 (only future confirmed), ?status=, ?limit=
 *
 * Uses system client with explicit memberId filter to avoid ZenStack policy
 * edge cases (e.g. session user id vs User table id mismatch).
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

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

    const searchParams = request.nextUrl.searchParams;
    const upcoming = searchParams.get("upcoming") === "1";
    const status = searchParams.get("status")?.trim() || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 50);

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    }) as any;

    // Resolve memberId: prefer User lookup by email (canonical id) to handle
    // session/user id mismatch across auth providers (credentials, AppKit, social)
    let memberId = user.id;
    if (user.email) {
      const u = await db.user.findFirst({
        where: { email: { equals: user.email, mode: "insensitive" } },
        select: { id: true },
      });
      if (u) memberId = u.id;
    }

    const where: Record<string, unknown> = { memberId };
    if (status) where.status = status;
    if (upcoming) {
      where.status = { in: ["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"] };
      where.bookingDate = { gte: new Date(new Date().toISOString().slice(0, 10)) };
    }

    const bookings = await (db as any).booking.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true, slug: true } },
        table: { select: { id: true, name: true, tableType: true } },
        ticket: { select: { id: true, name: true } },
      },
      orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
      take: limit,
    });

    const list = bookings.map((b: any) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      bookingType: b.bookingType,
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime,
      guestCount: b.guestCount,
      totalAmount: b.totalAmount,
      currency: b.currency,
      status: b.status,
      venue: b.venue,
      table: b.table,
      ticket: b.ticket,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("[api/account/bookings] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list bookings" },
      { status: 500 }
    );
  }
}
