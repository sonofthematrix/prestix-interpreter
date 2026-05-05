"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Calendar } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface Invitation {
  id: string;
  venue: {
    name: string;
    city: string;
    coverImage?: string;
  };
  event: {
    name: string;
    startDateTime: string;
  };
  createdAt: string;
}

export default function PromoterInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const response = await fetch("/api/promoter/invitations", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInvitations(data.data);
        }
      }
    } catch (error) {
      toast("Failed to load invitations", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const response = await fetch(`/api/promoter/invitations/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include"
      });

      if (response.ok) {
        toast(`Invitation ${status.toLowerCase()}`, "success");
        loadInvitations();
      } else {
        toast("Failed to update invitation", "error");
      }
    } catch (error) {
      toast("Failed to update invitation", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Invitations</h1>
          <p className="mt-2 text-muted-foreground">Manage your event promotion requests</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Venues that want you to promote their events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : invitations.length === 0 ? (
            <p className="text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {invitation.venue.coverImage && (
                      <img 
                        src={invitation.venue.coverImage} 
                        alt={invitation.venue.name} 
                        className="h-12 w-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{invitation.event.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {invitation.venue.name}, {invitation.venue.city}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(invitation.event.startDateTime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleRespond(invitation.id, 'ACCEPTED')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRespond(invitation.id, 'DECLINED')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}