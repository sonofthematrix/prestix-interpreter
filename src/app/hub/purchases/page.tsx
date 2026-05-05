"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useHubListSlice } from "@/hooks/useHubListSlice";
import { HubEntityCard } from "@/components/hub/HubEntityCard";
import { HubDataTable } from "@/components/hub/HubDataTable";
import { HubFilterBar, HubDateRangeFields, DEFAULT_DATE_PRESETS, type DatePreset } from "@/components/hub/HubFilterBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hooks";
import { ViewToggle } from "@/components/hub/ViewToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PurchaseItem {
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

interface PurchaseFilters {
  venueId?: string;
  rail?: string;
  status?: string;
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

export default function HubPurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
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
  } = useHubListSlice("purchases");
  const viewMode = useAppSelector((state) => state.ui.hubListViewMode);

  const effectiveDateRange = useMemo(() => {
    if (datePreset === "custom") {
      return { dateFrom: customDateFrom || undefined, dateTo: customDateTo || undefined };
    }
    return getDateRangeFromPreset(datePreset ?? "30");
  }, [datePreset, customDateFrom, customDateTo]);

  const filtersWithDate = useMemo(
    () => ({
      ...filters,
      dateFrom: effectiveDateRange.dateFrom,
      dateTo: effectiveDateRange.dateTo,
    }),
    [filters, effectiveDateRange]
  );

  const filteredPurchases = useMemo(() => {
    let filtered = purchases;

    const from = filtersWithDate.dateFrom;
    const to = filtersWithDate.dateTo;
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter((p) => new Date(p.createdAt) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.createdAt) <= toDate);
    }

    if (filters.venueId) {
      filtered = filtered.filter((p) => p.booking?.venue?.id === filters.venueId);
    }
    if (filters.rail) {
      filtered = filtered.filter((p) => p.rail === filters.rail);
    }
    if (filters.status) {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((p) => {
        const combined = [
          p.id,
          p.booking?.bookingNumber,
          p.booking?.venue?.name,
          p.booking?.member?.name,
          p.booking?.member?.email,
          p.amount,
          p.currency,
          p.rail,
          p.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return combined.includes(q);
      });
    }

    return filtered;
  }, [purchases, search, filtersWithDate]);

  const filterOptions = useMemo(() => {
    const venues = Array.from(
      new Set(purchases.map((p) => p.booking?.venue?.name).filter(Boolean))
    ).sort() as string[];
    const venueIds = venues.map(
      (name) => purchases.find((p) => p.booking?.venue?.name === name)?.booking?.venue?.id ?? ""
    );
    const rails = Array.from(new Set(purchases.map((p) => p.rail))).sort();
    const statuses = Array.from(new Set(purchases.map((p) => p.status))).sort();
    return {
      venues: venues.map((name, i) => ({ name, id: venueIds[i] ?? "" })),
      rails,
      statuses,
    };
  }, [purchases]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (filters.venueId) count++;
    if (filters.rail) count++;
    if (filters.status) count++;
    if (datePreset === "custom" && (customDateFrom || customDateTo)) count++;
    return count;
  }, [search, filters, datePreset, customDateFrom, customDateTo]);

  const groupKeyFn = useCallback((item: PurchaseItem): string => {
    if (groupBy === "venue") return item.booking?.venue?.name ?? "No Venue";
    if (groupBy === "rail") return item.rail;
    if (groupBy === "status") return item.status;
    return "No Group";
  }, [groupBy]);

  const groupAggregations = useCallback((items: PurchaseItem[]) => {
    const count = items.length;
    const totalAmount = items.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const currency = items[0]?.currency ?? "IDR";
    return { count, totalAmount, currency };
  }, []);

  const renderGroupHeader = useCallback(
    (groupKey: string, _items: PurchaseItem[], agg: ReturnType<typeof groupAggregations>) => {
      if (!agg) return null;
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">{groupKey}</span>
            <Badge variant="secondary" className="font-medium">
              {agg.count} purchases
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Total: {agg.currency} {agg.totalAmount.toLocaleString()}
          </div>
        </div>
      );
    },
    []
  );

  // Mount-time data fetch only (Redux-compliant)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/hub/purchases", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && Array.isArray(body.data)) {
          setPurchases(body.data);
        } else {
          setError(body.error || "Failed to load purchases");
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
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "id",
        header: "Payment ID",
        render: (r: PurchaseItem) => r.id.slice(0, 8) + "…",
      },
      {
        key: "booking",
        header: "Booking",
        render: (r: PurchaseItem) => r.booking?.bookingNumber ?? "—",
      },
      {
        key: "venue",
        header: "Venue",
        render: (r: PurchaseItem) => r.booking?.venue?.name ?? "—",
      },
      {
        key: "amount",
        header: "Amount",
        render: (r: PurchaseItem) => `${r.currency} ${r.amount}`,
        sortable: true,
        sortValue: (r: PurchaseItem) => parseFloat(r.amount || "0"),
      },
      {
        key: "rail",
        header: "Rail",
        render: (r: PurchaseItem) => r.rail,
        sortable: true,
        sortValue: (r: PurchaseItem) => r.rail,
      },
      {
        key: "status",
        header: "Status",
        render: (r: PurchaseItem) => r.status,
        sortable: true,
        sortValue: (r: PurchaseItem) => r.status,
      },
      {
        key: "created",
        header: "Created",
        render: (r: PurchaseItem) => new Date(r.createdAt).toLocaleString(),
        sortable: true,
        sortValue: (r: PurchaseItem) => new Date(r.createdAt).getTime(),
      },
    ],
    []
  );

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
        <Label htmlFor="filter-venue" className="text-sm font-medium text-foreground">
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
        <Label htmlFor="filter-rail" className="text-sm font-medium text-foreground">
          Rail
        </Label>
        <Select
          value={filters.rail ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, rail: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-rail" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All rails" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All rails</SelectItem>
            {filterOptions.rails.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-status" className="text-sm font-medium text-foreground">
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
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Purchases</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Purchases</h1>
        <p className="mt-2 text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Purchases</h1>
            <p className="mt-2 text-muted-foreground">
              Payment and purchase history.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-initial sm:justify-end">
            <HubFilterBar
              className="order-first w-full sm:order-none sm:w-auto sm:flex-1 sm:min-w-0"
              activeFiltersCount={activeFiltersCount}
              filterContent={filterContent}
              searchValue={search}
              onSearchChange={onSearchChange}
              searchPlaceholder="Search purchases…"
              groupByValue={groupBy}
              groupByOptions={[
                { value: "venue", label: "By Venue" },
                { value: "rail", label: "By Rail" },
                { value: "status", label: "By Status" },
              ]}
              onGroupByChange={onGroupByChange}
              datePresetValue={datePreset ?? "30"}
              datePresetOptions={DEFAULT_DATE_PRESETS}
              onDatePresetChange={onDatePresetChange}
              onClearFilters={onClearFilters}
            />
            <ViewToggle />
          </div>
        </div>

      {viewMode === "cards" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPurchases.map((p) => (
            <HubEntityCard
              key={p.id}
              href={`/hub/purchases/${p.id}`}
              title={`${p.currency} ${p.amount}`}
              subtitle={p.booking?.bookingNumber ?? undefined}
              meta={[
                { label: "Booking", value: p.booking?.bookingNumber ?? "—" },
                { label: "Venue", value: p.booking?.venue?.name ?? "—" },
                { label: "Rail", value: p.rail },
                { label: "Status", value: p.status },
                { label: "Created", value: new Date(p.createdAt).toLocaleString() },
              ]}
              actions={
                <Button variant="outline" size="sm">
                  <Link href={`/hub/purchases/${p.id}`}>View</Link>
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-card">
          <HubDataTable
            columns={columns}
            data={filteredPurchases}
            keyFn={(r) => r.id}
            getRowHref={(r) => `/hub/purchases/${r.id}`}
            getRowActions={(r) => (
              <Button variant="outline" size="sm">
                <Link href={`/hub/purchases/${r.id}`}>View</Link>
              </Button>
            )}
            enableSorting
            defaultSortKey="created"
            defaultSortDirection="desc"
            enableGrouping={!!groupBy}
            groupBy={groupBy ?? undefined}
            groupKeyFn={groupBy ? groupKeyFn : undefined}
            renderGroupHeader={renderGroupHeader}
            groupAggregations={groupAggregations}
            emptyMessage="No purchases match your filters."
            pageSize={pageSize}
            page={page}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            paginationEntityLabel="purchases"
          />
        </div>
      )}
    </div>
    </div>
  );
}
