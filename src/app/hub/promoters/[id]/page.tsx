"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { CachedImage } from "@/components/common/CachedImage";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useToast } from "@/hooks/useToast";
import { Mail, Calendar, TrendingUp, ImageIcon, User } from "lucide-react";

const PERIODS = [
  { key: "week", label: "Last 7 days" },
  { key: "biweekly", label: "Last 14 days" },
  { key: "month", label: "Last 30 days" },
  { key: "quarter", label: "Last 90 days" },
] as const;

interface PromoterDetail {
  id: string;
  userId: string;
  status: string;
  tier: string;
  referralCode: string;
  totalBookings: number;
  totalGrossRevenue: string;
  totalPromoterEarnings: string;
  marketingBio?: string | null;
  marketingBioImages?: string[] | unknown;
  /** Computed by API: user.profileImageUrl or pravatar fallback */
  profileImageUrl?: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    profileImageUrl?: string | null;
  } | null;
}

interface MetricsData {
  period: string;
  bookings: number;
  grossRevenue: number;
  promoterEarnings: number;
  conversionRate: number | null;
}

interface VenueItem {
  id: string;
  name: string;
  slug: string;
  city?: string;
}

interface EventItem {
  id: string;
  name: string;
  startDateTime: string;
}


function parseMarketingBioImages(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === "string");
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter((x: unknown): x is string => typeof x === "string") : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
}

export default function HubPromoterViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const [promoter, setPromoter] = useState<PromoterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsPeriod, setMetricsPeriod] = useState<"week" | "biweekly" | "month" | "quarter">("month");
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [myVenues, setMyVenues] = useState<VenueItem[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [venueEvents, setVenueEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/hub/promoters/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          setPromoter(body.data);
        } else {
          setError(body.error || "Promoter not found");
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

  const loadMetrics = useCallback(() => {
    if (!id) return;
    setMetricsLoading(true);
    fetch(`/api/hub/promoters/${id}/metrics?period=${metricsPeriod}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data) setMetrics(body.data);
      })
      .catch(() => {})
      .finally(() => setMetricsLoading(false));
  }, [id, metricsPeriod]);

  useEffect(() => {
    if (id) loadMetrics();
  }, [id, loadMetrics]);

  const loadMyVenues = useCallback(() => {
    fetch("/api/hub/my-venues", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && Array.isArray(body.data)) setMyVenues(body.data);
      })
      .catch(() => {});
  }, []);

  // Load my venues on mount — only partners/venue hosts (venue owners) can request collaboration
  useEffect(() => {
    loadMyVenues();
  }, [loadMyVenues]);

  useEffect(() => {
    if (!selectedVenueId) {
      setVenueEvents([]);
      setSelectedEventId("");
      return;
    }
    // Fetch upcoming events only for collaboration requests
    fetch(`/api/hub/venues/${selectedVenueId}/events?upcoming=true`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && Array.isArray(body.data)) {
          setVenueEvents(body.data);
          setSelectedEventId("");
        } else {
          setVenueEvents([]);
        }
      })
      .catch(() => setVenueEvents([]));
  }, [selectedVenueId]);

  const handleRequestInvolvement = async () => {
    if (!selectedVenueId || !selectedEventId || !promoter) return;
    setRequesting(true);
    try {
      const res = await fetch(`/api/hub/venues/${selectedVenueId}/promoters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ promoterId: promoter.id, eventId: selectedEventId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast("Promoter nominated successfully. They will receive an invitation.", "success");
        setRequestOpen(false);
        setSelectedVenueId("");
        setSelectedEventId("");
      } else {
        toast(data.error || "Failed to nominate promoter", "error");
      }
    } catch {
      toast("Failed to nominate promoter", "error");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !promoter) {
    return (
      <div>
        <p className="text-red-500">{error ?? "Not found"}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/promoters">Back to Promoters</Link>
        </Button>
      </div>
    );
  }

  const bioImages = parseMarketingBioImages(promoter.marketingBioImages);
  const profileImageUrl =
    promoter.profileImageUrl ||
    promoter.user?.profileImageUrl ||
    `https://i.pravatar.cc/300?u=${encodeURIComponent(promoter.id)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-border">
            <Image
              src={profileImageUrl}
              alt={promoter.user?.name ?? "Promoter"}
              width={64}
              height={64}
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {promoter.user?.name ?? promoter.user?.email ?? "Promoter"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{promoter.referralCode}</span>
              <Badge variant="secondary">{promoter.status}</Badge>
              <Badge variant="outline">{promoter.tier}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {promoter.user?.email && (
            <a
              href={`mailto:${promoter.user.email}`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-accent/70 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Mail className="mr-1.5 h-4 w-4" />
              Contact
            </a>
          )}
          {myVenues.length > 0 && (
            <Button variant="default" size="sm" onClick={() => setRequestOpen(true)}>
              <Calendar className="mr-1.5 h-4 w-4" />
              Request for Event
            </Button>
          )}
          <Link
            href="/hub/promoters"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-accent/70 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Back
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Email</span>
              <span>{promoter.user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Referral code</span>
              <span>{promoter.referralCode}</span>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Status</span>
              <span>{promoter.status}</span>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Tier</span>
              <span>{promoter.tier}</span>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Total bookings</span>
              <span>{promoter.totalBookings}</span>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Gross revenue</span>
              <span>{Number(promoter.totalGrossRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Promoter earnings</span>
              <span>{Number(promoter.totalPromoterEarnings || 0).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Performance by period
          </CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            {PERIODS.map((p) => (
              <Button
                key={p.key}
                variant={metricsPeriod === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => setMetricsPeriod(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {metricsLoading ? (
            <p className="text-sm text-muted-foreground">Loading metrics…</p>
          ) : metrics ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bookings</p>
                <p className="mt-1 text-xl font-semibold">{metrics.bookings}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gross revenue</p>
                <p className="mt-1 text-xl font-semibold">{metrics.grossRevenue.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Promoter earnings</p>
                <p className="mt-1 text-xl font-semibold">{metrics.promoterEarnings.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversion rate</p>
                <p className="mt-1 text-xl font-semibold">
                  {metrics.conversionRate != null
                    ? `${(metrics.conversionRate * 100).toFixed(1)}%`
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No metrics available for this period.</p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Marketing bio & images
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Promoter profile content for partner and venue host review. Promoters are required to upload profile and portfolio images.
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {promoter.marketingBio ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Bio</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{promoter.marketingBio}</p>
            </div>
          ) : null}
          {bioImages.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Marketing images ({bioImages.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {bioImages.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border hover:ring-2 hover:ring-accent transition-all"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                  >
                    <CachedImage
                      src={url}
                      alt={`Marketing image ${idx + 1}`}
                      fill
                      objectFit="cover"
                      className="h-full w-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {!promoter.marketingBio && bioImages.length === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              No marketing bio or images uploaded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request collaboration</DialogTitle>
            <DialogDescription>
              Select your venue and an upcoming event to request this promoter to collaborate. They will receive an invitation to promote the event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Venue</Label>
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {myVenues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                      {v.city ? ` (${v.city})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedVenueId && (
              <div className="space-y-2">
                <Label>Upcoming event</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select upcoming event" />
                  </SelectTrigger>
                  <SelectContent>
                    {venueEvents.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} — {new Date(e.startDateTime).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </SelectItem>
                    ))}
                    {venueEvents.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No upcoming events
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRequestInvolvement}
                disabled={!selectedVenueId || !selectedEventId || requesting}
              >
                {requesting ? "Submitting…" : "Request collaboration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        images={bioImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt="Marketing image"
      />
    </div>
  );
}
