/**
 * Configurable mapping between hub pages and preferred list view (cards vs table).
 * When a hub page loads, the view is set to the configured value for best UX.
 */

import type { HubListViewMode } from "@/store/slices/uiSlice";

export interface HubViewConfigEntry {
  /** Path prefix to match (e.g. "/hub/bookings" matches /hub/bookings and /hub/bookings/xyz) */
  pathPrefix: string;
  /** Preferred view for this page */
  view: HubListViewMode;
}

/**
 * Page-to-view mapping. Order matters: more specific paths should come first.
 * First matching entry wins.
 */
export const HUB_VIEW_CONFIG: HubViewConfigEntry[] = [
  { pathPrefix: "/hub/marketplace", view: "cards" },
  { pathPrefix: "/hub/venues", view: "cards" },
  { pathPrefix: "/hub/events", view: "cards" },
  { pathPrefix: "/hub/promoters", view: "table" },
  { pathPrefix: "/hub/bookings", view: "table" },
  { pathPrefix: "/hub/purchases", view: "table" },
  { pathPrefix: "/hub", view: "cards" }, // Dashboard
];

/**
 * Get the preferred view mode for a hub pathname.
 * @param pathname - Current path (e.g. "/hub/bookings" or "/hub/venues/abc123")
 * @returns Preferred view mode, or "cards" as default
 */
export function getHubViewForPath(pathname: string): HubListViewMode {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const { pathPrefix, view } of HUB_VIEW_CONFIG) {
    if (normalized === pathPrefix || normalized.startsWith(pathPrefix + "/")) {
      return view;
    }
  }
  return "cards";
}
