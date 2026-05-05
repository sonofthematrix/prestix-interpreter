/**
 * GET /api/hub/promoters/[id] — Get one PromoterProfile with user.
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
    const promoter = await (db as any).promoterProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    });
    if (!promoter) {
      return NextResponse.json(
        { success: false, error: "Promoter not found" },
        { status: 404 }
      );
    }
    // Compute profileImageUrl with pravatar fallback (matches list API for consistent image loading)
    const profileImageUrl =
      promoter.user?.profileImageUrl ||
      `https://i.pravatar.cc/300?u=${encodeURIComponent(promoter.id)}`;
    const data = {
      ...promoter,
      profileImageUrl,
      user: promoter.user
        ? { ...promoter.user, profileImageUrl: promoter.user.profileImageUrl || profileImageUrl }
        : promoter.user,
    };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[api/hub/promoters/[id]] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load promoter" },
      { status: 500 }
    );
  }
}
