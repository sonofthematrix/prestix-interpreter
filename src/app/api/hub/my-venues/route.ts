/**
 * GET /api/hub/my-venues — Venues owned by the current user (for Request Involvement flow)
 */

import { createClient } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createClient(user);

    const venues = await (db as any).venueProfile.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: venues });
  } catch (err) {
    console.error("[api/hub/my-venues] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load venues" },
      { status: 500 }
    );
  }
}
