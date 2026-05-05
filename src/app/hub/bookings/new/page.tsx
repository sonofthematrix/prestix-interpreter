"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getMembershipStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getFeatureIcon } from "@/lib/table-feature-icons";
import { Check, Sparkles } from "lucide-react";

interface SlotInfo {
  slot: string;
  available: boolean;
  canStart: boolean;
  totalTables?: number;
  bookedCount?: number;
  availableCount?: number;
}

interface AvailabilityData {
  slots: SlotInfo[];
  openTime: string | null;
  closeTime: string | null;
  minBookingHours: number;
  message?: string;
}

interface TableAddOn {
  name: string;
  price: number;
  required?: boolean;
  category?: string;
  allowedTiers?: string[];
}

interface TableData {
  id: string;
  name: string;
  tableType?: string;
  basePrice: string | number;
  currency: string;
  inclusions: string[];
  features: string[];
  availableAddOns: TableAddOn[];
  minCapacity: number;
  maxCapacity: number;
  isActive?: boolean;
}

/** Hourly time options when venue hours unknown (fallback). */
function getHourlyTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 12; h < 24; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
  }
  for (let h = 0; h <= 3; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
  }
  return options;
}

function formatTimeForDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function formatAmount(amount: number, currency: string): string {
  const noSubunit = ["IDR", "JPY", "KRW", "VND"].includes(currency.toUpperCase());
  const value = noSubunit ? amount : amount / 100;
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: noSubunit ? 0 : 2,
  })}`;
}

/** Returns true if the slot time has already passed when the selected date is today. */
function isSlotPastForToday(selectedDate: string, slot: string): boolean {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (selectedDate !== todayStr) return false;
  const [h, m] = slot.split(":").map(Number);
  const slotMinutes = (h ?? 0) * 60 + (m ?? 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // Overnight venues: slots 00:00–05:00 when it's evening (>=18:00) are "tonight" (future)
  if ((h ?? 0) >= 0 && (h ?? 0) <= 5 && now.getHours() >= 18) {
    return false;
  }
  return slotMinutes < nowMinutes;
}

/** Filter add-ons by member tier. If allowedTiers present and member has tier, only show if member tier in allowedTiers. */
function filterAddOnsByTier(
  addOns: TableAddOn[],
  memberTier: string | null
): TableAddOn[] {
  if (!addOns?.length) return [];
  return addOns.filter((a) => {
    const allowed = a.allowedTiers;
    if (!allowed?.length) return true;
    if (!memberTier) return false;
    return allowed.map((t) => t.toLowerCase()).includes(memberTier.toLowerCase());
  });
}

export default function HubNewBookingPage() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId");
  const ticketId = searchParams.get("ticketId");
  const venueId = searchParams.get("venueId");
  const prefDate = searchParams.get("date") ?? "";
  const prefTime = searchParams.get("time") ?? "";
  const prefEndTime = searchParams.get("endTime") ?? "";

  const user = useAppSelector((state) => state.auth.user) as { id?: string } | null;
  const [table, setTable] = useState<TableData | null>(null);
  const [ticketPrice, setTicketPrice] = useState<number | null>(null);
  const [ticketCurrency, setTicketCurrency] = useState<string>("AUD");
  const [memberTier, setMemberTier] = useState<string | null>(null);
  const [tableLoading, setTableLoading] = useState(false);

  const [formData, setFormData] = useState({
    bookingType: tableId ? "TABLE" : ticketId ? "TICKET" : "",
    guestCount: tableId ? "" : "1",
    preferredDate: prefDate || new Date().toISOString().slice(0, 10),
    preferredTime: prefTime ? (prefTime.includes(":") ? prefTime.split(":")[0] + ":00" : prefTime) : "",
    specialRequests: "",
    contactPhone: "",
  });

  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, { quantity: number; price: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "payment">("form");
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [venueSlotsLoading, setVenueSlotsLoading] = useState(false);

  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(venueId ?? "");
  const [venueTables, setVenueTables] = useState<TableData[]>([]);
  const [selectedTableTier, setSelectedTableTier] = useState<string>("");
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [savePhoneAsDefault, setSavePhoneAsDefault] = useState(false);

  const effectiveVenueId = venueId || selectedVenueId;
  const tierTable = selectedTableTier ? venueTables.find((t) => t.tableType === selectedTableTier && t.isActive) : null;
  const effectiveTableId = tableId || (tierTable?.id ?? null);
  const effectiveTable = table || (tierTable ?? null);

  const fetchTable = useCallback(async () => {
    if (!tableId) return;
    setTableLoading(true);
    try {
      const res = await fetch(`/api/hub/tables/${tableId}`, { credentials: "include" });
      const body = await res.json();
      if (body.success && body.data) {
        const raw = body.data;
        const parseJsonArray = (v: unknown): string[] =>
          Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
        setTable({
          ...raw,
          inclusions: parseJsonArray(raw.inclusions),
          features: parseJsonArray(raw.features),
          availableAddOns: Array.isArray(raw.availableAddOns) ? raw.availableAddOns : [],
        });
        const addOns = (raw.availableAddOns ?? []) as TableAddOn[];
        const initial: Record<string, { quantity: number; price: number }> = {};
        (addOns as TableAddOn[]).forEach((a) => {
          const price = typeof a.price === "number" ? a.price : parseFloat(String(a.price)) || 0;
          if (a.required) {
            initial[a.name] = { quantity: 1, price };
          }
        });
        setSelectedAddOns(initial);
      }
    } catch {
      setTable(null);
    } finally {
      setTableLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  useEffect(() => {
    if (!ticketId) return;
    fetch(`/api/hub/events/tickets/${ticketId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b.success && b.data) {
          const p = typeof b.data.price === "number" ? b.data.price : parseFloat(String(b.data.price)) || 0;
          setTicketPrice(p);
          setTicketCurrency(b.data.currency ?? "AUD");
        }
      })
      .catch(() => {});
  }, [ticketId]);

  useEffect(() => {
    getMembershipStatus().then((m) => setMemberTier(m.tier));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/user/contact", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        const phone = (b?.phone ?? "").trim() || null;
        setProfilePhone(phone);
        if (phone) {
          setFormData((prev) => (prev.contactPhone === "" ? { ...prev, contactPhone: phone } : prev));
        }
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    fetch("/api/hub/venues", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b.success && Array.isArray(b.data)) {
          setVenues(b.data.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (venueId) setSelectedVenueId(venueId);
  }, [venueId]);

  // Clear preferredTime when it's past (selected date is today)
  useEffect(() => {
    if (!formData.preferredDate || !formData.preferredTime) return;
    if (isSlotPastForToday(formData.preferredDate, formData.preferredTime)) {
      setFormData((prev) => ({ ...prev, preferredTime: "" }));
    }
  }, [formData.preferredDate, formData.preferredTime]);

  useEffect(() => {
    if (!selectedVenueId && !venueId) {
      setVenueTables([]);
      setSelectedTableTier("");
      return;
    }
    const vid = selectedVenueId || venueId;
    if (!vid) return;
    fetch(`/api/hub/venues/${vid}`, { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b.success && b.data?.tables) {
          const parseJsonArray = (v: unknown): string[] =>
            Array.isArray(v) ? (v as any[]).filter((x): x is string => typeof x === "string") : [];
          const tables = (b.data.tables as any[]).map((t: any) => ({
            id: t.id,
            name: t.name,
            tableType: t.tableType,
            basePrice: t.basePrice,
            currency: t.currency ?? "AUD",
            inclusions: parseJsonArray(t.inclusions),
            features: parseJsonArray(t.features),
            availableAddOns: Array.isArray(t.availableAddOns) ? t.availableAddOns : [],
            minCapacity: t.minCapacity ?? 2,
            maxCapacity: t.maxCapacity ?? 10,
            isActive: t.isActive !== false,
          }));
          setVenueTables(tables);
          if (selectedTableTier && !tables.some((t: TableData) => t.tableType === selectedTableTier && t.isActive)) {
            setSelectedTableTier("");
          }
        } else {
          setVenueTables([]);
        }
      })
      .catch(() => setVenueTables([]));
  }, [selectedVenueId, venueId]);

  useEffect(() => {
    if (selectedTableTier && venueTables.length > 0 && !tableId) {
      const addOns = venueTables.find((t) => t.tableType === selectedTableTier && t.isActive)?.availableAddOns ?? [];
      const initial: Record<string, { quantity: number; price: number }> = {};
      (addOns as TableAddOn[]).forEach((a) => {
        const price = typeof a.price === "number" ? a.price : parseFloat(String(a.price)) || 0;
        if (a.required) initial[a.name] = { quantity: 1, price };
      });
      setSelectedAddOns(initial);
    }
  }, [selectedTableTier, venueTables, tableId]);

  // Default guest count to table max capacity when table loads (user does not need to change)
  useEffect(() => {
    if (!tableId || !table) return;
    setFormData((prev) => ({ ...prev, guestCount: String(table.maxCapacity) }));
  }, [tableId, table?.id, table?.maxCapacity]);

  // Fetch availability for venue/date/table tier (table bookings only)
  useEffect(() => {
    const tid = tableId || tierTable?.id;
    if (!tid || !formData.preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(formData.preferredDate)) {
      setAvailabilityData(null);
      return;
    }
    let cancelled = false;
    setVenueSlotsLoading(true);
    setAvailabilityData(null);
    fetch(`/api/hub/tables/${tid}/availability?date=${formData.preferredDate}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          const slots = body.data.slots ?? [];
          const slotStrings = slots.map((s: { slot: string }) => s.slot).filter(Boolean);
          setAvailabilityData({
            slots: slots as SlotInfo[],
            openTime: body.data.openTime ?? null,
            closeTime: body.data.closeTime ?? null,
            minBookingHours: body.data.minBookingHours ?? 1,
            message: body.data.message,
          });
          setFormData((prev) => {
            const canStartSlots = slots.filter((s: SlotInfo) => s.canStart).map((s: SlotInfo) => s.slot);
            const shouldClear =
              slotStrings.length === 0 ||
              (prev.preferredTime && !canStartSlots.includes(prev.preferredTime));
            return shouldClear ? { ...prev, preferredTime: "" } : prev;
          });
        } else {
          setAvailabilityData({ slots: [], openTime: null, closeTime: null, minBookingHours: 1 });
        }
      })
      .catch(() => {
        if (!cancelled) setAvailabilityData({ slots: [], openTime: null, closeTime: null, minBookingHours: 1 });
      })
      .finally(() => {
        if (!cancelled) setVenueSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, tierTable?.id, formData.preferredDate]);

  const availableAddOns = effectiveTable?.availableAddOns
    ? filterAddOnsByTier(effectiveTable.availableAddOns as TableAddOn[], memberTier)
    : [];

  const baseAmount = effectiveTable
    ? typeof effectiveTable.basePrice === "number"
      ? effectiveTable.basePrice
      : parseFloat(String(effectiveTable.basePrice)) || 0
    : ticketId && ticketPrice != null
      ? ticketPrice
      : 0;

  const addOnsTotal = Object.entries(selectedAddOns).reduce(
    (sum, [, { quantity, price }]) => sum + quantity * price,
    0
  );

  const totalAmount = baseAmount + addOnsTotal;
  const currency = effectiveTable?.currency ?? ticketCurrency;

  const handleAddOnChange = (addOn: TableAddOn, checked: boolean, quantity: number = 1) => {
    const price = typeof addOn.price === "number" ? addOn.price : parseFloat(String(addOn.price)) || 0;
    setSelectedAddOns((prev) => {
      const next = { ...prev };
      if (checked) {
        next[addOn.name] = { quantity, price };
      } else {
        delete next[addOn.name];
      }
      return next;
    });
  };

  const handleAddOnQuantityChange = (addOn: TableAddOn, quantity: number) => {
    if (quantity < 1) return;
    const price = typeof addOn.price === "number" ? addOn.price : parseFloat(String(addOn.price)) || 0;
    setSelectedAddOns((prev) => ({ ...prev, [addOn.name]: { quantity, price } }));
  };

  /** Min booking hours by table type (matches availability API). */
  const minBookingHours = effectiveTableId && effectiveTable
    ? (["PREMIUM", "ULTRA_VIP", "CABANA", "BOOTH"].includes(effectiveTable.tableType ?? "") ? 2 : 1)
    : 1;

  const buildBookingPayload = () => {
    const date = formData.preferredDate;
    const startTime = formData.preferredTime;
    const endTime = prefEndTime || (() => {
      if (!startTime) return startTime;
      const [h, m] = startTime.split(":").map(Number);
      const endH = ((h ?? 0) + minBookingHours) % 24;
      return `${String(endH).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
    })();
    const addOnsPayload = Object.entries(selectedAddOns).map(([name, { quantity, price }]) => ({
      name,
      category: availableAddOns.find((a) => a.name === name)?.category ?? "OTHER",
      quantity,
      unitPrice: price,
      totalPrice: quantity * price,
      currency,
    }));
    return {
      memberId: user?.id,
      venueId: effectiveVenueId!,
      bookingType: (formData.bookingType === "TABLE" || tableId) ? ("TABLE_RESERVATION" as const) : ("EVENT_TICKET" as const),
      tableId: effectiveTableId || undefined,
      ticketId: ticketId || undefined,
      bookingDate: date,
      startTime,
      endTime: endTime || undefined,
      guestCount: effectiveTableId && effectiveTable ? effectiveTable.maxCapacity : (parseInt(formData.guestCount, 10) || 1),
      baseAmount,
      addOnsAmount: addOnsTotal,
      totalAmount,
      currency,
      addOns: addOnsPayload,
      specialNotes: formData.specialRequests || undefined,
    };
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const date = formData.preferredDate;
    const startTime = formData.preferredTime;
    if (!date || !startTime) {
      setSubmitError("Date and time are required.");
      return;
    }
    if (!effectiveVenueId) {
      setSubmitError("Venue is required.");
      return;
    }
    if (formData.bookingType === "TABLE" && !effectiveTableId) {
      setSubmitError("Please select a venue and table tier.");
      return;
    }
    if (!user?.id) {
      setSubmitError("Please sign in to book.");
      return;
    }
    if (savePhoneAsDefault && formData.contactPhone.trim()) {
      try {
        await fetch("/api/user/contact", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: formData.contactPhone.trim() }),
        });
      } catch {
        // Non-blocking; profile update failure doesn't prevent proceeding
      }
    }
    setStep("payment");
  };

  const handlePayWithCard = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const body = buildBookingPayload();
      const res = await fetch("/api/hub/bookings/checkout-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.error ?? "Failed to create checkout");
        setSubmitting(false);
        return;
      }
      if (data?.data?.url) {
        window.location.href = data.data.url;
      } else {
        setSubmitError("Unexpected response");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "payment") {
    const venueName = venues.find((v) => v.id === effectiveVenueId)?.name ?? effectiveVenueId;
    const date = formData.preferredDate;
    const startTime = formData.preferredTime;
    const endTime = prefEndTime || (startTime ? (() => {
      const [h, m] = startTime.split(":").map(Number);
      const endH = ((h ?? 0) + minBookingHours) % 24;
      return `${String(endH).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
    })() : "");
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Proceed To Payment</h1>
            <p className="mt-2 text-muted-foreground">
              Review your booking details and complete payment to confirm your reservation.
            </p>
          </div>
          <Button variant="outline" onClick={() => setStep("form")}>
            Back to form
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              {effectiveTableId || tableId ? "Table Reservation" : "Event Ticket"} · {venueName}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span>{formatTimeForDisplay(startTime)}{endTime ? ` – ${formatTimeForDisplay(endTime)}` : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span>{effectiveTableId && effectiveTable ? effectiveTable.maxCapacity : (parseInt(formData.guestCount, 10) || 1)}</span>
              </div>
              {effectiveTable && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Table</span>
                  <span>{effectiveTable.name} {effectiveTable.tableType && `(${effectiveTable.tableType.replace(/_/g, " ")})`}</span>
                </div>
              )}
              {formData.specialRequests && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Special requests</span>
                  <span className="max-w-[200px] truncate" title={formData.specialRequests}>{formData.specialRequests}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{effectiveTableId || tableId ? "Table base" : "Ticket"}</span>
                <span>{formatAmount(baseAmount, currency)}</span>
              </div>
              {Object.entries(selectedAddOns).map(([name, { quantity, price }]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{name} {quantity > 1 ? `× ${quantity}` : ""}</span>
                  <span>{formatAmount(quantity * price, currency)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatAmount(totalAmount, currency)}</span>
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handlePayWithCard} disabled={submitting} className="flex-1">
                {submitting ? "Redirecting…" : "Pay with Card (Stripe)"}
              </Button>
              <Button variant="outline" disabled className="flex-1 opacity-60 cursor-not-allowed" title="Coming soon">
                Pay with Crypto (AppKit)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            {tableId ? "Book Table" : "Request Booking"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tableId
              ? "Select add-ons and complete your table reservation. Full payment required upfront."
              : "Submit a booking request for tables or event tickets."}
          </p>
        </div>
        <Button variant="outline" >
          <Link href="/hub">Back to Hub</Link>
        </Button>
      </div>

      {(effectiveTableId || tableId) && effectiveTable && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{effectiveTable.name}</CardTitle>
                {effectiveTable.tableType && (
                  <Badge variant={effectiveTable.tableType === "PREMIUM" || effectiveTable.tableType === "ULTRA_VIP" ? "default" : "secondary"}>
                    {effectiveTable.tableType.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {effectiveTable.minCapacity}-{effectiveTable.maxCapacity} guests · {formatAmount(baseAmount, currency)} base
              </p>
            </CardHeader>
            {(effectiveTable.inclusions?.length > 0 || effectiveTable.features?.length > 0) && (
              <CardContent className="pt-0">
                <div className="space-y-3 border-t border-border pt-4">
                  {effectiveTable.inclusions?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Included in your booking
                      </h4>
                      <ul className="flex flex-wrap gap-2">
                        {effectiveTable.inclusions.map((item, index) => (
                          <li
                            key={index}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-sm text-foreground"
                          >
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {effectiveTable.features?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Table features
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {effectiveTable.features.map((feature, index) => {
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
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          {(effectiveTableId || tableId || ticketId) && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {effectiveTableId || tableId ? "Table Reservation" : "Event Ticket"}
              </Badge>
              {effectiveVenueId && (
                <span className="text-sm text-muted-foreground">Venue: {venues.find((v) => v.id === effectiveVenueId)?.name ?? effectiveVenueId}</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProceedToPayment} className="space-y-6">
            <div className={cn("grid gap-4", (effectiveTableId || tableId) ? "md:grid-cols-1" : "md:grid-cols-2")}>
              {!tableId && (
                <div>
                  <Label htmlFor="bookingType">Booking Type</Label>
                  <select
                    id="bookingType"
                    value={formData.bookingType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({ ...prev, bookingType: v }));
                      if (v !== "TABLE") {
                        setSelectedVenueId("");
                        setSelectedTableTier("");
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Select booking type</option>
                    <option value="TABLE">Table Reservation</option>
                    <option value="TICKET">Event Ticket</option>
                  </select>
                </div>
              )}

              {formData.bookingType === "TABLE" && !tableId && (
                <>
                  <div>
                    <Label htmlFor="venue">Venue *</Label>
                    <select
                      id="venue"
                      value={selectedVenueId}
                      onChange={(e) => {
                        setSelectedVenueId(e.target.value);
                        setSelectedTableTier("");
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="">Select venue</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="tableTier">Table Tier *</Label>
                    <select
                      id="tableTier"
                      value={selectedTableTier}
                      onChange={(e) => setSelectedTableTier(e.target.value)}
                      disabled={!selectedVenueId || venueTables.length === 0}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select table tier</option>
                      {Array.from(new Set(venueTables.filter((t) => t.isActive).map((t) => t.tableType).filter(Boolean))).map((tier) => (
                        <option key={tier} value={tier}>{tier?.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    {selectedVenueId && venueTables.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">No tables at this venue.</p>
                    )}
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="guestCount">{(effectiveTableId || tableId) ? "Guests" : "Number of Guests"}</Label>
                {(effectiveTableId || tableId) ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground"
                  >
                    {effectiveTable ? (
                      `Up to ${effectiveTable.maxCapacity} guests (included)`
                    ) : (
                      <span className="text-muted-foreground">Loading…</span>
                    )}
                  </div>
                ) : (
                  <Input
                    id="guestCount"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.guestCount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, guestCount: e.target.value }))}
                    placeholder="1-20 guests"
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="preferredDate">Date *</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, preferredDate: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>

              <div className={cn((effectiveTableId || tableId) && formData.preferredDate && "md:col-span-2")}>
                <Label htmlFor="preferredTime">Arrival time *</Label>
                {(effectiveTableId || tableId) && formData.preferredDate ? (
                  <>
                    {venueSlotsLoading ? (
                      <p className="mt-2 text-sm text-muted-foreground">Loading availability…</p>
                    ) : availabilityData?.message ? (
                      <p className="mt-2 text-sm text-muted-foreground">{availabilityData.message}</p>
                    ) : availabilityData && availabilityData.slots.length > 0 ? (
                      <div className="mt-2 space-y-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {availabilityData.openTime && availabilityData.closeTime && (
                            <span>
                              {formatTimeForDisplay(availabilityData.openTime)} – {formatTimeForDisplay(availabilityData.closeTime)}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Min {availabilityData.minBookingHours}h
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                          {availabilityData.slots.map((s) => {
                            const { slot, canStart, totalTables = 0, bookedCount = 0, availableCount = 0 } = s;
                            const isPast = isSlotPastForToday(formData.preferredDate, slot);
                            const isFullyBooked = availableCount === 0;
                            const hasAvailability = availableCount > 0;
                            const isSelectable = canStart && !isPast;
                            const isSelected = formData.preferredTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => {
                                  if (isSelectable) setFormData((prev) => ({ ...prev, preferredTime: prev.preferredTime === slot ? "" : slot }));
                                }}
                                disabled={!isSelectable}
                                title={
                                  isPast
                                    ? "This time has already passed"
                                    : isFullyBooked
                                      ? `${bookedCount}/${totalTables} booked – fully booked`
                                      : canStart
                                        ? `${availableCount} left – book from ${formatTimeForDisplay(slot)}`
                                        : `${availableCount} left – not enough consecutive hours`
                                }
                                className={cn(
                                  "flex flex-col items-center justify-center rounded-md border-2 px-2 py-2.5 text-center text-sm font-medium transition-colors min-h-[3.5rem]",
                                  isPast
                                    ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 dark:border-border dark:bg-muted/50 dark:text-muted-foreground opacity-60"
                                    : isFullyBooked
                                      ? "cursor-not-allowed border-red-400 bg-red-100 text-red-950 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200"
                                      : hasAvailability && isSelectable
                                        ? "cursor-pointer border-green-600 bg-green-100 text-green-950 dark:border-green-500/40 dark:bg-green-950/40 dark:text-green-200 hover:border-green-700 hover:bg-green-200 dark:hover:bg-green-950/60 dark:hover:border-green-400"
                                        : hasAvailability
                                          ? "cursor-not-allowed border-green-500 bg-green-100/90 text-green-950 dark:border-green-500/40 dark:bg-green-950/30 dark:text-green-300"
                                          : "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-700 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
                                  isSelected && "ring-2 ring-primary ring-offset-2 dark:ring-offset-background"
                                )}
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
                        <div className="flex flex-wrap items-center gap-3 text-xs text-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded border-2 border-green-600 bg-green-100 dark:border-green-500/50 dark:bg-green-500/25" /> Available
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded border-2 border-red-500 bg-red-100 dark:border-red-500/50 dark:bg-red-500/25" /> Fully booked
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded ring-2 ring-primary ring-offset-1 ring-offset-background" /> Selected
                          </span>
                        </div>
                      </div>
                    ) : (effectiveTableId || tableId) && !venueSlotsLoading ? (
                      <p className="mt-2 text-sm text-destructive">Venue closed on this date. Please select another date.</p>
                    ) : null}
                  </>
                ) : (effectiveTableId || tableId) && !formData.preferredDate ? (
                  <p className="mt-2 text-sm text-muted-foreground">Select a date to see available time slots.</p>
                ) : (
                  <select
                    id="preferredTime"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preferredTime: e.target.value }))}
                    required={!((effectiveTableId || tableId) && formData.preferredDate)}
                    className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Select hour</option>
                    {getHourlyTimeOptions()
                      .filter((t) => !isSlotPastForToday(formData.preferredDate, t))
                      .map((t) => (
                        <option key={t} value={t}>{formatTimeForDisplay(t)}</option>
                      ))}
                  </select>
                )}
                {prefDate && prefTime && formData.preferredTime && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Selected from availability: {prefDate} at {formatTimeForDisplay(formData.preferredTime)}
                  </p>
                )}
              </div>
            </div>

            {(effectiveTableId || tableId) && (
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Optional upgrades & add-ons</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enhance your experience with optional upgrades. Select any add-ons to include in your final payment. Required add-ons are pre-selected.
                  </p>
                </div>
                {availableAddOns.length > 0 ? (
                <div className="space-y-3 rounded-lg border-2 border-dashed border-border bg-muted/20 p-4">
                  {availableAddOns.map((addOn) => {
                    const price = typeof addOn.price === "number" ? addOn.price : parseFloat(String(addOn.price)) || 0;
                    const sel = selectedAddOns[addOn.name];
                    const isRequired = !!addOn.required;
                    return (
                      <div
                        key={addOn.name}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`addon-${addOn.name}`}
                            checked={!!sel}
                            onCheckedChange={(checked) =>
                              handleAddOnChange(addOn, !!checked, sel?.quantity ?? 1)
                            }
                            disabled={isRequired}
                          />
                          <label
                            htmlFor={`addon-${addOn.name}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {addOn.name}
                            {addOn.category && (
                              <span className="ml-1 text-muted-foreground">({addOn.category})</span>
                            )}
                            {isRequired ? (
                              <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                            ) : (
                              <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
                            )}
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          {sel && (
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={sel.quantity}
                              onChange={(e) =>
                                handleAddOnQuantityChange(addOn, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-16 h-8 text-sm"
                              disabled={isRequired}
                            />
                          )}
                          <span className="text-sm font-medium min-w-[80px] text-right">
                            {formatAmount(price, currency)} each
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                    No add-ons available for this table.
                  </p>
                )}
              </div>
            )}

            {(effectiveTableId || tableId || ticketId) && totalAmount > 0 && (
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {effectiveTableId || tableId ? "Table base" : "Ticket"}
                    </span>
                    <span>{formatAmount(baseAmount, currency)}</span>
                  </div>
                  {Object.entries(selectedAddOns).map(([name, { quantity, price }]) => (
                    <div key={name} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {name} {quantity > 1 ? `× ${quantity}` : ""}
                      </span>
                      <span>{formatAmount(quantity * price, currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t border-border">
                    <span>Total (full payment upfront)</span>
                    <span>{formatAmount(totalAmount, currency)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
              {!profilePhone && formData.contactPhone.trim() && (
                <div className="mt-2 flex items-center gap-2">
                  <Checkbox
                    id="savePhoneAsDefault"
                    checked={savePhoneAsDefault}
                    onCheckedChange={(checked) => setSavePhoneAsDefault(!!checked)}
                  />
                  <label
                    htmlFor="savePhoneAsDefault"
                    className="text-sm cursor-pointer select-none text-muted-foreground hover:text-foreground"
                  >
                    Save as default contact number for future bookings
                  </label>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="Any special dietary requirements, accessibility needs, or other requests..."
                rows={4}
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={submitting}>
                Proceed To Payment
              </Button>
              <Button type="button" variant="outline">
                <Link href="/hub">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Table booking</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Full payment required upfront to confirm your reservation</li>
              <li>Add-ons are itemized and included in the total</li>
              <li>You will receive confirmation via email</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Cancellation Policy</h4>
            <p className="text-sm text-muted-foreground">
              {tableId
                ? "Table reservations are paid in full upfront and are non-refundable. Cancellations are not permitted. Please contact the venue directly for exceptional circumstances."
                : "Free cancellation up to 24 hours before your booking. Cancellations within 24 hours may incur a fee."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
