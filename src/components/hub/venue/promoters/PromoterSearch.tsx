"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface Promoter {
  id: string;
  name: string;
  email: string;
  image?: string;
  referralCode: string;
}

interface PromoterSearchProps {
  onNominate: (promoterId: string) => Promise<void>;
}

export function PromoterSearch({ onNominate }: PromoterSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(false);
  const [nominating, setNominating] = useState<string | null>(null);
  const toast = useToast();

  const handleSearch = async () => {
    if (query.length < 3) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/hub/promoters/search?q=${encodeURIComponent(query)}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResults(data.data);
        }
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNominate = async (promoter: Promoter) => {
    setNominating(promoter.id);
    try {
      await onNominate(promoter.id);
      toast(`Nominated ${promoter.name}`, "success");
      // Remove from results or mark as nominated?
      // For now, just keep it.
    } catch (error) {
      toast("Failed to nominate", "error");
    } finally {
      setNominating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search promoters by name, email, or code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading || query.length < 3}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border rounded-md divide-y">
          {results.map((promoter) => (
            <div key={promoter.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={promoter.image} />
                  <AvatarFallback>{promoter.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{promoter.name}</div>
                  <div className="text-sm text-muted-foreground">{promoter.email} • {promoter.referralCode}</div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNominate(promoter)}
                disabled={nominating === promoter.id}
              >
                {nominating === promoter.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Nominate
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}