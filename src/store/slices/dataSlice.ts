import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  getSiteSettings,
  getPartnershipStatus,
  getPartners,
  getProfileCapabilities,
  getAdminUsers,
  getAdminFeedback,
  getMembershipStatus,
  type AdminUser,
  type AdminFeedbackRow,
  type PartnerPublic,
  type PartnershipAgreement,
  type MembershipStatus as ApiMembershipStatus,
} from "@/lib/api";

const DEFAULT_MARKETPLACE_URL = "https://prestix.vip/marketplace";

export interface PartnershipStatusState {
  hasAgreement: boolean;
  isPartner: boolean;
  role: "partner" | "promoter" | "event_organizer" | null;
  agreement: PartnershipAgreement | null;
}

export interface ProfileCapabilitiesState {
  canUpload: boolean;
  canDownloadUsers?: boolean;
  canManageUsers?: boolean;
}

export interface DataState {
  siteSettings: {
    marketplaceUrl: string;
  };
  siteSettingsLoading: boolean;
  siteSettingsError: string | null;

  partnershipStatus: PartnershipStatusState | null;
  partnershipStatusLoading: boolean;
  partnershipStatusError: string | null;

  partners: PartnerPublic[];
  partnersLoading: boolean;
  partnersError: string | null;

  profileCapabilities: ProfileCapabilitiesState | null;
  profileCapabilitiesLoading: boolean;
  profileCapabilitiesError: string | null;

  adminUsers: AdminUser[];
  adminUsersLoading: boolean;
  adminUsersError: string | null;

  adminFeedback: AdminFeedbackRow[];
  adminFeedbackLoading: boolean;
  adminFeedbackError: string | null;

  membershipStatus: ApiMembershipStatus | null;
  membershipStatusLoading: boolean;
  membershipStatusError: string | null;
}

const initialState: DataState = {
  siteSettings: { marketplaceUrl: DEFAULT_MARKETPLACE_URL },
  siteSettingsLoading: false,
  siteSettingsError: null,

  partnershipStatus: null,
  partnershipStatusLoading: false,
  partnershipStatusError: null,

  partners: [],
  partnersLoading: false,
  partnersError: null,

  profileCapabilities: null,
  profileCapabilitiesLoading: false,
  profileCapabilitiesError: null,

  adminUsers: [],
  adminUsersLoading: false,
  adminUsersError: null,

  adminFeedback: [],
  adminFeedbackLoading: false,
  adminFeedbackError: null,

  membershipStatus: null,
  membershipStatusLoading: false,
  membershipStatusError: null,
};

export const fetchSiteSettings = createAsyncThunk(
  "data/fetchSiteSettings",
  async () => {
    const s = await getSiteSettings();
    return { marketplaceUrl: s.marketplaceUrl };
  }
);

export const fetchPartnershipStatus = createAsyncThunk(
  "data/fetchPartnershipStatus",
  async () => {
    const r = await getPartnershipStatus();
    return {
      hasAgreement: r.hasAgreement,
      isPartner: r.isPartner,
      role: r.role,
      agreement: r.agreement ?? null,
    } as PartnershipStatusState;
  }
);

export const fetchPartners = createAsyncThunk(
  "data/fetchPartners",
  async () => {
    const r = await getPartners();
    return r.partners ?? [];
  }
);

export const fetchProfileCapabilities = createAsyncThunk(
  "data/fetchProfileCapabilities",
  async () => {
    const c = await getProfileCapabilities();
    return {
      canUpload: !!c.canUpload,
      canDownloadUsers: c.canDownloadUsers,
      canManageUsers: c.canManageUsers,
    } as ProfileCapabilitiesState;
  }
);

export const fetchAdminUsers = createAsyncThunk(
  "data/fetchAdminUsers",
  async () => {
    const result = await getAdminUsers();
    if ("error" in result) throw new Error(result.error);
    return result.users;
  }
);

export const fetchAdminFeedback = createAsyncThunk(
  "data/fetchAdminFeedback",
  async () => {
    const result = await getAdminFeedback();
    if ("error" in result) throw new Error(result.error);
    return result.feedback;
  }
);

