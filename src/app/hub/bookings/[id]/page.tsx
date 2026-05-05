"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, ReceiptIcon } from "lucide-react";
import { generateBookingReceiptPdf } from "@/lib/booking-receipt-pdf";
interface BookingAddOn {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
  currency: string;
  notes?: string | null;
}

interface BookingPayment {
  id: string;
  amount: string | number;
  currency: string;
  rail: string;
  status: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  processedAt?: string | null;
  refundedAmount?: string | number | null;
  refundedAt?: string | null;
}

interface BookingDetail {
  id: string;
  bookingNumber: string;
  bookingType: string;
  bookingDate: string;
  startTime: string;
  endTime: string | null;
  guestCount: number;
  baseAmount?: string | number;
  addOnsAmount?: string | number;
  discountAmount?: string | number;
  taxAmount?: string | number;
  totalAmount: string;
  currency: string;
  status: string;
  venue: { id: string; name: string; slug: string } | null;
  member: { id: string; email: string | null; name: string | null } | null;
  table: { id: string; name: string; inclusions?: unknown; availableAddOns?: unknown } | null;
  ticket: { id: string; name: string; inclusions?: unknown } | null;
  promoter: { id: string; name: string; tier: string; referralCode?: string } | null;
  venueShare?: string | number;
  commissionPool?: string | number;
  promoterEarning?: string | number;
  platformPassive?: string | number;
  platformFee?: string | number;
  totalPlatformRevenue?: string | number;
  addOns?: BookingAddOn[];
  payment?: BookingPayment | null;
}

