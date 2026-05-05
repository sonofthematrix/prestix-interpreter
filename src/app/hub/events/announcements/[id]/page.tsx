"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVenueAnnouncementImages } from "@/lib/entity-images";

interface AnnouncementDetail {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  publishAt: string;
  expiresAt: string | null;
  isActive: boolean;
  venue: { id: string; name: string; slug: string };
}

export default function HubEventAnnouncementDetailPage() {
  const params = useParams();
  const announcementId = params?.id as string;
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAppSelector((state) => state.auth.user);
  const userRole = (user as { role?: string })?.role ?? null;
  const isMember = !userRole || userRole === "MEMBER" || userRole === "HOST";

  useEffect(() => {
    if (!announcementId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/hub/events/announcements/${announcementId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success && body.data) {
          setAnnouncement(body.data);
        } else {
          setError(body.error || "Announcement not found");
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
  }, [announcementId]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !announcement) {
    return (
      <div>
        <p className="text-red-500">{error ?? "Not found"}</p>
        <Button variant="outline" className="mt-4">
          <Link href="/hub/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const imageInfo = getVenueAnnouncementImages(announcement);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">{announcement.title}</h1>
          <Badge variant={announcement.isActive ? "default" : "secondary"}>
            {announcement.isActive ? "Active" : "Inactive"}
          </Badge>
          <span className="text-muted-foreground">
            {announcement.venue.name} · Published {new Date(announcement.publishAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm">
            <Link href="/hub/events">Back</Link>
          </Button>
          {!isMember && (
            <Button size="sm">
              <Link href={`/hub/events/announcements/${announcement.id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      </div>

      {imageInfo.hasImages && (
        <div className="relative h-40 overflow-hidden rounded-lg bg-muted">
          <img
            src={imageInfo.posterImage}
            alt={announcement.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Venue</span>
              <span>{announcement.venue.name}</span>
            </div>
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Published</span>
              <span>{new Date(announcement.publishAt).toLocaleDateString()}</span>
            </div>
            {announcement.expiresAt && (
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Expires</span>
                <span>{new Date(announcement.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
            {announcement.linkUrl && (
              <div className="flex justify-between gap-2 sm:col-span-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Link</span>
                <a href={announcement.linkUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">
                  {announcement.linkUrl}
                </a>
              </div>
            )}
            <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={announcement.isActive ? "default" : "secondary"} className="w-fit">
                {announcement.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <p className="mt-2 border-t pt-2 text-foreground whitespace-pre-wrap">{announcement.content}</p>
        </CardContent>
      </Card>
    </div>
  );
}