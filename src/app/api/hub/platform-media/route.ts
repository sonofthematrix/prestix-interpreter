/**
 * GET /api/hub/platform-media — List platform media assets for admin/venue host selection
 *
 * Returns all PlatformMediaAsset records (blob URLs) so admins and venue hosts
 * can choose from pre-uploaded images when editing entities.
 *
 * Access: PLATFORM_ADMIN, VENUE_ADMIN, HOST, VENUE_STAFF
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_ROLES = ["PLATFORM_ADMIN", "VENUE_ADMIN", "HOST", "VENUE_STAFF"] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const db = createClient(user);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const assets = await db.platformMediaAsset.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: assets,
    });
  } catch (err) {
    console.error("[api/hub/platform-media] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list platform media" },
      { status: 500 }
    );
  }
}
