"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "NO_SHOW",
] as const;

interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  specialNotes: string | null;
  bookingType: string;
  bookingDate: string;
  startTime: string;
  venue: { id: string; name: string; slug: string } | null;
}

export default function HubBookingEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [status, setStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/hub/bookings/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          const b = body.data;
          setBooking(b);
          setStatus(b.status ?? "PENDING_PAYMENT");
          setNotes(b.specialNotes ?? "");
        } else {
          setError(body.error || "Booking not found");
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
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || saving) return;
    setSaving(true);
    setError(null);
    fetch(`/api/hub/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, notes: notes.trim() || undefined }),
    })
      .then((res) => res.json())
      .then((body) => {
        if (body.success) {
          router.push(`/hub/bookings/${id}`);
          router.refresh();
        } else {
          setError(body.error || "Update failed");
          setSaving(false);
        }
      })
      .catch((err) => {
        setError(err.message || "Request failed");
        setSaving(false);
      });
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error && !booking) {
    return (
      <div>
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/bookings">Back to Bookings</Link>
        </Button>
      </div>
    );
  }
  if (!booking) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Edit booking
          </h1>
          <p className="mt-1 text-muted-foreground">
            {booking.bookingNumber} · {new Date(booking.bookingDate).toLocaleDateString()} · {booking.startTime}
          </p>
        </div>
        <Button variant="outline">
          <Link href={`/hub/bookings/${id}`}>Back to Booking</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status & notes</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-foreground">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                className={cn(
                  "flex h-10 w-full max-w-xs rounded-md border border-accent/70 bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                )}
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-foreground">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Special notes for this booking"
                rows={4}
                className={cn(
                  "flex w-full min-h-[80px] rounded-md border border-accent/70 bg-background px-3 py-2 text-sm resize-y",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                )}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline">
                <Link href={`/hub/bookings/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
