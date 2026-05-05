"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select as SelectRoot, 
  SelectContent as SelectContentRoot, 
  SelectItem as SelectItemRoot, 
  SelectValue as SelectValueRoot 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MessageCircle, Send, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/useToast";

// Cast to any to resolve "cannot be used as a JSX component" type error (React 18/19 mismatch)
const Select = SelectRoot as any;
const SelectContent = SelectContentRoot as any;
const SelectItem = SelectItemRoot as any;
const SelectValue = SelectValueRoot as any;

interface Channel {
  id: string;
  platform: 'WHATSAPP' | 'TELEGRAM' | 'INSTAGRAM' | 'SMS' | 'EMAIL';
  channelHandle: string;
  channelName: string;
  channelType: string;
  isPrimary: boolean;
}

const PLATFORM_ICONS = {
  WHATSAPP: MessageCircle,
  TELEGRAM: Send,
  INSTAGRAM: MessageCircle, // Use generic or specific icon if available
  SMS: Phone,
  EMAIL: Mail
};

export default function SocialChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    platform: 'WHATSAPP',
    channelHandle: '',
    channelName: '',
    channelType: 'DM',
    isPrimary: false
  });

  useEffect(() => {
    loadChannels();
  }, []);

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
      toast("Failed to load channels", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    try {
      const response = await fetch("/api/promoter/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });

      if (response.ok) {
        toast("Channel added successfully", "success");
        setOpenAdd(false);
        setFormData({
          platform: 'WHATSAPP',
          channelHandle: '',
          channelName: '',
          channelType: 'DM',
          isPrimary: false
        });
        loadChannels();
      } else {
        const data = await response.json();
        toast(data.error || "Failed to add channel", "error");
      }
    } catch (error) {
      toast("Failed to add channel", "error");
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    
    try {
      const response = await fetch(`/api/promoter/channels/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        toast("Channel deleted successfully", "success");
        loadChannels();
      } else {
        toast("Failed to delete channel", "error");
      }
    } catch (error) {
      toast("Failed to delete channel", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Social Channels</h1>
          <p className="mt-2 text-muted-foreground">Manage your broadcast channels</p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Channel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Channels</CardTitle>
          <CardDescription>Channels you can broadcast magic links to</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : channels.length === 0 ? (
            <p className="text-muted-foreground">No channels connected.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => {
                const Icon = PLATFORM_ICONS[channel.platform] || MessageCircle;
                return (
                  <div key={channel.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-full">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{channel.channelName}</div>
                        <div className="text-xs text-muted-foreground">
                          {channel.platform} • {channel.channelType}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {channel.channelHandle}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteChannel(channel.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Social Channel</DialogTitle>
            <DialogDescription>Connect a new channel for broadcasting.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select 
                value={formData.platform} 
                onValueChange={(val: string) => setFormData(prev => ({ ...prev, platform: val }))}
              >
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="TELEGRAM">Telegram</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Channel Name</Label>
              <Input 
                placeholder="e.g. VIP List, Friday Group" 
                value={formData.channelName}
                onChange={(e) => setFormData(prev => ({ ...prev, channelName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Handle / Number / ID</Label>
              <Input 
                placeholder="@username or +1234567890" 
                value={formData.channelHandle}
                onChange={(e) => setFormData(prev => ({ ...prev, channelHandle: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={formData.channelType} 
                onValueChange={(val: string) => setFormData(prev => ({ ...prev, channelType: val }))}
              >
                <SelectContent>
                  <SelectItem value="DM">Direct Message</SelectItem>
                  <SelectItem value="GROUP">Group Chat</SelectItem>
                  <SelectItem value="CHANNEL">Broadcast Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button onClick={handleAddChannel}>Add Channel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}