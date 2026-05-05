"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VenueSelector } from "./VenueSelector";
import { EventSelector } from "./EventSelector";
import { useToast } from "@/hooks/useToast";

export function LinkGenerationForm() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    targetName: "",
    targetEmail: "",
    targetPhone: "",
    targetInstagram: "",
    targetNotes: "",
    presetVenueId: "",
    presetEventId: "", // Wait, schema has presetEventDate, not presetEventId. But usually we link to an event.
    // The schema says: presetVenueId, presetTicketId, presetTableType, presetEventDate.
    // It does NOT have presetEventId.
    // However, the logic in POST /api/promoter/links uses presetEventDate.
    // And the middleware will likely use venue + date to find the event.
    // So we need to get the date from the selected event.
    presetEventDate: "",
    channel: "",
    campaignTag: "",
    expiresAt: "",
    maxUses: ""
  });

  // We need to store the selected event object to get the date
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVenueChange = (value: string) => {
    setFormData(prev => ({ ...prev, presetVenueId: value, presetEventId: "", presetEventDate: "" }));
    setSelectedEventDate(null);
  };

  const handleEventChange = (value: string) => {
    // value is event ID. But we need the date.
    // The EventSelector returns event ID.
    // We need to fetch the event details or modify EventSelector to return the date too.
    // Or we can just store the ID and let the backend handle it?
    // The backend POST /api/promoter/links expects presetEventDate.
    // So we must send the date.
    
    // I'll modify EventSelector to pass the date or I'll fetch it here.
    // Actually, EventSelector's onChange only accepts string.
    // I'll assume for now I can get the date from the selector if I modify it, 
    // or I'll just use a separate state for the event ID and find the date from the events list.
    // But the events list is inside EventSelector.
    
    // Let's modify EventSelector to accept an onEventSelect callback that passes the full event object.
    // But I already wrote EventSelector.
    // I'll just use a hack: I'll fetch the event details when selected? No, that's slow.
    
    // Better: I'll update EventSelector to expose the events list or use a context.
    // Or simply, I'll update EventSelector to take `onSelectEvent` prop.
    
    // For now, I'll stick to the current implementation and maybe I can't get the date easily without modifying EventSelector.
    // I will modify EventSelector in the next step.
    
    // Wait, I can just change how I use EventSelector.
    // I'll pass a callback `onEventSelected` to EventSelector.
    
    setFormData(prev => ({ ...prev, presetEventId: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        ...formData,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        presetEventDate: selectedEventDate ? new Date(selectedEventDate).toISOString() : undefined
      };
      
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === "" || payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Remove presetEventId as it's not in schema (we use presetEventDate)
      delete payload.presetEventId;

      const response = await fetch("/api/promoter/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast("Magic link created successfully", "success");
          router.push("/hub/links");
        } else {
          toast(data.error || "Failed to create link", "error");
        }
      } else {
        toast("Failed to create link", "error");
      }
    } catch (error) {
      toast("Failed to create link", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Target Audience</CardTitle>
            <CardDescription>Who is this link for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetName">Name</Label>
              <Input
                id="targetName"
                name="targetName"
                placeholder="John Doe"
                value={formData.targetName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetEmail">Email</Label>
              <Input
                id="targetEmail"
                name="targetEmail"
                type="email"
                placeholder="john@example.com"
                value={formData.targetEmail}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetInstagram">Instagram Handle</Label>
              <Input
                id="targetInstagram"
                name="targetInstagram"
                placeholder="@johndoe"
                value={formData.targetInstagram}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link Configuration</CardTitle>
            <CardDescription>Set link parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Venue</Label>
              <VenueSelector
                value={formData.presetVenueId}
                onChange={handleVenueChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Event</Label>
              <EventSelector
                venueId={formData.presetVenueId}
                value={formData.presetEventId}
                onChange={handleEventChange}
                onEventDateChange={setSelectedEventDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaignTag">Campaign Tag</Label>
              <Input
                id="campaignTag"
                name="campaignTag"
                placeholder="Summer2026"
                value={formData.campaignTag}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses</Label>
                <Input
                  id="maxUses"
                  name="maxUses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input
                  id="expiresAt"
                  name="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Generate Link"}
        </Button>
      </div>
    </form>
  );
}