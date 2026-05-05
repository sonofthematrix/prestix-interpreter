/**
 * GET /api/hub/events/announcements/[id] — Get one VenueAnnouncement.
 * PATCH /api/hub/events/announcements/[id] — Update VenueAnnouncement.
 * DELETE /api/hub/events/announcements/[id] — Delete VenueAnnouncement.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedPatchKeys = ["title", "content", "imageUrl", "linkUrl", "publishAt", "expiresAt", "isActive"] as const;

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
    const announcement = await db.venueAnnouncement.findUnique({
      where: { id } as any,
      include: { venue: { select: { id: true, name: true, slug: true } } },
    });
    if (!announcement) {
      return NextResponse.json(
        { success: false, error: "Announcement not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: announcement });
  } catch (err) {
    console.error("[api/hub/events/announcements/[id]] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load announcement" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const data: Record<string, unknown> = {};
    for (const key of allowedPatchKeys) {
      if (body[key] !== undefined) {
        const v = body[key];
        if (["publishAt", "expiresAt"].includes(key)) {
          data[key] = v != null ? new Date(v) : null;
        } else if (key === "isActive") {
          data[key] = Boolean(v);
        } else if (typeof v === "string") {
          data[key] = v.trim();
        } else {
          data[key] = v;
        }
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }
    const announcement = await db.venueAnnouncement.update({
      where: { id } as any,
      data: data as any,
    });
    return NextResponse.json({ success: true, data: announcement });
  } catch (err) {
    console.error("[api/hub/events/announcements/[id]] PATCH:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    await db.venueAnnouncement.delete({ where: { id } as any });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/hub/events/announcements/[id]] DELETE:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