export const fetchMembershipStatus = createAsyncThunk(
  "data/fetchMembershipStatus",
  async () => {
    return getMembershipStatus();
  }
);

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    setSiteSettingsMarketplaceUrl: (state, action: PayloadAction<string>) => {
      state.siteSettings.marketplaceUrl = action.payload;
    },
    patchAdminUserInList: (
      state,
      action: PayloadAction<{ userId: string; patch: Partial<Pick<AdminUser, "isAdmin" | "active" | "isPartner" | "role">> }>
    ) => {
      const idx = state.adminUsers.findIndex((u) => u.id === action.payload.userId);
      if (idx !== -1) {
        state.adminUsers[idx] = { ...state.adminUsers[idx], ...action.payload.patch };
      }
    },
    patchAdminUserAgreementInList: (
      state,
      action: PayloadAction<{ userId: string; agreement: PartnershipAgreement }>
    ) => {
      const idx = state.adminUsers.findIndex((u) => u.id === action.payload.userId);
      if (idx !== -1 && state.adminUsers[idx].partnershipAgreement) {
        state.adminUsers[idx] = {
          ...state.adminUsers[idx],
          partnershipAgreement: action.payload.agreement,
        };
      }
    },
    removeAdminUserAgreementInList: (state, action: PayloadAction<{ userId: string }>) => {
      const idx = state.adminUsers.findIndex((u) => u.id === action.payload.userId);
      if (idx !== -1) {
        state.adminUsers[idx] = {
          ...state.adminUsers[idx],
          partnershipAgreement: undefined,
          partnershipAgreedAt: undefined,
          isPartner: false,
        };
      }
    },
    clearPartnershipStatus: (state) => {
      state.partnershipStatus = null;
      state.partnershipStatusError = null;
    },
    clearProfileCapabilities: (state) => {
      state.profileCapabilities = null;
      state.profileCapabilitiesError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteSettings.pending, (state) => {
        state.siteSettingsLoading = true;
        state.siteSettingsError = null;
      })
      .addCase(fetchSiteSettings.fulfilled, (state, action) => {
        state.siteSettingsLoading = false;
        state.siteSettings.marketplaceUrl = action.payload.marketplaceUrl;
        state.siteSettingsError = null;
      })
      .addCase(fetchSiteSettings.rejected, (state, action) => {
        state.siteSettingsLoading = false;
        state.siteSettingsError = action.error.message ?? "Failed to load site settings";
      })

      .addCase(fetchPartnershipStatus.pending, (state) => {
        state.partnershipStatusLoading = true;
        state.partnershipStatusError = null;
      })
      .addCase(fetchPartnershipStatus.fulfilled, (state, action) => {
        state.partnershipStatusLoading = false;
        state.partnershipStatus = action.payload;
        state.partnershipStatusError = null;
      })
      .addCase(fetchPartnershipStatus.rejected, (state, action) => {
        state.partnershipStatusLoading = false;
        state.partnershipStatusError = action.error.message ?? "Failed to load partnership status";
      })

      .addCase(fetchPartners.pending, (state) => {
        state.partnersLoading = true;
        state.partnersError = null;
      })
      .addCase(fetchPartners.fulfilled, (state, action) => {
        state.partnersLoading = false;
        state.partners = action.payload;
        state.partnersError = null;
      })
      .addCase(fetchPartners.rejected, (state, action) => {
        state.partnersLoading = false;
        state.partnersError = action.error.message ?? "Failed to load partners";
      })

      .addCase(fetchProfileCapabilities.pending, (state) => {
        state.profileCapabilitiesLoading = true;
        state.profileCapabilitiesError = null;
      })
      .addCase(fetchProfileCapabilities.fulfilled, (state, action) => {
        state.profileCapabilitiesLoading = false;
        state.profileCapabilities = action.payload;
        state.profileCapabilitiesError = null;
      })
      .addCase(fetchProfileCapabilities.rejected, (state, action) => {
        state.profileCapabilitiesLoading = false;
        state.profileCapabilitiesError = action.error.message ?? "Failed to load capabilities";
      })

      .addCase(fetchAdminUsers.pending, (state) => {
        state.adminUsersLoading = true;
        state.adminUsersError = null;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.adminUsersLoading = false;
        state.adminUsers = action.payload;
        state.adminUsersError = null;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.adminUsersLoading = false;
        state.adminUsersError = action.error.message ?? "Failed to load users";
      })

      .addCase(fetchAdminFeedback.pending, (state) => {
        state.adminFeedbackLoading = true;
        state.adminFeedbackError = null;
      })
      .addCase(fetchAdminFeedback.fulfilled, (state, action) => {
        state.adminFeedbackLoading = false;
        state.adminFeedback = action.payload;
        state.adminFeedbackError = null;
      })
      .addCase(fetchAdminFeedback.rejected, (state, action) => {
        state.adminFeedbackLoading = false;
        state.adminFeedbackError = action.error.message ?? "Failed to load feedback";
      })

      .addCase(fetchMembershipStatus.pending, (state) => {
        state.membershipStatusLoading = true;
        state.membershipStatusError = null;
      })
      .addCase(fetchMembershipStatus.fulfilled, (state, action) => {
        state.membershipStatusLoading = false;
        state.membershipStatus = action.payload;
        state.membershipStatusError = null;
      })
      .addCase(fetchMembershipStatus.rejected, (state, action) => {
        state.membershipStatusLoading = false;
        state.membershipStatusError = action.error.message ?? "Failed to load membership";
      });
  },
});

export const {
  setSiteSettingsMarketplaceUrl,
  patchAdminUserInList,
  patchAdminUserAgreementInList,
  removeAdminUserAgreementInList,
  clearPartnershipStatus,
  clearProfileCapabilities,
} = dataSlice.actions;
export default dataSlice.reducer;
