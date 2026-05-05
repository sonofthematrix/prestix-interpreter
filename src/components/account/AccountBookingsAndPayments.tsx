"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CreditCard, TicketIcon } from "lucide-react";

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
  table: { id: string; name: string } | null;
  ticket: { id: string; name: string } | null;
}

interface PaymentItem {
  id: string;
  bookingId: string;
  amount: string | number;
  currency: string;
  rail: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  booking: {
    id: string;
    bookingNumber: string;
    bookingDate: string;
    startTime: string;
    totalAmount: string | number;
    currency: string;
    status: string;
    bookingType: string;
    venue: { id: string; name: string; slug: string } | null;
  } | null;
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
    dateStyle: "medium",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toUpperCase();
  if (["CONFIRMED", "COMPLETED", "CHECKED_IN"].includes(s)) return "default";
  if (["PENDING_PAYMENT", "PENDING"].includes(s)) return "secondary";
  if (["CANCELLED", "NO_SHOW", "REFUNDED", "FAILED"].includes(s)) return "destructive";
  return "outline";
}

export function AccountBookingsAndPayments() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    fetch("/api/account/bookings?limit=20", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b.success && Array.isArray(b.data)) setBookings(b.data);
      })
      .catch((err) => {
        console.warn("[AccountBookingsAndPayments] Failed to load bookings:", err);
      })
      .finally(() => setLoadingBookings(false));
  }, []);

  useEffect(() => {
    fetch("/api/account/purchases?limit=30", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b.success && Array.isArray(b.data)) setPayments(b.data);
      })
      .catch((err) => {
        console.warn("[AccountBookingsAndPayments] Failed to load payments:", err);
      })
      .finally(() => setLoadingPayments(false));
  }, []);

  const upcomingBookings = bookings.filter((b) => {
    const d = new Date(b.bookingDate + "T" + (b.startTime || "00:00"));
    return d >= new Date() && ["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"].includes(b.status);
  });

  const pastBookings = bookings.filter((b) => {
    const d = new Date(b.bookingDate + "T" + (b.startTime || "00:00"));
    return d < new Date() || ["COMPLETED", "CANCELLED", "NO_SHOW", "REFUNDED"].includes(b.status);
  });

  return (
    <div className="mt-12 space-y-8">
      {/* Upcoming confirmed reservations */}
      <section aria-labelledby="upcoming-bookings-heading">
        <h2 id="upcoming-bookings-heading" className="font-serif text-xl font-bold text-foreground">
          Upcoming reservations
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your confirmed venue reservations and event tickets.
        </p>
        {loadingBookings ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : upcomingBookings.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">No upcoming reservations.</p>
            <Link
              href="/hub/bookings"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              View all bookings →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {upcomingBookings.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        {b.bookingType === "TABLE_RESERVATION" ? (
                          <Calendar className="h-5 w-5" />
                        ) : (
                          <TicketIcon className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <p className="font-medium">{b.venue?.name ?? "Venue"}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(b.bookingDate)} · {formatTime(b.startTime)}
                          {b.table ? ` · ${b.table.name}` : b.ticket ? ` · ${b.ticket.name}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {b.guestCount} guest{b.guestCount !== 1 ? "s" : ""} ·{" "}
                          {formatAmount(Number(b.totalAmount), b.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(b.status)}>{b.status.replace(/_/g, " ")}</Badge>
                      <Link
                        href={`/hub/bookings/${b.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Payments (settled & pending) */}
      <section aria-labelledby="payments-heading">
        <h2 id="payments-heading" className="font-serif text-xl font-bold text-foreground">
          Payments
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your settled and pending payment history.
        </p>
        {loadingPayments ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : payments.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">No payments yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Completed payments will appear here after you confirm a booking.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <CreditCard className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {p.booking?.venue?.name ?? "Booking"} · {p.booking?.bookingNumber ?? p.bookingId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {p.booking?.bookingDate && formatDate(p.booking.bookingDate)}
                          {p.booking?.startTime && ` · ${formatTime(p.booking.startTime)}`}
                        </p>
                        <p className="text-sm font-medium">
                          {formatAmount(Number(p.amount), p.currency)}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({p.rail?.replace(/_/g, " ") ?? "Card"})
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge>
                      {p.bookingId && (
                        <Link
                          href={`/hub/bookings/${p.bookingId}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View booking →
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Historic booking confirmations */}
      <section aria-labelledby="historic-bookings-heading">
        <h2 id="historic-bookings-heading" className="font-serif text-xl font-bold text-foreground">
          Booking history
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Past bookings and confirmations.
        </p>
        {loadingBookings ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : pastBookings.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">No past bookings.</p>
            <Link
              href="/hub/bookings"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              View all bookings →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {pastBookings.slice(0, 15).map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        {b.bookingType === "TABLE_RESERVATION" ? (
                          <Calendar className="h-5 w-5" />
                        ) : (
                          <TicketIcon className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <p className="font-medium">{b.venue?.name ?? "Venue"}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(b.bookingDate)} · {formatTime(b.startTime)}
                          {b.table ? ` · ${b.table.name}` : b.ticket ? ` · ${b.ticket.name}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatAmount(Number(b.totalAmount), b.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(b.status)}>{b.status.replace(/_/g, " ")}</Badge>
                      <Link
                        href={`/hub/bookings/${b.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {pastBookings.length > 15 && (
          <Link href="/hub/bookings" className="mt-4 block text-sm font-medium text-primary hover:underline">
            View all bookings →
          </Link>
        )}
      </section>
    </div>
  );
}
