/**
 * GET /api/hub/promoters/[id]/metrics — Performance metrics by period
 * Query: ?period=week|biweekly|month|quarter
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Period = "week" | "biweekly" | "month" | "quarter";

function getDateRange(period: Period): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  switch (period) {
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "biweekly":
      start.setDate(start.getDate() - 14);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }
  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const period = (request.nextUrl.searchParams.get("period") || "month") as Period;
    const validPeriods: Period[] = ["week", "biweekly", "month", "quarter"];
    const p = validPeriods.includes(period) ? period : "month";

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const promoter = await (db as any).promoterProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!promoter) {
      return NextResponse.json(
        { success: false, error: "Promoter not found" },
        { status: 404 }
      );
    }

    const { start, end } = getDateRange(p);

    // Aggregate from PromoterDailyMetrics if available
    const dailyMetrics = await (db as any).promoterDailyMetrics.findMany({
      where: {
        promoterId: id,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
    });

    let bookings = 0;
    let grossRevenue = 0;
    let promoterEarnings = 0;
    let conversionRate: number | null = null;

    if (dailyMetrics.length > 0) {
      for (const m of dailyMetrics) {
        bookings += Number(m.newBookings ?? 0);
        grossRevenue += Number(m.commissionPool ?? 0) * 10; // commissionPool is 10% of gross
        promoterEarnings += Number(m.promoterEarned ?? 0);
      }
      const totalClicks = dailyMetrics.reduce((s: number, m: any) => s + Number(m.linkClicks ?? 0), 0);
      const totalRegs = dailyMetrics.reduce((s: number, m: any) => s + Number(m.newRegistrations ?? 0), 0);
      if (totalClicks > 0) conversionRate = totalRegs / totalClicks;
    } else {
      // Fallback: aggregate from Booking
      const bookingList = await (db as any).booking.findMany({
        where: {
          promoterId: id,
          createdAt: { gte: start, lte: end },
          status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        },
        select: {
          totalAmount: true,
          promoterEarning: true,
        },
      });
      bookings = bookingList.length;
      for (const b of bookingList) {
        grossRevenue += Number(b.totalAmount ?? 0);
        promoterEarnings += Number(b.promoterEarning ?? 0);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        period: p,
        start: start.toISOString(),
        end: end.toISOString(),
        bookings,
        grossRevenue,
        promoterEarnings,
        conversionRate,
      },
    });
  } catch (err) {
    console.error("[api/hub/promoters/[id]/metrics] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load metrics" },
      { status: 500 }
    );
  }
}
