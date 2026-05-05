"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface CoverMediaItem {
  type: "image" | "video";
  url: string;
}

interface VenueCoverSectionProps {
  coverMedia?: CoverMediaItem[];
  coverImage?: string | null;
  logoImage?: string | null;
  venueName: string;
  className?: string;
}

const TRANSITION_MS = 5000;

export function VenueCoverSection({
  coverMedia = [],
  coverImage,
  logoImage,
  venueName,
  className,
}: VenueCoverSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Build assets: coverMedia first, then fallback to coverImage
  const assets: CoverMediaItem[] =
    coverMedia.length > 0
      ? coverMedia
      : coverImage
        ? [{ type: "image", url: coverImage }]
        : [];

  const current = assets[activeIndex];

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % Math.max(1, assets.length));
  }, [assets.length]);

  useEffect(() => {
    if (assets.length <= 1) return;
    const t = setInterval(goNext, TRANSITION_MS);
    return () => clearInterval(t);
  }, [assets.length, goNext]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-accent/30 shadow-2xl shadow-accent/10",
        "ring-2 ring-background/20",
        className
      )}
    >
      {/* Cover media area */}
      <div className="relative aspect-[21/9] min-h-[200px] w-full bg-muted">
        {current ? (
          current.type === "video" ? (
            <video
              key={current.url}
              src={current.url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            />
          ) : (
            <div className="absolute inset-0">
              {assets
                .filter((a) => a.type === "image")
                .map((a, i) => (
                  <div
                    key={a.url}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-700",
                      a.url === current.url ? "opacity-100 z-10" : "opacity-0 z-0"
                    )}
                  >
                    <Image
                      src={a.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 1280px"
                      priority={i === 0}
                    />
                  </div>
                ))}
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/20 via-muted to-muted/50">
            <span className="text-4xl font-serif font-bold text-muted-foreground/50">
              {venueName}
            </span>
          </div>
        )}

        {/* Gradient overlay for logo readability */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"
          aria-hidden
        />

        {/* Logo overlay */}
        {logoImage && (
          <div className="absolute bottom-4 left-4 z-20 flex items-end gap-4">
            <div className="rounded-lg border-2 border-white/20 bg-black/40 p-3 shadow-xl backdrop-blur-sm">
              <Image
                src={logoImage}
                alt={`${venueName} logo`}
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <span className="font-serif text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
              {venueName}
            </span>
          </div>
        )}

        {/* Pagination dots */}
        {assets.length > 1 && (
          <div className="absolute bottom-4 right-4 z-20 flex gap-2">
            {assets.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  i === activeIndex
                    ? "w-6 bg-white"
                    : "bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
