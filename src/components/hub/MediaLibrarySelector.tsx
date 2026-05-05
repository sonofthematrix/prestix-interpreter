"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ImageIcon, Check, Loader2, Library } from "lucide-react";
import Image from "next/image";

export interface PlatformMediaAsset {
  id: string;
  name: string;
  url: string;
  pathname?: string | null;
  category?: string | null;
  source?: string | null;
}

interface MediaLibrarySelectorProps {
  /** Single URL or multiple URLs to add */
  onSelect: (urls: string[]) => void;
  /** Already selected URLs (for multi-select to show checkmarks) */
  selectedUrls?: string[];
  /** Single pick (one click = one URL) or multi (toggle multiple) */
  mode?: "single" | "multiple";
  /** Trigger button label */
  triggerLabel?: string;
  /** Optional category filter */
  category?: string;
  /** Class name for trigger button */
  className?: string;
}

function getFullImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${typeof window !== "undefined" ? window.location.origin : ""}${url}`;
  return url;
}

export function MediaLibrarySelector({
  onSelect,
  selectedUrls = [],
  mode = "multiple",
  triggerLabel = "Choose from library",
  category,
  className,
}: MediaLibrarySelectorProps) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<PlatformMediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedUrls));

  useEffect(() => {
    if (open && assets.length === 0) {
      setLoading(true);
      const params = category ? `?category=${encodeURIComponent(category)}` : "";
      fetch(`/api/hub/platform-media${params}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setAssets(data.data);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, category, assets.length]);

  useEffect(() => {
    setPicked(new Set(selectedUrls));
  }, [selectedUrls]);

  const handleClick = (asset: PlatformMediaAsset) => {
    const url = asset.url;
    if (mode === "single") {
      onSelect([url]);
      setOpen(false);
      return;
    }
    const next = new Set(picked);
    if (next.has(url)) {
      next.delete(url);
    } else {
      next.add(url);
    }
    setPicked(next);
  };

  const handleConfirm = () => {
    onSelect(Array.from(picked));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("gap-2", className)}>
          <Library className="w-4 h-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose from platform media</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select {mode === "single" ? "an image" : "images"} to add to this entity.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No platform media yet.</p>
            <p className="text-xs mt-1">Run: bun scripts/upload-missfish-images-to-blob.ts</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 overflow-y-auto flex-1 min-h-0 py-2">
              {assets.map((asset) => {
                const isSelected = picked.has(asset.url);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleClick(asset)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <Image
                      src={getFullImageUrl(asset.url)}
                      alt={asset.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized={asset.url.startsWith("/api/blob")}
                    />
                    {isSelected && (
                      <span className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground p-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {mode === "multiple" && (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleConfirm}>
                  Add selected ({picked.size})
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
