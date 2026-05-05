"use client";

import { useCallback } from "react";
import { useHubListStore, type HubListPageKey, type DatePreset } from "@/stores/hub-list-store";

/**
 * Hook to access hub list store slice for a given page.
 * Provides state and actions - page resets automatically when filters/search/groupBy change (in store).
 * Redux-compliant: no useEffect for state sync; store is single source of truth.
 */
export function useHubListSlice(pageKey: HubListPageKey) {
  const slice = useHubListStore((s) => s.slices[pageKey] ?? s.getSlice(pageKey));
  const setSearch = useHubListStore((s) => s.setSearch);
  const setFilters = useHubListStore((s) => s.setFilters);
  const updateFilters = useHubListStore((s) => s.updateFilters);
  const setGroupBy = useHubListStore((s) => s.setGroupBy);
  const setPage = useHubListStore((s) => s.setPage);
  const setPageSize = useHubListStore((s) => s.setPageSize);
  const setDatePreset = useHubListStore((s) => s.setDatePreset);
  const setCustomDateRange = useHubListStore((s) => s.setCustomDateRange);
  const setCustomDateFrom = useHubListStore((s) => s.setCustomDateFrom);
  const setCustomDateTo = useHubListStore((s) => s.setCustomDateTo);
  const setActiveFilter = useHubListStore((s) => s.setActiveFilter);
  const setPageTables = useHubListStore((s) => s.setPageTables);
  const setPageTickets = useHubListStore((s) => s.setPageTickets);
  const setPageAnnouncements = useHubListStore((s) => s.setPageAnnouncements);
  const clearFilters = useHubListStore((s) => s.clearFilters);

  const onSearchChange = useCallback((v: string) => setSearch(pageKey, v), [pageKey, setSearch]);
  const onFiltersChange = useCallback(
    (f: Record<string, string | undefined>) => setFilters(pageKey, f),
    [pageKey, setFilters]
  );
  const onFiltersUpdate = useCallback(
    (updater: (prev: Record<string, string | undefined>) => Record<string, string | undefined>) =>
      updateFilters(pageKey, updater),
    [pageKey, updateFilters]
  );
  const onGroupByChange = useCallback((v: string | null) => setGroupBy(pageKey, v), [pageKey, setGroupBy]);
  const onPageChange = useCallback((p: number) => setPage(pageKey, p), [pageKey, setPage]);
  const onPageSizeChange = useCallback((ps: number) => setPageSize(pageKey, ps), [pageKey, setPageSize]);
  const onDatePresetChange = useCallback((p: DatePreset) => setDatePreset(pageKey, p), [pageKey, setDatePreset]);
  const onCustomDateChange = useCallback(
    (from: string, to: string) => setCustomDateRange(pageKey, from, to),
    [pageKey, setCustomDateRange]
  );
  const onCustomDateFromChange = useCallback(
    (from: string) => setCustomDateFrom(pageKey, from),
    [pageKey, setCustomDateFrom]
  );
  const onCustomDateToChange = useCallback(
    (to: string) => setCustomDateTo(pageKey, to),
    [pageKey, setCustomDateTo]
  );
  const onActiveFilterChange = useCallback(
    (v: "all" | "true" | "false") => setActiveFilter(pageKey, v),
    [pageKey, setActiveFilter]
  );
  const onPageTablesChange = useCallback((p: number) => setPageTables(pageKey, p), [pageKey, setPageTables]);
  const onPageTicketsChange = useCallback((p: number) => setPageTickets(pageKey, p), [pageKey, setPageTickets]);
  const onPageAnnouncementsChange = useCallback(
    (p: number) => setPageAnnouncements(pageKey, p),
    [pageKey, setPageAnnouncements]
  );
  const onClearFilters = useCallback(() => clearFilters(pageKey), [pageKey, clearFilters]);

  return {
    slice,
    search: slice.search,
    filters: slice.filters,
    groupBy: slice.groupBy,
    page: slice.page,
    pageSize: slice.pageSize,
    datePreset: slice.datePreset,
    customDateFrom: slice.customDateFrom,
    customDateTo: slice.customDateTo,
    activeFilter: slice.activeFilter,
    pageTables: slice.pageTables ?? 1,
    pageTickets: slice.pageTickets ?? 1,
    pageAnnouncements: slice.pageAnnouncements ?? 1,
    onSearchChange,
    onFiltersChange,
    onGroupByChange,
    onPageChange,
    onPageSizeChange,
    onDatePresetChange,
    onCustomDateChange,
    onCustomDateFromChange,
    onCustomDateToChange,
    onActiveFilterChange,
    onPageTablesChange,
    onPageTicketsChange,
    onPageAnnouncementsChange,
    onClearFilters,
    onFiltersUpdate,
  };
}
