"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useHubListSlice } from "@/hooks/useHubListSlice";
import { HubEntityCard } from "@/components/hub/HubEntityCard";
import { HubDataTable } from "@/components/hub/HubDataTable";
import { HubFilterBar } from "@/components/hub/HubFilterBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ViewToggle } from "@/components/hub/ViewToggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVenueTicketImages, getVenueAnnouncementImages } from "@/lib/entity-images";

interface TicketItem {
  id: string;
  name: string;
  eventDate: string | null;
  price: string;
  currency: string;
  soldCount: number;
  totalInventory: number | null;
  isActive: boolean;
  venue: { id: string; name: string; slug: string } | null;
  /** Official poster/flyer (first image); remaining in images = gallery */
  posterImage?: string | null;
  images?: string[];
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  publishAt: string;
  expiresAt: string | null;
  isActive: boolean;
  venue: { id: string; name: string; slug: string } | null;
}

type Tab = "tickets" | "announcements";

interface TicketBookingDetails {
  ticket: {
    id: string;
    name: string;
    venue: { id: string; name: string };
  };
  summary: {
    totalBookings: number;
    confirmedBookings: number;
    paidBookings: number;
    totalRevenue: number;
    paidRevenue: number;
    currency: string;
  };
  bookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    bookingDate: string;
    startTime: string;
    guestCount: number;
    totalAmount: number;
    currency: string;
    member: { id: string; email: string; name?: string };
    payment?: { status: string; amount: number; processedAt?: string };
    promoter?: { name: string; tier: string };
    commission?: { amount: number; status: string };
  }>;
}

interface EventFilters {
  venueId?: string;
  active?: "all" | "true" | "false";
}

