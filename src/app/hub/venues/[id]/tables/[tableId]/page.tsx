"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getVenueTableImages } from "@/lib/entity-images";
import { getFeatureIcon } from "@/lib/table-feature-icons";
import { TableAvailabilityView } from "@/components/hub/TableAvailabilityView";
import { VenueFloorPlanView } from "@/components/hub/VenueFloorPlanView";
import { Sparkles, Calendar, Map } from "lucide-react";

interface TableDetail {
  id: string;
  name: string;
  tableNumber: string | null;
  tableType: string;
  description: string | null;
  minCapacity: number;
  maxCapacity: number;
  basePrice: string;
  minimumSpend: string | null;
  currency: string;
  inclusions: string[];
  availableAddOns: any[];
  location: string | null;
  images: string[];
  features: string[];
  isActive: boolean;
  venue: { id: string; name: string; slug: string };
}

export default function HubVenueTableDetailPage() {
  const params = useParams();
  const venueId = params?.id as string;
  const tableId = params?.tableId as string;
  const [table, setTable] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availabilityView, setAvailabilityView] = useState<"slots" | "floorPlan">("slots");
  const user = useAppSelector((state) => state.auth.user);
  const userRole = (user as { role?: string })?.role ?? null;
  const isMember = !userRole || userRole === "MEMBER" || userRole === "HOST";

  useEffect(() => {
    if (!tableId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/hub/tables/${tableId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          setTable(body.data);
        } else {
          setError(body.error || "Table not found");
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
  }, [tableId]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !table) {
    return (
      <div>
        <p className="text-red-500">{error ?? "Not found"}</p>
        <Button variant="outline" className="mt-4">
          <Link href={`/hub/venues/${venueId}`}>Back to Venue</Link>
        </Button>
      </div>
    );
  }

  const imageInfo = getVenueTableImages(table);

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">{table.name}</h1>
          <Badge variant={table.tableType === "PREMIUM" ? "default" : "secondary"}>
            {table.tableType}
          </Badge>
          {table.tableNumber && (
            <Badge variant="outline">#{table.tableNumber}</Badge>
          )}
          <span className="text-muted-foreground">
            {table.venue.name} · {table.currency} {table.basePrice}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm">
            <Link href={`/hub/venues/${venueId}`}>Back</Link>
          </Button>
          {!isMember && (
            <Button size="sm">
              <Link href={`/hub/venues/${venueId}/tables/${table.id}/edit`}>Edit</Link>
            </Button>
          )}
          {isMember && table.isActive && (
            <Button size="sm">
              <Link href={`/hub/bookings/new?tableId=${table.id}&venueId=${venueId}`}>
                Book Table
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main content: details + availability side-by-side for quick scan */}
      <div className="grid gap-4 lg:grid-cols-[1fr,minmax(320px,420px)]">
        {/* Left: image + consolidated details */}
        <div className="space-y-4">
          {imageInfo.hasImages && (
            <div className="relative h-40 overflow-hidden rounded-lg bg-muted">
              <img
                src={imageInfo.posterImage}
                alt={table.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <Card className="overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
                <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                  <span className="text-muted-foreground">Capacity</span>
                  <span>{table.minCapacity}-{table.maxCapacity} guests</span>
                </div>
                <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                  <span className="text-muted-foreground">Base Price</span>
                  <span>{table.currency} {table.basePrice}</span>
                </div>
                {table.minimumSpend && (
                  <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                    <span className="text-muted-foreground">Min Spend</span>
                    <span>{table.currency} {table.minimumSpend}</span>
                  </div>
                )}
                {table.location && (
                  <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                    <span className="text-muted-foreground">Location</span>
                    <span>{table.location}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={table.isActive ? "default" : "secondary"} className="w-fit">
                    {table.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {table.description && (
                <p className="mt-2 border-t pt-2 text-sm text-foreground">{table.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Inclusions + Features + Add-ons in one compact card */}
          {(table.inclusions.length > 0 || table.features.length > 0 || table.availableAddOns.length > 0) && (
          <Card className="overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Inclusions & Add-ons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {table.inclusions.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Included</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {table.inclusions.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {table.features.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Features</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {table.features.map((feature, index) => {
                      const Icon = getFeatureIcon(feature) ?? Sparkles;
                      return (
                        <Badge key={index} variant="outline" className="flex w-fit items-center gap-1 py-0.5 text-xs">
                          <Icon className="h-3 w-3 shrink-0" aria-hidden />
                          {feature}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              {table.availableAddOns.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add-ons</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {table.availableAddOns.map((addon, index) => (
                      <span key={index} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                        <span className="font-medium">{addon.name}</span>
                        <span className="text-muted-foreground">{table.currency} {addon.price}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Right: availability - toggle between time slots and floor plan */}
        <div className={cn(
            "space-y-3",
            isMember && table.isActive && "lg:sticky lg:top-4 lg:self-start"
          )}>
            <div
              className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5"
              role="tablist"
              aria-label="Availability view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={availabilityView === "slots"}
                onClick={() => setAvailabilityView("slots")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  availabilityView === "slots"
                    ? "bg-accent/15 text-accent border border-accent/60 shadow-prestix"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
                title="Time slots"
              >
                <Calendar className="h-4 w-4" aria-hidden />
                Time slots
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={availabilityView === "floorPlan"}
                onClick={() => setAvailabilityView("floorPlan")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  availabilityView === "floorPlan"
                    ? "bg-accent/15 text-accent border border-accent/60 shadow-prestix"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
                title="Floor plan"
              >
                <Map className="h-4 w-4" aria-hidden />
                Floor plan
              </button>
            </div>
            {availabilityView === "slots" ? (
              <TableAvailabilityView
                tableId={table.id}
                venueId={venueId}
                tableName={table.name}
                tableType={table.tableType}
                isMember={isMember && table.isActive}
                compact
              />
            ) : (
              <VenueFloorPlanView venueId={venueId} currentTableId={table.id} />
            )}
          </div>
      </div>
    </div>
  );
}