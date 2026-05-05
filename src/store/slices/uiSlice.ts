import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Theme = "light" | "dark";
export type Audience = "all" | "partner" | "organizer" | "promoter" | "influencer";
export type ModelVariant = "bike" | "ebike";

export interface Toast {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
}

export type Language = "en" | "es" | "fr" | "de" | "id";

/** Hub list view: cards grid or table. Single source of truth for all hub entity pages. */
export type HubListViewMode = "cards" | "table";

export interface UIState {
  theme: Theme;
  language: Language;
  /** 1-based section index for URL (?section=01, ?section=02, ...). null = no section. */
  sectionIndex: number | null;
  signInOpen: boolean;
  /** True while user clicked Connect Wallet and we're opening AppKit; prevents safeguard from re-opening sign-in modal. */
  openingAppKit: boolean;
  audience: Audience | null;
  toasts: Toast[];
  drawerOpen: boolean;
  /** Transient copy feedback in account drawer (e.g. "Link copied"). Cleared when drawer closes. */
  drawerCopyFeedback: string | null;
  shareOpen: boolean;
  modelViewerFocused: boolean;
  breakoutsVisible: boolean;
  modelVariant: ModelVariant;
  /** Hub entity list view (cards vs table). ONE SOURCE OF TRUTH for ViewToggle. */
  hubListViewMode: HubListViewMode;
  /** Mobile hub left sidebar (nav menu) open state. ONE SOURCE OF TRUTH for hub layout. */
  hubSidebarOpen: boolean;
}

const initialState: UIState = {
  theme: "dark",
  language: "en",
  sectionIndex: null,
  signInOpen: false,
  openingAppKit: false,
  audience: null,
  toasts: [],
  drawerOpen: false,
  drawerCopyFeedback: null,
  shareOpen: false,
  modelViewerFocused: false,
  breakoutsVisible: false,
  modelVariant: "bike",
  hubListViewMode: "cards",
  hubSidebarOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    setSectionIndex: (state, action: PayloadAction<number | null>) => {
      state.sectionIndex = action.payload;
    },
    setSignInOpen: (state, action: PayloadAction<boolean>) => {
      state.signInOpen = action.payload;
    },
    setOpeningAppKit: (state, action: PayloadAction<boolean>) => {
      state.openingAppKit = action.payload;
    },
    setAudience: (state, action: PayloadAction<Audience | null>) => {
      state.audience = action.payload;
    },
    addToast: (state, action: PayloadAction<Omit<Toast, "id">>) => {
      const maxId = state.toasts.length
        ? Math.max(...state.toasts.map((t) => t.id))
        : 0;
      state.toasts.push({
        ...action.payload,
        id: maxId + 1,
      });
    },
    removeToast: (state, action: PayloadAction<number>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.drawerOpen = action.payload;
      if (!action.payload) state.drawerCopyFeedback = null;
    },
    setDrawerCopyFeedback: (state, action: PayloadAction<string | null>) => {
      state.drawerCopyFeedback = action.payload;
    },
    setShareOpen: (state, action: PayloadAction<boolean>) => {
      state.shareOpen = action.payload;
    },
    setModelViewerFocused: (state, action: PayloadAction<boolean>) => {
      state.modelViewerFocused = action.payload;
    },
    setBreakoutsVisible: (state, action: PayloadAction<boolean>) => {
      state.breakoutsVisible = action.payload;
    },
    setModelVariant: (state, action: PayloadAction<ModelVariant>) => {
      state.modelVariant = action.payload;
    },
    setHubListViewMode: (state, action: PayloadAction<HubListViewMode>) => {
      state.hubListViewMode = action.payload;
    },
    setHubSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.hubSidebarOpen = action.payload;
    },
  },
});

export const {
  setTheme,
  setLanguage,
  setSectionIndex,
  setSignInOpen,
  setOpeningAppKit,
  setAudience,
  addToast,
  removeToast,
  setDrawerOpen,
  setDrawerCopyFeedback,
  setShareOpen,
  setModelViewerFocused,
  setBreakoutsVisible,
  setModelVariant,
  setHubListViewMode,
  setHubSidebarOpen,
} = uiSlice.actions;
export default uiSlice.reducer;