/** Format amount for display. Currencies without subunits (IDR, JPY) use whole units; others use cents. */
function formatAmount(amount: number, currency: string): string {
  const noSubunit = ["IDR", "JPY", "KRW", "VND"].includes(currency.toUpperCase());
  const value = noSubunit ? amount : amount / 100;
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: noSubunit ? 0 : 2,
  })}`;
}

/** Status badge variant */
function getStatusBadgeProps(status: string): { variant: "default" | "secondary" | "destructive" | "outline"; className?: string } {
  const s = status.toUpperCase();
  if (["CONFIRMED", "COMPLETED", "CHECKED_IN"].includes(s)) {
    return { variant: "default", className: "bg-emerald-600/90 text-white border-emerald-500/50" };
  }
  if (["PENDING_PAYMENT", "PENDING"].includes(s)) {
    return { variant: "secondary", className: "bg-amber-500/20 text-amber-200 border-amber-500/30" };
  }
  if (["CANCELLED", "NO_SHOW", "REFUNDED"].includes(s)) {
    return { variant: "destructive" };
  }
  return { variant: "outline" };
}

export default function HubBookingViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const paymentSuccess = searchParams?.get("success") === "1";
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
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
          setBooking(body.data);
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

  const handleDownloadReceipt = useCallback(() => {
    const baseAmount = parseFloat(String(booking?.baseAmount ?? booking?.totalAmount ?? 0));
    const addOnsAmount = parseFloat(String(booking?.addOnsAmount ?? 0));
    const discountAmount = parseFloat(String(booking?.discountAmount ?? 0));
    const taxAmount = parseFloat(String(booking?.taxAmount ?? 0));
    const totalAmount = parseFloat(String(booking?.totalAmount ?? 0));
    generateBookingReceiptPdf({
      bookingNumber: booking!.bookingNumber,
      bookingType: booking!.bookingType,
      bookingDate: booking!.bookingDate,
      startTime: booking!.startTime,
      venue: booking!.venue?.name ?? "—",
      member: booking!.member?.name ?? booking!.member?.email ?? "—",
      table: booking!.table?.name ?? undefined,
      ticket: booking!.ticket?.name ?? undefined,
      guestCount: booking!.guestCount ?? 1,
      baseAmount,
      addOnsAmount,
      discountAmount,
      taxAmount,
      totalAmount,
      currency: booking!.currency ?? "IDR",
      addOns: (booking!.addOns ?? []).map((a) => ({
        name: a.name,
        category: a.category,
        quantity: a.quantity,
        unitPrice: a.unitPrice,
        totalPrice: a.totalPrice,
        currency: a.currency,
      })),
      packageInclusions: (() => {
        if (booking!.bookingType === "TABLE_RESERVATION" && booking!.table?.inclusions) {
          const inc = booking!.table.inclusions;
          return Array.isArray(inc) ? inc.map(String) : [];
        }
        if (booking!.bookingType === "EVENT_TICKET" && booking!.ticket?.inclusions) {
          const inc = booking!.ticket.inclusions;
          return Array.isArray(inc) ? inc.map(String) : [];
        }
        return [];
      })(),
      platformFee: parseFloat(String(booking!.platformFee ?? 0)) || undefined,
      promoterEarning: parseFloat(String(booking!.promoterEarning ?? 0)) || undefined,
      platformPassive: parseFloat(String(booking!.platformPassive ?? 0)) || undefined,
      paymentStatus: booking!.payment?.status,
      paymentProcessedAt: booking!.payment?.processedAt ?? undefined,
      stripeChargeId: booking!.payment?.stripeChargeId ?? undefined,
    });
  }, [booking]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !booking) {
    return (
      <div>
        <p className="text-red-500">{error ?? "Not found"}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/bookings">Back to Bookings</Link>
        </Button>
      </div>
    );
  }

  const isMissFish = booking.venue?.slug === "miss-fish-bali";
  const addOns = booking.addOns ?? [];
  const payment = booking.payment;

  // Package inclusions (free) from table or ticket
  const packageInclusions: string[] = (() => {
    if (booking.bookingType === "TABLE_RESERVATION" && booking.table?.inclusions) {
      const inc = booking.table.inclusions;
      return Array.isArray(inc) ? inc.map(String) : [];
    }
    if (booking.bookingType === "EVENT_TICKET" && booking.ticket?.inclusions) {
      const inc = booking.ticket.inclusions;
      return Array.isArray(inc) ? inc.map(String) : [];
    }
    return [];
  })();

  return (
    <div className="space-y-4">
      {paymentSuccess && (
        <Card className="overflow-hidden border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="py-3">
            <p className="text-sm text-foreground">
              <strong>Payment successful.</strong> Your booking is confirmed. You will receive a confirmation email shortly.
            </p>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">{booking.bookingNumber}</h1>
          <span className="text-muted-foreground">
            {booking.bookingType === "EVENT_TICKET" ? "Ticket" : "Table"} · {new Date(booking.bookingDate).toLocaleDateString()} · {booking.startTime}
          </span>
          <Badge {...getStatusBadgeProps(booking.status)}>
            {booking.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleDownloadReceipt}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Receipt (PDF)
          </Button>
          <Button variant="outline" size="sm">
            <Link href="/hub/bookings">Back</Link>
          </Button>
          <Button size="sm">
            <Link href={`/hub/bookings/${booking.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      {isMissFish && booking.bookingType === "TABLE_RESERVATION" && (
        <Card className="overflow-hidden border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <p className="text-sm text-foreground">
              <strong>Miss Fish Bali:</strong> Table booking full amount is paid at the time of booking. No additional payment required at venue.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p><span className="text-muted-foreground">Venue:</span> {booking.venue?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Member:</span> {booking.member?.name ?? booking.member?.email ?? "—"}</p>
            <p><span className="text-muted-foreground">Promoter:</span> {booking.promoter ? `${booking.promoter.name} (${booking.promoter.tier})` : "—"}</p>
            <p><span className="text-muted-foreground">Promo Code:</span> {booking.promoter?.referralCode ?? "—"}</p>
            <p><span className="text-muted-foreground">Table:</span> {booking.table?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Ticket:</span> {booking.ticket?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Guests:</span> {booking.guestCount}</p>
          </div>

          {/* Itemized bill */}
          <div className="border-t border-border pt-4">
            <h4 className="mb-2 font-medium text-foreground">Itemized Bill</h4>
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{booking.bookingType === "EVENT_TICKET" ? "Event Ticket" : "Table Reservation"}</span>
                <span>{formatAmount(parseFloat(String(booking.baseAmount ?? booking.totalAmount)), booking.currency)}</span>
              </div>
              {packageInclusions.length > 0 && (
                <>
                  {packageInclusions.map((item, i) => (
                    <div key={`inc-${i}`} className="flex justify-between">
                      <span className="text-muted-foreground">{item} <span className="text-xs">(included)</span></span>
                      <span className="text-muted-foreground">—</span>
                    </div>
                  ))}
                </>
              )}
              {addOns.length > 0 && (
                <>
                  {addOns.map((a) => (
                    <div key={a.id} className="flex justify-between">
                      <span className="text-muted-foreground">{a.name} {a.quantity > 1 ? `× ${a.quantity}` : ""} ({a.category})</span>
                      <span>{formatAmount(parseFloat(String(a.totalPrice)), a.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional purchases subtotal</span>
                    <span>{formatAmount(parseFloat(String(booking.addOnsAmount ?? 0)), booking.currency)}</span>
                  </div>
                </>
              )}
              {parseFloat(String(booking.discountAmount ?? 0)) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatAmount(parseFloat(String(booking.discountAmount)), booking.currency)}</span>
                </div>
              )}
              {parseFloat(String(booking.taxAmount ?? 0)) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatAmount(parseFloat(String(booking.taxAmount)), booking.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <span>Total</span>
                <span>{formatAmount(parseFloat(String(booking.totalAmount)), booking.currency)}</span>
              </div>
            </div>
          </div>

          {(booking.platformFee != null || booking.promoterEarning != null || booking.platformPassive != null) && (() => {
            const total = parseFloat(String(booking.totalAmount));
            const pct = (amt: number) => total > 0 ? ((amt / total) * 100).toFixed(1) : null;
            const platformFeeAmt = parseFloat(String(booking.platformFee ?? 0));
            const promoterAmt = parseFloat(String(booking.promoterEarning ?? 0));
            const platformPassiveAmt = parseFloat(String(booking.platformPassive ?? 0));
            return (
              <div className="space-y-1 border-t border-border pt-3">
                {platformFeeAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Platform Fee (Software Service) {pct(platformFeeAmt) != null ? `(${pct(platformFeeAmt)}%)` : ""}
                    </span>
                    <span>{formatAmount(platformFeeAmt, booking.currency)}</span>
                  </div>
                )}
                {promoterAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Promoter Commission {pct(promoterAmt) != null ? `(${pct(promoterAmt)}%)` : ""}
                    </span>
                    <span>{formatAmount(promoterAmt, booking.currency)}</span>
                  </div>
                )}
                {platformPassiveAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Platform Commission {pct(platformPassiveAmt) != null ? `(${pct(platformPassiveAmt)}%)` : ""}
                    </span>
                    <span>{formatAmount(platformPassiveAmt, booking.currency)}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {(packageInclusions.length > 0 || addOns.length > 0) && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptIcon className="h-4 w-4" />
              Package & Add-ons
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
              {packageInclusions.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Included in package (no extra cost)</p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {packageInclusions.map((item, i) => (
                      <li key={`pkg-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {addOns.length > 0 && (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Additional items added at time of booking.
                  </p>
                  <div className="space-y-2">
                {addOns.map((a) => (
                  <div key={a.id} className="flex justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div>
                      <span className="font-medium">{a.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({a.category})</span>
                      {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                    </div>
                    <div className="text-right">
                      <span>{a.quantity} × {formatAmount(parseFloat(String(a.unitPrice)), a.currency)}</span>
                      <span className="ml-2 font-medium">{formatAmount(parseFloat(String(a.totalPrice)), a.currency)}</span>
                    </div>
                  </div>
                ))}
                  </div>
                </>
              )}
            </CardContent>
        </Card>
      )}

      {payment && (
        <Link href={`/hub/purchases/${payment.id}`} className="block">
          <Card className="overflow-hidden transition-colors hover:border-primary/50 hover:bg-muted/30">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between text-base">
                Payment Details
                <span className="text-xs font-normal text-muted-foreground">View transaction →</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <p><span className="text-muted-foreground">Transaction ID:</span> <code className="text-xs font-mono">{payment.id}</code></p>
                <p><span className="text-muted-foreground">Status:</span> <Badge variant={payment.status === "COMPLETED" ? "default" : "secondary"}>{payment.status}</Badge></p>
                <p><span className="text-muted-foreground">Amount:</span> {formatAmount(parseFloat(String(payment.amount)), payment.currency)}</p>
                <p><span className="text-muted-foreground">Rail:</span> {payment.rail.replace(/_/g, " ")}</p>
                {payment.processedAt && (
                  <p><span className="text-muted-foreground">Processed:</span> {new Date(payment.processedAt).toLocaleString()}</p>
                )}
                {payment.stripePaymentIntentId && (
                  <p><span className="text-muted-foreground">Payment Intent:</span> <code className="text-xs">{payment.stripePaymentIntentId}</code></p>
                )}
                {payment.stripeChargeId && (
                  <p><span className="text-muted-foreground">Charge ID:</span> <code className="text-xs">{payment.stripeChargeId}</code></p>
                )}
                {payment.refundedAmount != null && parseFloat(String(payment.refundedAmount)) > 0 && (
                  <p><span className="text-muted-foreground">Refunded:</span> {formatAmount(parseFloat(String(payment.refundedAmount)), payment.currency)} {payment.refundedAt && `on ${new Date(payment.refundedAt).toLocaleString()}`}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
