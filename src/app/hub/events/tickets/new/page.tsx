"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { MediaLibrarySelector } from "@/components/hub/MediaLibrarySelector";
import { X } from "lucide-react";

interface VenueOption {
  id: string;
  name: string;
  slug: string;
}

export default function HubEventTicketNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetVenueId = searchParams.get("venueId") ?? "";
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    venueId: presetVenueId,
    name: "",
    price: "",
    currency: "AUD",
    description: "",
    eventDate: "",
    totalInventory: "",
    isActive: true,
    images: [] as string[],
  });

  useEffect(() => {
    fetch("/api/hub/venues", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && Array.isArray(body.data)) {
          setVenues(body.data.map((v: { id: string; name: string; slug: string }) => ({ id: v.id, name: v.name, slug: v.slug })));
          if (presetVenueId) setForm((p) => ({ ...p, venueId: presetVenueId }));
        }
      })
      .finally(() => setLoading(false));
  }, [presetVenueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const venueId = form.venueId.trim();
    const name = form.name.trim();
    const price = Number(form.price);
    if (!venueId || !name || Number.isNaN(price) || price < 0) {
      setError("Venue, name, and price (≥ 0) are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hub/events/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          name,
          price,
          currency: form.currency || "AUD",
          description: form.description.trim() || undefined,
          eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : undefined,
          totalInventory: form.totalInventory ? Number(form.totalInventory) : undefined,
          isActive: form.isActive,
          images: form.images,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create ticket");
        return;
      }
      router.push("/hub/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Add event ticket</h1>
        </div>
        <Button variant="outline">
          <Link href="/hub/events">Back</Link>
        </Button>
      </div>
      <form onSubmit={handleSubmit}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Venue *</label>
              <select
                value={form.venueId}
                onChange={(e) => setForm((p) => ({ ...p, venueId: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                required
              >
                <option value="">Select venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Event date</label>
              <input
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Total inventory</label>
              <input
                type="number"
                min="0"
                value={form.totalInventory}
                onChange={(e) => setForm((p) => ({ ...p, totalInventory: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Event Images</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Add event flyers and poster images. You can add more after creating.
              </p>
              {form.images.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Current images ({form.images.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {form.images.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square"
                      >
                        <img
                          src={url}
                          alt={`Event image ${idx + 1}`}
                          className="absolute inset-0 h-full w-full rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7 opacity-90 hover:opacity-100"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              images: p.images.filter((_, i) => i !== idx),
                            }))
                          }
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-2">
                <p className="mb-2 text-sm font-medium text-foreground">Add image</p>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <MediaLibrarySelector
                    mode="multiple"
                    selectedUrls={form.images}
                    onSelect={(urls) =>
                      setForm((p) => ({ ...p, images: [...p.images, ...urls] }))
                    }
                    triggerLabel="Choose from library"
                  />
                </div>
                <ImageUpload
                  value=""
                  onChange={(url) =>
                    url && setForm((p) => ({ ...p, images: [...p.images, url] }))
                  }
                  placeholder="Enter URL or upload event flyer / poster"
                  showPreview={false}
                  showLibrarySelector
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-border"
              />
              <label htmlFor="isActive" className="text-sm text-foreground">Active</label>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create ticket"}</Button>
          <Button type="button" variant="outline">
            <Link href="/hub/events">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
