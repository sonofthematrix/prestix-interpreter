/**
 * GET /api/hub/events/tickets — List VenueTicket. Optional: ?venueId=
 * POST /api/hub/events/tickets — Create VenueTicket. Body: venueId, name, price, ...
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request as any);
    const isAuthorized = user && (user.role === 'PLATFORM_ADMIN' || user.role === 'VENUE_ADMIN' || user.role === 'PROMOTER');

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const venueId = request.nextUrl.searchParams.get("venueId")?.trim() || undefined;
    const where = venueId ? ({ venueId } as any) : undefined;

    const tickets = await db.venueTicket.findMany({
      where,
      include: { venue: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ venueId: "asc" }, { sortOrder: "asc" }, { eventDate: "asc" }] as any,
    });

    const list = await Promise.all((tickets as any[]).map(async (t) => {
      const images = Array.isArray(t.images) ? (t.images as string[]) : [];
      const posterImage = images[0] ?? null;

      // Include booking summary for authorized users
      let bookingSummary = null;
      if (isAuthorized) {
        const bookingStats = await (db as any).booking.aggregate({
          where: { ticketId: t.id },
          _count: { id: true },
          _sum: { totalAmount: true }
        });

        const paidBookings = await (db as any).booking.count({
          where: {
            ticketId: t.id,
            payment: { status: 'COMPLETED' }
          }
        });

        bookingSummary = {
          totalBookings: bookingStats._count.id,
          paidBookings,
          totalRevenue: bookingStats._sum.totalAmount || 0
        };
      }

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        eventDate: t.eventDate,
        price: t.price,
        currency: t.currency,
        totalInventory: t.totalInventory,
        soldCount: t.soldCount,
        isActive: t.isActive,
        venueId: t.venueId,
        venue: t.venue,
        images,
        posterImage,
        bookingSummary, // Only included for authorized users
      };
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("[api/hub/events/tickets] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const venueId = typeof body.venueId === "string" ? body.venueId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const price = Number(body.price);
    if (!venueId || !name || Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { success: false, error: "venueId, name, and price (number >= 0) required" },
        { status: 400 }
      );
    }
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const ticket = await db.venueTicket.create({
      data: {
        venueId,
        name,
        description: body.description != null ? String(body.description).trim() || undefined : undefined,
        eventDate: body.eventDate != null ? new Date(body.eventDate) : undefined,
        isRecurring: Boolean(body.isRecurring),
        recurringDays: Array.isArray(body.recurringDays) ? body.recurringDays : [],
        price,
        currency: body.currency ?? "AUD",
        originalPrice: body.originalPrice != null ? Number(body.originalPrice) : undefined,
        totalInventory: body.totalInventory != null ? Number(body.totalInventory) : undefined,
        inclusions: Array.isArray(body.inclusions) ? body.inclusions : [],
        images: Array.isArray(body.images) ? body.images : [],
        validFrom: body.validFrom != null ? new Date(body.validFrom) : undefined,
        validUntil: body.validUntil != null ? new Date(body.validUntil) : undefined,
        isActive: body.isActive !== false,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      } as any,
    });
    return NextResponse.json({ success: true, data: ticket });
  } catch (err) {
    console.error("[api/hub/events/tickets] POST:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
