"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarIcon,
  FilterIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubSearchInput } from "@/components/hub/HubSearchInput";

export type DatePreset = "7" | "30" | "90" | "month" | "custom";

export interface HubFilterBarDateRange {
  preset: DatePreset;
  dateFrom?: string;
  dateTo?: string;
}

export interface HubFilterBarProps {
  /** Number of active filters (shown as badge on Filters button) */
  activeFiltersCount: number;
  /** Callback when filters panel opens/closes */
  onFiltersOpenChange?: (open: boolean) => void;
  /** Filter panel content (date inputs, selects, etc.) */
  filterContent?: React.ReactNode;
  /** Search value (controlled) */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Group-by select: controlled value (optional; hide when groupByOptions empty) */
  groupByValue?: string | null;
  /** Group-by options: { value, label } (optional; when empty/undefined, group-by is hidden) */
  groupByOptions?: Array<{ value: string; label: string }>;
  /** Group-by change handler */
  onGroupByChange?: (value: string | null) => void;
  /** Date preset select: controlled value (optional; hide when datePresetOptions empty) */
  datePresetValue?: DatePreset;
  /** Date preset options (optional; when empty/undefined, date preset is hidden) */
  datePresetOptions?: Array<{ value: DatePreset; label: string }>;
  /** Date preset change handler */
  onDatePresetChange?: (value: DatePreset) => void;
  /** Show clear button when filters are active */
  onClearFilters?: () => void;
  /** Optional class for the toolbar container */
  className?: string;
}

/**
 * Hub filter toolbar: Filters panel (collapsible, inline), Group by, Date range presets, Clear.
 * Filter panel expands inline below toolbar—no overlap with stats/table.
 * Responsive: stacks on mobile, horizontal on desktop.
 * Theme-aware: uses semantic tokens (bg-background, text-foreground, border-border).
 */
export function HubFilterBar({
  activeFiltersCount,
  onFiltersOpenChange,
  filterContent,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  groupByValue,
  groupByOptions,
  onGroupByChange,
  datePresetValue,
  datePresetOptions,
  onDatePresetChange,
  onClearFilters,
  className,
}: HubFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const hasFilterContent = filterContent != null;
  const hasGroupBy = Array.isArray(groupByOptions) && groupByOptions.length > 0 && onGroupByChange;
  const hasDatePreset = Array.isArray(datePresetOptions) && datePresetOptions.length > 0 && onDatePresetChange;

  const handleOpenChange = (open: boolean) => {
    setFiltersOpen(open);
    onFiltersOpenChange?.(open);
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      {onSearchChange != null && (
        <HubSearchInput
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          wrapperClassName="order-first w-full sm:order-none sm:w-auto"
        />
      )}
      {hasFilterContent && (
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-accent/70 bg-background px-3 text-sm font-medium text-foreground transition-all hover:bg-accent/10 hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <FilterIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-xs font-medium"
              >
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                filtersOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
      )}
      {hasGroupBy && (
        <Select
          value={groupByValue ?? "none"}
          onValueChange={(v: string) => onGroupByChange!(v === "none" ? null : v)}
        >
          <SelectTrigger
            className="min-w-0 flex-1 border-border bg-background text-foreground sm:min-w-[140px] sm:flex-initial sm:basis-[140px]"
            aria-label="Group results by"
          >
            <SelectValue placeholder="Group by…" />
          </SelectTrigger>
          <SelectContent className="z-50 border border-border bg-background text-foreground shadow-md dark:border-border dark:bg-background dark:text-foreground">
            <SelectItem value="none">No grouping</SelectItem>
            {groupByOptions!.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hasDatePreset && (
        <Select
          value={datePresetValue}
          onValueChange={(v: string) => onDatePresetChange!(v as DatePreset)}
        >
          <SelectTrigger
            className="min-w-0 flex-1 border-border bg-background text-foreground sm:min-w-[140px] sm:flex-initial sm:basis-[140px]"
            aria-label="Date range"
          >
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent className="z-50 border border-border bg-background text-foreground shadow-md dark:border-border dark:bg-background dark:text-foreground">
            {datePresetOptions!.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {activeFiltersCount > 0 && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="mr-1.5 h-4 w-4" />
          Clear
        </button>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {hasFilterContent ? (
        <Collapsible open={filtersOpen} onOpenChange={handleOpenChange} className="w-full">
          {toolbar}
          <CollapsibleContent className="w-full">
            <div className="mt-3 rounded-lg border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card">
              {filterContent}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        toolbar
      )}
    </div>
  );
}

/** Standard date preset options for Hub filter bars */
export const DEFAULT_DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom range" },
];

/** Date range filter fields for use inside HubFilterBar filterContent */
export interface HubDateRangeFieldsProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  showCustomRange: boolean;
  className?: string;
}

export function HubDateRangeFields({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showCustomRange,
  className,
}: HubDateRangeFieldsProps) {
  if (!showCustomRange) return null;

  return (
    <>
      <div className={cn("flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial", className)}>
        <Label
          htmlFor="hub-filter-date-from"
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          Date from
        </Label>
        <Input
          id="hub-filter-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="border-border bg-background text-foreground"
        />
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 sm:min-w-[140px] sm:flex-initial">
        <Label
          htmlFor="hub-filter-date-to"
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          Date to
        </Label>
        <Input
          id="hub-filter-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="border-border bg-background text-foreground"
        />
      </div>
    </>
  );
}
