"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, QrCode, Copy, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";

interface MagicLink {
  id: string;
  shortCode: string;
  fullUrl: string;
  qrCodeUrl?: string;
  targetName?: string;
  targetEmail?: string;
  presetVenueId?: string;
  presetEventDate?: string;
  isActive: boolean;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  campaignTag?: string;
}

interface LinksStats {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
}

export default function PromoterLinksPage() {
  const [links, setLinks] = useState<MagicLink[]>([]);
  const [stats, setStats] = useState<LinksStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const response = await fetch("/api/promoter/links", {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLinks(data.data.links);
          setStats(data.data.stats);
        }
      } else {
        toast("Failed to load links", "error");
      }
    } catch (error) {
      toast("Failed to load links", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast("Link copied to clipboard", "success");
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to deactivate this link? This action cannot be undone.")) {
      return;
    }

    setDeletingId(linkId);
    try {
      const response = await fetch(`/api/promoter/links/${linkId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        toast("Link deactivated successfully", "success");
        await loadLinks(); // Reload the list
      } else {
        toast("Failed to deactivate link", "error");
      }
    } catch (error) {
      toast("Failed to deactivate link", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">My Links</h1>
            <p className="mt-2 text-muted-foreground">Create and manage your magic links</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">My Links</h1>
          <p className="mt-2 text-muted-foreground">Create and manage your magic links</p>
        </div>
        <Button>
          <Link href="/hub/links/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Link
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLinks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeLinks} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClicks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle>Magic Links</CardTitle>
          <CardDescription>
            Your personalized links for event promotion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No links created yet</p>
              <Button>
                <Link href="/hub/links/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Link
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {link.shortCode}
                      </code>
                      <Badge variant={link.isActive ? "default" : "secondary"}>
                        {link.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {link.campaignTag && (
                        <Badge variant="outline">{link.campaignTag}</Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      {link.targetName && <span>Target: {link.targetName}</span>}
                      {link.targetEmail && <span> • {link.targetEmail}</span>}
                      {link.presetVenueId && <span> • Venue-specific</span>}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Created {formatDate(link.createdAt)}
                      {link.expiresAt && ` • Expires ${formatDate(link.expiresAt)}`}
                      {link.maxUses && ` • Max ${link.maxUses} uses`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">{link.totalClicks}</div>
                      <div className="text-xs text-muted-foreground">Clicks</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{link.totalConversions}</div>
                      <div className="text-xs text-muted-foreground">Conversions</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{formatCurrency(link.totalCommission)}</div>
                      <div className="text-xs text-muted-foreground">Commission</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(link.fullUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Link href={`/hub/links/${link.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id)}
                      disabled={deletingId === link.id}
                    >
                      <Trash2 className="h-4 w-4" />
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