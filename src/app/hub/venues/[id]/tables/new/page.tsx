"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { MediaLibrarySelector } from "@/components/hub/MediaLibrarySelector";
import { X } from "lucide-react";

const TABLE_TYPES = ["STANDARD", "PREMIUM", "ULTRA_VIP", "CABANA", "BOOTH"] as const;

export default function HubVenueTableNewPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params?.id as string;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    tableNumber: "",
    tableType: "STANDARD" as const,
    description: "",
    minCapacity: 2,
    maxCapacity: 10,
    basePrice: "",
    minimumSpend: "",
    currency: "AUD",
    location: "",
    images: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = form.name.trim();
    const basePrice = Number(form.basePrice);
    if (!name || Number.isNaN(basePrice) || basePrice < 0) {
      setError("Name and base price (≥ 0) are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hub/venues/${venueId}/tables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tableNumber: form.tableNumber.trim() || undefined,
          tableType: form.tableType,
          description: form.description.trim() || undefined,
          minCapacity: form.minCapacity,
          maxCapacity: form.maxCapacity,
          basePrice,
          minimumSpend: form.minimumSpend ? Number(form.minimumSpend) : undefined,
          currency: form.currency,
          location: form.location.trim() || undefined,
          images: form.images,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create table");
        return;
      }
      router.push(`/hub/venues/${venueId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Add table</h1>
          <p className="mt-2 text-muted-foreground">Create a table for this venue.</p>
        </div>
        <Button variant="outline">
          <Link href={`/hub/venues/${venueId}`}>Back</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Table</CardTitle>
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
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Table number</label>
                <input
                  type="text"
                  value={form.tableNumber}
                  onChange={(e) => setForm((p) => ({ ...p, tableNumber: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Type</label>
                <select
                  value={form.tableType}
                  onChange={(e) => setForm((p) => ({ ...p, tableType: e.target.value as typeof form.tableType }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                >
                  {TABLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Min capacity</label>
                <input
                  type="number"
                  min="1"
                  value={form.minCapacity}
                  onChange={(e) => setForm((p) => ({ ...p, minCapacity: Number(e.target.value) }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Max capacity</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxCapacity}
                  onChange={(e) => setForm((p) => ({ ...p, maxCapacity: Number(e.target.value) }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Base price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Minimum spend</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimumSpend}
                  onChange={(e) => setForm((p) => ({ ...p, minimumSpend: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Table Images</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Add table photos. You can add more after creating.
              </p>
              {form.images.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Images ({form.images.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {form.images.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square"
                      >
                        <img
                          src={url}
                          alt={`Table image ${idx + 1}`}
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
                  placeholder="Enter URL or upload table photo"
                  showPreview={false}
                  showLibrarySelector
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create table"}</Button>
          <Button type="button" variant="outline">  
            <Link href={`/hub/venues/${venueId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
