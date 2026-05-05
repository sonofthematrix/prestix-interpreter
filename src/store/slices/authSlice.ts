import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type PrestixUserRole } from "../../../zenstack/models";


/** Single source of truth for session user (id, email, name, image/avatar, role). Populated only by fetchSession, SessionSync, and SignInSignUpModal from /api/auth/session. */
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  profileImageUrl?: string | null;
  authMethod?: string | null;
  role?: PrestixUserRole | null;
  walletAddress?: string | null;
}

export interface AuthState {
  user: User | null;
  ndaAccepted: boolean | null;
  loading: boolean;
  isAuthenticated: boolean;
  roles: PrestixUserRole[];
  /** Email from AppKit wallet localStorage (@appkit-wallet/EMAIL) when user signed in with email/wallet. Single source of truth; set by syncAppkitWalletEmail thunk. */
  appkitWalletEmail: string | null;
}

const initialState: AuthState = {
  user: null,
  ndaAccepted: null,
  loading: true,
  isAuthenticated: false,
  roles: [],
  appkitWalletEmail: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      if (action.payload === null) state.appkitWalletEmail = null;
    },
    setAppkitWalletEmail: (state, action: PayloadAction<string | null>) => {
      state.appkitWalletEmail = action.payload;
    },
    setNdaAccepted: (state, action: PayloadAction<boolean | null>) => {
      state.ndaAccepted = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    reset: (state) => {
      state.user = null;
      state.ndaAccepted = null;
      state.loading = false;
      state.appkitWalletEmail = null;
    },
  },
});

export const { setUser, setAppkitWalletEmail, setNdaAccepted, setLoading, reset } = authSlice.actions;
export default authSlice.reducer;
