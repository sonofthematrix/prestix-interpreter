"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";

export default function HubAnnouncementEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    linkUrl: "",
    isActive: true,
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/hub/events/announcements/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data) {
          const a = body.data;
          setForm({
            title: a.title ?? "",
            content: a.content ?? "",
            imageUrl: a.imageUrl ?? "",
            linkUrl: a.linkUrl ?? "",
            isActive: a.isActive !== false,
          });
        } else {
          setError(body.error || "Announcement not found");
        }
      })
      .catch((err) => setError(err.message || "Request failed"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hub/events/announcements/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          imageUrl: form.imageUrl?.trim() || undefined,
          linkUrl: form.linkUrl.trim() || undefined,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update announcement");
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
  if (error && !form.title) {
    return (
      <div>
        <p className="text-red-500">{error}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Edit announcement</h1>
        </div>
        <Button variant="outline">
          <Link href={`/hub/events/announcements/${id}`}>Back</Link>
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
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button type="button" variant="outline">
            <Link href="/hub/events">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
