/**
 * POST /api/hub/venues/[id]/tables — Create VenueTable for a venue.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params;
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const basePrice = Number(body.basePrice);
    if (!name || Number.isNaN(basePrice) || basePrice < 0) {
      return NextResponse.json(
        { success: false, error: "name and basePrice (number >= 0) required" },
        { status: 400 }
      );
    }
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const table = await db.venueTable.create({
      data: {
        venueId,
        name,
        tableNumber: body.tableNumber != null ? String(body.tableNumber).trim() : undefined,
        tableType: (body.tableType as "STANDARD" | "PREMIUM" | "ULTRA_VIP" | "CABANA" | "BOOTH") ?? "STANDARD",
        description: body.description != null ? String(body.description).trim() || undefined : undefined,
        minCapacity: typeof body.minCapacity === "number" ? body.minCapacity : 2,
        maxCapacity: typeof body.maxCapacity === "number" ? body.maxCapacity : 10,
        basePrice,
        minimumSpend: body.minimumSpend != null ? Number(body.minimumSpend) : undefined,
        currency: body.currency ?? "AUD",
        inclusions: Array.isArray(body.inclusions) ? body.inclusions : [],
        availableAddOns: Array.isArray(body.availableAddOns) ? body.availableAddOns : [],
        location: body.location != null ? String(body.location).trim() : undefined,
        images: Array.isArray(body.images) ? body.images : [],
        features: Array.isArray(body.features) ? body.features : [],
        isActive: body.isActive !== false,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      } as any,
    });
    return NextResponse.json({ success: true, data: table });
  } catch (err) {
    console.error("[api/hub/venues/[id]/tables] POST:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create table" },
      { status: 500 }
    );
  }
}
