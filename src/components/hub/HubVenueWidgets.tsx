"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Venue admin/staff widgets: quick summary and links to tables, bookings, events.
 */
export function HubVenueWidgets() {
  const venueCards = [
    {
      href: "/hub/venues",
      title: "Venues",
      description: "Manage venue profiles, tables, and settings",
      image: "/images/partners/missfish/venue/bar/missfish_nightclub_neon_sign.jpg"
    },
    {
      href: "/hub/events",
      title: "Events & tickets",
      description: "Events and announcements",
      image: "/images/partners/missfish/events/parties/missfish_nightlife_dancing.jpg"
    },
    {
      href: "/hub/bookings",
      title: "Bookings",
      description: "Table and ticket bookings",
      image: "/images/partners/missfish/venue/food/missfish_fine_dining_experience.jpg"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venueCards.map(({ href, title, description, image }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/50 overflow-hidden">
              <div className="relative h-32 w-full overflow-hidden bg-muted">
                <Image
                  src={image}
                  alt={title}
                  fill
                  className="object-cover transition-transform duration-200 hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
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
        ))}
      </div>
    </div>
  );
}
