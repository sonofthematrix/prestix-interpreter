"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PurchaseDetail {
  id: string;
  bookingId: string;
  amount: string;
  currency: string;
  rail: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  booking: {
    id: string;
    bookingNumber: string;
    bookingDate: string;
    totalAmount: string;
    currency: string;
    venue: { id: string; name: string; slug: string } | null;
    member: { id: string; email: string | null; name: string | null } | null;
  } | null;
}

export default function HubPurchaseViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/hub/purchases/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          setPurchase(body.data);
        } else {
          setError(body.error || "Purchase not found");
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

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !purchase) {
    return (
      <div>
        <p className="text-red-500">{error ?? "Not found"}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/purchases">Back to Purchases</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Payment {purchase.id.slice(0, 8)}…
          </h1>
          <span className="text-muted-foreground">
            {purchase.currency} {purchase.amount} · {purchase.rail} · {purchase.status}
          </span>
        </div>
        <Button variant="outline" size="sm">
          <Link href="/hub/purchases">Back</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Payment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm">
          <p><span className="text-muted-foreground">Transaction ID:</span> <code className="font-mono text-xs">{purchase.id}</code></p>
          <p><span className="text-muted-foreground">Amount:</span> {purchase.currency} {purchase.amount}</p>
          <p><span className="text-muted-foreground">Rail:</span> {purchase.rail}</p>
          <p><span className="text-muted-foreground">Status:</span> {purchase.status}</p>
          <p><span className="text-muted-foreground">Created:</span> {new Date(purchase.createdAt).toLocaleString()}</p>
          {purchase.processedAt && <p><span className="text-muted-foreground">Processed:</span> {new Date(purchase.processedAt).toLocaleString()}</p>}
        </CardContent>
      </Card>

      {purchase.booking && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-sm">
            <p><span className="text-muted-foreground">Number:</span> {purchase.booking.bookingNumber}</p>
            <p><span className="text-muted-foreground">Venue:</span> {purchase.booking.venue?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Member:</span> {purchase.booking.member?.name ?? purchase.booking.member?.email ?? "—"}</p>
            <Button variant="outline" size="sm" className="mt-2">
              <Link href={`/hub/bookings/${purchase.booking.id}`}>View booking</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
