"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  setUser,
  setNdaAccepted,
  setLoading,
} from "@/store/slices/authSlice";
import { setSignInOpen, setOpeningAppKit } from "@/store/slices/uiSlice";
import { getSession } from "@/lib/api";
import { clearLocalStorageOnSignOut } from "@/lib/auth-storage-clear";

const SESSION_CHANNEL = "prestix-session";
const JUST_SIGNED_OUT_KEY = "__just_signed_out__";
// Don't auto-restore session for 5 min after sign-out (no automatic login without user choosing auth)
const JUST_SIGNED_OUT_TTL_MS = 300_000;

/** Syncs session across tabs: mount-time listeners only (BroadcastChannel, visibilitychange). Event-driven dispatch to Redux — no periodic refresh. SSoT compliant. */
export function SessionSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(SESSION_CHANNEL)
        : null;

    const handleSignOut = () => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(JUST_SIGNED_OUT_KEY, String(Date.now()));
      }
      clearLocalStorageOnSignOut();
      dispatch(setUser(null));
      dispatch(setSignInOpen(true));
      dispatch(setNdaAccepted(null));
      dispatch(setLoading(false));
      dispatch(setOpeningAppKit(false));
    };

    if (channel) {
      channel.onmessage = (e) => {
        if (e.data === "signout") handleSignOut();
      };
    }

    // When AppKit/SIWE signOut runs (Exit/disconnect), clear Redux and notify other tabs
    const onAppKitSignOut = () => {
      handleSignOut();
      broadcastSignOut();
    };
    window.addEventListener("appkit-signout", onAppKitSignOut);
    window.addEventListener("appkit-disconnect-wallet", onAppKitSignOut);

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      // Don't restore session from cookie shortly after sign-out (avoids reactivation from stale cookie)
      const justSignedOut = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(JUST_SIGNED_OUT_KEY) : null;
      if (justSignedOut) {
        const t = Number(justSignedOut);
        if (Number.isFinite(t) && Date.now() - t < JUST_SIGNED_OUT_TTL_MS) {
          return;
        }
        sessionStorage.removeItem(JUST_SIGNED_OUT_KEY);
      }
      getSession()
        .then((session) => {
          const user = session?.user ?? null;
          if (!user) {
            handleSignOut();
          } else {
            dispatch(
              setUser({
                id: user.id,
                email: user.email ?? "",
                name: user.name ?? undefined,
                image: user.image ?? user.profileImageUrl ?? undefined,
                profileImageUrl: user.profileImageUrl ?? undefined,
                authMethod: user.authMethod ?? undefined,
              })
            );
          }
        })
        .catch(() => handleSignOut());
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      channel?.close();
      window.removeEventListener("appkit-signout", onAppKitSignOut);
      window.removeEventListener("appkit-disconnect-wallet", onAppKitSignOut);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [dispatch]);

  return null;
}

/** Call after sign-out so other tabs clear their session state. */
export function broadcastSignOut() {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    new BroadcastChannel(SESSION_CHANNEL).postMessage("signout");
  } catch {
    // ignore
  }
}
