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

interface VenueItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venueType: string;
  status: string;
  city: string;
  country: string;
  coverImage: string | null;
  logoImage: string | null;
  tableCount: number;
  ticketCount: number;
  announcementCount: number;
}

interface VenueFilters {
  venueType?: string;
  city?: string;
}

export default function HubMarketplacePage() {
  const [venues, setVenues] = useState<VenueItem[]>([]);
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
  } = useHubListSlice("marketplace");
  const viewMode = useAppSelector((state) => state.ui.hubListViewMode);

  const filteredVenues = useMemo(() => {
    let filtered = venues;

    if (filters.venueType) {
      filtered = filtered.filter((v) => v.venueType === filters.venueType);
    }
    if (filters.city) {
      filtered = filtered.filter((v) => v.city === filters.city);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((v) => {
        const combined = [v.name, v.slug, v.venueType, v.city]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return combined.includes(q);
      });
    }

    return filtered;
  }, [venues, search, filters]);

  const filterOptions = useMemo(() => {
    const venueTypes = Array.from(new Set(venues.map((v) => v.venueType))).sort();
    const cities = Array.from(new Set(venues.map((v) => v.city).filter(Boolean))).sort();
    return { venueTypes, cities };
  }, [venues]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (filters.venueType) count++;
    if (filters.city) count++;
    return count;
  }, [search, filters]);

  const groupKeyFn = useCallback((item: VenueItem): string => {
    if (groupBy === "venueType") return item.venueType;
    if (groupBy === "city") return item.city || "No city";
    return "No Group";
  }, [groupBy]);

  const groupAggregations = useCallback((items: VenueItem[]) => {
    const count = items.length;
    const totalTables = items.reduce((sum, v) => sum + v.tableCount, 0);
    const totalTickets = items.reduce((sum, v) => sum + v.ticketCount, 0);
    return { count, totalTables, totalTickets };
  }, []);

  const renderGroupHeader = useCallback(
    (groupKey: string, _items: VenueItem[], agg: ReturnType<typeof groupAggregations>) => {
      if (!agg) return null;
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">{groupKey}</span>
            <Badge variant="secondary" className="font-medium">
              {agg.count} venues
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{agg.totalTables} tables</span>
            <span>{agg.totalTickets} tickets</span>
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
    fetch("/api/hub/venues", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && Array.isArray(body.data)) {
          setVenues(body.data);
        } else {
          setError(body.error || "Failed to load venues");
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
        header: "Venue",
        render: (r: VenueItem) => r.name,
        sortable: true,
        sortValue: (r: VenueItem) => r.name.toLowerCase(),
      },
      { key: "slug", header: "Slug", render: (r: VenueItem) => r.slug },
      {
        key: "venueType",
        header: "Type",
        render: (r: VenueItem) => r.venueType,
        sortable: true,
        sortValue: (r: VenueItem) => r.venueType,
      },
      {
        key: "city",
        header: "City",
        render: (r: VenueItem) => r.city,
        sortable: true,
        sortValue: (r: VenueItem) => (r.city || "").toLowerCase(),
      },
      {
        key: "tables",
        header: "Tables",
        render: (r: VenueItem) => r.tableCount,
        sortable: true,
        sortValue: (r: VenueItem) => r.tableCount,
      },
      {
        key: "tickets",
        header: "Tickets",
        render: (r: VenueItem) => r.ticketCount,
        sortable: true,
        sortValue: (r: VenueItem) => r.ticketCount,
      },
    ],
    []
  );

  const selectContentClass =
    "z-50 border border-border bg-background text-foreground shadow-md dark:border-border dark:bg-background dark:text-foreground";

  const filterContent = (
    <div className="flex flex-row flex-wrap items-end gap-3">
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-type" className="text-sm font-medium text-foreground">
          Type
        </Label>
        <Select
          value={filters.venueType ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, venueType: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-type" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All types</SelectItem>
            {filterOptions.venueTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label htmlFor="filter-city" className="text-sm font-medium text-foreground">
          City
        </Label>
        <Select
          value={filters.city ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, city: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger id="filter-city" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All cities</SelectItem>
            {filterOptions.cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
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
        <h1 className="font-serif text-3xl font-bold text-foreground">Marketplace</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Marketplace</h1>
        <p className="mt-2 text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Marketplace</h1>
            <p className="mt-2 text-muted-foreground">
              Partner venues and listings. View venue details and manage from Venues.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-initial sm:justify-end">
            <HubFilterBar
              className="order-first w-full sm:order-none sm:w-auto sm:flex-1 sm:min-w-0"
              activeFiltersCount={activeFiltersCount}
              filterContent={filterContent}
              searchValue={search}
              onSearchChange={onSearchChange}
              searchPlaceholder="Search venues…"
              groupByValue={groupBy}
              groupByOptions={[
                { value: "venueType", label: "By Type" },
                { value: "city", label: "By City" },
              ]}
              onGroupByChange={onGroupByChange}
              onClearFilters={onClearFilters}
            />
            <ViewToggle />
          </div>
        </div>

      {viewMode === "cards" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVenues.map((v) => (
            <HubEntityCard
              key={v.id}
              href={`/hub/venues/${v.id}`}
              title={v.name}
              subtitle={v.description ?? undefined}
              imageUrl={v.coverImage ?? v.logoImage ?? undefined}
              meta={[
                { label: "Type", value: v.venueType },
                { label: "City", value: v.city },
                { label: "Tables", value: v.tableCount },
                { label: "Tickets", value: v.ticketCount },
              ]}
              actions={
                <>
                  <Button variant="outline" size="sm">
                    <Link href={`/hub/venues/${v.id}`}>View</Link>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Link href={`/hub/venues/${v.id}/edit`}>Edit</Link>
                  </Button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-card">
          <HubDataTable
            columns={columns}
            data={filteredVenues}
            keyFn={(r) => r.id}
            getRowHref={(r) => `/hub/venues/${r.id}`}
            getRowActions={(r) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Link href={`/hub/venues/${r.id}`}>View</Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Link href={`/hub/venues/${r.id}/edit`}>Edit</Link>
                </Button>
              </div>
            )}
            enableSorting
            defaultSortKey="name"
            defaultSortDirection="asc"
            enableGrouping={!!groupBy}
            groupBy={groupBy ?? undefined}
            groupKeyFn={groupBy ? groupKeyFn : undefined}
            renderGroupHeader={renderGroupHeader}
            groupAggregations={groupAggregations}
            emptyMessage="No venues match your filters. Run the Miss Fish seed or add a venue."
            pageSize={pageSize}
            page={page}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            paginationEntityLabel="venues"
          />
        </div>
      )}
    </div>
    </div>
  );
}
