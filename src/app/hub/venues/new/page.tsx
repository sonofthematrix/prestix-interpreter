"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VENUE_TYPES = ["NIGHTCLUB", "BAR", "LOUNGE", "BEACH_CLUB", "ROOFTOP", "DAY_CLUB"] as const;
const STATUSES = ["PENDING_REVIEW", "ACTIVE", "SUSPENDED", "CLOSED"] as const;

export default function HubVenueNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    userId: "",
    name: "",
    slug: "",
    address: "",
    city: "Bali",
    country: "Indonesia",
    venueType: "LOUNGE" as const,
    status: "PENDING_REVIEW" as const,
    description: "",
    phone: "",
    email: "",
    website: "",
    currency: "AUD",
  });

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "name" && !form.slug) {
      const slug = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      setForm((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.userId.trim() || !form.name.trim() || !form.slug.trim() || !form.address.trim()) {
      setError("userId, name, slug, and address are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hub/venues", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: form.userId.trim(),
          name: form.name.trim(),
          slug: form.slug.trim(),
          address: form.address.trim(),
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
          venueType: form.venueType,
          status: form.status,
          description: form.description.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          website: form.website.trim() || undefined,
          currency: form.currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create venue");
        return;
      }
      router.push(`/hub/venues/${data.data.id}`);
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
          <h1 className="font-serif text-3xl font-bold text-foreground">Add venue</h1>
          <p className="mt-2 text-muted-foreground">
            Create a new venue. Owner userId must exist in the database (e.g. from seed or users).
          </p>
        </div>
        <Button variant="outline">
          <Link href="/hub/venues">Back</Link>
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
              <label className="mb-1 block text-sm font-medium text-foreground">Owner user ID *</label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => update("userId", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                placeholder="cuid or user id"
              />
            </div>
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
                placeholder="e.g. miss-fish-bali"
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
        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create venue"}
          </Button>
          <Button type="button" variant="outline">
            <Link href="/hub/venues">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
