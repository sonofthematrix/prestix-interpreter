/**
 * GET /api/hub/venues — List VenueProfile. Optional: ?slug=, ?city=, ?status=
 * POST /api/hub/venues — Create VenueProfile (PLATFORM_ADMIN). Body: userId, name, slug, address, ...
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const venueCreateSchema = {
  userId: (v: unknown) => typeof v === "string" && v.length > 0,
  name: (v: unknown) => typeof v === "string" && v.trim().length > 0,
  slug: (v: unknown) => typeof v === "string" && /^[a-z0-9-]+$/.test(String(v).trim()),
  address: (v: unknown) => typeof v === "string" && v.trim().length > 0,
  venueType: (v: unknown) => ["NIGHTCLUB", "BAR", "LOUNGE", "BEACH_CLUB", "ROOFTOP", "DAY_CLUB"].includes(String(v)),
  city: (v: unknown) => v == null || typeof v === "string",
  country: (v: unknown) => v == null || typeof v === "string",
  description: (v: unknown) => v == null || typeof v === "string",
  status: (v: unknown) => v == null || ["PENDING_REVIEW", "ACTIVE", "SUSPENDED", "CLOSED"].includes(String(v)),
  phone: (v: unknown) => v == null || typeof v === "string",
  email: (v: unknown) => v == null || typeof v === "string",
  website: (v: unknown) => v == null || typeof v === "string",
  currency: (v: unknown) => v == null || typeof v === "string",
};

export async function GET(request: NextRequest) {
  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim() || undefined;
    const city = searchParams.get("city")?.trim() || undefined;
    const status = searchParams.get("status")?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (slug) where.slug = slug;
    if (city) where.city = city;
    if (status) where.status = status;

    const venues = await db.venueProfile.findMany({
      where: Object.keys(where).length ? (where as any) : undefined,
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { tables: true, tickets: true, announcements: true } },
      },
      orderBy: { name: "asc" } as any,
    });

    const list = venues.map((v: any) => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      description: v.description,
      venueType: v.venueType,
      status: v.status,
      address: v.address,
      city: v.city,
      country: v.country,
      phone: v.phone,
      email: v.email,
      website: v.website,
      coverImage: v.coverImage,
      logoImage: v.logoImage,
      currency: v.currency,
      tableCount: v._count?.tables ?? 0,
      ticketCount: v._count?.tickets ?? 0,
      announcementCount: v._count?.announcements ?? 0,
      owner: v.user ? { id: v.user.id, email: v.user.email, name: v.user.name } : null,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("[api/hub/venues] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to list venues" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!venueCreateSchema.userId(body.userId) || !venueCreateSchema.name(body.name) || !venueCreateSchema.slug(body.slug) || !venueCreateSchema.address(body.address) || !venueCreateSchema.venueType(body.venueType)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid: userId, name, slug, address, venueType" },
        { status: 400 }
      );
    }
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });
    const venue = await db.venueProfile.create({
      data: {
        userId: body.userId,
        name: String(body.name).trim(),
        slug: String(body.slug).trim(),
        address: String(body.address).trim(),
        venueType: body.venueType,
        city: body.city != null ? String(body.city).trim() : "Bali",
        country: body.country != null ? String(body.country).trim() : "Indonesia",
        description: body.description != null ? String(body.description).trim() || undefined : undefined,
        status: (body.status as "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "CLOSED") ?? "PENDING_REVIEW",
        phone: body.phone != null ? String(body.phone).trim() || undefined : undefined,
        email: body.email != null ? String(body.email).trim() || undefined : undefined,
        website: body.website != null ? String(body.website).trim() || undefined : undefined,
        currency: body.currency ?? "AUD",
      } as any,
    });
    return NextResponse.json({ success: true, data: venue });
  } catch (err) {
    console.error("[api/hub/venues] POST:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create venue" },
      { status: 500 }
    );
  }
}
