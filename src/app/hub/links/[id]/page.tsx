"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkBroadcast } from "@/components/hub/links/LinkBroadcast";
import { useToast } from "@/hooks/useToast";
import { Copy, QrCode } from "lucide-react";

interface MagicLink {
  id: string;
  shortCode: string;
  fullUrl: string;
  qrCodeUrl?: string;
  presetVenueId?: string;
  presetEventDate?: string;
  totalClicks: number;
  totalConversions: number;
  totalCommission: number;
}

export default function LinkDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [link, setLink] = useState<MagicLink | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (id) loadLink();
  }, [id]);

  const loadLink = async () => {
    try {
      const response = await fetch(`/api/promoter/links/${id}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLink(data.data);
        }
      }
    } catch (error) {
      toast("Failed to load link", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (link) {
      navigator.clipboard.writeText(link.fullUrl);
      toast("Link copied", "success");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!link) return <p className="text-muted-foreground">Link not found.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-foreground">Link Details</h1>
          <span className="text-muted-foreground">{link.shortCode}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm">
            <Link href="/hub/links">Back</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 pt-0 text-center">
            <div>
              <div className="text-2xl font-bold">{link.totalClicks}</div>
              <div className="text-xs text-muted-foreground">Clicks</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{link.totalConversions}</div>
              <div className="text-xs text-muted-foreground">Conversions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">${Number(link.totalCommission).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Commission</div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-0">
            {link.qrCodeUrl ? (
              <img src={link.qrCodeUrl} alt="QR Code" className="h-32 w-32" />
            ) : (
              <div className="h-32 w-32 bg-muted flex items-center justify-center rounded">
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LinkBroadcast 
        linkId={link.id} 
        fullUrl={link.fullUrl} 
        shortCode={link.shortCode}
        eventDate={link.presetEventDate}
      />
    </div>
  );
}