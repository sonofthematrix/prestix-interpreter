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

interface Venue {
  id: string;
  name: string;
  city: string;
}

interface VenueSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VenueSelector({ value, onChange, disabled }: VenueSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch("/api/promoter/venues", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVenues(data.data);
        }
      } else {
        toast("Failed to load venues", "error");
      }
    } catch (error) {
      toast("Failed to load venues", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select value={value} onValueChange={(val: string) => onChange(val ?? undefined)} disabled={disabled || loading}>
      <SelectContent> 
        {venues.map((venue) => (
          <SelectItem key={venue.id} value={venue.id}>
            {venue.name} ({venue.city})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}