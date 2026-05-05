/**
 * Session bootstrap thunk — single source of truth for initial session load.
 * Dispatched once on app mount (e.g. from AuthGate); no useEffect in hooks.
 */
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getSession,
  getNda,
  getUserSettings,
  apiFetch,
} from "@/lib/api";
import type { SessionUser } from "@/lib/api";
import { setUser, setAppkitWalletEmail, setNdaAccepted, setLoading, User } from "@/store/slices/authSlice";
import { setTheme, setLanguage, setSignInOpen } from "@/store/slices/uiSlice";
import { persistTheme } from "@/components/ThemeSync";
import { setLang, SUPPORTED_LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import type { AppDispatch, RootState } from "@/store";

function mapSessionUser(
  user: SessionUser | null
): { id: string; email: string; name?: string; image?: string | null; profileImageUrl?: string | null; authMethod?: string | null; role?: string | null; walletAddress?: string | null  } | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? undefined,
    image: user.image ?? user.profileImageUrl ?? undefined,
    profileImageUrl: user.profileImageUrl ?? undefined,
    authMethod: user.authMethod ?? undefined,
    role: user.role ?? undefined,
    walletAddress: user.walletAddress ?? undefined,
  };
}

const JUST_SIGNED_OUT_KEY = "__just_signed_out__";
// Match SessionSync: no auto-restore for 5 min after sign-out (no automatic login without user action)
const JUST_SIGNED_OUT_TTL_MS = 300_000;

const APPKIT_WALLET_EMAIL_KEY = "@appkit-wallet/EMAIL";

/** Syncs email from AppKit wallet localStorage (@appkit-wallet/EMAIL) into Redux and optionally into user record (DB). Run on client when user has wallet. */
export const syncAppkitWalletEmail = createAsyncThunk<
  void,
  void,
  { state: RootState; dispatch: AppDispatch }
>("auth/syncAppkitWalletEmail", async (_, { dispatch, getState }) => {
  if (typeof window === "undefined") return;
  const { user } = getState().auth;
  if (!user?.walletAddress) return;
  try {
    const email = localStorage.getItem(APPKIT_WALLET_EMAIL_KEY);
    dispatch(setAppkitWalletEmail(email || null));
    // Populate into user data: if session has placeholder email, sync to backend so next session has real email
    if (email?.trim() && user.email?.endsWith("@wallet.local")) {
      apiFetch("/api/user/sync-appkit-email", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      }).catch(() => {});
    }
  } catch {
    dispatch(setAppkitWalletEmail(null));
  }
});

export const fetchSession = createAsyncThunk<
  void,
  void,
  { state: RootState; dispatch: AppDispatch }
>("auth/fetchSession", async (_, { dispatch }) => {
  try {
    // If user just signed out, don't restore from cookie (prevents session reactivation)
    if (typeof sessionStorage !== "undefined") {
      const justSignedOut = sessionStorage.getItem(JUST_SIGNED_OUT_KEY);
      if (justSignedOut) {
        const t = Number(justSignedOut);
        if (Number.isFinite(t) && Date.now() - t < JUST_SIGNED_OUT_TTL_MS) {
          sessionStorage.removeItem(JUST_SIGNED_OUT_KEY);
          dispatch(setUser(null));
          dispatch(setSignInOpen(true));
          dispatch(setNdaAccepted(null));
          dispatch(setLoading(false));
          return;
        }
        sessionStorage.removeItem(JUST_SIGNED_OUT_KEY);
      }
    }
    const session = await getSession();
    const mapped = mapSessionUser(session?.user ?? null);
    dispatch(setUser(mapped as unknown as User | null));
    dispatch(setSignInOpen(false));

    if (mapped?.walletAddress && typeof window !== "undefined") {
      dispatch(syncAppkitWalletEmail());
    }

    if (!mapped) {
      dispatch(setSignInOpen(true));
      dispatch(setNdaAccepted(null));
      dispatch(setLoading(false));
      return;
    }

    const nda = await getNda();
    if (nda) {
      dispatch(setNdaAccepted(nda.accepted));
    } else {
      dispatch(setNdaAccepted(null));
    }

    const settings = await getUserSettings();
    if (settings?.theme === "light" || settings?.theme === "dark") {
      dispatch(setTheme(settings.theme));
      persistTheme(settings.theme);
    }
    if (
      settings?.language &&
      SUPPORTED_LANGS.includes(settings.language as Lang)
    ) {
      const lang = settings.language as Lang;
      setLang(lang);
      dispatch(setLanguage(lang));
    }
  } catch {
    dispatch(setUser(null));
    dispatch(setSignInOpen(true));
    dispatch(setNdaAccepted(null));
  } finally {
    dispatch(setLoading(false));
  }
});
