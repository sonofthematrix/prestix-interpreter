/**
 * GET /api/hub/purchases/[id] — Get one BookingPayment with booking (venue, member).
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    const payment = await (db as any).bookingPayment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            venue: { select: { id: true, name: true, slug: true } },
            member: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Purchase not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: payment });
  } catch (err) {
    console.error("[api/hub/purchases/[id]] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load purchase" },
      { status: 500 }
    );
  }
}
