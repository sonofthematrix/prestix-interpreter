"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHubListViewMode, type HubListViewMode } from "@/store/slices/uiSlice";
import { useHubListStore } from "@/stores/hub-list-store";
import { cn } from "@/lib/utils";

export type ViewMode = HubListViewMode;

/** Venue detail page sections - each has its own view toggle (cards vs table). */
export type VenueDetailSection = "tables" | "events" | "announcements";

export interface ViewToggleProps {
  /** Optional class for the container. */
  className?: string;
  /**
   * When set, uses per-section view mode from hubListStore (venue detail page).
   * Each section (Tables, Events, Announcements) has its own toggle - clicking
   * only affects that section. When omitted, uses Redux hubListViewMode (global).
   */
  section?: VenueDetailSection;
}

/**
 * Icon-only cards/table toggle.
 * - With section: per-section state from hubListStore (venue detail page).
 * - Without section: global Redux ui.hubListViewMode.
 * Selected button is highlighted dynamically (accent border/bg). Responsive.
 */
export function ViewToggle({ className, section }: ViewToggleProps) {
  const dispatch = useAppDispatch();
  const reduxMode = useAppSelector((state) => state.ui.hubListViewMode);

  const setViewModeTables = useHubListStore((s) => s.setViewModeTables);
  const setViewModeEvents = useHubListStore((s) => s.setViewModeEvents);
  const setViewModeAnnouncements = useHubListStore((s) => s.setViewModeAnnouncements);
  const slice = useHubListStore((s) => s.slices.venueDetail ?? s.getSlice("venueDetail"));

  const isSectionMode = section != null;
  const mode: HubListViewMode = isSectionMode
    ? (section === "tables"
        ? (slice.viewModeTables ?? "cards")
        : section === "events"
          ? (slice.viewModeEvents ?? "cards")
          : (slice.viewModeAnnouncements ?? "cards"))
    : reduxMode;

  const setMode = (value: HubListViewMode) => {
    if (isSectionMode) {
      const pageKey = "venueDetail" as const;
      if (section === "tables") setViewModeTables(pageKey, value);
      else if (section === "events") setViewModeEvents(pageKey, value);
      else setViewModeAnnouncements(pageKey, value);
    } else {
      dispatch(setHubListViewMode(value));
    }
  };

  const base =
    "inline-flex items-center justify-center rounded-md p-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const selected =
    "bg-accent/15 text-accent border border-accent/60 shadow-prestix";
  const unselected =
    "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent";

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-muted/30 p-0.5",
        className
      )}
      role="tablist"
      aria-label="View mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "cards"}
        onClick={() => setMode("cards")}
        className={cn(base, mode === "cards" ? selected : unselected)}
        title="Cards"
      >
        <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "table"}
        onClick={() => setMode("table")}
        className={cn(base, mode === "table" ? selected : unselected)}
        title="Table"
      >
        <Table2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
      </button>
    </div>
  );
}