export default function HubEventsPage() {
  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
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
  } = useHubListSlice("events");
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<TicketBookingDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const viewMode = useAppSelector((state) => state.ui.hubListViewMode);

  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    if (filters.venueId) {
      filtered = filtered.filter((t) => t.venue?.id === filters.venueId);
    }
    if (filters.active === "true") filtered = filtered.filter((t) => t.isActive);
    if (filters.active === "false") filtered = filtered.filter((t) => !t.isActive);

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((t) => {
        const combined = [t.name, t.venue?.name, t.price, t.currency].filter(Boolean).join(" ").toLowerCase();
        return combined.includes(q);
      });
    }
    return filtered;
  }, [tickets, search, filters]);

  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements;
    if (filters.venueId) {
      filtered = filtered.filter((a) => a.venue?.id === filters.venueId);
    }
    if (filters.active === "true") filtered = filtered.filter((a) => a.isActive);
    if (filters.active === "false") filtered = filtered.filter((a) => !a.isActive);

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((a) => {
        const combined = [a.title, a.content, a.venue?.name].filter(Boolean).join(" ").toLowerCase();
        return combined.includes(q);
      });
    }
    return filtered;
  }, [announcements, search, filters]);

  const ticketFilterOptions = useMemo(() => {
    const venues = Array.from(new Set(tickets.map((t) => t.venue?.name).filter(Boolean))).sort() as string[];
    const venueIds = venues.map((n) => tickets.find((t) => t.venue?.name === n)?.venue?.id ?? "");
    return { venues: venues.map((name, i) => ({ name, id: venueIds[i] ?? "" })) };
  }, [tickets]);

  const announcementFilterOptions = useMemo(() => {
    const venues = Array.from(new Set(announcements.map((a) => a.venue?.name).filter(Boolean))).sort() as string[];
    const venueIds = venues.map((n) => announcements.find((a) => a.venue?.name === n)?.venue?.id ?? "");
    return { venues: venues.map((name, i) => ({ name, id: venueIds[i] ?? "" })) };
  }, [announcements]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (filters.venueId) count++;
    if (filters.active && filters.active !== "all") count++;
    return count;
  }, [search, filters]);

  const ticketGroupKeyFn = useCallback((item: TicketItem): string => {
    if (groupBy === "venue") return item.venue?.name ?? "No Venue";
    if (groupBy === "date") return item.eventDate ? new Date(item.eventDate).toLocaleDateString() : "Recurring";
    return "No Group";
  }, [groupBy]);

  const announcementGroupKeyFn = useCallback((item: AnnouncementItem): string => {
    if (groupBy === "venue") return item.venue?.name ?? "No Venue";
    return "No Group";
  }, [groupBy]);

  const ticketGroupAggregations = useCallback((items: TicketItem[]) => {
    const count = items.length;
    const totalSold = items.reduce((sum, t) => sum + t.soldCount, 0);
    return { count, totalSold };
  }, []);

  const announcementGroupAggregations = useCallback((items: AnnouncementItem[]) => {
    return { count: items.length };
  }, []);

  const renderTicketGroupHeader = useCallback(
    (groupKey: string, _items: TicketItem[], agg: ReturnType<typeof ticketGroupAggregations>) => {
      if (!agg) return null;
      return (
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-foreground">{groupKey}</span>
          <Badge variant="secondary" className="font-medium">
            {agg.count} tickets · {agg.totalSold} sold
          </Badge>
        </div>
      );
    },
    []
  );

  const filteredDataForPage = tab === "tickets" ? filteredTickets : filteredAnnouncements;

  const renderAnnouncementGroupHeader = useCallback(
    (groupKey: string, _items: AnnouncementItem[], agg: { count: number }) => {
      if (!agg) return null;
      return (
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-foreground">{groupKey}</span>
          <Badge variant="secondary" className="font-medium">
            {agg.count} announcements
          </Badge>
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
    Promise.all([
      fetch("/api/hub/events/tickets", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/hub/events/announcements", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([tRes, aRes]) => {
        if (cancelled) return;
        if (tRes.success && Array.isArray(tRes.data)) setTickets(tRes.data);
        if (aRes.success && Array.isArray(aRes.data)) setAnnouncements(aRes.data);
        if (!tRes.success && !aRes.success) setError(tRes.error || aRes.error || "Failed to load");
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

  const fetchTicketDetails = async (ticketId: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/hub/events/tickets/${ticketId}/bookings`, {
        credentials: "include"
      });
      const result = await response.json();
      if (result.success) {
        setSelectedTicketDetails(result.data);
      } else {
        console.error("Failed to load ticket details:", result.error);
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Events</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Events</h1>
        <p className="mt-2 text-red-500">{error}</p>
      </div>
    );
  }

  const selectContentClass =
    "z-50 border border-border bg-background text-foreground shadow-md dark:border-border dark:bg-background dark:text-foreground";

  const filterOptions = tab === "tickets" ? ticketFilterOptions : announcementFilterOptions;

  const filterContent = (
    <div className="flex flex-row flex-wrap items-end gap-3">
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
        <Label htmlFor="filter-active" className="text-sm font-medium text-foreground">
          Active
        </Label>
        <Select
          value={filters.active ?? "all"}
          onValueChange={(v: string) =>
            onFiltersUpdate((p) => ({ ...p, active: v === "all" ? undefined : (v as "true" | "false") }))
          }
        >
          <SelectTrigger id="filter-active" className="border-border bg-background text-foreground">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active only</SelectItem>
            <SelectItem value="false">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Events</h1>
            <p className="mt-2 text-muted-foreground">
              Events and venue announcements.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-initial sm:justify-end">
            <HubFilterBar
              className="order-first w-full sm:order-none sm:w-auto sm:flex-1 sm:min-w-0"
              activeFiltersCount={activeFiltersCount}
              filterContent={filterContent}
              searchValue={search}
              onSearchChange={onSearchChange}
              searchPlaceholder={tab === "tickets" ? "Search tickets…" : "Search announcements…"}
              groupByValue={groupBy}
              groupByOptions={
                tab === "tickets"
                  ? [
                      { value: "venue", label: "By Venue" },
                      { value: "date", label: "By Date" },
                    ]
                  : [{ value: "venue", label: "By Venue" }]
              }
              onGroupByChange={onGroupByChange}
              onClearFilters={onClearFilters}
            />
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setTab("tickets")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "tickets" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Tickets
              </button>
              <button
                type="button"
                onClick={() => setTab("announcements")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "announcements" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Announcements
              </button>
            </div>
            <ViewToggle />
            {tab === "tickets" ? (
              <Button size="sm">
                <Link href="/hub/events/tickets/new">Add ticket</Link>
              </Button>
            ) : (
              <Button size="sm">
                <Link href="/hub/events/announcements/new">Add announcement</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {tab === "tickets" && (
        <>
          {viewMode === "cards" ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTickets.map((t) => {
                const imageInfo = getVenueTicketImages(t);
                return (
                  <HubEntityCard
                    key={t.id}
                    href={`/hub/events/tickets/${t.id}/edit`}
                    title={t.name}
                    subtitle={t.venue?.name ?? undefined}
                    images={imageInfo.images}
                    meta={[
                      { label: "Venue", value: t.venue?.name ?? "—" },
                      { label: "Date", value: t.eventDate ? new Date(t.eventDate).toLocaleDateString() : "Recurring" },
                      { label: "Price", value: `${t.currency} ${t.price}` },
                      { label: "Sold", value: t.soldCount },
                    ]}
                    actions={
                      <Button variant="outline" size="sm">
                        <Link href={`/hub/events/tickets/${t.id}/edit`}>Edit</Link>
                      </Button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-border bg-card">
              <HubDataTable
                columns={[
                  { key: "name", header: "Ticket", render: (r: TicketItem) => r.name, sortable: true, sortValue: (r: TicketItem) => r.name.toLowerCase() },
                  { key: "venue", header: "Venue", render: (r: TicketItem) => r.venue?.name ?? "—", sortable: true, sortValue: (r: TicketItem) => (r.venue?.name ?? "").toLowerCase() },
                  { key: "date", header: "Date", render: (r: TicketItem) => r.eventDate ? new Date(r.eventDate).toLocaleDateString() : "Recurring", sortable: true, sortValue: (r: TicketItem) => r.eventDate ? new Date(r.eventDate).getTime() : 0 },
                  { key: "price", header: "Price", render: (r: TicketItem) => `${r.currency} ${r.price}`, sortable: true, sortValue: (r: TicketItem) => parseFloat(r.price || "0") },
                  { key: "sold", header: "Sold", render: (r: TicketItem) => r.soldCount, sortable: true, sortValue: (r: TicketItem) => r.soldCount },
                  { key: "status", header: "Active", render: (r: TicketItem) => r.isActive ? "Yes" : "No", sortable: true, sortValue: (r: TicketItem) => (r.isActive ? 1 : 0) },
                ]}
                data={filteredTickets}
                keyFn={(r) => r.id}
                imageColumn={{
                  getImageUrl: (r: TicketItem) => getVenueTicketImages(r).posterImage,
                  altText: "Ticket image",
                  size: "md",
                }}
                getRowHref={(r) => `/hub/events/tickets/${r.id}/edit`}
                getRowClickHandler={(r: TicketItem) => fetchTicketDetails(r.id)}
                getRowActions={(r) => (
                  <Button variant="outline" size="sm">
                    <Link href={`/hub/events/tickets/${r.id}/edit`}>Edit</Link>
                  </Button>
                )}
                enableSorting
                defaultSortKey="date"
                defaultSortDirection="desc"
                enableGrouping={!!groupBy}
                groupBy={groupBy ?? undefined}
                groupKeyFn={groupBy ? ticketGroupKeyFn : undefined}
                renderGroupHeader={renderTicketGroupHeader}
                groupAggregations={ticketGroupAggregations}
                emptyMessage="No event tickets match your filters. Add from a venue or Create ticket."
                pageSize={pageSize}
                page={page}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                paginationEntityLabel="tickets"
              />
            </div>
          )}
        </>
      )}

      {tab === "announcements" && (
        <>
          {viewMode === "cards" ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAnnouncements.map((a) => {
                const imageInfo = getVenueAnnouncementImages(a);
                return (
                  <HubEntityCard
                    key={a.id}
                    href={`/hub/events/announcements/${a.id}/edit`}
                    title={a.title}
                    subtitle={a.content?.slice(0, 100) ?? undefined}
                    images={imageInfo.images}
                    meta={[
                      { label: "Venue", value: a.venue?.name ?? "—" },
                      { label: "Published", value: new Date(a.publishAt).toLocaleDateString() },
                      { label: "Active", value: a.isActive ? "Yes" : "No" },
                    ]}
                    actions={
                      <Button variant="outline" size="sm">
                        <Link href={`/hub/events/announcements/${a.id}/edit`}>Edit</Link>
                      </Button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-border bg-card">
              <HubDataTable
                columns={[
                  { key: "title", header: "Title", render: (r: AnnouncementItem) => r.title, sortable: true, sortValue: (r: AnnouncementItem) => r.title.toLowerCase() },
                  { key: "venue", header: "Venue", render: (r: AnnouncementItem) => r.venue?.name ?? "—", sortable: true, sortValue: (r: AnnouncementItem) => (r.venue?.name ?? "").toLowerCase() },
                  { key: "publishAt", header: "Published", render: (r: AnnouncementItem) => new Date(r.publishAt).toLocaleDateString(), sortable: true, sortValue: (r: AnnouncementItem) => new Date(r.publishAt).getTime() },
                  { key: "active", header: "Active", render: (r: AnnouncementItem) => r.isActive ? "Yes" : "No", sortable: true, sortValue: (r: AnnouncementItem) => (r.isActive ? 1 : 0) },
                ]}
                data={filteredAnnouncements}
                keyFn={(r) => r.id}
                imageColumn={{
                  getImageUrl: (r: AnnouncementItem) => getVenueAnnouncementImages(r).posterImage,
                  altText: "Announcement image",
                  size: "md",
                }}
                getRowHref={(r) => `/hub/events/announcements/${r.id}/edit`}
                getRowActions={(r) => (
                  <Button variant="outline" size="sm">
                    <Link href={`/hub/events/announcements/${r.id}/edit`}>Edit</Link>
                  </Button>
                )}
                enableSorting
                defaultSortKey="publishAt"
                defaultSortDirection="desc"
                enableGrouping={!!groupBy}
                groupBy={groupBy ?? undefined}
                groupKeyFn={groupBy ? announcementGroupKeyFn : undefined}
                renderGroupHeader={renderAnnouncementGroupHeader}
                groupAggregations={announcementGroupAggregations}
                emptyMessage="No announcements match your filters. Add from a venue or Create announcement."
                pageSize={pageSize}
                page={page}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                paginationEntityLabel="announcements"
              />
            </div>
          )}
        </>
      )}

      {/* Ticket Booking Details Dialog */}
      <Dialog open={!!selectedTicketDetails} onOpenChange={() => setSelectedTicketDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTicketDetails?.ticket.name} - Booking Details
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="text-center py-8">Loading booking details...</div>
          ) : selectedTicketDetails ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTicketDetails.summary.totalBookings}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Paid Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTicketDetails.summary.paidBookings}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedTicketDetails.summary.currency} {selectedTicketDetails.summary.totalRevenue.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Paid Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedTicketDetails.summary.currency} {selectedTicketDetails.summary.paidRevenue.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bookings List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Bookings</h3>
                <div className="space-y-3">
                  {selectedTicketDetails.bookings.map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium">{booking.bookingNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.member.name || booking.member.email} • {booking.guestCount} guests
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              booking.status === 'CONFIRMED' ? 'default' :
                              booking.status === 'COMPLETED' ? 'secondary' :
                              booking.status === 'CANCELLED' ? 'destructive' : 'outline'
                            }>
                              {booking.status}
                            </Badge>
                            <div className="text-sm font-medium mt-1">
                              {booking.currency} {booking.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Date</div>
                            <div className="text-muted-foreground">
                              {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                            </div>
                          </div>

                          {booking.payment && (
                            <div>
                              <div className="font-medium">Payment</div>
                              <Badge variant={booking.payment.status === 'COMPLETED' ? 'secondary' : 'outline'} className="text-xs">
                                {booking.payment.status}
                              </Badge>
                            </div>
                          )}

                          {booking.promoter && (
                            <div>
                              <div className="font-medium">Promoter</div>
                              <div className="text-muted-foreground">
                                {booking.promoter.name} ({booking.promoter.tier})
                              </div>
                            </div>
                          )}

                          {booking.commission && (
                            <div>
                              <div className="font-medium">Commission</div>
                              <div className="text-muted-foreground">
                                {booking.currency} {booking.commission.amount} ({booking.commission.status})
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
