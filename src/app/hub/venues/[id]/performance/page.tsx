"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select as SelectRoot,
  SelectContent as SelectContentRoot,
  SelectItem as SelectItemRoot,
  SelectValue as SelectValueRoot
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

// Cast to any to resolve "cannot be used as a JSX component" type error (React 18/19 mismatch)
const Select = SelectRoot as any;
const SelectContent = SelectContentRoot as any;
const SelectItem = SelectItemRoot as any;
const SelectValue = SelectValueRoot as any;

interface Performance {
  id: string;
  promoter: {
    user: {
      name: string;
      email: string;
      profileImageUrl?: string;
    };
  };
  totalLinkClicks: number;
  totalRegistrations: number;
  totalBookings: number;
  conversionRate: string; // Decimal string
  totalCommissionEarned: string;
  generalVenueSpend: string;
}

export default function VenuePerformancePage() {
  const params = useParams();
  const venueId = params?.id as string;
  const [data, setData] = useState<Performance[]>([]);
  const [windowDays, setWindowDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (venueId) {
      loadData();
    }
  }, [venueId, windowDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hub/venues/${venueId}/performance?window=${windowDays}`, {
        credentials: "include"
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      }
    } catch (error) {
      toast("Failed to load performance data", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  };

  const formatPercent = (val: string) => {
    return `${(Number(val) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Promoter Performance</h1>
          <p className="mt-2 text-muted-foreground">Track promoter effectiveness and ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Link href={`/hub/venues/${venueId}`}>Back</Link>
          </Button>
          <div className="w-40">
            <Select value={windowDays} onValueChange={setWindowDays}>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="0">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Showing data for the selected period. Updated daily.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : data.length === 0 ? (
            <p className="text-muted-foreground">No performance data available for this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promoter</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Registrations</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={row.promoter.user.profileImageUrl} />
                          <AvatarFallback>{row.promoter.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{row.promoter.user.name}</div>
                          <div className="text-xs text-muted-foreground">{row.promoter.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{row.totalLinkClicks}</TableCell>
                    <TableCell className="text-right">{row.totalRegistrations}</TableCell>
                    <TableCell className="text-right">{row.totalBookings}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.conversionRate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.generalVenueSpend)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalCommissionEarned)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}