/**
 * GET /api/hub/venues/[id] — Get one VenueProfile with tables, tickets, announcements.
 * PATCH /api/hub/venues/[id] — Update VenueProfile. Body: partial fields.
 * DELETE /api/hub/venues/[id] — Delete VenueProfile (PLATFORM_ADMIN).
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedPatchKeys = [
  "name", "slug", "description", "venueType", "status", "address", "city", "country",
  "latitude", "longitude",
  "phone", "email", "website", "instagramHandle", "coverImage", "logoImage", "coverMedia",
  "currency", "operatingHours", "minAge", "galleryImages", "autoAcceptBookings", "requiresDeposit",
  "cancellationHours",
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

    const venue = await db.venueProfile.findUnique({
      where: { id } as any,
      include: {
        user: { select: { id: true, email: true, name: true } },
        tables: {
          orderBy: { sortOrder: "asc" } as any,
          select: {
            id: true,
            name: true,
            tableNumber: true,
            tableType: true,
            description: true,
            minCapacity: true,
            maxCapacity: true,
            basePrice: true,
            minimumSpend: true,
            currency: true,
            inclusions: true,
            availableAddOns: true,
            images: true,
            features: true,
            isActive: true,
          },
        },
        tickets: {
          orderBy: { sortOrder: "asc" } as any,
          select: {
            id: true,
            name: true,
            description: true,
            eventDate: true,
            price: true,
            currency: true,
            soldCount: true,
            totalInventory: true,
            inclusions: true,
            images: true,
            isActive: true,
          },
        },
        announcements: {
          orderBy: { publishAt: "desc" } as any,
          select: {
            id: true,
            title: true,
            content: true,
            imageUrl: true,
            publishAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, error: "Venue not found" },
        { status: 404 }
      );
    }

    const v = venue as any;
    return NextResponse.json({
      success: true,
      data: {
        ...v,
        user: v.user,
        tables: v.tables ?? [],
        tickets: v.tickets ?? [],
        announcements: v.announcements ?? [],
      },
    });
  } catch (err) {
    console.error("[api/hub/venues/[id]] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load venue" },
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
        if (key === "operatingHours" || key === "galleryImages" || key === "coverMedia") {
          data[key] = v;
        } else if (key === "latitude" || key === "longitude") {
          data[key] = v == null || v === "" ? null : Number(v);
        } else if (key === "minAge" || key === "cancellationHours") {
          data[key] = Number(v);
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
    const venue = await db.venueProfile.update({
      where: { id } as any,
      data: data as any,
    });
    return NextResponse.json({ success: true, data: venue });
  } catch (err) {
    console.error("[api/hub/venues/[id]] PATCH:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update venue" },
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
    await db.venueProfile.delete({ where: { id } as any });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/hub/venues/[id]] DELETE:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete venue" },
      { status: 500 }
    );
  }
}
