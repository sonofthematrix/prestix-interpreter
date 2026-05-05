"use client";

/**
 * Dark blue wall texture background for venue/missfish pages.
 * Uses missfish_venue_background_wall.png at 40% opacity with very dark blue overlay.
 */

import { usePathname } from "next/navigation";

const TEXTURE_URL = "/images/partners/missfish/venue/photos/missfish_venue_background_wall.png";

export function VenueWallTexture() {
  const pathname = usePathname();
  const isVenueRoute = pathname?.startsWith("/hub/venues");

  if (!isVenueRoute) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    >
      {/* Base dark blue */}
      <div className="absolute inset-0 bg-[#0a0e1a]" />
      {/* Texture at 40% opacity with dark blue blend */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `url(${TEXTURE_URL})`,
          backgroundRepeat: "repeat",
          backgroundSize: "400px auto",
        }}
      />
      {/* Extra dark blue tint overlay for cohesion */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: "linear-gradient(180deg, rgba(5, 10, 25, 0.7) 0%, rgba(8, 15, 35, 0.5) 100%)",
        }}
      />
    </div>
  );
}
