"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CachedImage } from "@/components/common/CachedImage";

interface FloorPlanCoords {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TableWithAvailability {
  id: string;
  name: string;
  tableNumber: string | null;
  tableType: string;
  location: string | null;
  floorPlanCoords: FloorPlanCoords | null;
  minCapacity: number;
  maxCapacity: number;
  basePrice: string;
  currency: string;
  isBooked: boolean;
}

interface FloorPlanData {
  venue: {
    id: string;
    name: string;
    slug: string;
    floorPlanImage: string | null;
  };
  date: string;
  time: string;
  tables: TableWithAvailability[];
}

interface VenueFloorPlanViewProps {
  venueId: string;
  currentTableId?: string;
}

function getDefaultDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTimeForDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

/** Generate time options (6 PM - 2 AM) */
function getTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 18; h < 24; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
  }
  for (let h = 0; h <= 2; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
  }
  return options;
}

export function VenueFloorPlanView({ venueId, currentTableId }: VenueFloorPlanViewProps) {
  const [selectedDate, setSelectedDate] = useState(getDefaultDate);
  const [selectedTime, setSelectedTime] = useState("20:00");
  const [data, setData] = useState<FloorPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFloorPlan = useCallback(async (date: string, time: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hub/venues/${venueId}/floor-plan?date=${date}&time=${time}`,
        { credentials: "include" }
      );
      const body = await res.json();
      if (body.success && body.data) {
        setData(body.data);
      } else {
        setError(body.error ?? "Failed to load floor plan");
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchFloorPlan(selectedDate, selectedTime);
  }, [selectedDate, selectedTime, fetchFloorPlan]);

  const tablesWithCoords = data?.tables.filter((t) => t.floorPlanCoords) ?? [];
  const tablesWithoutCoords = data?.tables.filter((t) => !t.floorPlanCoords) ?? [];

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          Floor Plan & Table Availability
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select date and time to see table locations and availability. Green = available, red = booked.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="fp-date" className="mb-1 block text-xs font-medium text-muted-foreground">
              Date
            </label>
            <input
              id="fp-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getDefaultDate()}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="fp-time" className="mb-1 block text-xs font-medium text-muted-foreground">
              Time
            </label>
            <select
              id="fp-time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {getTimeOptions().map((t) => (
                <option key={t} value={t}>
                  {formatTimeForDisplay(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && !data && <p className="text-sm text-muted-foreground">Loading floor plan…</p>}

        {data && (
          <>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              {data.venue.floorPlanImage ? (
                <CachedImage
                  src={data.venue.floorPlanImage}
                  alt={`${data.venue.name} floor plan`}
                  fill
                  objectFit="contain"
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MapPin className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-2 text-sm">No floor plan image</p>
                    <p className="text-xs">Tables listed below</p>
                  </div>
                </div>
              )}

              {/* Table overlays - positioned when floorPlanCoords exist */}
              {data.venue.floorPlanImage &&
                tablesWithCoords.map((t) => {
                  const coords = t.floorPlanCoords!;
                  const x = typeof coords.x === "number" ? coords.x : 0;
                  const y = typeof coords.y === "number" ? coords.y : 0;
                  const w = typeof coords.w === "number" ? Math.max(coords.w, 8) : 10;
                  const h = typeof coords.h === "number" ? Math.max(coords.h, 8) : 10;
                  const isCurrent = t.id === currentTableId;

                  return (
                    <Link
                      key={t.id}
                      href={`/hub/venues/${venueId}/tables/${t.id}`}
                      className={cn(
                        "absolute flex items-center justify-center rounded-md border-2 text-center text-xs font-medium transition-all hover:z-10 hover:scale-105",
                        t.isBooked
                          ? "border-red-500 bg-red-500/80 text-white dark:border-red-400 dark:bg-red-600/80"
                          : "border-green-600 bg-green-500/80 text-white dark:border-green-400 dark:bg-green-600/80",
                        isCurrent && "ring-2 ring-primary ring-offset-2"
                      )}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${w}%`,
                        height: `${h}%`,
                        minWidth: 36,
                        minHeight: 28,
                      }}
                      title={`${t.name}${t.tableNumber ? ` #${t.tableNumber}` : ""} – ${t.isBooked ? "Booked" : "Available"}`}
                    >
                      <span className="truncate px-1">
                        {t.tableNumber ? `#${t.tableNumber}` : t.name}
                      </span>
                    </Link>
                  );
                })}
            </div>

            {/* Tables without coords - list view */}
            {tablesWithoutCoords.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Tables at {formatTimeForDisplay(selectedTime)} on {selectedDate}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tablesWithoutCoords.map((t) => {
                    const isCurrent = t.id === currentTableId;
                    return (
                      <Link
                        key={t.id}
                        href={`/hub/venues/${venueId}/tables/${t.id}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors",
                          t.isBooked
                            ? "border-red-400 bg-red-100 text-red-900 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200"
                            : "border-green-400 bg-green-100 text-green-900 dark:border-green-500/40 dark:bg-green-950/40 dark:text-green-200",
                          isCurrent && "ring-2 ring-primary"
                        )}
                      >
                        <span className="font-medium">
                          {t.tableNumber ? `#${t.tableNumber}` : t.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {t.isBooked ? "Booked" : "Available"}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded border-2 border-green-600 bg-green-500/80" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded border-2 border-red-500 bg-red-500/80" />
                Booked
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
