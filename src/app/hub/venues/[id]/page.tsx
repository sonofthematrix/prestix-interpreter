"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useHubListStore } from "@/stores/hub-list-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { HubEntityCard } from "@/components/hub/HubEntityCard";
import { HubDataTable } from "@/components/hub/HubDataTable";
import { HubFilterBar } from "@/components/hub/HubFilterBar";
import { ViewToggle } from "@/components/hub/ViewToggle";
import { getVenueTableImages, getVenueTicketImages, getVenueAnnouncementImages } from "@/lib/entity-images";
import { getFeatureIcon } from "@/lib/table-feature-icons";
import { VenueCoverSection, type CoverMediaItem } from "@/components/hub/VenueCoverSection";
import { Sparkles } from "lucide-react";

interface VenueDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venueType: string;
  status: string;
  address: string;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  coverMedia?: CoverMediaItem[];
  phone: string | null;
  email: string | null;
  website: string | null;
  coverImage: string | null;
  logoImage: string | null;
  currency: string;
  tables: {
    id: string;
    name: string;
    tableNumber: string | null;
    tableType: string;
    description: string | null;
    minCapacity: number;
    maxCapacity: number;
    basePrice: string;
    minimumSpend: string | null;
    currency: string;
    inclusions: string[];
    images: string[];
    features: string[];
    isActive: boolean;
  }[];
  tickets: {
    id: string;
    name: string;
    description: string | null;
    eventDate: string | null;
    price: string;
    currency: string;
    soldCount: number;
    totalInventory: number | null;
    inclusions: string[];
    images: string[];
    isActive: boolean;
  }[];
  announcements: {
    id: string;
    title: string;
    content: string;
    imageUrl: string | null;
    publishAt: string;
    isActive: boolean;
  }[];
  user: { id: string; email: string | null; name: string | null } | null;
}

