/**
 * GET /api/hub/promoters — List PromoterProfile.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const promoters = await (db as any).promoterProfile.findMany({
      include: { user: { select: { id: true, email: true, name: true, profileImageUrl: true } } },
      orderBy: { createdAt: "desc" },
    });

    const list = promoters.map((p: any) => {
      const profileImageUrl =
        p.user?.profileImageUrl || `https://i.pravatar.cc/300?u=${encodeURIComponent(p.id)}`;
      return {
        id: p.id,
        userId: p.userId,
        status: p.status,
        tier: p.tier,
        referralCode: p.referralCode,
        totalBookings: p.totalBookings,
        totalGrossRevenue: p.totalGrossRevenue,
        totalPromoterEarnings: p.totalPromoterEarnings,
        profileImageUrl,
        user: p.user ? { ...p.user, profileImageUrl } : p.user,
      };
    });

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("[api/hub/promoters] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list promoters" },
      { status: 500 }
    );
  }
}
