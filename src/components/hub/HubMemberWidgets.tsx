"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getVenueTableImages, getVenueTicketImages } from "@/lib/entity-images";

interface VenueSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venueType: string;
  status: string;
  address: string;
  city: string;
  country: string;
  coverImage: string | null;
  logoImage: string | null;
  currency: string;
  tableCount: number;
  ticketCount: number;
  announcementCount: number;
}

/**
 * Member view: browse available venues and their offerings.
 */
export function HubMemberWidgets() {
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/hub/venues?status=ACTIVE", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && Array.isArray(body.data)) {
          const activeVenues = body.data.filter((v: VenueSummary) => v.status === "ACTIVE");
          setVenues(activeVenues);

          // If there's only one venue, redirect to it automatically
          if (activeVenues.length === 1) {
            router.push(`/hub/venues/${activeVenues[0].id}`);
          }
        } else {
          setError(body.error || "Failed to load venues");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading venues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Unable to Load Venues</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No Venues Available</CardTitle>
            <CardDescription>No active venues are currently available for browsing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">
              <Link href="/hub/promoters">Become a Promoter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we get here, there are multiple venues to display
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Available Venues</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Browse venues, view their facilities, and book tables for upcoming events.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48 w-full overflow-hidden bg-muted">
              <Image
                src={venue.coverImage || venue.logoImage || "/images/prestix_logo_transparent.png"}
                alt={venue.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 text-xs font-medium bg-white/90 text-black rounded-full">
                  {venue.venueType.replace(/_/g, " ")}
                </span>
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{venue.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {venue.description || `${venue.city}, ${venue.country}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-foreground">{venue.tableCount}</div>
                  <div className="text-xs text-muted-foreground">Tables</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-foreground">{venue.ticketCount}</div>
                  <div className="text-xs text-muted-foreground">Events</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-foreground">{venue.announcementCount}</div>
                  <div className="text-xs text-muted-foreground">Updates</div>
                </div>
              </div>
              <Link href={`/hub/venues/${venue.id}`}>
                <Button className="w-full">
                  View Venue Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Become a Promoter</CardTitle>
          <CardDescription>
            Apply to become a promoter and earn commission on bookings from your audience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm">
            <Link href="/hub/promoters">Promoter Hub</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