export default function HubVenueViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [pageTables, setPageTables] = useState(1);
  const [pageTickets, setPageTickets] = useState(1);
  const [pageAnnouncements, setPageAnnouncements] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const user = useAppSelector((state) => state.auth.user);
  const venueDetailSlice = useHubListStore((s) => s.slices.venueDetail ?? s.getSlice("venueDetail"));
  const viewModeTables = venueDetailSlice.viewModeTables ?? "cards";
  const viewModeEvents = venueDetailSlice.viewModeEvents ?? "cards";
  const viewModeAnnouncements = venueDetailSlice.viewModeAnnouncements ?? "cards";

  const filteredTables = useMemo(() => {
    let tables = venue?.tables ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      tables = tables.filter((t) =>
        [t.name, t.tableType, t.description].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    if (activeFilter === "true") tables = tables.filter((t) => t.isActive);
    if (activeFilter === "false") tables = tables.filter((t) => !t.isActive);
    return tables;
  }, [venue?.tables, search, activeFilter]);

  const filteredTickets = useMemo(() => {
    let tickets = venue?.tickets ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      tickets = tickets.filter((t) =>
        [t.name, t.description, t.price, t.currency].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    if (activeFilter === "true") tickets = tickets.filter((t) => t.isActive);
    if (activeFilter === "false") tickets = tickets.filter((t) => !t.isActive);
    return tickets;
  }, [venue?.tickets, search, activeFilter]);

  const filteredAnnouncements = useMemo(() => {
    let announcements = venue?.announcements ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      announcements = announcements.filter((a) =>
        [a.title, a.content].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    if (activeFilter === "true") announcements = announcements.filter((a) => a.isActive);
    if (activeFilter === "false") announcements = announcements.filter((a) => !a.isActive);
    return announcements;
  }, [venue?.announcements, search, activeFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (activeFilter && activeFilter !== "all") count++;
    return count;
  }, [search, activeFilter]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setActiveFilter("all");
  }, []);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(filteredTables.length / pageSize));
    if (pageTables > max) setPageTables(1);
  }, [filteredTables.length, pageSize, pageTables]);
  useEffect(() => {
    const max = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
    if (pageTickets > max) setPageTickets(1);
  }, [filteredTickets.length, pageSize, pageTickets]);
  useEffect(() => {
    const max = Math.max(1, Math.ceil(filteredAnnouncements.length / pageSize));
    if (pageAnnouncements > max) setPageAnnouncements(1);
  }, [filteredAnnouncements.length, pageSize, pageAnnouncements]);

  const userRole = (user as { role?: string })?.role ?? null;
  const isMember = !userRole || userRole === "MEMBER" || userRole === "HOST";

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/hub/venues/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          setVenue(body.data);
        } else {
          setError(body.error || "Venue not found");
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
  if (error || !venue) {
    return (
      <div>
        <p className="text-red-500">{error ?? "Not found"}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/venues">Back to Venues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">{venue.name}</h1>
          <span className="text-muted-foreground">{venue.slug} · {venue.venueType} · {venue.status}</span>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-initial sm:justify-end">
          <HubFilterBar
            className="order-first w-full sm:order-none sm:w-auto sm:flex-1 sm:min-w-0"
            activeFiltersCount={activeFiltersCount}
            filterContent={
              <div className="flex flex-row flex-wrap items-end gap-3">
                <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
                  <Label htmlFor="filter-active" className="text-sm font-medium text-foreground">
                    Status
                  </Label>
                  <Select
                    value={activeFilter}
                    onValueChange={(v: any) => setActiveFilter(v as "all" | "true" | "false")}
                  >
                    <SelectTrigger id="filter-active" className="border-border bg-background text-foreground">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="z-50 border border-border bg-background text-foreground">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Active only</SelectItem>
                      <SelectItem value="false">Inactive only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            }
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search tables, tickets, announcements…"
            onClearFilters={clearFilters}
          />
          <Button variant="outline" size="sm">
            <Link href="/hub/venues">Back</Link>
          </Button>
          <Button size="sm">
            <Link href={`/hub/venues/${venue.id}/edit`}>Edit</Link>
          </Button>
          <Button variant="outline" size="sm">
            <Link href={`/hub/venues/${venue.id}/promoters`}>Promoters</Link>
          </Button>
          <Button variant="outline" size="sm">
            <Link href={`/hub/venues/${venue.id}/performance`}>Performance</Link>
          </Button>
        </div>
      </div>

      <VenueCoverSection
        coverMedia={venue.coverMedia}
        coverImage={venue.coverImage}
        logoImage={venue.logoImage}
        venueName={venue.name}
        className="mb-6"
      />

      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0 sm:col-span-2">
              <span className="text-muted-foreground">Address</span>
              <span>{venue.address}, {venue.city}, {venue.country}</span>
            </div>
            {(venue.latitude != null || venue.longitude != null) && (
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Location</span>
                <span>
                  {venue.latitude != null && venue.longitude != null
                    ? `${Number(venue.latitude).toFixed(6)}, ${Number(venue.longitude).toFixed(6)}`
                    : "—"}
                </span>
              </div>
            )}
            {venue.phone && (
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Phone</span>
                <span>{venue.phone}</span>
              </div>
            )}
            {venue.email && (
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Email</span>
                <span>{venue.email}</span>
              </div>
            )}
            {venue.website && (
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Website</span>
                <a href={venue.website} className="text-accent hover:underline" target="_blank" rel="noreferrer">{venue.website}</a>
              </div>
            )}
            {venue.user && (
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Owner</span>
                <span>{venue.user.name ?? venue.user.email}</span>
              </div>
            )}
          </div>
          {venue.description && (
            <p className="mt-2 border-t pt-2 text-sm text-foreground whitespace-pre-wrap">{venue.description}</p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-base">Tables ({filteredTables.length})</CardTitle>
          <div className="flex items-center gap-2">
            <ViewToggle section="tables" />
            {!isMember && (
              <Button size="sm">
                <Link href={`/hub/venues/${venue.id}/tables/new`}>Add table</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredTables.length === 0 ? (
            <p className="text-muted-foreground">No tables.</p>
          ) : viewModeTables === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTables.map((t) => {
                const imageInfo = getVenueTableImages(t);
                return (
                  <HubEntityCard
                    key={t.id}
                    href={`/hub/venues/${venue.id}/tables/${t.id}`}
                    title={t.name}
                    subtitle={`${t.minCapacity}-${t.maxCapacity} guests`}
                    images={imageInfo.images}
                    meta={[
                      { label: "Type", value: t.tableType },
                      { label: "Price", value: `${t.currency} ${t.basePrice}` },
                      { label: "Capacity", value: `${t.minCapacity}-${t.maxCapacity}` },
                    ]}
                    children={
                      Array.isArray(t.features) && t.features.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 px-6 pb-4 pt-0">
                          {t.features.slice(0, 4).map((f: string, i: number) => {
                            const Icon = getFeatureIcon(f) ?? Sparkles;
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-xs"
                                title={f}
                              >
                                <Icon className="h-3 w-3 shrink-0" aria-hidden />
                                {f}
                              </span>
                            );
                          })}
                          {(t.features?.length ?? 0) > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{(t.features?.length ?? 0) - 4}
                            </span>
                          )}
                        </div>
                      ) : null
                    }
                    actions={
                      <Button variant="outline" size="sm">
                        <Link href={`/hub/venues/${venue.id}/tables/${t.id}`}>
                          {isMember ? "Book Table" : "Edit"}
                        </Link>
                      </Button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <HubDataTable
                columns={[
                  { key: "name", header: "Table", render: (r) => r.name, sortable: true, sortValue: (r) => r.name.toLowerCase() },
                  { key: "type", header: "Type", render: (r) => r.tableType, sortable: true, sortValue: (r) => r.tableType },
                  { key: "capacity", header: "Capacity", render: (r) => `${r.minCapacity}-${r.maxCapacity}`, sortable: true, sortValue: (r) => r.minCapacity },
                  { key: "price", header: "Price", render: (r) => `${r.currency} ${r.basePrice}`, sortable: true, sortValue: (r) => parseFloat(r.basePrice || "0") },
                  { key: "active", header: "Active", render: (r) => r.isActive ? "Yes" : "No", sortable: true, sortValue: (r) => (r.isActive ? 1 : 0) },
                ]}
                data={filteredTables}
                enableSorting
                defaultSortKey="name"
                defaultSortDirection="asc"
                keyFn={(r) => r.id}
                imageColumn={{
                  getImageUrl: (r) => getVenueTableImages(r).posterImage,
                  altText: "Table image",
                  size: "md",
                }}
                getRowHref={(r) => `/hub/venues/${venue.id}/tables/${r.id}`}
                getRowActions={(r) => (
                  <Button variant="outline" size="sm">
                    <Link href={`/hub/venues/${venue.id}/tables/${r.id}`}>
                      {isMember ? "Book Table" : "Edit"}
                    </Link>
                  </Button>
                )}
                pageSize={pageSize}
                page={pageTables}
                onPageChange={setPageTables}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageTables(1);
                  setPageTickets(1);
                  setPageAnnouncements(1);
                }}
                paginationEntityLabel="tables"
                emptyMessage="No tables."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-base">Events ({filteredTickets.length})</CardTitle>
          <div className="flex items-center gap-2">
            <ViewToggle section="events" />
            {!isMember && (
              <Button size="sm">
                <Link href={`/hub/events/tickets/new?venueId=${venue.id}`}>Add ticket</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <p className="text-muted-foreground">No event tickets.</p>
          ) : viewModeEvents === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTickets.map((t) => {
                const imageInfo = getVenueTicketImages(t);
                return (
                  <HubEntityCard
                    key={t.id}
                    href={`/hub/events/tickets/${t.id}`}
                    title={t.name}
                    subtitle={t.description?.slice(0, 100) ?? undefined}
                    images={imageInfo.images}
                    meta={[
                      { label: "Price", value: `${t.currency} ${t.price}` },
                      { label: "Sold", value: t.soldCount.toString() },
                      { label: "Date", value: t.eventDate ? new Date(t.eventDate).toLocaleDateString() : "TBD" },
                    ]}
                    actions={
                      <Button variant="outline" size="sm">
                        <Link href={`/hub/events/tickets/${t.id}`}>
                          {isMember ? "Book Ticket" : "Edit"}
                        </Link>
                      </Button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <HubDataTable
                columns={[
                  { key: "name", header: "Ticket", render: (r) => r.name, sortable: true, sortValue: (r) => r.name.toLowerCase() },
                  { key: "price", header: "Price", render: (r) => `${r.currency} ${r.price}`, sortable: true, sortValue: (r) => parseFloat(r.price || "0") },
                  { key: "sold", header: "Sold", render: (r) => r.soldCount, sortable: true, sortValue: (r) => r.soldCount },
                  { key: "inventory", header: "Inventory", render: (r) => r.totalInventory ?? "—", sortable: true, sortValue: (r) => r.totalInventory ?? 0 },
                  { key: "date", header: "Date", render: (r) => r.eventDate ? new Date(r.eventDate).toLocaleDateString() : "TBD", sortable: true, sortValue: (r) => r.eventDate ? new Date(r.eventDate).getTime() : 0 },
                  { key: "active", header: "Active", render: (r) => r.isActive ? "Yes" : "No", sortable: true, sortValue: (r) => (r.isActive ? 1 : 0) },
                ]}
                data={filteredTickets}
                enableSorting
                defaultSortKey="date"
                defaultSortDirection="desc"
                keyFn={(r) => r.id}
                imageColumn={{
                  getImageUrl: (r) => getVenueTicketImages(r).posterImage,
                  altText: "Ticket image",
                  size: "md",
                }}
                getRowHref={(r) => `/hub/events/tickets/${r.id}`}
                getRowActions={(r) => (
                  <Button variant="outline" size="sm">
                    <Link href={`/hub/events/tickets/${r.id}`}>
                      {isMember ? "Book Ticket" : "Edit"}
                    </Link>
                  </Button>
                )}
                pageSize={pageSize}
                page={pageTickets}
                onPageChange={setPageTickets}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageTables(1);
                  setPageTickets(1);
                  setPageAnnouncements(1);
                }}
                paginationEntityLabel="tickets"
                emptyMessage="No event tickets."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-base">Announcements ({filteredAnnouncements.length})</CardTitle>
          <div className="flex items-center gap-2">
            <ViewToggle section="announcements" />
            {!isMember && (
              <Button size="sm">
                <Link href={`/hub/events/announcements/new?venueId=${venue.id}`}>Add announcement</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredAnnouncements.length === 0 ? (
            <p className="text-muted-foreground">No announcements.</p>
          ) : viewModeAnnouncements === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAnnouncements.map((a) => {
                const imageInfo = getVenueAnnouncementImages(a);
                return (
                  <HubEntityCard
                    key={a.id}
                    href={`/hub/events/announcements/${a.id}`}
                    title={a.title}
                    subtitle={a.content.slice(0, 100) + (a.content.length > 100 ? "..." : "")}
                    images={imageInfo.images}
                    meta={[
                      { label: "Published", value: new Date(a.publishAt).toLocaleDateString() },
                      { label: "Status", value: a.isActive ? "Active" : "Inactive" },
                    ]}
                    actions={
                      <Button variant="outline" size="sm">
                        <Link href={`/hub/events/announcements/${a.id}`}>
                          {isMember ? "View" : "Edit"}
                        </Link>
                      </Button>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <HubDataTable
                columns={[
                  { key: "title", header: "Title", render: (r) => r.title, sortable: true, sortValue: (r) => r.title.toLowerCase() },
                  { key: "content", header: "Content", render: (r) => r.content.slice(0, 50) + (r.content.length > 50 ? "..." : "") },
                  { key: "published", header: "Published", render: (r) => new Date(r.publishAt).toLocaleDateString(), sortable: true, sortValue: (r) => new Date(r.publishAt).getTime() },
                  { key: "active", header: "Active", render: (r) => r.isActive ? "Yes" : "No", sortable: true, sortValue: (r) => (r.isActive ? 1 : 0) },
                ]}
                data={filteredAnnouncements}
                enableSorting
                defaultSortKey="published"
                defaultSortDirection="desc"
                keyFn={(r) => r.id}
                imageColumn={{
                  getImageUrl: (r) => getVenueAnnouncementImages(r).posterImage,
                  altText: "Announcement image",
                  size: "md",
                }}
                getRowHref={(r) => `/hub/events/announcements/${r.id}`}
                getRowActions={(r) => (
                  <Button variant="outline" size="sm">
                    <Link href={`/hub/events/announcements/${r.id}`}>
                      {isMember ? "View" : "Edit"}
                    </Link>
                  </Button>
                )}
                pageSize={pageSize}
                page={pageAnnouncements}
                onPageChange={setPageAnnouncements}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageTables(1);
                  setPageTickets(1);
                  setPageAnnouncements(1);
                }}
                paginationEntityLabel="announcements"
                emptyMessage="No announcements."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
