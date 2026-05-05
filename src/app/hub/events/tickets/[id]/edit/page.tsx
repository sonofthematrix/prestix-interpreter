"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useHubTicketStore, type HubTicketDetail } from "@/stores/hub-ticket-store";
import { HubTicketDetailFetcher } from "@/components/hub/HubTicketDetailFetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { MediaLibrarySelector } from "@/components/hub/MediaLibrarySelector";
import { X } from "lucide-react";

function ticketToForm(t: HubTicketDetail) {
  return {
    name: t.name ?? "",
    price: String(t.price ?? ""),
    currency: t.currency ?? "AUD",
    description: t.description ?? "",
    eventDate: t.eventDate ? new Date(t.eventDate).toISOString().slice(0, 16) : "",
    totalInventory: t.totalInventory != null ? String(t.totalInventory) : "",
    isActive: t.isActive !== false,
    images: Array.isArray(t.images) ? t.images : [],
  };
}

export default function HubEventTicketEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const ticket = useHubTicketStore((s) => s.ticket);
  const loading = useHubTicketStore((s) => s.loading);
  const error = useHubTicketStore((s) => s.error);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    currency: "AUD",
    description: "",
    eventDate: "",
    totalInventory: "",
    isActive: true,
    images: [] as string[],
  });
  const hasHydratedFromStore = useRef(false);

  useEffect(() => {
    hasHydratedFromStore.current = false;
  }, [id]);

  useEffect(() => {
    if (!ticket || !id || ticket.id !== id) return;
    if (hasHydratedFromStore.current) return;
    hasHydratedFromStore.current = true;
    setForm(ticketToForm(ticket));
  }, [ticket, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name || Number.isNaN(price) || price < 0) {
      setFormError("Name and price (≥ 0) are required.");
      return;
    }
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hub/events/tickets/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price,
          currency: form.currency || "AUD",
          description: form.description.trim() || undefined,
          eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
          totalInventory: form.totalInventory ? Number(form.totalInventory) : undefined,
          isActive: form.isActive,
          images: form.images,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to update ticket");
        return;
      }
      // Don't setTicket here: PATCH response may omit venue; detail page refetches on open.
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HubTicketDetailFetcher ticketId={id} />
      {loading && <p className="text-muted-foreground">Loading…</p>}
      {!loading && error && !ticket && (
        <div>
          <p className="text-red-500">{error}</p>
          <Button variant="outline" className="mt-4">
            <Link href="/hub/events">Back to Events</Link>
          </Button>
        </div>
      )}
      {!loading && (ticket || form.name) && (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Edit event ticket</h1>
        </div>
        <Button variant="outline">
          <Link href={`/hub/events/tickets/${id}`}>Back</Link>
        </Button>
      </div>
      <form onSubmit={handleSubmit}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
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
                Manage event flyers and poster images. Add new images or remove existing ones.
              </p>

              {/* Existing images grid */}
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

              {/* Add new image */}
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
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button type="button" variant="outline">
            <Link href="/hub/events">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
      )}
    </>
  );
}
