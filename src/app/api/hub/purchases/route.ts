/**
 * GET /api/hub/purchases — List BookingPayment (purchases). Optional: ?status=
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const status = request.nextUrl.searchParams.get("status")?.trim() || undefined;
    const where = status ? ({ status } as any) : undefined;

    const payments = await (db as any).bookingPayment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            bookingDate: true,
            totalAmount: true,
            currency: true,
            venue: { select: { id: true, name: true, slug: true } },
            member: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const list = payments.map((p: any) => ({
      id: p.id,
      bookingId: p.bookingId,
      amount: p.amount,
      currency: p.currency,
      rail: p.rail,
      status: p.status,
      createdAt: p.createdAt,
      processedAt: p.processedAt,
      booking: p.booking,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("[api/hub/purchases] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list purchases" },
      { status: 500 }
    );
  }
}
