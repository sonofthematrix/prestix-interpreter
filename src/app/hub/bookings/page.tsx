"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useHubListSlice } from "@/hooks/useHubListSlice";
import { HubDataTable } from "@/components/hub/HubDataTable";
import { HubFilterBar, HubDateRangeFields, DEFAULT_DATE_PRESETS, type DatePreset } from "@/components/hub/HubFilterBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BuildingIcon, TicketIcon, UserIcon } from "lucide-react";

interface BookingFilters {
  dateFrom?: string;
  dateTo?: string;
  venueId?: string;
  bookingType?: string;
  status?: string;
  promoterTier?: string;
}

interface BookingItem {
  id: string;
  bookingNumber: string;
  bookingType: string;
  bookingDate: string;
  startTime: string;
  guestCount: number;
  totalAmount: string;
  currency: string;
  status: string;
  venue: { id: string; name: string; slug: string } | null;
  member: { id: string; email: string | null; name: string | null } | null;
  table: { id: string; name: string } | null;
  ticket: { id: string; name: string } | null;
  promoter: { id: string; name: string; tier: string; referralCode?: string } | null;
  venueShare: string;
  commissionPool: string;
  promoterEarning: string;
  platformPassive: string;
  platformFee: string;
  totalPlatformRevenue: string;
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

/** Status badge variant and styling */
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

/** Compute date range from preset */
function getDateRangeFromPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const to = today.toISOString().slice(0, 10);

  let fromDate: Date;
  switch (preset) {
    case "7":
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 6);
      fromDate.setHours(0, 0, 0, 0);
      break;
    case "30":
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 29);
      fromDate.setHours(0, 0, 0, 0);
      break;
    case "90":
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 89);
      fromDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    default:
      return { dateFrom: "", dateTo: "" };
  }
  const from = fromDate.toISOString().slice(0, 10);
  return { dateFrom: from, dateTo: to };
}

