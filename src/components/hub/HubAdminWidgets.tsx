"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { PurchasesCarousel } from "@/components/hub/PurchasesCarousel";

const PRESTIX_LOGO = "/prestix_logo_transparent.png";

const FALLBACK_IMAGES = {
  marketplace: PRESTIX_LOGO,
  venues: "/images/partners/missfish/venue/bar/missfish_nightclub_neon_sign.jpg",
  events: "/images/partners/missfish/events/parties/missfish_nightlife_dancing.jpg",
  promoters: "/images/partners/missfish/marketplace/promoters/missfish_dj_performance.jpg",
  bookings: "/images/partners/missfish/venue/food/missfish_fine_dining_experience.jpg",
  purchases: "/images/partners/missfish/venue/bar/missfish_bartender_pouring.jpg",
} as const;

const SECTIONS = [
  { href: "/hub/marketplace", title: "Marketplace", description: "Browse partner venues and listings.", key: "marketplace" as const },
  { href: "/hub/venues", title: "Venues", description: "Manage venue profiles, tables, and settings.", key: "venues" as const },
  { href: "/hub/events", title: "Events", description: "Events and announcements.", key: "events" as const },
  { href: "/hub/promoters", title: "Promoters", description: "Promoter profiles and performance.", key: "promoters" as const },
  { href: "/hub/bookings", title: "Bookings", description: "View and manage table and ticket bookings.", key: "bookings" as const },
  { href: "/hub/purchases", title: "Purchases", description: "Payment and purchase history.", key: "purchases" as const },
] as const;

interface OverviewData {
  marketplace?: { image?: string };
  latestPurchases?: { id: string; imageUrl: string; type: string }[];
  topPromoters?: { id: string; name: string; imageUrl: string }[];
}

/**
 * Platform admin: full hub navigation grid.
 * Marketplace uses dynamic image from latest venue/event/promoter.
 * Purchases shows 3-image carousel of latest 6 items (table/ticket/menu).
 */
export function HubAdminWidgets() {
  const [overview, setOverview] = useState<OverviewData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hub/overview", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled || !body.success) return;
        setOverview(body.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const marketplaceImage = PRESTIX_LOGO;
  const purchaseImages = overview?.latestPurchases?.map((p) => p.imageUrl).filter(Boolean) ?? [];
  const topPromoters = overview?.topPromoters ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SECTIONS.map(({ href, title, description, key }) => {
        const isMarketplace = key === "marketplace";
        const isPurchases = key === "purchases";
        const isPromoters = key === "promoters";
        const image = isMarketplace ? marketplaceImage : FALLBACK_IMAGES[key];

        return (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/50 overflow-hidden">
              <div className="relative h-32 w-full overflow-hidden bg-muted">
                {isPurchases && purchaseImages.length > 0 ? (
                  <PurchasesCarousel
                    images={purchaseImages.slice(0, 6)}
                    alt="Latest purchases"
                    className="absolute inset-0 h-full w-full"
                  />
                ) : isPromoters && topPromoters.length > 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 p-4">
                    {topPromoters.map((promoter) => (
                      <div
                        key={promoter.id}
                        className="relative flex-1 h-full min-w-0 rounded-lg overflow-hidden border border-border/50"
                      >
                        <Image
                          src={promoter.imageUrl}
                          alt={promoter.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 11vw"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Image
                    src={image}
                    alt={title}
                    fill
                    className={isMarketplace ? "object-contain transition-transform duration-200 hover:scale-105" : "object-cover transition-transform duration-200 hover:scale-105"}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                )}
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-accent">View →</span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
