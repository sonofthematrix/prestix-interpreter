"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface EventDetails {
  id: string;
  name: string;
  description: string | null;
  eventDate: string | null;
  price: string;
  currency: string;
  venue: { id: string; name: string; slug: string } | null;
}

export default function HubNewProposalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    promotionStrategy: "",
    targetAudience: "",
    expectedReach: "",
    socialPlatforms: [] as string[],
    marketingBudget: "",
    timeline: "",
    additionalNotes: "",
  });

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    fetch(`/api/hub/events/tickets/${eventId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.data) {
          setEvent(body.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load event:", err);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!eventId || !event) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Event Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The event you're trying to promote could not be found.
            </p>
            <Button>
              <Link href="/hub">Back to Hub</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-4">Proposal Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your interest in promoting "{event.name}". Your proposal has been sent to the venue team for review.
          </p>
          <div className="flex gap-4 justify-center">
            <Button>
              <Link href="/hub">Back to Hub</Link>
            </Button>
            <Button variant="outline">
              <Link href="/hub/proposals">View My Proposals</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Promotion Proposal</h1>
          <p className="mt-2 text-muted-foreground">
            Submit a proposal to promote this event
          </p>
        </div>
        <Button variant="outline">
          <Link href="/hub">Back to Hub</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-lg">{event.name}</h3>
              <p className="text-muted-foreground">{event.description}</p>
              <div className="mt-2 space-y-1">
                <p><span className="font-medium">Venue:</span> {event.venue?.name ?? "Unknown"}</p>
                <p><span className="font-medium">Date:</span> {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "TBD"}</p>
                <p><span className="font-medium">Ticket Price:</span> {event.currency} {event.price}</p>
                <p><span className="font-medium">Commission:</span> <span className="text-green-600 font-semibold">10%</span></p>
              </div>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Available for Promotion</Badge>
              <p className="text-sm text-muted-foreground">
                Submit your promotion proposal below. The venue team will review your track record and audience fit before approving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promotion Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="promotionStrategy">Promotion Strategy</Label>
                <Textarea
                  id="promotionStrategy"
                  value={formData.promotionStrategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, promotionStrategy: e.target.value }))}
                  placeholder="Describe your promotion strategy (social media, influencers, email campaigns, etc.)"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Textarea
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="Describe your audience demographics and interests"
                  rows={4}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="expectedReach">Expected Reach</Label>
                <Input
                  id="expectedReach"
                  type="number"
                  value={formData.expectedReach}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedReach: e.target.value }))}
                  placeholder="e.g., 5000"
                />
              </div>

              <div>
                <Label htmlFor="marketingBudget">Marketing Budget</Label>
                <Input
                  id="marketingBudget"
                  value={formData.marketingBudget}
                  onChange={(e) => setFormData(prev => ({ ...prev, marketingBudget: e.target.value }))}
                  placeholder="e.g., IDR 500,000"
                />
              </div>

              <div>
                <Label htmlFor="timeline">Promotion Timeline</Label>
                <Input
                  id="timeline"
                  value={formData.timeline}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                  placeholder="e.g., 2 weeks before event"
                />
              </div>
            </div>

            <div>
              <Label>Social Media Platforms</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["Instagram", "TikTok", "Twitter", "Facebook", "YouTube", "LinkedIn"].map((platform) => (
                  <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.socialPlatforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            socialPlatforms: [...prev.socialPlatforms, platform]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            socialPlatforms: prev.socialPlatforms.filter(p => p !== platform)
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                placeholder="Any additional information you'd like to share..."
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Promotion Proposal"}
              </Button>
              <Button type="button" variant="outline">
                <Link href="/hub">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}