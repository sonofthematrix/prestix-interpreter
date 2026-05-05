"use client";

import { create } from "zustand";

/**
 * Hub list page keys for store slices.
 * Each hub list page has its own filter/search/pagination state.
 */
export type HubListPageKey =
  | "bookings"
  | "promoters"
  | "venues"
  | "marketplace"
  | "purchases"
  | "events"
  | "venuePromoters"
  | "venueDetail";

export type DatePreset = "7" | "30" | "90" | "month" | "custom";

export interface HubListSliceState {
  search: string;
  filters: Record<string, string | undefined>;
  groupBy: string | null;
  page: number;
  pageSize: number;
  datePreset?: DatePreset;
  customDateFrom?: string;
  customDateTo?: string;
  /** Venue detail: separate page states for tables/tickets/announcements */
  pageTables?: number;
  pageTickets?: number;
  pageAnnouncements?: number;
  /** Venue detail: active filter (all/true/false) */
  activeFilter?: "all" | "true" | "false";
  /** Venue detail: per-section view mode (cards vs table).
   * Each section (Tables, Events, Announcements) has its own toggle. */
  viewModeTables?: "cards" | "table";
  viewModeEvents?: "cards" | "table";
  viewModeAnnouncements?: "cards" | "table";
}

const DEFAULT_SLICE: HubListSliceState = {
  search: "",
  filters: {},
  groupBy: null,
  page: 1,
  pageSize: 10,
  datePreset: "30",
  customDateFrom: "",
  customDateTo: "",
};

export interface HubListStore {
  slices: Record<HubListPageKey, HubListSliceState>;
  getSlice: (pageKey: HubListPageKey) => HubListSliceState;
  setSearch: (pageKey: HubListPageKey, search: string) => void;
  setFilters: (pageKey: HubListPageKey, filters: Record<string, string | undefined>) => void;
  updateFilters: (
    pageKey: HubListPageKey,
    updater: (prev: Record<string, string | undefined>) => Record<string, string | undefined>
  ) => void;
  setGroupBy: (pageKey: HubListPageKey, groupBy: string | null) => void;
  setPage: (pageKey: HubListPageKey, page: number) => void;
  setPageSize: (pageKey: HubListPageKey, pageSize: number) => void;
  setDatePreset: (pageKey: HubListPageKey, preset: DatePreset) => void;
  setCustomDateRange: (pageKey: HubListPageKey, from: string, to: string) => void;
  setCustomDateFrom: (pageKey: HubListPageKey, from: string) => void;
  setCustomDateTo: (pageKey: HubListPageKey, to: string) => void;
  setActiveFilter: (pageKey: HubListPageKey, activeFilter: "all" | "true" | "false") => void;
  setPageTables: (pageKey: HubListPageKey, page: number) => void;
  setPageTickets: (pageKey: HubListPageKey, page: number) => void;
  setPageAnnouncements: (pageKey: HubListPageKey, page: number) => void;
  setViewModeTables: (pageKey: HubListPageKey, mode: "cards" | "table") => void;
  setViewModeEvents: (pageKey: HubListPageKey, mode: "cards" | "table") => void;
  setViewModeAnnouncements: (pageKey: HubListPageKey, mode: "cards" | "table") => void;
  clearFilters: (pageKey: HubListPageKey) => void;
  clearAll: () => void;
}

const getInitialSlices = (): Record<HubListPageKey, HubListSliceState> => ({
  bookings: { ...DEFAULT_SLICE, datePreset: "30" },
  promoters: { ...DEFAULT_SLICE },
  venues: { ...DEFAULT_SLICE },
  marketplace: { ...DEFAULT_SLICE },
  purchases: { ...DEFAULT_SLICE, datePreset: "30" },
  events: { ...DEFAULT_SLICE },
  venuePromoters: { ...DEFAULT_SLICE },
  venueDetail: {
    ...DEFAULT_SLICE,
    activeFilter: "all",
    pageTables: 1,
    pageTickets: 1,
    pageAnnouncements: 1,
    viewModeTables: "cards",
    viewModeEvents: "cards",
    viewModeAnnouncements: "cards",
  },
});

export const useHubListStore = create<HubListStore>((set, get) => ({
  slices: getInitialSlices(),

  getSlice: (pageKey) => {
    const state = get();
    return state.slices[pageKey] ?? { ...DEFAULT_SLICE };
  },

  setSearch: (pageKey, search) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          search,
          page: 1,
        },
      },
    })),

  setFilters: (pageKey, filters) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          filters,
          page: 1,
        },
      },
    })),

  updateFilters: (pageKey, updater) =>
    set((state) => {
      const slice = state.slices[pageKey] ?? { ...DEFAULT_SLICE };
      const nextFilters = updater(slice.filters ?? {});
      return {
        slices: {
          ...state.slices,
          [pageKey]: {
            ...slice,
            filters: nextFilters,
            page: 1,
          },
        },
      };
    }),

  setGroupBy: (pageKey, groupBy) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          groupBy,
          page: 1,
        },
      },
    })),

  setPage: (pageKey, page) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          page,
        },
      },
    })),

  setPageSize: (pageKey, pageSize) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          pageSize,
          page: 1,
        },
      },
    })),

  setDatePreset: (pageKey, datePreset) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          datePreset,
          page: 1,
        },
      },
    })),

  setCustomDateRange: (pageKey, customDateFrom, customDateTo) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          customDateFrom,
          customDateTo,
          datePreset: "custom" as DatePreset,
          page: 1,
        },
      },
    })),

  setCustomDateFrom: (pageKey, customDateFrom) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          customDateFrom,
          datePreset: "custom" as DatePreset,
          page: 1,
        },
      },
    })),

  setCustomDateTo: (pageKey, customDateTo) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          customDateTo,
          datePreset: "custom" as DatePreset,
          page: 1,
        },
      },
    })),

  setActiveFilter: (pageKey, activeFilter) =>
    set((state) => {
      const slice = state.slices[pageKey] ?? { ...DEFAULT_SLICE };
      return {
        slices: {
          ...state.slices,
          [pageKey]: {
            ...slice,
            activeFilter,
            pageTables: 1,
            pageTickets: 1,
            pageAnnouncements: 1,
          },
        },
      };
    }),

  setPageTables: (pageKey, page) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          pageTables: page,
        },
      },
    })),

  setPageTickets: (pageKey, page) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          pageTickets: page,
        },
      },
    })),

  setPageAnnouncements: (pageKey, page) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          pageAnnouncements: page,
        },
      },
    })),

  setViewModeTables: (pageKey, mode) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          viewModeTables: mode,
        },
      },
    })),

  setViewModeEvents: (pageKey, mode) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          viewModeEvents: mode,
        },
      },
    })),

  setViewModeAnnouncements: (pageKey, mode) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...(state.slices[pageKey] ?? { ...DEFAULT_SLICE }),
          viewModeAnnouncements: mode,
        },
      },
    })),

  clearFilters: (pageKey) =>
    set((state) => ({
      slices: {
        ...state.slices,
        [pageKey]: {
          ...DEFAULT_SLICE,
          pageSize: state.slices[pageKey]?.pageSize ?? 10,
        },
      },
    })),

  clearAll: () => set({ slices: getInitialSlices() }),
}));