export default function HubBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    search,
    filters,
    groupBy,
    page,
    pageSize,
    datePreset,
    customDateFrom,
    customDateTo,
    onSearchChange,
    onFiltersUpdate,
    onGroupByChange,
    onPageChange,
    onPageSizeChange,
    onDatePresetChange,
    onCustomDateFromChange,
    onCustomDateToChange,
    onClearFilters,
  } = useHubListSlice("bookings");

  // Resolve effective date range (preset or custom)
  const effectiveDateRange = useMemo(() => {
    if (datePreset === "custom") {
      return { dateFrom: customDateFrom || undefined, dateTo: customDateTo || undefined };
    }
    return getDateRangeFromPreset(datePreset ?? "30");
  }, [datePreset, customDateFrom, customDateTo]);

  // Merge effective date range into filters for filtering
  const filtersWithDate = useMemo((): BookingFilters => {
    const base = filters as BookingFilters;
    return {
      ...base,
      dateFrom: effectiveDateRange.dateFrom || base.dateFrom,
      dateTo: effectiveDateRange.dateTo || base.dateTo,
    };
  }, [filters, effectiveDateRange]);

  // Filter and aggregate bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    const from = filtersWithDate.dateFrom;
    const to = filtersWithDate.dateTo;
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter((b) => new Date(b.bookingDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((b) => new Date(b.bookingDate) <= toDate);
    }

    if (filtersWithDate.venueId) {
      filtered = filtered.filter((b) => b.venue?.id === filtersWithDate.venueId);
    }
    if (filtersWithDate.bookingType) {
      filtered = filtered.filter((b) => b.bookingType === filtersWithDate.bookingType);
    }
    if (filtersWithDate.status) {
      filtered = filtered.filter((b) => b.status === filtersWithDate.status);
    }
    if (filtersWithDate.promoterTier) {
      filtered = filtered.filter((b) => b.promoter?.tier === filtersWithDate.promoterTier);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((b) => {
        const num = b.bookingNumber?.toLowerCase() ?? "";
        const venue = b.venue?.name?.toLowerCase() ?? "";
        const member = [b.member?.name, b.member?.email].filter(Boolean).join(" ").toLowerCase();
        const promoter = b.promoter?.name?.toLowerCase() ?? "";
        const table = b.table?.name?.toLowerCase() ?? "";
        const ticket = b.ticket?.name?.toLowerCase() ?? "";
        const combined = [num, venue, member, promoter, table, ticket].join(" ");
        return combined.includes(q);
      });
    }

    return filtered;
  }, [bookings, filtersWithDate, search]);

  // Aggregations
  const aggregations = useMemo(() => {
    const total = filteredBookings.length;
    const totalAmount = filteredBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalPromoterEarnings = filteredBookings.reduce((sum, b) => sum + parseFloat(b.promoterEarning), 0);
    const totalPlatformRevenue = filteredBookings.reduce((sum, b) => sum + parseFloat(b.totalPlatformRevenue), 0);
    const currency = filteredBookings[0]?.currency ?? "IDR";
    return {
      total,
      totalAmount,
      totalPromoterEarnings,
      totalPlatformRevenue,
      currency,
    };
  }, [filteredBookings]);

  const groupAggregations = useCallback((items: BookingItem[]) => {
    const count = items.length;
    const totalAmount = items.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalPromoterEarnings = items.reduce((sum, b) => sum + parseFloat(b.promoterEarning), 0);
    const totalPlatformRevenue = items.reduce((sum, b) => sum + parseFloat(b.totalPlatformRevenue), 0);
    const currency = items[0]?.currency ?? "IDR";
    return {
      count,
      totalAmount,
      totalPromoterEarnings,
      totalPlatformRevenue,
      currency,
    };
  }, []);

  const renderGroupHeader = useCallback(
    (groupKey: string, items: BookingItem[], agg: ReturnType<typeof groupAggregations>) => {
      if (!agg) return null;
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">{groupKey}</span>
            <Badge variant="secondary" className="font-medium">
              {agg.count} bookings
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Total: {formatAmount(agg.totalAmount, agg.currency)}</span>
            <span>Promoter: {formatAmount(agg.totalPromoterEarnings, agg.currency)}</span>
            <span>Platform: {formatAmount(agg.totalPlatformRevenue, agg.currency)}</span>
          </div>
        </div>
      );
    },
    []
  );

  const filterOptions = useMemo(() => {
    const venues = Array.from(new Set(bookings.map((b) => b.venue?.name).filter(Boolean))).sort();
    const bookingTypes = Array.from(new Set(bookings.map((b) => b.bookingType))).sort();
    const statuses = Array.from(new Set(bookings.map((b) => b.status))).sort();
    const promoterTiers = Array.from(new Set(bookings.map((b) => b.promoter?.tier).filter(Boolean))).sort();
    return {
      venues: venues.map((name) => ({
        name: name!,
        id: bookings.find((b) => b.venue?.name === name)?.venue?.id ?? "",
      })),
      bookingTypes,
      statuses,
      promoterTiers,
    };
  }, [bookings]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (filters.venueId) count++;
    if (filters.bookingType) count++;
    if (filters.status) count++;
    if (filters.promoterTier) count++;
    if (datePreset === "custom" && (customDateFrom || customDateTo)) count++;
    return count;
  }, [search, filters, datePreset, customDateFrom, customDateTo]);

  const groupKeyFn = useCallback((item: BookingItem): string => {
    if (groupBy === "venue") return item.venue?.name ?? "No Venue";
    if (groupBy === "promoter") return item.promoter?.name ?? "No Promoter";
    if (groupBy === "bookingType") return item.bookingType;
    return "No Group";
  }, [groupBy]);

  // Mount-time data fetch only (Redux-compliant)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/hub/bookings", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && Array.isArray(body.data)) {
          setBookings(body.data);
        } else {
          setError(body.error ?? "Failed to load bookings");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo(
    () => [
      { key: "number", header: "Number", render: (r: BookingItem) => r.bookingNumber },
      { key: "venue", header: "Venue", render: (r: BookingItem) => r.venue?.name ?? "—" },
      {
        key: "member",
        header: "Member",
        render: (r: BookingItem) => r.member?.name ?? r.member?.email ?? "—",
      },
      {
        key: "promoter",
        header: "Promoter",
        render: (r: BookingItem) =>
          r.promoter ? `${r.promoter.name} (${r.promoter.tier})` : "—",
      },
      {
        key: "promoCode",
        header: "Promo Code",
        render: (r: BookingItem) =>
          r.promoter?.referralCode ?? "—",
      },
      {
        key: "date",
        header: "Date",
        render: (r: BookingItem) => new Date(r.bookingDate).toLocaleDateString(),
      },
      { key: "time", header: "Time", render: (r: BookingItem) => r.startTime },
      {
        key: "type",
        header: "Type",
        render: (r: BookingItem) => (
          <span className="text-foreground">
            {r.bookingType === "EVENT_TICKET" ? "Ticket" : "Table"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (r: BookingItem) => {
          const props = getStatusBadgeProps(r.status);
          return (
            <Badge variant={props.variant} className={props.className}>
              {r.status.replace(/_/g, " ")}
            </Badge>
          );
        },
      },
      {
        key: "amount",
        header: "Total Amount",
        render: (r: BookingItem) =>
          formatAmount(parseFloat(r.totalAmount), r.currency),
        sortable: true,
        sortValue: (r: BookingItem) => parseFloat(r.totalAmount),
      },
      {
        key: "promoterEarning",
        header: "Promoter Earned",
        render: (r: BookingItem) =>
          formatAmount(parseFloat(r.promoterEarning), r.currency),
        sortable: true,
        sortValue: (r: BookingItem) => parseFloat(r.promoterEarning),
      },
      {
        key: "platformRevenue",
        header: "Platform Revenue",
        render: (r: BookingItem) =>
          formatAmount(parseFloat(r.totalPlatformRevenue), r.currency),
        sortable: true,
        sortValue: (r: BookingItem) => parseFloat(r.totalPlatformRevenue),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Bookings</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Bookings</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const selectContentClass =
    "z-50 border border-border bg-background text-foreground shadow-md dark:border-border dark:bg-background dark:text-foreground";

  const filterContent = (
    <div className="flex flex-row flex-wrap items-end gap-3">
      <HubDateRangeFields
        dateFrom={customDateFrom ?? ""}
        dateTo={customDateTo ?? ""}
        onDateFromChange={onCustomDateFromChange}
        onDateToChange={onCustomDateToChange}
        showCustomRange={datePreset === "custom"}
      />
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-venue" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BuildingIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          Venue
        </Label>
        <Select
          value={filters.venueId ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, venueId: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-venue" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All venues" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All venues</SelectItem>
            {filterOptions.venues.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-type" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <TicketIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          Type
        </Label>
        <Select
          value={filters.bookingType ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, bookingType: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-type" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All types</SelectItem>
            {filterOptions.bookingTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "EVENT_TICKET" ? "Ticket" : "Table"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-status" className="flex items-center gap-2 text-sm font-medium text-foreground">
          Status
        </Label>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, status: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-status" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All statuses</SelectItem>
            {filterOptions.statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-tier" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          Promoter tier
        </Label>
        <Select
          value={filters.promoterTier ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, promoterTier: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-tier" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All tiers</SelectItem>
            {filterOptions.promoterTiers.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-bold text-foreground">Bookings</h1>

      <HubFilterBar
        activeFiltersCount={activeFiltersCount}
        filterContent={filterContent}
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search bookings…"
        groupByValue={groupBy}
        groupByOptions={[
          { value: "venue", label: "By Venue" },
          { value: "bookingType", label: "By Type" },
          { value: "promoter", label: "By Promoter" },
        ]}
        onGroupByChange={onGroupByChange}
        datePresetValue={datePreset ?? "30"}
        datePresetOptions={DEFAULT_DATE_PRESETS}
        onDatePresetChange={onDatePresetChange}
        onClearFilters={onClearFilters}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-foreground">{aggregations.total}</div>
          <div className="text-sm text-muted-foreground">Total Bookings</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-foreground">
            {formatAmount(aggregations.totalAmount, aggregations.currency)}
          </div>
          <div className="text-sm text-muted-foreground">Total Revenue</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-foreground">
            {formatAmount(aggregations.totalPromoterEarnings, aggregations.currency)}
          </div>
          <div className="text-sm text-muted-foreground">Promoter Earnings</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold text-foreground">
            {formatAmount(aggregations.totalPlatformRevenue, aggregations.currency)}
          </div>
          <div className="text-sm text-muted-foreground">Platform Revenue</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <HubDataTable
          columns={columns}
          data={filteredBookings}
          keyFn={(r) => r.id}
          getRowHref={(r) => `/hub/bookings/${r.id}`}
          getRowActions={(r) => (
            <Link
              href={`/hub/bookings/${r.id}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-accent/70 bg-background px-3 text-sm font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground"
            >
              View
            </Link>
          )}
          enableSorting
          defaultSortKey="amount"
          defaultSortDirection="desc"
          enableGrouping={!!groupBy}
          groupBy={groupBy ?? undefined}
          groupKeyFn={groupBy ? groupKeyFn : undefined}
          renderGroupHeader={renderGroupHeader}
          groupAggregations={groupAggregations}
          emptyMessage="No bookings match your filters."
          pageSize={pageSize}
          page={page}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          paginationEntityLabel="bookings"
        />
      </div>
    </div>
  );
}
