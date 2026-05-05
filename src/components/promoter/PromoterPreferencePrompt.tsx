"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/store/hooks";

interface PendingPreference {
  id: string;
  venueName: string;
  eventName: string;
  primaryPromoter: {
    id: string;
    name: string;
    image?: string;
  };
  challengerPromoter: {
    id: string;
    name: string;
    image?: string;
  };
  expiresAt: string;
}

export function PromoterPreferencePrompt() {
  const [pendingPrefs, setPendingPrefs] = useState<PendingPreference[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const toast = useToast();
  const user = useAppSelector(s => s.auth.user);

  useEffect(() => {
    if (user) {
      checkPendingPreferences();
    }
  }, [pathname, user]);

  const checkPendingPreferences = async () => {
    try {
      const response = await fetch("/api/promoter/preferences/pending", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setPendingPrefs(data.data);
          setOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to check pending preferences", error);
    }
  };

  const handleChoice = async (prefId: string, choice: 'primary' | 'challenger') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/promoter/preferences/${prefId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast("Promoter selection confirmed", "success");
          // Remove from list
          const remaining = pendingPrefs.filter(p => p.id !== prefId);
          setPendingPrefs(remaining);
          if (remaining.length === 0) {
            setOpen(false);
          }
        } else {
          toast(data.error || "Failed to confirm selection", "error");
        }
      } else {
        toast("Failed to confirm selection", "error");
      }
    } catch (error) {
      toast("Failed to confirm selection", "error");
    } finally {
      setLoading(false);
    }
  };

  if (pendingPrefs.length === 0) return null;

  const currentPref = pendingPrefs[0];

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing if there are pending preferences?
      // Or allow closing but it will reappear on next navigation?
      // Better to keep it open or allow minimizing.
      // For now, allow closing but it might reappear.
      setOpen(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Promoter</DialogTitle>
          <DialogDescription>
            You have clicked links from two different promoters for <strong>{currentPref.venueName}</strong> ({currentPref.eventName}).
            Please select who should be credited for your attendance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div 
            className="flex flex-col items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleChoice(currentPref.id, 'primary')}
          >
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={currentPref.primaryPromoter.image} />
              <AvatarFallback>{currentPref.primaryPromoter.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="font-semibold text-center">{currentPref.primaryPromoter.name}</div>
            <div className="text-xs text-muted-foreground mt-1">First Link</div>
            <Button size="sm" className="mt-2 w-full" variant="outline" disabled={loading}>
              Select
            </Button>
          </div>

          <div 
            className="flex flex-col items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-primary/50 bg-primary/5"
            onClick={() => handleChoice(currentPref.id, 'challenger')}
          >
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={currentPref.challengerPromoter.image} />
              <AvatarFallback>{currentPref.challengerPromoter.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="font-semibold text-center">{currentPref.challengerPromoter.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Latest Link</div>
            <Button size="sm" className="mt-2 w-full" disabled={loading}>
              Select
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <p className="text-xs text-muted-foreground text-center">
            Your choice helps reward the promoter who invited you.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}