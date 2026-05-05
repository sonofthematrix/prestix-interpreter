"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageCircle, Send, Mail, Phone, Copy } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface Channel {
  id: string;
  platform: 'WHATSAPP' | 'TELEGRAM' | 'INSTAGRAM' | 'SMS' | 'EMAIL';
  channelHandle: string;
  channelName: string;
  channelType: string;
}

interface LinkBroadcastProps {
  linkId: string;
  fullUrl: string;
  shortCode: string;
  eventName?: string;
  venueName?: string;
  eventDate?: string;
}

const PLATFORM_ICONS = {
  WHATSAPP: MessageCircle,
  TELEGRAM: Send,
  INSTAGRAM: MessageCircle,
  SMS: Phone,
  EMAIL: Mail
};

export function LinkBroadcast({ linkId, fullUrl, shortCode, eventName, venueName, eventDate }: LinkBroadcastProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadChannels();
    // Pre-fill message
    const dateStr = eventDate ? new Date(eventDate).toLocaleDateString() : 'an upcoming event';
    const venueStr = venueName ? ` at ${venueName}` : '';
    const eventStr = eventName ? `Join me for ${eventName}` : 'Join me';
    setMessage(`Hey! ${eventStr}${venueStr} on ${dateStr}. Get on my guest list here: ${fullUrl}`);
  }, [fullUrl, eventName, venueName, eventDate]);

  const loadChannels = async () => {
    try {
      const response = await fetch("/api/promoter/channels", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChannels(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to load channels", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (selectedChannels.length === 0) return;
    setSending(true);

    try {
      // Process each selected channel
      for (const channelId of selectedChannels) {
        const channel = channels.find(c => c.id === channelId);
        if (!channel) continue;

        // Record broadcast
        await fetch(`/api/promoter/links/${linkId}/broadcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId, message }),
          credentials: "include"
        });

        // Platform specific action
        const encodedMessage = encodeURIComponent(message);
        
        switch (channel.platform) {
          case 'WHATSAPP':
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
            break;
          case 'TELEGRAM':
            window.open(`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(message)}`, '_blank');
            break;
          case 'SMS':
            window.open(`sms:?body=${encodedMessage}`, '_blank');
            break;
          case 'EMAIL':
            window.open(`mailto:?subject=${encodeURIComponent("Invitation")}&body=${encodedMessage}`, '_blank');
            break;
          case 'INSTAGRAM':
            navigator.clipboard.writeText(message);
            toast(`Message copied for Instagram DM to ${channel.channelHandle}`, "success");
            break;
        }
      }
      
      toast("Broadcast initiated", "success");
      setSelectedChannels([]);
    } catch (error) {
      toast("Failed to broadcast", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading channels...</p>;
  if (channels.length === 0) return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground">No social channels connected. Go to Settings to add channels.</p>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast to Channels</CardTitle>
        <CardDescription>Share this link with your communities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Channels</label>
          <div className="grid gap-2">
            {channels.map((channel) => {
              const Icon = PLATFORM_ICONS[channel.platform] || MessageCircle;
              return (
                <div key={channel.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50">
                  <Checkbox 
                    id={channel.id} 
                    checked={selectedChannels.includes(channel.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedChannels(prev => [...prev, channel.id]);
                      else setSelectedChannels(prev => prev.filter(id => id !== channel.id));
                    }}
                  />
                  <label htmlFor={channel.id} className="flex-1 flex items-center gap-2 cursor-pointer">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{channel.channelName}</span>
                    <span className="text-xs text-muted-foreground">({channel.platform})</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={handleBroadcast} disabled={sending || selectedChannels.length === 0} className="w-full">
          {sending ? "Sending..." : `Send to ${selectedChannels.length} Channels`}
        </Button>
      </CardContent>
    </Card>
  );
}