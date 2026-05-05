"use client";

import { useState, useEffect } from "react";
import { 
  Select as SelectRoot, 
  SelectContent as SelectContentRoot, 
  SelectItem as SelectItemRoot,   
  SelectValue as SelectValueRoot 
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";

// Cast to any to resolve "cannot be used as a JSX component" type error (React 18/19 mismatch)
const Select = SelectRoot as any;
const SelectContent = SelectContentRoot as any;
const SelectItem = SelectItemRoot as any;
const SelectValue = SelectValueRoot as any;

interface Event {
  id: string;
  name: string;
  startDateTime: string;
}

interface VenueEventSelectorProps {
  venueId: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VenueEventSelector({ venueId, value, onChange, disabled }: VenueEventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchEvents();
  }, [venueId]);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/hub/venues/${venueId}/events`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEvents(data.data);
        }
      } else {
        toast("Failed to load events", "error");
      }
    } catch (error) {
      toast("Failed to load events", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectContent>
        {events.map((event) => (
          <SelectItem key={event.id} value={event.id}>
            {event.name} ({new Date(event.startDateTime).toLocaleDateString()})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}