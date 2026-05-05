"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlotInfo {
  slot: string;
  available: boolean;
  canStart: boolean;
  totalTables: number;
  bookedCount: number;
  availableCount: number;
}

export interface AvailabilityData {
  date: string;
  openTime: string | null;
  closeTime: string | null;
  slots: SlotInfo[];
  minBookingHours: number;
  tableType: string;
  tableName: string;
  totalTierTables?: number;
  message?: string;
}

interface TableAvailabilityViewProps {
  tableId: string;
  venueId: string;
  tableName: string;
  tableType: string;
  isMember?: boolean;
  compact?: boolean;
}

function formatTimeForDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function getDefaultDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function TableAvailabilityView({
  tableId,
  venueId,
  tableName,
  tableType,
  isMember = true,
  compact = false,
}: TableAvailabilityViewProps) {
  const [selectedDate, setSelectedDate] = useState(getDefaultDate);
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const fetchAvailability = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/hub/tables/${tableId}/availability?date=${date}`,
        { credentials: "include" }
      );
      const body = await res.json();
      if (body.success && body.data) {
        setData(body.data);
      } else {
        setError(body.error ?? "Failed to load availability");
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (date) fetchAvailability(date);
  };

  useEffect(() => {
    if (selectedDate) fetchAvailability(selectedDate);
  }, [selectedDate, fetchAvailability]);

  const bookingUrl = selectedSlot && data
    ? (() => {
        const [h, m] = selectedSlot.split(":").map(Number);
        const endH = ((h ?? 0) + data.minBookingHours) % 24;
        const endTime = `${String(endH).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
        return `/hub/bookings/new?tableId=${tableId}&venueId=${venueId}&date=${selectedDate}&time=${selectedSlot}&endTime=${endTime}`;
      })()
    : null;

  return (
    <Card className={compact ? "overflow-hidden" : ""}>
      <CardHeader className={compact ? "py-3" : ""}>
        <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
          <Calendar className={compact ? "h-4 w-4" : "h-5 w-5"} />
          Table Availability
        </CardTitle>
        {!compact && (
          <p className="text-sm text-muted-foreground">
            Select a date to see hourly availability by tier. Green = tables available, red = fully booked.
            Minimum booking: {tableType === "STANDARD" ? "1 hour" : "2 hours"} for {tableType} tables.
          </p>
        )}
      </CardHeader>
      <CardContent className={compact ? "space-y-3 pt-0" : "space-y-4"}>
        <div>
          <label htmlFor="avail-date" className="mb-1 block text-sm font-medium text-foreground">
            Date
          </label>
          <input
            id="avail-date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={getDefaultDate()}
            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {loading && !data && (
          <p className="text-muted-foreground">Loading availability…</p>
        )}

        {data && !data.message && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {data.openTime && data.closeTime
                  ? `${formatTimeForDisplay(data.openTime)} – ${formatTimeForDisplay(data.closeTime)}`
                  : "—"}
              </span>
              <Badge variant="outline" className="text-xs">
                Min {data.minBookingHours}h
              </Badge>
              {data.totalTierTables != null && (
                <span>
                  {data.totalTierTables} {data.tableType} table{data.totalTierTables !== 1 ? "s" : ""} at venue
                </span>
              )}
            </div>

            <div className={cn("grid gap-2", compact ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6")}>
              {data.slots.map((s) => {
                const { slot, available, canStart, totalTables = 0, bookedCount = 0, availableCount = 0 } = s;
                const hasAvailability = availableCount > 0;
                const isFullyBooked = availableCount === 0;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      if (canStart && isMember) setSelectedSlot((s) => (s === slot ? null : slot));
                    }}
                    disabled={!canStart || !isMember}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-md border-2 px-2 py-2.5 text-center text-sm font-medium transition-colors",
                      compact ? "min-h-[3rem] py-2" : "min-h-[4rem]",
                      isFullyBooked
                        ? "cursor-not-allowed border-red-400 bg-red-100 text-red-950 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200"
                        : hasAvailability && canStart
                          ? "cursor-pointer border-green-600 bg-green-100 text-green-950 dark:border-green-500/40 dark:bg-green-950/40 dark:text-green-200 hover:border-green-700 hover:bg-green-200 dark:hover:bg-green-950/60 dark:hover:border-green-400"
                          : hasAvailability
                            ? "cursor-not-allowed border-green-500 bg-green-100/90 text-green-950 dark:border-green-500/40 dark:bg-green-950/30 dark:text-green-300"
                            : "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-700 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
                      selectedSlot === slot && "ring-2 ring-primary ring-offset-2 dark:ring-offset-background"
                    )}
                    title={
                      isFullyBooked
                        ? `${bookedCount}/${totalTables} booked – fully booked`
                        : canStart
                          ? `${availableCount} left – book from ${formatTimeForDisplay(slot)}`
                          : `${availableCount} left – not enough consecutive hours`
                    }
                  >
                    <span className="font-semibold">{formatTimeForDisplay(slot)}</span>
                    <span className="mt-0.5 text-xs">
                      {isFullyBooked ? (
                        <span className="font-medium">{bookedCount}/{totalTables} booked</span>
                      ) : (
                        <span>{availableCount} left</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={cn("flex flex-wrap items-center text-xs text-foreground", compact ? "gap-3" : "gap-4")}>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border-2 border-green-600 bg-green-100 dark:border-green-500/50 dark:bg-green-500/25" /> Available (tables left)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border-2 border-red-500 bg-red-100 dark:border-red-500/50 dark:bg-red-500/25" /> Fully booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded ring-2 ring-primary ring-offset-1 ring-offset-background" /> Selected
              </span>
            </div>

            {isMember && selectedSlot && bookingUrl && (
              <div className="pt-2">
                <Button >
                  <Link href={bookingUrl}>
                    Book from {formatTimeForDisplay(selectedSlot)} ({data.minBookingHours}h min)
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}

        {data?.message && (
          <p className="text-muted-foreground">{data.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
