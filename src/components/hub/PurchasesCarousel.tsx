"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const VISIBLE_COUNT = 3;
const AUTO_PLAY_INTERVAL = 4000;

interface PurchasesCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
}

/**
 * Hub Purchases carousel: 3 visible images, right-to-left sliding transition,
 * loops through up to 6 images.
 */
export function PurchasesCarousel({ images, alt = "Latest purchases", className = "" }: PurchasesCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Transition 3 times (0→1→2→3) until 6th image is visible, then loop to first three
  const maxIndex = Math.max(0, images.length - VISIBLE_COUNT);
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(goToNext, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [images.length, goToNext]);

  if (!images || images.length === 0) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-muted ${className}`}>
        <span className="text-sm text-muted-foreground">No purchases yet</span>
      </div>
    );
  }

  // Single image: full width
  if (images.length === 1) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <Image
          src={images[0]}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={images[0].startsWith("/api/blob")}
        />
      </div>
    );
  }

  // Each image = 1/VISIBLE_COUNT of viewport. Strip = numImages * (1/VISIBLE_COUNT) of viewport.
  const stripWidthPercent = (images.length / VISIBLE_COUNT) * 100;
  const itemWidthPercentOfStrip = 100 / images.length;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{
          width: `${stripWidthPercent}%`,
          transform: `translateX(-${currentIndex * itemWidthPercentOfStrip}%)`,
        }}
      >
        {images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="relative flex-shrink-0 min-h-0"
            style={{ width: `${itemWidthPercentOfStrip}%` }}
          >
            <Image
              src={src}
              alt={`${alt} ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 11vw"
              unoptimized={src.startsWith("/api/blob")}
            />
          </div>
        ))}
      </div>

      {/* Counter overlay: position (1–4) of cycle */}
      {images.length > 1 && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {currentIndex + 1} / {maxIndex + 1}
        </div>
      )}

      {/* Pagination dots: one per transition stop */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <span
              key={index}
              className={`block h-1.5 w-1.5 rounded-full transition-all ${
                index === currentIndex ? "w-4 bg-white" : "bg-white/50"
              }`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </div>
  );
}
