/**
 * GET /api/hub/venues/[id]/floor-plan?date=YYYY-MM-DD&time=HH:mm
 *
 * Returns venue floor plan data for a user-defined date and time:
 * - Venue cover image (floor plan background)
 * - All tables with floorPlanCoords and availability at the given date/time
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isTimeInBooking(
  slotMinutes: number,
  startStr: string,
  endStr: string
): boolean {
  const start = parseTimeToMinutes(startStr);
  let end = parseTimeToMinutes(endStr);
  if (end <= start) end += 24 * 60;
  if (slotMinutes < 12 * 60) slotMinutes += 24 * 60;
  return slotMinutes >= start && slotMinutes < end;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params;
    const dateParam = request.nextUrl.searchParams.get("date");
    const timeParam = request.nextUrl.searchParams.get("time");

    const today = new Date().toISOString().slice(0, 10);
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
    const time = timeParam && /^\d{1,2}:\d{2}$/.test(timeParam) ? timeParam : "20:00";

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const venue = await (db as any).venueProfile.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        name: true,
        slug: true,
        coverImage: true,
        galleryImages: true,
      },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, error: "Venue not found" },
        { status: 404 }
      );
    }

    const tables = await (db as any).venueTable.findMany({
      where: { venueId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        tableNumber: true,
        tableType: true,
        location: true,
        floorPlanCoords: true,
        minCapacity: true,
        maxCapacity: true,
        basePrice: true,
        currency: true,
      },
    });

    const tableIds = tables.map((t: { id: string }) => t.id);
    const slotMinutes = parseTimeToMinutes(time);

    // Only count CONFIRMED+ as booked — table not reserved until payment is settled
    const bookings = await (db as any).booking.findMany({
      where: {
        tableId: { in: tableIds },
        bookingDate: new Date(date),
        bookingType: "TABLE_RESERVATION",
        status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      },
      select: { tableId: true, startTime: true, endTime: true },
    });

    const bookedTableIds = new Set<string>();
    for (const b of bookings) {
      if (isTimeInBooking(slotMinutes, b.startTime, b.endTime ?? b.startTime)) {
        bookedTableIds.add(b.tableId);
      }
    }

    const floorPlanImage =
      venue.coverImage ??
      (Array.isArray(venue.galleryImages) && venue.galleryImages.length > 0
        ? venue.galleryImages[0]
        : null);

    const tablesWithAvailability = tables.map((t: any) => ({
      id: t.id,
      name: t.name,
      tableNumber: t.tableNumber,
      tableType: t.tableType,
      location: t.location,
      floorPlanCoords: t.floorPlanCoords,
      minCapacity: t.minCapacity,
      maxCapacity: t.maxCapacity,
      basePrice: t.basePrice,
      currency: t.currency,
      isBooked: bookedTableIds.has(t.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        venue: {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          floorPlanImage,
        },
        date,
        time,
        tables: tablesWithAvailability,
      },
    });
  } catch (err) {
    console.error("[api/hub/venues/[id]/floor-plan] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load floor plan" },
      { status: 500 }
    );
  }
}
