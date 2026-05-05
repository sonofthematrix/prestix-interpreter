/**
 * GET /api/hub/tables/[id] — Get VenueTable with venue info.
 * PATCH /api/hub/tables/[id] — Update VenueTable.
 * DELETE /api/hub/tables/[id] — Delete VenueTable.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedPatchKeys = [
  "name", "tableNumber", "tableType", "description", "minCapacity", "maxCapacity",
  "basePrice", "minimumSpend", "currency", "inclusions", "availableAddOns",
  "location", "floorPlanCoords", "images", "features", "isActive", "sortOrder",
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

    const table = await db.venueTable.findUnique({
      where: { id } as any,
      include: {
        venue: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: "Table not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: table,
    });
  } catch (err) {
    console.error("[api/hub/tables/[id]] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load table" },
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
        if (key === "inclusions" || key === "availableAddOns" || key === "images" || key === "features") {
          data[key] = Array.isArray(v) ? v : [];
        } else if (key === "floorPlanCoords") {
          data[key] = v && typeof v === "object" ? v : null;
        } else if (["minCapacity", "maxCapacity", "sortOrder"].includes(key)) {
          data[key] = Number(v);
        } else if (["basePrice", "minimumSpend"].includes(key)) {
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
    const table = await db.venueTable.update({
      where: { id } as any,
      data: data as any,
    });
    return NextResponse.json({ success: true, data: table });
  } catch (err) {
    console.error("[api/hub/tables/[id]] PATCH:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update table" },
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
    await db.venueTable.delete({ where: { id } as any });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/hub/tables/[id]] DELETE:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete table" },
      { status: 500 }
    );
  }
}
