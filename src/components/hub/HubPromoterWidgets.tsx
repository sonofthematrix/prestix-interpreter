"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Promoter-focused widgets: find events by commission, venue vibe, capacity; compatibility and conversion summary.
 * Kept simple: event list summary + commission info + placeholder compatibility factor.
 */
export function HubPromoterWidgets() {
  const [tickets, setTickets] = useState<{ id: string; name: string; venue?: { name: string }; price: string; currency: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPromotions: 12,
    activeEvents: 3,
    totalBookings: 45,
    totalCommission: 225000,
    conversionRate: 8.5,
  });

  useEffect(() => {
    fetch("/api/hub/events/tickets", { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && Array.isArray(body.data)) {
          setTickets(body.data.slice(0, 6));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const promoterCards = [
    {
      title: "Commission rate",
      description: "Earn on every booking from your links",
      image: "/images/partners/missfish/marketplace/promoters/missfish_dj_performance.jpg",
      content: (
        <>
          <p className="text-2xl font-bold text-foreground">10%</p>
          <p className="mt-1 text-sm text-muted-foreground">Pool on eligible bookings. Your share by tier.</p>
        </>
      ),
      action: <Link href="/hub/events">Browse events</Link>
    },
    {
      title: "Compatibility factor",
      description: "Match events to your audience",
      image: "/images/partners/missfish/events/parties/missfish_nightlife_dancing.jpg",
      content: (
        <p className="text-sm text-muted-foreground">
          Filter by venue vibe, capacity, and prerequisites to find events that best match your followers and support base. Higher match = better conversion and velocity.
        </p>
      ),
      action: <Link href="/hub/events">Search events</Link>
    },
    {
      title: "Conversion & velocity",
      description: "Track performance",
      image: "/images/partners/missfish/venue/bar/missfish_bartender_pouring.jpg",
      content: (
        <p className="text-sm text-muted-foreground">
          Quantified conversion rate and member response speed help you pick the most profitable events to promote.
        </p>
      ),
      action: <Link href="/hub/promoters">My promoter profile</Link>
    },
    {
      title: "My Links",
      description: "Create and manage social promotion auto generated links",
      image: "/images/partners/missfish/marketplace/promoters/missfish_shes_with_us_women_group.jpg",
      content: (
        <p className="text-sm text-muted-foreground">
          Generate personalized social promotion auto generated links for events and venues. Track clicks, conversions, and commission earnings.
        </p>
      ),
      action: <Link href="/hub/links">Manage links</Link>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promoterCards.map((card, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-32 w-full overflow-hidden bg-muted">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover transition-transform duration-200 hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {card.content}
              <Button variant="outline" size="sm" className="w-full">
                {card.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Overview</CardTitle>
          <CardDescription>Your promotion track record and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.totalPromotions}</div>
              <div className="text-xs text-muted-foreground">Events Promoted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.activeEvents}</div>
              <div className="text-xs text-muted-foreground">Active Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalBookings}</div>
              <div className="text-xs text-muted-foreground">Total Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">IDR {stats.totalCommission.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Commission Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.conversionRate}%</div>
              <div className="text-xs text-muted-foreground">Conversion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Events with commission</CardTitle>
            <CardDescription>Listed events you can promote — filter by venue vibe, capacity, prerequisites</CardDescription>
          </div>
          <Button size="sm">
            <Link href="/hub/events">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No event tickets yet. Venues add events in Hub → Events.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Ticket Price</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{ticket.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Event Ticket
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{ticket.venue?.name ?? "Unknown Venue"}</span>
                          <Badge variant="outline" className="w-fit text-xs">
                            Active Venue
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{ticket.currency} {ticket.price}</span>
                          <span className="text-xs text-muted-foreground">per ticket</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-green-600">10%</span>
                          <span className="text-xs text-muted-foreground">
                            ~{ticket.currency} {(parseFloat(ticket.price) * 0.1).toFixed(0)} per booking
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <Link href={`/hub/proposals/new?eventId=${ticket.id}`}>
                            Send Proposal
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
