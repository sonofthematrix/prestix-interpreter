"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HubEntityCardMeta {
  label: string;
  value: string | number | React.ReactNode | null | undefined;
}

export interface HubEntityCardProps {
  title: string;
  subtitle?: string | null;
  meta?: HubEntityCardMeta[];
  /** Single image URL (for backward compatibility) */
  imageUrl?: string | null;
  /** Multiple images for carousel/lightbox */
  images?: string[];
  /** When set, the card body (excluding actions) links to this URL for record details. */
  href?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** Prestix brand: accent border by default, shadow, light and motion on hover. */
const prestixCardClass =
  "border border-accent/70 shadow-prestix transition-all duration-200 hover:border-accent hover:shadow-prestix-hover hover:ring-1 hover:ring-accent/25 hover:-translate-y-0.5";

export function HubEntityCard({
  title,
  subtitle,
  meta = [],
  imageUrl,
  images,
  href,
  actions,
  className,
  children,
}: HubEntityCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Determine which images to use - prioritize images array over single imageUrl
  const displayImages = images || (imageUrl ? [imageUrl] : []);
  const hasImages = displayImages.length > 0;
  const handleLightboxOpen = (index: number = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Always show up to 3 images horizontally; when 4+, show first 3 (click opens lightbox for all)
  const imagesToShow = Math.min(displayImages.length, 3);
  const gridCols = imagesToShow === 1 ? 1 : imagesToShow === 2 ? 2 : 3;

  const infoContent = (
    <>
      <CardHeader className="pb-2">
        <p className="font-semibold leading-tight text-foreground">{title}</p>
        {subtitle != null && subtitle !== "" && (
          <p className="text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
        )}
      </CardHeader>
      {meta.length > 0 && (
        <CardContent className="space-y-1 py-0 text-sm">
          {meta.map(({ label, value }) =>
            value != null && value !== "" ? (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{value}</span>
              </div>
            ) : null
          )}
        </CardContent>
      )}
      {children}
    </>
  );

  const cardClass = cn(
    "group flex flex-col overflow-hidden",
    prestixCardClass,
    className
  );

  return (
    <Card className={cardClass}>
      {/* Image area: always 3 images horizontally when available; click opens lightbox, NOT redirect */}
      {hasImages && (
        <div className="relative w-full overflow-hidden rounded-t-lg bg-muted">
          <div
            className={cn(
              "relative grid gap-px bg-muted",
              gridCols === 1 && "grid-cols-1",
              gridCols === 2 && "grid-cols-2",
              gridCols === 3 && "grid-cols-3"
            )}
          >
            {displayImages.slice(0, 3).map((img, i) => (
              <button
                key={`${img}-${i}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLightboxOpen(i);
                }}
                className="group relative aspect-video min-h-0 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-zoom-in"
              >
                <Image
                  src={img}
                  alt={`${title} - Image ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Maximize2 className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Event info: click redirects to details page */}
      {href ? (
        <Link href={href} className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-b-lg [&:focus]:rounded-b-lg">
          {infoContent}
        </Link>
      ) : (
        infoContent
      )}
      {actions && (
        <CardFooter className="flex gap-2 pt-4" onClick={(e) => e.stopPropagation()}>
          {actions}
        </CardFooter>
      )}

      {/* Lightbox for viewing full-size images */}
      {hasImages && (
        <ImageLightbox
          images={displayImages}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          alt={title}
        />
      )}
    </Card>
  );
}
