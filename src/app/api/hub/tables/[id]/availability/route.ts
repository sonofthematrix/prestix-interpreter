/**
 * GET /api/hub/tables/[id]/availability?date=YYYY-MM-DD
 *
 * Returns hourly availability for a table on a given date:
 * - Venue operating hours for that calendar date (from operatingHours or VenueAvailability)
 * - Existing table bookings (startTime/endTime)
 * - Hourly slots: available vs booked
 * - Min booking duration by table tier (STANDARD=1hr, PREMIUM/ULTRA_VIP/CABANA/BOOTH=2hr)
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type OperatingHoursEntry = { open: string; close: string } | null;

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Get venue open/close for a date. Returns [openMinutes, closeMinutes] (0–1440). Close may be >1440 for overnight. */
function getHoursForDate(
  operatingHours: Record<string, OperatingHoursEntry>,
  dateStr: string
): { openMinutes: number; closeMinutes: number } | null {
  const d = new Date(dateStr + "T12:00:00");
  const dayName = DAY_NAMES[d.getDay()];
  const entry = operatingHours?.[dayName];
  if (!entry || typeof entry !== "object" || !entry.open || !entry.close) {
    return null;
  }
  let openMinutes = parseTimeToMinutes(entry.open);
  let closeMinutes = parseTimeToMinutes(entry.close);
  if (closeMinutes <= openMinutes) {
    closeMinutes += 24 * 60; // overnight
  }
  return { openMinutes, closeMinutes };
}

/** Generate hourly slots from open to close. Returns ["18:00","19:00",...,"01:00"] */
function getHourlySlots(openMinutes: number, closeMinutes: number): string[] {
  const slots: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += 60) {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

/** Check if a time string (HH:mm) falls within a booking range. Handles overnight. */
function isTimeInBooking(
  slotMinutes: number,
  startStr: string,
  endStr: string
): boolean {
  const start = parseTimeToMinutes(startStr);
  let end = parseTimeToMinutes(endStr);
  if (end <= start) end += 24 * 60;
  if (slotMinutes < 12 * 60) slotMinutes += 24 * 60; // treat early morning as next day
  return slotMinutes >= start && slotMinutes < end;
}

/** Min booking duration in hours by table type. Top tier = 2hr, basic = 1hr. */
function getMinBookingHours(tableType: string): number {
  const topTier = ["PREMIUM", "ULTRA_VIP", "CABANA", "BOOTH"];
  return topTier.includes(tableType) ? 2 : 1;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tableId } = await params;
    const dateParam = request.nextUrl.searchParams.get("date");
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { success: false, error: "Query param date (YYYY-MM-DD) required" },
        { status: 400 }
      );
    }

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const table = await db.venueTable.findUnique({
      where: { id: tableId } as any,
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            operatingHours: true,
          },
        },
      },
    });

    if (!table || !table.venue) {
      return NextResponse.json(
        { success: false, error: "Table not found" },
        { status: 404 }
      );
    }

    const venue = table.venue as { operatingHours?: Record<string, OperatingHoursEntry> };
    const operatingHours = (venue.operatingHours ?? {}) as Record<string, OperatingHoursEntry>;

    // Check VenueAvailability for date-specific override
    const venueAvailability = await (db as any).venueAvailability.findFirst({
      where: {
        venueId: table.venueId,
        date: new Date(dateParam),
      },
    });

    let openMinutes: number;
    let closeMinutes: number;

    if (venueAvailability?.openTime && venueAvailability?.closeTime && venueAvailability?.isOpen) {
      openMinutes = parseTimeToMinutes(venueAvailability.openTime);
      closeMinutes = parseTimeToMinutes(venueAvailability.closeTime);
      if (closeMinutes <= openMinutes) closeMinutes += 24 * 60;
    } else {
      const hours = getHoursForDate(operatingHours, dateParam);
      if (!hours) {
        return NextResponse.json({
          success: true,
          data: {
            date: dateParam,
            openTime: null,
            closeTime: null,
            slots: [],
            minBookingHours: getMinBookingHours((table as any).tableType ?? "STANDARD"),
            message: "Venue closed on this date",
          },
        });
      }
      openMinutes = hours.openMinutes;
      closeMinutes = hours.closeMinutes;
    }

    const slots = getHourlySlots(openMinutes, closeMinutes);
    const tableType = (table as any).tableType ?? "STANDARD";
    const minBookingHours = getMinBookingHours(tableType);

    // Get all tables of this tier in the venue (for tier-level counts)
    const tierTables = await (db as any).venueTable.findMany({
      where: {
        venueId: table.venueId,
        tableType,
        isActive: true,
      },
      select: { id: true },
    });
    const tierTableIds = tierTables.map((t: { id: string }) => t.id);
    const totalTables = tierTableIds.length;

    // Fetch all bookings for tables of this tier on this date.
    // Only count CONFIRMED+ bookings as "booked" — table is not reserved until payment is settled.
    const allTierBookings = await (db as any).booking.findMany({
      where: {
        tableId: { in: tierTableIds },
        bookingDate: new Date(dateParam),
        bookingType: "TABLE_RESERVATION",
        status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      },
      select: { tableId: true, startTime: true, endTime: true },
    });

    // Per slot: count how many tier tables are booked
    const slotStatus = slots.map((slot) => {
      const [h, m] = slot.split(":").map(Number);
      let slotMinutes = (h ?? 0) * 60 + (m ?? 0);
      if (slotMinutes < 12 * 60 && closeMinutes > 24 * 60) {
        slotMinutes += 24 * 60; // early morning = next day
      }
      const bookedTableIds = new Set<string>();
      for (const b of allTierBookings) {
        if (isTimeInBooking(slotMinutes, b.startTime, b.endTime ?? b.startTime)) {
          bookedTableIds.add(b.tableId);
        }
      }
      const bookedCount = bookedTableIds.size;
      const availableCount = Math.max(0, totalTables - bookedCount);
      const thisTableBooked = bookedTableIds.has(tableId);
      return {
        slot,
        available: !thisTableBooked,
        totalTables,
        bookedCount,
        availableCount,
      };
    });

    // For each slot, check if we have enough consecutive available hours for min duration (for this table)
    const slotAvailability = slotStatus.map((item, idx) => {
      if (item.available) {
        let consecutive = 0;
        for (let i = idx; i < Math.min(idx + minBookingHours, slotStatus.length); i++) {
          if (slotStatus[i].available) consecutive++;
          else break;
        }
        const canStart = consecutive >= minBookingHours;
        return { ...item, canStart };
      }
      return { ...item, canStart: false };
    });

    const formatSlot = (m: number) => {
      const h = Math.floor(m / 60) % 24;
      const min = m % 60;
      return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    };

    return NextResponse.json({
      success: true,
      data: {
        date: dateParam,
        openTime: formatSlot(openMinutes),
        closeTime: formatSlot(closeMinutes % (24 * 60)),
        slots: slotAvailability,
        minBookingHours,
        tableType: (table as any).tableType,
        tableName: (table as any).name,
        totalTierTables: totalTables,
      },
    });
  } catch (err) {
    console.error("[api/hub/tables/[id]/availability] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load availability" },
      { status: 500 }
    );
  }
}
