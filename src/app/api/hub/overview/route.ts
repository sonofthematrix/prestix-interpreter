/**
 * GET /api/hub/overview — Hub overview data for dynamic card images
 *
 * Returns:
 * - marketplace: { image } — from latest venue, latest event, or top promoter
 * - latestPurchases: array of 6 items with { id, imageUrl, type } for carousel
 * - topPromoters: top 3 revenue leaders with { id, name, imageUrl } for leaderboard
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fallback cocktail/bar images for menu-item or unknown purchase types
const COCKTAIL_FALLBACKS = [
  "/images/partners/missfish/venue/bar/missfish_bartender_pouring.jpg",
  "/images/partners/missfish/venue/bar/missfish_nightclub_neon_sign.jpg",
  "/images/partners/missfish/venue/food/missfish_fine_dining_experience.jpg",
  "/images/partners/missfish/venue/food/missfish_japanese_fine_dining_spread.jpg",
  "/images/partners/missfish/venue/food/missfish_gourmet_nigiri_platter_condiments.jpg",
  "/images/partners/missfish/venue/food/missfish_sushi_garnish_preparation.jpg",
];

// Fallback promoter image when no promoter has image
const PROMOTER_FALLBACK = "/images/partners/missfish/marketplace/promoters/missfish_dj_performance.jpg";

// Placeholder profile images for promoters without profileImageUrl (free, deterministic per promoter)
function getPromoterPlaceholderImage(promoterId: string): string {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(promoterId)}`;
}

export async function GET(request: NextRequest) {
  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    }) as any;

    // Latest venue (by updatedAt) with cover/logo
    const latestVenue = await db.venueProfile.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: { coverImage: true, logoImage: true },
    });

    // Latest event with image
    const latestEvent = await db.venueEvent.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { startDateTime: "desc" },
      select: { imageUrl: true },
    });

    // Top 3 revenue leader promoters (by totalGrossRevenue) with user profile images
    const topPromoters = await db.promoterProfile.findMany({
      where: { status: "ACTIVE" },
      orderBy: { totalGrossRevenue: "desc" },
      take: 3,
      select: {
        id: true,
        referralCode: true,
        totalGrossRevenue: true,
        user: { select: { name: true, profileImageUrl: true } },
      },
    });

    const topPromotersWithImages = topPromoters.map((p: any) => ({
      id: p.id,
      name: p.user?.name || `Promoter ${p.referralCode}`,
      imageUrl: p.user?.profileImageUrl || getPromoterPlaceholderImage(p.id),
    }));

    // Top promoter by totalBookings (for marketplace fallback)
    const topPromoter = await db.promoterProfile.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { totalBookings: "desc" },
      select: { id: true },
    });

    // Marketplace image: prefer venue cover > event image > promoter fallback
    const marketplaceImage =
      latestVenue?.coverImage ||
      latestVenue?.logoImage ||
      latestEvent?.imageUrl ||
      (topPromoter ? PROMOTER_FALLBACK : PROMOTER_FALLBACK);

    // Latest 6 purchases with table/ticket/venue images
    const payments = await db.bookingPayment.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            bookingType: true,
            tableId: true,
            ticketId: true,
            table: { select: { images: true } },
            ticket: { select: { images: true } },
            venue: { select: { coverImage: true, logoImage: true, galleryImages: true } },
          },
        },
      },
    });

    const latestPurchases = payments.map((p: any, idx: number) => {
      const b = p.booking;
      let imageUrl: string | null = null;
      let type = "unknown";

      if (b?.bookingType === "TABLE_RESERVATION" && b?.table) {
        const imgs = Array.isArray(b.table.images) ? b.table.images.filter(Boolean) : [];
        imageUrl = imgs[0] || null;
        type = "table";
      } else if (b?.bookingType === "EVENT_TICKET" && b?.ticket) {
        const imgs = Array.isArray(b.ticket.images) ? b.ticket.images.filter(Boolean) : [];
        imageUrl = imgs[0] || null;
        type = "ticket";
      }

      if (!imageUrl && b?.venue) {
        imageUrl = b.venue.coverImage || b.venue.logoImage || null;
        if (!imageUrl && Array.isArray(b.venue.galleryImages) && b.venue.galleryImages.length > 0) {
          imageUrl = b.venue.galleryImages[0] || null;
        }
      }

      if (!imageUrl) {
        imageUrl = COCKTAIL_FALLBACKS[idx % COCKTAIL_FALLBACKS.length];
        type = "menu";
      }

      return {
        id: p.id,
        imageUrl,
        type,
        bookingNumber: b?.bookingNumber,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        marketplace: { image: marketplaceImage },
        latestPurchases,
        topPromoters: topPromotersWithImages,
      },
    });
  } catch (err) {
    console.error("[api/hub/overview] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load hub overview" },
      { status: 500 }
    );
  }
}
