"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { VenueMediaEditor } from "@/components/hub/VenueMediaEditor";
import { GalleryImagesEditor } from "@/components/hub/GalleryImagesEditor";
import type { CoverMediaItem } from "@/components/hub/VenueCoverSection";

const VENUE_TYPES = ["NIGHTCLUB", "BAR", "LOUNGE", "BEACH_CLUB", "ROOFTOP", "DAY_CLUB"] as const;
const STATUSES = ["PENDING_REVIEW", "ACTIVE", "SUSPENDED", "CLOSED"] as const;

export default function HubVenueEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    address: "",
    city: "",
    country: "",
    latitude: "" as string | number,
    longitude: "" as string | number,
    venueType: "LOUNGE" as const,
    status: "PENDING_REVIEW" as const,
    description: "",
    phone: "",
    email: "",
    website: "",
    currency: "AUD",
    logoImage: "",
    coverImage: "",
    coverMedia: [] as CoverMediaItem[],
    galleryImages: [] as string[],
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/hub/venues/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          const v = body.data;
          const coverMedia = Array.isArray(v.coverMedia) ? v.coverMedia : [];
          const galleryImages = Array.isArray(v.galleryImages) ? v.galleryImages : [];
          setForm({
            name: v.name ?? "",
            slug: v.slug ?? "",
            address: v.address ?? "",
            city: v.city ?? "",
            country: v.country ?? "",
            latitude: v.latitude ?? "",
            longitude: v.longitude ?? "",
            venueType: v.venueType ?? "LOUNGE",
            status: v.status ?? "PENDING_REVIEW",
            description: v.description ?? "",
            phone: v.phone ?? "",
            email: v.email ?? "",
            website: v.website ?? "",
            currency: v.currency ?? "AUD",
            logoImage: v.logoImage ?? "",
            coverImage: v.coverImage ?? "",
            coverMedia,
            galleryImages,
          });
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

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/hub/venues/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          address: form.address.trim(),
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
          latitude: form.latitude === "" ? undefined : Number(form.latitude),
          longitude: form.longitude === "" ? undefined : Number(form.longitude),
          venueType: form.venueType,
          status: form.status,
          description: form.description.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          website: form.website.trim() || undefined,
          currency: form.currency,
          logoImage: form.logoImage || undefined,
          coverImage: form.coverImage || undefined,
          coverMedia: form.coverMedia,
          galleryImages: form.galleryImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update venue");
        return;
      }
      router.push(`/hub/venues/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error && !form.name) {
    return (
      <div>
        <p className="text-red-500">{error}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/venues">Back to Venues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Edit venue</h1>
          <p className="mt-2 text-muted-foreground">Update venue details.</p>
        </div>
        <Button variant="outline">
          <Link href={`/hub/venues/${id}`}>Back</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update("slug", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Address *</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Venue type</label>
                <select
                  value={form.venueType}
                  onChange={(e) => setForm((p) => ({ ...p, venueType: e.target.value as typeof form.venueType }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                >
                  {VENUE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as typeof form.status }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Branding & media</CardTitle>
            <p className="text-sm text-muted-foreground">
              Logo (SVG/PNG), cover media (images or MP4 video), and gallery.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Logo (SVG or PNG)</label>
              <ImageUpload
                value={form.logoImage}
                onChange={(url) => setForm((p) => ({ ...p, logoImage: url }))}
                acceptedFormats={["image/png", "image/svg+xml", "image/jpeg", "image/webp"]}
                placeholder="Logo URL or upload"
                showLibrarySelector
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Cover image (fallback)</label>
              <ImageUpload
                value={form.coverImage}
                onChange={(url) => setForm((p) => ({ ...p, coverImage: url }))}
                placeholder="Cover URL or upload"
                showLibrarySelector
              />
            </div>
            <VenueMediaEditor
              coverMedia={form.coverMedia}
              onChange={(items) => setForm((p) => ({ ...p, coverMedia: items }))}
            />
            <GalleryImagesEditor
              images={form.galleryImages}
              onChange={(images) => setForm((p) => ({ ...p, galleryImages: images }))}
            />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <p className="text-sm text-muted-foreground">
              Coordinates for maps. Optional.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Latitude</label>
              <input
                type="text"
                value={form.latitude}
                onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                placeholder="e.g. -8.6705"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Longitude</label>
              <input
                type="text"
                value={form.longitude}
                onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                placeholder="e.g. 115.2126"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline">
            <Link href={`/hub/venues/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
