"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";

interface VenueOption {
  id: string;
  name: string;
}

export default function HubAnnouncementNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetVenueId = searchParams.get("venueId") ?? "";
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    venueId: presetVenueId,
    title: "",
    content: "",
    imageUrl: "",
    linkUrl: "",
    isActive: true,
  });

  useEffect(() => {
    fetch("/api/hub/venues", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && Array.isArray(body.data)) {
          setVenues(body.data.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })));
          if (presetVenueId) setForm((p) => ({ ...p, venueId: presetVenueId }));
        }
      })
      .finally(() => setLoading(false));
  }, [presetVenueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const venueId = form.venueId.trim();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!venueId || !title || !content) {
      setError("Venue, title, and content are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hub/events/announcements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          title,
          content,
          imageUrl: form.imageUrl.trim() || undefined,
          linkUrl: form.linkUrl.trim() || undefined,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create announcement");
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
          <h1 className="font-serif text-3xl font-bold text-foreground">Add announcement</h1>
        </div>
        <Button variant="outline">
          <Link href="/hub/events">Back</Link>
        </Button>
      </div>
      <form onSubmit={handleSubmit}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Announcement</CardTitle>
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
              <label className="mb-1 block text-sm font-medium text-foreground">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Content *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Image</label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                onRemove={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                placeholder="Enter URL or upload announcement image"
                showPreview={true}
                showLibrarySelector
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Link URL</label>
              <input
                type="url"
                value={form.linkUrl}
                onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
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
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create announcement"}</Button>
          <Button type="button" variant="outline">
            <Link href="/hub/events">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
