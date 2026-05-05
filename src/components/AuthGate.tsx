"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { fetchSession } from "@/store/thunks/fetchSession";
import { setOpeningAppKit } from "@/store/slices/uiSlice";
import { useSessionGate } from "@/hooks/useSessionGate";
import { SessionSync } from "./SessionSync";
import { NdaOverlay } from "./NdaOverlay";
import { SignInSignUpModal } from "./SignInSignUpModal";
import { ToastContainer } from "./ToastContainer";
import { SocialWalletSIWEHandler } from "./auth/SocialWalletSIWEHandler";
import { AppKitModalCloseHandler } from "./auth/AppKitModalCloseHandler";
import { PromoterPreferencePrompt } from "./promoter/PromoterPreferencePrompt";

/**
 * Runs session/NDA bootstrap. Renders NDA overlay, sign-in modal, and toasts.
 * SessionSync runs always so cross-tab sign-out is received even before content is shown.
 * Site content (children) is rendered only when the user is signed in AND has accepted the NDA.
 * When AppKit connect modal is closed/canceled/clicked outside, login screen is shown again.
 * After SIWE sign-in: redirects to home (/) so user sees NDA or main content; does not re-open AppKit modal.
 *
 * ONE SOURCE OF TRUTH (Redux): Session state lives in Redux auth slice only. Bootstrap runs once on
 * mount via dispatch(fetchSession()). Refresh is event-triggered only (e.g. appkit-siwe-signin). No periodic refresh.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, ndaAccepted, loading, refresh } = useSessionGate();

  // Mount-time only: single session bootstrap (SSoT — no state sync or periodic fetch).
  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  // Event listeners only: dispatch/store actions on discrete events; no state sync in effect deps.
  useEffect(() => {
    const onNavigate = (e: CustomEvent<{ path: string }>) => {
      const path = e.detail?.path;
      if (!path) return;
      // Preserve ?lang=en&section=06 when redirecting to home so deep links don't reload to bare /
      const target =
        path === "/" && typeof window !== "undefined" && window.location.search
          ? path + window.location.search
          : path;
      router.push(target);
    };
    const onSignIn = () => {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("__just_signed_out__");
      dispatch(setOpeningAppKit(false));
      refresh();
    };

    window.addEventListener("appkit-siwe-navigate", onNavigate as EventListener);
    window.addEventListener("appkit-siwe-signin", onSignIn);
    return () => {
      window.removeEventListener("appkit-siwe-navigate", onNavigate as EventListener);
      window.removeEventListener("appkit-siwe-signin", onSignIn);
    };
  }, [router, refresh, dispatch]);

  const showContent = !!user && ndaAccepted === true;
  const showSessionLoading = loading && user == null;

  return (
    <>
      <SessionSync />
      <SocialWalletSIWEHandler />
      <AppKitModalCloseHandler />
      {showContent ? children : null}
      {showSessionLoading && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-background/90" aria-hidden="true">
          <div className="text-muted-foreground text-sm">Loading…</div>
        </div>
      )}
      <NdaOverlay />
      <SignInSignUpModal />
      <PromoterPreferencePrompt />
      <ToastContainer />
    </>
  );
}
