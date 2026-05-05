"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useHubListSlice } from "@/hooks/useHubListSlice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Link, Plus } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { PromoterSearch } from "@/components/hub/venue/promoters/PromoterSearch";
import { VenueEventSelector } from "@/components/hub/venue/VenueEventSelector";
import { HubDataTable } from "@/components/hub/HubDataTable";
import { HubFilterBar } from "@/components/hub/HubFilterBar";

interface Assignment {
  id: string;
  status: string;
  nominatedAt: string;
  promoter: {
    id: string;
    displayName: string;
    email: string;
    avatar?: string;
    tier: string;
    status: string;
    referralCode: string;
    followerCount: number;
    totalRegistrations: number;
    totalCommission: number;
  };
  event: {
    id: string;
    name: string;
    formattedDate: string;
    formattedTime: string;
  };
}

interface AssignmentFilters {
  tier?: string;
  status?: string;
}

export default function VenuePromotersPage() {
  const params = useParams();
  const venueId = params?.id as string;
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
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
  } = useHubListSlice("venuePromoters");
  const [openNominate, setOpenNominate] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const toast = useToast();

  const filteredAssignments = useMemo(() => {
    let filtered = assignments;

    if (filters.tier) {
      filtered = filtered.filter((a) => a.promoter.tier === filters.tier);
    }
    if (filters.status) {
      filtered = filtered.filter((a) => a.status === filters.status);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((a) => {
        const combined = [
          a.promoter.displayName,
          a.promoter.email,
          a.promoter.tier,
          a.promoter.referralCode,
          a.event.name,
          a.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return combined.includes(q);
      });
    }

    return filtered;
  }, [assignments, search, filters]);

  const filterOptions = useMemo(() => {
    const tiers = Array.from(new Set(assignments.map((a) => a.promoter.tier))).sort();
    const statuses = Array.from(new Set(assignments.map((a) => a.status))).sort();
    return { tiers, statuses };
  }, [assignments]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (filters.tier) count++;
    if (filters.status) count++;
    return count;
  }, [search, filters]);

  const groupKeyFn = useCallback((item: Assignment): string => {
    if (groupBy === "event") return item.event.name;
    if (groupBy === "tier") return item.promoter.tier;
    return "No Group";
  }, [groupBy]);

  const groupAggregations = useCallback((items: Assignment[]) => {
    const count = items.length;
    const totalRegistrations = items.reduce((sum, a) => sum + (a.promoter.totalRegistrations || 0), 0);
    const totalCommission = items.reduce((sum, a) => sum + (Number(a.promoter.totalCommission) || 0), 0);
    return { count, totalRegistrations, totalCommission };
  }, []);

  const renderGroupHeader = useCallback(
    (groupKey: string, _items: Assignment[], agg: ReturnType<typeof groupAggregations>) => {
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
            <span>{agg.totalRegistrations} registrations</span>
            <span>${agg.totalCommission.toFixed(2)} earned</span>
          </div>
        </div>
      );
    },
    []
  );

  useEffect(() => {
    if (venueId) {
      loadAssignments();
    }
  }, [venueId]);

  const loadAssignments = async () => {
    try {
      const response = await fetch(`/api/hub/venues/${venueId}/promoters`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAssignments(data.data);
        }
      }
    } catch (error) {
      toast("Failed to load promoters", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNominate = async (promoterId: string) => {
    if (!selectedEventId) {
      toast("Please select an event first", "error");
      return;
    }

    try {
      const response = await fetch(`/api/hub/venues/${venueId}/promoters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoterId, eventId: selectedEventId }),
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast("Promoter nominated successfully", "success");
          setOpenNominate(false);
          loadAssignments();
        } else {
          toast(data.error || "Failed to nominate", "error");
        }
      } else {
        toast("Failed to nominate", "error");
      }
    } catch (error) {
      toast("Failed to nominate", "error");
    }
  };

  const selectContentClass =
    "z-50 border border-border bg-background text-foreground shadow-md dark:border-border dark:bg-background dark:text-foreground";

  const filterContent = (
    <div className="flex flex-row flex-wrap items-end gap-3">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Manage Promoters</h1>
          <p className="mt-2 text-muted-foreground">Nominate and manage promoters for your events</p>
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
              { value: "event", label: "By Event" },
              { value: "tier", label: "By Tier" },
            ]}
            onGroupByChange={onGroupByChange}
            onClearFilters={onClearFilters}
          />
          <Button variant="outline">
            <Link href={`/hub/venues/${venueId}`}>Back</Link>
          </Button>
          <Button onClick={() => setOpenNominate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nominate Promoter
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card">
        <HubDataTable
          columns={[
            {
              key: "promoter",
              header: "Promoter",
              render: (r: Assignment) => (
                <div>
                  <div className="font-medium">{r.promoter.displayName}</div>
                  <div className="text-sm text-muted-foreground">{r.promoter.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.promoter.followerCount} followers • {r.promoter.referralCode}
                  </div>
                </div>
              ),
              sortable: true,
              sortValue: (r: Assignment) => (r.promoter.displayName ?? "").toLowerCase(),
            },
            {
              key: "tier",
              header: "Tier",
              render: (r: Assignment) => (
                <Badge variant={
                  r.promoter.tier === 'ELITE' ? 'default' :
                  r.promoter.tier === 'GOLD' ? 'secondary' :
                  r.promoter.tier === 'SILVER' ? 'outline' : 'outline'
                }>
                  {r.promoter.tier}
                </Badge>
              ),
              sortable: true,
              sortValue: (r: Assignment) => r.promoter.tier,
            },
            {
              key: "stats",
              header: "Performance",
              render: (r: Assignment) => (
                <div className="text-sm">
                  <div>{r.promoter.totalRegistrations} registrations</div>
                  <div className="text-muted-foreground">
                    ${(Number(r.promoter.totalCommission) || 0).toFixed(2)} earned
                  </div>
                </div>
              ),
              sortable: true,
              sortValue: (r: Assignment) => r.promoter.totalRegistrations || 0,
            },
            {
              key: "event",
              header: "Event",
              render: (r: Assignment) => (
                <div>
                  <div className="font-medium">{r.event.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.event.formattedDate} at {r.event.formattedTime}
                  </div>
                </div>
              ),
              sortable: true,
              sortValue: (r: Assignment) => (r.event.name ?? "").toLowerCase(),
            },
            {
              key: "status",
              header: "Status",
              render: (r: Assignment) => (
                <Badge variant={
                  r.status === 'ACCEPTED' ? 'default' :
                  r.status === 'DECLINED' ? 'destructive' :
                  r.status === 'SUSPENDED' ? 'destructive' : 'secondary'
                }>
                  {r.status}
                </Badge>
              ),
              sortable: true,
              sortValue: (r: Assignment) => r.status,
            },
            {
              key: "nominated",
              header: "Nominated",
              render: (r: Assignment) => (
                <div className="text-sm text-muted-foreground">
                  {new Date(r.nominatedAt).toLocaleDateString()}
                </div>
              ),
              sortable: true,
              sortValue: (r: Assignment) => new Date(r.nominatedAt).getTime(),
            },
          ]}
          data={filteredAssignments}
          keyFn={(r) => r.id}
          imageColumn={{
            getImageUrl: (r: Assignment) => r.promoter.avatar,
            altText: "Promoter avatar",
            size: "sm",
          }}
          getRowHref={(r) => `/hub/promoters/${r.promoter.id}`}
          enableSorting
          defaultSortKey="nominated"
          defaultSortDirection="desc"
          enableGrouping={!!groupBy}
          groupBy={groupBy ?? undefined}
          groupKeyFn={groupBy ? groupKeyFn : undefined}
          renderGroupHeader={renderGroupHeader}
          groupAggregations={groupAggregations}
          emptyMessage="No promoters match your filters. Use 'Nominate Promoter' to assign promoters to your events."
          pageSize={pageSize}
          page={page}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          paginationEntityLabel="promoters"
        />
      </div>

      <Dialog open={openNominate} onOpenChange={setOpenNominate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nominate Promoter</DialogTitle>
            <DialogDescription>
              Select an event and search for a promoter to nominate.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Event</label>
              <VenueEventSelector 
                venueId={venueId} 
                value={selectedEventId} 
                onChange={setSelectedEventId} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search Promoter</label>
              <PromoterSearch onNominate={handleNominate} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
