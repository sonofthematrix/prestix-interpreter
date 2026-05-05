"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useHubListSlice } from "@/hooks/useHubListSlice";
import { HubEntityCard } from "@/components/hub/HubEntityCard";
import { HubDataTable } from "@/components/hub/HubDataTable";
import { HubFilterBar } from "@/components/hub/HubFilterBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hooks";
import { ViewToggle } from "@/components/hub/ViewToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PromoterItem {
  id: string;
  userId: string;
  status: string;
  tier: string;
  referralCode: string;
  totalBookings: number;
  totalGrossRevenue: string;
  totalPromoterEarnings: string;
  profileImageUrl?: string;
  user: { id: string; email: string | null; name: string | null; profileImageUrl?: string | null } | null;
}

interface PromoterFilters {
  status?: string;
  tier?: string;
}

export default function HubPromotersPage() {
  const [promoters, setPromoters] = useState<PromoterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    search,
    filters,
    groupBy,
    page,
    pageSize,
    onSearchChange,
    onFiltersUpdate,
    onGroupByChange,
    onPageChange,
    onPageSizeChange,
    onClearFilters,
  } = useHubListSlice("promoters");
  const viewMode = useAppSelector((state) => state.ui.hubListViewMode);

  const filteredPromoters = useMemo(() => {
    let filtered = promoters;

    if (filters.status) {
      filtered = filtered.filter((p) => p.status === filters.status);
    }
    if (filters.tier) {
      filtered = filtered.filter((p) => p.tier === filters.tier);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((p) => {
        const combined = [
          p.user?.name,
          p.user?.email,
          p.status,
          p.tier,
          p.referralCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return combined.includes(q);
      });
    }

    return filtered;
  }, [promoters, search, filters]);

  const filterOptions = useMemo(() => {
    const statuses = Array.from(new Set(promoters.map((p) => p.status))).sort();
    const tiers = Array.from(new Set(promoters.map((p) => p.tier))).sort();
    return { statuses, tiers };
  }, [promoters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (filters.status) count++;
    if (filters.tier) count++;
    return count;
  }, [search, filters]);

  const groupKeyFn = useCallback((item: PromoterItem): string => {
    if (groupBy === "tier") return item.tier;
    if (groupBy === "status") return item.status;
    return "No Group";
  }, [groupBy]);

  const groupAggregations = useCallback((items: PromoterItem[]) => {
    const count = items.length;
    const totalBookings = items.reduce((sum, p) => sum + p.totalBookings, 0);
    const totalEarnings = items.reduce((sum, p) => sum + parseFloat(p.totalPromoterEarnings || "0"), 0);
    return { count, totalBookings, totalEarnings };
  }, []);

  const renderGroupHeader = useCallback(
    (groupKey: string, _items: PromoterItem[], agg: ReturnType<typeof groupAggregations>) => {
      if (!agg) return null;
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">{groupKey}</span>
            <Badge variant="secondary" className="font-medium">
              {agg.count} promoters
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{agg.totalBookings} bookings</span>
            <span>${agg.totalEarnings.toFixed(2)} earned</span>
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
    fetch("/api/hub/promoters", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && Array.isArray(body.data)) {
          setPromoters(body.data);
        } else {
          setError(body.error || "Failed to load promoters");
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
        key: "name",
        header: "Name",
        render: (r: PromoterItem) => r.user?.name ?? r.user?.email ?? "—",
        sortable: true,
        sortValue: (r: PromoterItem) => (r.user?.name ?? r.user?.email ?? "").toLowerCase(),
      },
      { key: "email", header: "Email", render: (r: PromoterItem) => r.user?.email ?? "—" },
      {
        key: "status",
        header: "Status",
        render: (r: PromoterItem) => r.status,
        sortable: true,
        sortValue: (r: PromoterItem) => r.status,
      },
      {
        key: "tier",
        header: "Tier",
        render: (r: PromoterItem) => r.tier,
        sortable: true,
        sortValue: (r: PromoterItem) => r.tier,
      },
      { key: "referralCode", header: "Referral code", render: (r: PromoterItem) => r.referralCode },
      {
        key: "bookings",
        header: "Bookings",
        render: (r: PromoterItem) => r.totalBookings,
        sortable: true,
        sortValue: (r: PromoterItem) => r.totalBookings,
      },
      {
        key: "earnings",
        header: "Earnings",
        render: (r: PromoterItem) => r.totalPromoterEarnings,
        sortable: true,
        sortValue: (r: PromoterItem) => parseFloat(r.totalPromoterEarnings || "0"),
      },
    ],
    []
  );

  const selectContentClass =
    "z-50 border border-border bg-background text-foreground shadow-md dark:border-border dark:bg-background dark:text-foreground";

  const filterContent = (
    <div className="flex flex-row flex-wrap items-end gap-3">
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
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-tier" className="text-sm font-medium text-foreground">
          Tier
        </Label>
        <Select
          value={filters.tier ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, tier: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-tier" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All tiers</SelectItem>
            {filterOptions.tiers.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
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
        <h1 className="font-serif text-3xl font-bold text-foreground">Promoters</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Promoters</h1>
        <p className="mt-2 text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Promoters</h1>
            <p className="mt-2 text-muted-foreground">
              Promoter profiles and performance.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-initial sm:justify-end">
            <HubFilterBar
              className="order-first w-full sm:order-none sm:w-auto sm:flex-1 sm:min-w-0"
              activeFiltersCount={activeFiltersCount}
              filterContent={filterContent}
              searchValue={search}
              onSearchChange={onSearchChange}
              searchPlaceholder="Search promoters…"
              groupByValue={groupBy}
              groupByOptions={[
                { value: "tier", label: "By Tier" },
                { value: "status", label: "By Status" },
              ]}
              onGroupByChange={onGroupByChange}
              onClearFilters={onClearFilters}
            />
            <ViewToggle />
          </div>
        </div>

      {viewMode === "cards" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPromoters.map((p) => (
            <HubEntityCard
              key={p.id}
              href={`/hub/promoters/${p.id}`}
              title={p.user?.name ?? p.user?.email ?? "Promoter"}
              subtitle={p.user?.email ?? undefined}
              imageUrl={p.profileImageUrl ?? undefined}
              meta={[
                { label: "Status", value: p.status },
                { label: "Tier", value: p.tier },
                { label: "Referral", value: p.referralCode },
                { label: "Bookings", value: p.totalBookings },
                { label: "Earnings", value: p.totalPromoterEarnings },
              ]}
              actions={
                <Button variant="outline" size="sm">
                  <Link href={`/hub/promoters/${p.id}`}>View</Link>
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-card">
          <HubDataTable
            columns={columns}
            data={filteredPromoters}
            keyFn={(r) => r.id}
            getRowHref={(r) => `/hub/promoters/${r.id}`}
            imageColumn={{
              getImageUrl: (r) => r.profileImageUrl,
              altText: "Promoter",
              size: "sm",
            }}
            getRowActions={(r) => (
              <Button variant="outline" size="sm">
                <Link href={`/hub/promoters/${r.id}`}>View</Link>
              </Button>
            )}
            enableSorting
            defaultSortKey="earnings"
            defaultSortDirection="desc"
            enableGrouping={!!groupBy}
            groupBy={groupBy ?? undefined}
            groupKeyFn={groupBy ? groupKeyFn : undefined}
            renderGroupHeader={renderGroupHeader}
            groupAggregations={groupAggregations}
            emptyMessage="No promoters match your filters."
            pageSize={pageSize}
            page={page}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            paginationEntityLabel="promoters"
          />
        </div>
      )}
    </div>
    </div>
  );
}
