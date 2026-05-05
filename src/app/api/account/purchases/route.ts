/**
 * GET /api/account/purchases — Current user's booking payments.
 * Query: ?status=, ?limit=
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
    const status = searchParams.get("status")?.trim() || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10) || 30, 100);

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    }) as any;

    // Resolve memberId: prefer User lookup by email (canonical id) to handle
    // session/user id mismatch across auth providers
    let memberId = user.id;
    if (user.email) {
      const u = await db.user.findFirst({
        where: { email: { equals: user.email, mode: "insensitive" } },
        select: { id: true },
      });
      if (u) memberId = u.id;
    }

    const where: Record<string, unknown> = {
      booking: { memberId },
    };
    if (status) (where as any).status = status;

    const payments = await (db as any).bookingPayment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            bookingDate: true,
            startTime: true,
            totalAmount: true,
            currency: true,
            status: true,
            bookingType: true,
            venue: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
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
    console.error("[api/account/purchases] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list purchases" },
      { status: 500 }
    );
  }
}
