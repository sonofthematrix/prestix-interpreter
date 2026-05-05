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
  date: string;
  venueName: string;
}

interface EventSelectorProps {
  venueId?: string;
  value?: string;
  onChange: (value: string) => void;
  onEventDateChange?: (date: string) => void;
  disabled?: boolean;
}

export function EventSelector({ venueId, value, onChange, onEventDateChange, disabled }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (venueId) {
      fetchEvents(venueId);
    } else {
      setEvents([]);
    }
  }, [venueId]);

  const fetchEvents = async (venueId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/promoter/events?venueId=${venueId}`, {
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

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (onEventDateChange) {
      const selectedEvent = events.find(e => e.id === newValue);
      if (selectedEvent) {
        onEventDateChange(selectedEvent.date);
      }
    }
  };

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled || loading || !venueId}>
      <SelectContent>
        {events.map((event) => (
          <SelectItem key={event.id} value={event.id}>
            {event.name} ({new Date(event.date).toLocaleDateString()})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}