/**
 * GET /api/hub/events/tickets/[id] — Get one VenueTicket.
 * PATCH /api/hub/events/tickets/[id] — Update VenueTicket.
 * DELETE /api/hub/events/tickets/[id] — Delete VenueTicket.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedPatchKeys = [
  "name", "description", "eventDate", "isRecurring", "recurringDays", "price", "currency",
  "originalPrice", "totalInventory", "inclusions", "images", "validFrom", "validUntil",
  "isActive", "sortOrder",
] as const;

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
    const ticket = await db.venueTicket.findUnique({
      where: { id } as any,
      include: { venue: { select: { id: true, name: true, slug: true, userId: true } } },
    });
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: ticket });
  } catch (err) {
    console.error("[api/hub/events/tickets/[id]] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load ticket" },
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
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const existingTicket = await db.venueTicket.findUnique({
      where: { id } as any,
      include: { venue: { select: { userId: true } } },
    });
    if (!existingTicket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }
    const canEdit =
      user.role === "PLATFORM_ADMIN" ||
      user.role === "VENUE_ADMIN" ||
      user.role === "VENUE_STAFF" ||
      existingTicket.venue.userId === user.id;
    if (!canEdit) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const key of allowedPatchKeys) {
      if (body[key] !== undefined) {
        const v = body[key];
        if (key === "recurringDays" || key === "inclusions" || key === "images") {
          data[key] = Array.isArray(v) ? v : [];
        } else if (["eventDate", "validFrom", "validUntil"].includes(key)) {
          data[key] = v != null ? new Date(v) : null;
        } else if (["price", "originalPrice", "totalInventory", "sortOrder"].includes(key)) {
          data[key] = Number(v);
        } else if (key === "isRecurring" || key === "isActive") {
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
    const ticket = await db.venueTicket.update({
      where: { id } as any,
      data: data as any,
    });
    return NextResponse.json({ success: true, data: ticket });
  } catch (err) {
    console.error("[api/hub/events/tickets/[id]] PATCH:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update ticket" },
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
    await db.venueTicket.delete({ where: { id } as any });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/hub/events/tickets/[id]] DELETE:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
