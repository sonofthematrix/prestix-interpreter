"use client";

import { useAppKitState, useAppKitAccount, getModal } from "@/lib/appkit";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSignInOpen, setOpeningAppKit } from "@/store/slices/uiSlice";
import { setUser, setNdaAccepted } from "@/store/slices/authSlice";
import { getSession, apiFetch } from "@/lib/api";
import { useRef, useEffect, useState } from "react";
import { sessionCache } from "@/lib/services/session-cache";

/**
 * Short settling delay (ms) so the social popup can update connection state before we decide to show login.
 * Event-driven: we react to isConnected/user changes; this only avoids showing login in the same tick as modal close.
 */
const POPUP_STATE_SETTLE_MS = 800;

/** Poll interval (ms) for session while AppKit modal is open — detects session after /auth/v1/authenticate (social flow). */
const SESSION_POLL_MS = 1500;

/**
 * Inner handler: uses useAppKitState so must only mount after createAppKit has run.
 * When the connect dialog is closed and the wallet is connected but there is no session,
 * re-opens the AppKit modal so the SIWE sign-message step runs (Sepolia / session).
 * When modal closes and wallet is not connected, waits for connection/user events (popup success)
 * before showing login; uses a short settling delay so popup callback can run.
 */
function AppKitModalCloseHandlerInner() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const appKitState = useAppKitState();
  const { isConnected, address } = useAppKitAccount();
  const wasOpenRef = useRef<boolean>(false);
  const waitingForPopupRef = useRef<boolean>(false);
  const closedAtRef = useRef<number>(0);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionDetectedRef = useRef<boolean>(false);

  const isAppKitOpen = Boolean(appKitState?.open);

  // When modal is open, poll for session only for social/embedded flow (cookie set by /auth/v1/authenticate).
  // Do NOT close when wallet is connected (address) — user is in SIWE sign step; modal must stay open until
  // they sign and verification completes (siwe-config onSignIn will close it).
  useEffect(() => {
    if (!isAppKitOpen) {
      sessionDetectedRef.current = false;
      return;
    }
    const poll = async () => {
      try {
        if (address || isConnected) return; // SIWE sign step in progress: never close from poll; wait for onSignIn after verification
        const session = await getSession();
        if (!session?.user || sessionDetectedRef.current) return;
        sessionDetectedRef.current = true;
        try {
          sessionStorage.setItem("__appkit_just_signed_in__", "true");
        } catch {}
        window.dispatchEvent(new CustomEvent("appkit-siwe-signin"));
        try {
          const modal = getModal();
          if (modal && typeof (modal as any).close === "function") {
            (modal as any).close();
          }
        } catch (e) {
          console.warn("[AppKitModalCloseHandler] Close modal after session poll:", e);
        }
        window.dispatchEvent(new CustomEvent("appkit-siwe-navigate", { detail: { path: "/" } }));
      } catch {
        // ignore poll errors
      }
    };
    const id = setInterval(poll, SESSION_POLL_MS);
    poll();
    return () => clearInterval(id);
  }, [isAppKitOpen, address, isConnected]);

  useEffect(() => {
    const justClosed = wasOpenRef.current && !isAppKitOpen;
    wasOpenRef.current = isAppKitOpen;

    if (justClosed && !user && !isConnected) {
      waitingForPopupRef.current = true;
      closedAtRef.current = Date.now();
    }

    if (!justClosed && !waitingForPopupRef.current && user) return;

    if (!user) {
      // Do not re-open modal if user just completed sign-in (redirect to NDA/home is in progress)
      const justSignedIn = typeof sessionStorage !== "undefined" && sessionStorage.getItem("__appkit_just_signed_in__") === "true";
      if (justSignedIn) {
        waitingForPopupRef.current = false;
        return;
      }
    }

    // Event-driven: connection or session established (e.g. Google popup completed)
    if (waitingForPopupRef.current && (isConnected || user)) {
      waitingForPopupRef.current = false;
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
      if (isConnected && address && !user) {
        const openSiweModal = () => {
          try {
            const modal = getModal();
            if (modal && typeof (modal as any).open === "function") {
              console.log("🔐 [AppKitModalCloseHandler] Wallet connected without session, opening SIWE sign dialog...");
              (modal as any).open();
            }
          } catch (e) {
            console.warn("[AppKitModalCloseHandler] Failed to open SIWE modal:", e);
          }
        };
        const t = setTimeout(openSiweModal, 300);
        return () => clearTimeout(t);
      }
      return;
    }

    // Modal just closed, no connection yet: wait for popup to complete (isConnected/user will trigger re-run)
    if (justClosed && !user && !isConnected) {
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
      settleTimeoutRef.current = setTimeout(() => {
        settleTimeoutRef.current = null;
        if (!waitingForPopupRef.current) return;
        if (user) return;
        const conn = (window as any).__appkit_connected__;
        if (conn) {
          console.log("✅ [AppKitModalCloseHandler] Connection established during settle; not showing login");
          return;
        }
        console.log("⏱️ [AppKitModalCloseHandler] No connection/session after settle; showing login");
        waitingForPopupRef.current = false;
        dispatch(setOpeningAppKit(false));
        dispatch(setSignInOpen(true));
      }, POPUP_STATE_SETTLE_MS);
      return () => {
        if (settleTimeoutRef.current) {
          clearTimeout(settleTimeoutRef.current);
          settleTimeoutRef.current = null;
        }
      };
    }

    // Modal closed earlier, we were waiting, and still no connection: show login after settling
    if (waitingForPopupRef.current && !user && !isConnected) {
      const elapsed = Date.now() - closedAtRef.current;
      if (elapsed >= POPUP_STATE_SETTLE_MS) {
        waitingForPopupRef.current = false;
        dispatch(setOpeningAppKit(false));
        dispatch(setSignInOpen(true));
      }
    }

    // Modal just closed with wallet connected but no session → open SIWE sign step (not "waiting for popup")
    if (justClosed && !user && isConnected && address) {
      const openSiweModal = () => {
        try {
          const modal = getModal();
          if (modal && typeof (modal as any).open === "function") {
            console.log("🔐 [AppKitModalCloseHandler] Wallet connected without session, opening SIWE sign dialog...");
            (modal as any).open();
          }
        } catch (e) {
          console.warn("[AppKitModalCloseHandler] Failed to open SIWE modal:", e);
        }
      };
      const t = setTimeout(openSiweModal, 300);
      return () => clearTimeout(t);
    }

    // Modal just closed with wallet connected AND we have user in Redux: verify server session.
    // If user cancelled the SIWE sign, the cookie may be stale or missing → clear and re-prompt to sign.
    if (justClosed && isConnected && address && user) {
      const justSignedIn = typeof sessionStorage !== "undefined" && sessionStorage.getItem("__appkit_just_signed_in__") === "true";
      if (justSignedIn) return;

      const runValidation = async () => {
        try {
          const win = typeof window !== "undefined" ? (window as any) : null;
          const pendingAt = win?.__appkit_siwe_pending_at__ as number | undefined;
          const signedAt = win?.__appkit_siwe_signed_at__ as number | undefined;
          const pendingAge = pendingAt != null ? Date.now() - pendingAt : Infinity;
          const wasSignCancelled =
            pendingAt != null &&
            pendingAge < 120000 &&
            (signedAt == null || signedAt < pendingAt);

          if (wasSignCancelled) {
            if (win) {
              delete win.__appkit_siwe_pending_at__;
              delete win.__appkit_siwe_signed_at__;
            }
            console.log("🔐 [AppKitModalCloseHandler] SIWE sign cancelled: clearing user and re-opening sign dialog");
            try {
              await apiFetch("/api/auth/signout", { method: "POST" });
            } catch (e) {
              console.warn("[AppKitModalCloseHandler] signout API error:", e);
            }
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("__just_signed_out__", String(Date.now()));
              } catch {}
              sessionCache.invalidate(address, "manualInvalidate");
              const { useAppKitSession } = await import("@/lib/auth/appkit-session");
              useAppKitSession.getState().clearSession();
            }
            dispatch(setUser(null));
            dispatch(setNdaAccepted(null));
            dispatch(setSignInOpen(false));
            dispatch(setOpeningAppKit(false));
            const openSiweModal = () => {
              try {
                const modal = getModal();
                if (modal && typeof (modal as any).open === "function") {
                  (modal as any).open();
                }
              } catch (e) {
                console.warn("[AppKitModalCloseHandler] Failed to re-open SIWE modal:", e);
              }
            };
            setTimeout(openSiweModal, 300);
            return;
          }

          const session = await getSession();
          const sessionUser = session?.user ?? null;
          const walletMatch =
            sessionUser?.walletAddress &&
            address &&
            sessionUser.walletAddress.toLowerCase() === address.toLowerCase();
          if (!sessionUser || !walletMatch) {
            console.log("🔐 [AppKitModalCloseHandler] Invalid or stale session: clearing user and re-opening sign dialog");
            try {
              await apiFetch("/api/auth/signout", { method: "POST" });
            } catch (e) {
              console.warn("[AppKitModalCloseHandler] signout API error:", e);
            }
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("__just_signed_out__", String(Date.now()));
              } catch {}
              sessionCache.invalidate(address, "manualInvalidate");
              const { useAppKitSession } = await import("@/lib/auth/appkit-session");
              useAppKitSession.getState().clearSession();
            }
            dispatch(setUser(null));
            dispatch(setNdaAccepted(null));
            dispatch(setSignInOpen(false));
            dispatch(setOpeningAppKit(false));
            const openSiweModal = () => {
              try {
                const modal = getModal();
                if (modal && typeof (modal as any).open === "function") {
                  (modal as any).open();
                }
              } catch (e) {
                console.warn("[AppKitModalCloseHandler] Failed to re-open SIWE modal:", e);
              }
            };
            setTimeout(openSiweModal, 300);
          }
        } catch (e) {
          console.warn("[AppKitModalCloseHandler] Session validation error:", e);
        }
      };
      runValidation();
      return;
    }
  }, [isAppKitOpen, user, dispatch, isConnected, address]);

  return null;
}

/**
 * When the AppKit connect modal is closed (cancel, overlay click, or X):
 * - If the wallet is connected but there is no session → re-open the AppKit modal to show the SIWE sign-message step.
 * - If the wallet is not connected → re-open the app login screen with all login options.
 * Mounts the inner handler only on the client after createAppKit has been called,
 * to avoid "Please call createAppKit before using useAppKitState" during SSR or initial load.
 */
export function AppKitModalCloseHandler() {
  const [appKitReady, setAppKitReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      getModal();
      setAppKitReady(true);
    } catch {
      setAppKitReady(false);
    }
  }, []);

  if (!appKitReady) return null;
  return <AppKitModalCloseHandlerInner />;
}
