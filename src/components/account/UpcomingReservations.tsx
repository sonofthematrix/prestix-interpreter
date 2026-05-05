"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";

interface BookingItem {
  id: string;
  bookingNumber: string;
  bookingType: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  guestCount: number;
  totalAmount: string | number;
  currency: string;
  status: string;
  venue: { id: string; name: string; slug: string } | null;
  table: { id: string; name: string; tableType?: string } | null;
  ticket: { id: string; name: string } | null;
}

function formatAmount(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const noSubunit = ["IDR", "JPY", "KRW", "VND"].includes(currency.toUpperCase());
  const value = noSubunit ? n : n / 100;
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: noSubunit ? 0 : 2,
  })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

export function UpcomingReservations({ linkQuery = "" }: { linkQuery?: string }) {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/bookings?upcoming=1&limit=5", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b.success && Array.isArray(b.data)) {
          // Show upcoming: confirmed, checked-in, and pending payment
          const upcoming = b.data.filter((x: BookingItem) =>
            ["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"].includes(x.status)
          );
          setBookings(upcoming);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (bookings.length === 0) return null;

  return (
    <section className="mb-6 border-t border-border pt-4" aria-labelledby="drawer-upcoming-heading">
      <h2
        id="drawer-upcoming-heading"
        className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground opacity-70"
      >
        Upcoming reservations
      </h2>
      <ul className="space-y-2">
        {bookings.slice(0, 5).map((b) => (
          <li key={b.id}>
            <Link
              href={`/hub/bookings/${b.id}${linkQuery}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted-bg"
            >
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.venue?.name ?? "Venue"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(b.bookingDate)} · {formatTime(b.startTime)}
                  {b.table ? ` · ${b.table.name}` : b.ticket ? ` · ${b.ticket.name}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/hub/bookings${linkQuery}`}
        className="mt-2 block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted-bg hover:text-foreground"
      >
        View all bookings →
      </Link>
    </section>
  );
}
