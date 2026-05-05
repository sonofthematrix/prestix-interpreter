/**
 * GET /api/hub/events/announcements — List VenueAnnouncement. Optional: ?venueId=
 * POST /api/hub/events/announcements — Create VenueAnnouncement. Body: venueId, title, content, ...
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

    const venueId = request.nextUrl.searchParams.get("venueId")?.trim() || undefined;
    const where = venueId ? ({ venueId } as any) : undefined;

    const announcements = await db.venueAnnouncement.findMany({
      where,
      include: { venue: { select: { id: true, name: true, slug: true } } },
      orderBy: { publishAt: "desc" } as any,
    });

    const list = (announcements as any[]).map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      imageUrl: a.imageUrl,
      linkUrl: a.linkUrl,
      publishAt: a.publishAt,
      expiresAt: a.expiresAt,
      isActive: a.isActive,
      venueId: a.venueId,
      venue: a.venue,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("[api/hub/events/announcements] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list announcements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const venueId = typeof body.venueId === "string" ? body.venueId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!venueId || !title || !content) {
      return NextResponse.json(
        { success: false, error: "venueId, title, and content required" },
        { status: 400 }
      );
    }
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const announcement = await db.venueAnnouncement.create({
      data: {
        venueId,
        title,
        content,
        imageUrl: body.imageUrl != null ? String(body.imageUrl).trim() || undefined : undefined,
        linkUrl: body.linkUrl != null ? String(body.linkUrl).trim() || undefined : undefined,
        publishAt: body.publishAt != null ? new Date(body.publishAt) : new Date(),
        expiresAt: body.expiresAt != null ? new Date(body.expiresAt) : undefined,
        isActive: body.isActive !== false,
      } as any,
    });
    return NextResponse.json({ success: true, data: announcement });
  } catch (err) {
    console.error("[api/hub/events/announcements] POST:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
