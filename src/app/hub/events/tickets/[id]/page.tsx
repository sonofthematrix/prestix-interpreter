"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useHubTicketStore, type HubTicketDetail } from "@/stores/hub-ticket-store";
import { HubTicketDetailFetcher } from "@/components/hub/HubTicketDetailFetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { cn } from "@/lib/utils";
import { getVenueTicketImages } from "@/lib/entity-images";

export default function HubEventTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id as string | undefined;
  const ticket = useHubTicketStore((s) => s.ticket);
  const loading = useHubTicketStore((s) => s.loading);
  const error = useHubTicketStore((s) => s.error);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const user = useAppSelector((state) => state.auth.user);
  const userRole = (user as { role?: string })?.role ?? null;
  const userId = (user as { id?: string })?.id ?? null;
  const isMember = !userRole || userRole === "MEMBER" || userRole === "HOST";

  return (
    <>
      <HubTicketDetailFetcher ticketId={ticketId} />
      {loading && <p className="text-muted-foreground">Loading…</p>}
      {!loading && (error || !ticket) && (
        <div>
          <p className="text-red-500">{error ?? "Not found"}</p>
          <Button variant="outline" className="mt-4">
            <Link href="/hub/events">Back to Events</Link>
          </Button>
        </div>
      )}
      {!loading && ticket && (
        <TicketDetailContent
          ticket={ticket}
          userRole={userRole}
          userId={userId}
          isMember={isMember}
          lightboxOpen={lightboxOpen}
          lightboxIndex={lightboxIndex}
          setLightboxOpen={setLightboxOpen}
          setLightboxIndex={setLightboxIndex}
        />
      )}
    </>
  );
}

function TicketDetailContent({
  ticket,
  userRole,
  userId,
  isMember,
  lightboxOpen,
  lightboxIndex,
  setLightboxOpen,
  setLightboxIndex,
}: {
  ticket: HubTicketDetail;
  userRole: string | null;
  userId: string | null;
  isMember: boolean;
  lightboxOpen: boolean;
  lightboxIndex: number;
  setLightboxOpen: (v: boolean) => void;
  setLightboxIndex: (v: number) => void;
}) {
  const imageInfo = getVenueTicketImages(ticket);
  const canEdit =
    userRole === "PLATFORM_ADMIN" ||
    userRole === "VENUE_ADMIN" ||
    userRole === "VENUE_STAFF" ||
    (userId != null && ticket.venue?.userId === userId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">{ticket.name}</h1>
          <Badge variant={ticket.isActive ? "default" : "secondary"}>
            {ticket.isActive ? "Active" : "Inactive"}
          </Badge>
          <span className="text-muted-foreground">
            {ticket.venue.name} · {ticket.currency} {ticket.price}
            {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
              <span className="ml-1 line-through">{ticket.currency} {ticket.originalPrice}</span>
            )}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm">
            <Link href="/hub/events">Back</Link>
          </Button>
          {canEdit && (
            <Button size="sm">
              <Link href={`/hub/events/tickets/${ticket.id}/edit`}>Edit</Link>
            </Button>
          )}
          {isMember && ticket.isActive && (
            <Button size="sm">
              <Link href={`/hub/bookings/new?ticketId=${ticket.id}&venueId=${ticket.venue.id}`}>
                Book Ticket
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className={cn("grid gap-4", ticket.inclusions.length > 0 && "lg:grid-cols-[1fr,minmax(280px,360px)]")}>
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Venue</span>
                <span>{ticket.venue.name}</span>
              </div>
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Price</span>
                <span>{ticket.currency} {ticket.price}</span>
              </div>
              {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
                <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                  <span className="text-muted-foreground">Original</span>
                  <span className="line-through">{ticket.currency} {ticket.originalPrice}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Sold</span>
                <span>{ticket.soldCount}{ticket.totalInventory != null ? ` / ${ticket.totalInventory}` : ""}</span>
              </div>
              <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-muted-foreground">Event Date</span>
                <span>
                  {ticket.eventDate
                    ? new Date(ticket.eventDate).toLocaleDateString()
                    : ticket.isRecurring ? "Recurring" : "TBD"}
                </span>
              </div>
              {ticket.isRecurring && ticket.recurringDays.length > 0 && (
                <div className="flex justify-between gap-2 sm:flex-col sm:gap-0 sm:col-span-2">
                  <span className="text-muted-foreground">Recurring Days</span>
                  <span>{ticket.recurringDays.join(", ")}</span>
                </div>
              )}
            </div>
            {ticket.description && (
              <p className="mt-2 border-t pt-2 text-foreground whitespace-pre-wrap">{ticket.description}</p>
            )}
            {imageInfo.hasImages && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Images</p>
                <ImageCarousel
                  images={imageInfo.images}
                  alt={ticket.name}
                  className="h-48 aspect-video"
                  responsiveMode
                  onLightboxOpen={(idx) => {
                    setLightboxIndex(idx);
                    setLightboxOpen(true);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {(ticket.inclusions.length > 0) && (
          <Card className="overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Inclusions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {ticket.inclusions.map((item, index) => (
                  <span key={index} className="rounded-md border bg-muted/50 px-2 py-1 text-xs">{item}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ImageLightbox
        images={imageInfo.images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        alt={ticket.name}
      />
    </div>
  );
}
