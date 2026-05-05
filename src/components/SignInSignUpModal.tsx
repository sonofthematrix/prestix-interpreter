"use client";

// ✅ CRITICAL: Patch @reown/appkit-utils BEFORE importing any AppKit modules
// This prevents "Cannot read properties of null (reading 'asset')" errors during TokenUtil initialization
import '@/lib/appkit-patch';
// ✅ CRITICAL: Import from @/lib/appkit to ensure createAppKit is called before useAppKit
// This ensures AppKit is initialized before any hooks are used
import { useAppKit } from '@/lib/appkit';

import type { SessionUser } from "@/lib/api";
import {
  register as apiRegister,
  forgotPassword,
  getNda,
  getSession,
  getSignInUrl,
  loginWithCredentials,
} from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLoading, setNdaAccepted, setUser } from "@/store/slices/authSlice";
import { setSignInOpen, setOpeningAppKit } from "@/store/slices/uiSlice";
import { useState } from "react";

function mapUser(u: SessionUser | null) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    name: u.name ?? undefined,
    image: u.image ?? u.profileImageUrl ?? undefined,
    profileImageUrl: u.profileImageUrl ?? undefined,
    authMethod: u.authMethod ?? undefined,
  };
}

export function SignInSignUpModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.signInOpen);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [signinError, setSigninError] = useState("");
  const [signupError, setSignupError] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoadingState] = useState(false);
  const { open: openAppKit } = useAppKit();

  if (!open) return null;

  const handleClose = async () => {
    dispatch(setSignInOpen(false));
    const session = await getSession();
    const user = mapUser(session?.user ?? null);
    dispatch(setUser(user));
    if (user) {
      const nda = await getNda();
      dispatch(setNdaAccepted(nda?.accepted ?? null));
    }
    dispatch(setLoading(false));
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value;
    const password = (form.querySelector('[name="password"]') as HTMLInputElement)?.value;
    if (!email || !password) return;
    setSigninError("");
    setLoadingState(true);
    try {
      const result = await loginWithCredentials(email, password);
      if (result.ok) {
        await handleClose();
      } else {
        setSigninError(result.error ?? "Sign in failed.");
      }
    } catch {
      setSigninError("Sign in failed. Try again.");
    } finally {
      setLoadingState(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value;
    const password = (form.querySelector('[name="password"]') as HTMLInputElement)?.value;
    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value;
    if (!email || !password) return;
    setSignupError("");
    setLoadingState(true);
    try {
      const result = await apiRegister(email, password, name);
      if (result.ok) {
        await handleClose();
      } else {
        setSignupError(result.error ?? "Sign up failed.");
      }
    } catch {
      setSignupError("Sign up failed. Try again.");
    } finally {
      setLoadingState(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (document.getElementById("signin-forgot-email") as HTMLInputElement)?.value?.trim();
    if (!email) {
      setForgotError("Enter your email.");
      return;
    }
    setForgotError("");
    setForgotMessage("");
    setLoadingState(true);
    try {
      const result = await forgotPassword(email);
      setForgotMessage(result.message ?? "Check your email for a link to set a new password.");
    } catch {
      setForgotError("Request failed. Try again.");
    } finally {
      setLoadingState(false);
    }
  };

  const signInUrl = getSignInUrl();

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-signup-title"
    >
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-zinc-900 p-6 shadow-xl">
        <h2 id="signin-signup-title" className="font-serif text-xl font-bold text-white">
          Sign in or Sign up
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Use your Google account or email and password to continue.
        </p>

        <div className="mt-4 flex gap-2 rounded-lg bg-zinc-800 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signin"}
            onClick={() => {
              setTab("signin");
              setSigninError("");
              setSignupError("");
              setShowForgot(false);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === "signin" ? "bg-zinc-700 text-white" : "text-white/70"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signup"}
            onClick={() => {
              setTab("signup");
              setSigninError("");
              setSignupError("");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === "signup" ? "bg-zinc-700 text-white" : "text-white/70"}`}
          >
            Sign up
          </button>
        </div>

        <a
          href={signInUrl}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 py-3 text-sm font-medium text-white hover:bg-white/10"
        >
          <GoogleIcon />
          Continue with Google
        </a>

        <p className="mt-4 text-center text-xs text-white/50">or</p>

        <button
          type="button"
          onClick={async () => {
            try {
              // Prevent Redux signInOpenSafeguard from re-opening this modal (user intent: open AppKit)
              dispatch(setOpeningAppKit(true));
              dispatch(setSignInOpen(false));

              await new Promise((resolve) => setTimeout(resolve, 100));
              await openAppKit({ view: "Connect" });

              // Clear openingAppKit only on events: modal close (AppKitModalCloseHandler) or sign-in success (AuthGate appkit-siwe-signin). No fixed timeout.
            } catch (error) {
              console.error("❌ [SignInSignUpModal] Failed to open AppKit modal:", error);
              dispatch(setOpeningAppKit(false));
            }
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <WalletIcon />
          Connect Wallet
        </button>

        {!showForgot ? (
          <>
            <form
              onSubmit={tab === "signin" ? handleSignIn : handleSignUp}
              className="mt-4 space-y-3"
              style={{ display: tab === "signin" ? "block" : "none" }}
            >
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-white/20 bg-zinc-800 px-3 py-2 text-white placeholder:text-white/50"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/20 bg-zinc-800 px-3 py-2 text-white placeholder:text-white/50"
              />
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs text-white/60 hover:underline"
              >
                Forgot password?
              </button>
              {signinError && (
                <p className="text-sm text-red-400" role="alert">
                  {signinError}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-black disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <form
              onSubmit={tab === "signup" ? handleSignUp : undefined}
              className="mt-4 space-y-3"
              style={{ display: tab === "signup" ? "block" : "none" }}
            >
              <input
                type="text"
                name="name"
                placeholder="Name (optional)"
                autoComplete="name"
                className="w-full rounded-lg border border-white/20 bg-zinc-800 px-3 py-2 text-white placeholder:text-white/50"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-white/20 bg-zinc-800 px-3 py-2 text-white placeholder:text-white/50"
              />
              <input
                type="password"
                name="password"
                placeholder="Password (min 8 characters)"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/20 bg-zinc-800 px-3 py-2 text-white placeholder:text-white/50"
              />
              {signupError && (
                <p className="text-sm text-red-400" role="alert">
                  {signupError}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-black disabled:opacity-50"
              >
                {loading ? "Signing up…" : "Sign up"}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleForgot} className="mt-4 space-y-3">
            <p className="text-sm text-white/80">
              Enter your email to receive a link to set a new password.
            </p>
            <input
              id="signin-forgot-email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-lg border border-white/20 bg-zinc-800 px-3 py-2 text-white placeholder:text-white/50"
            />
            {forgotError && (
              <p className="text-sm text-red-400" role="alert">
                {forgotError}
              </p>
            )}
            {forgotMessage && (
              <p className="text-sm text-green-400" role="alert">
                {forgotMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotError("");
                setForgotMessage("");
              }}
              className="block w-full text-center text-sm text-white/60 hover:underline"
            >
              Back to sign in
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-white/40">
          This site is protected by reCAPTCHA and the Google{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Terms of Service
          </a>{" "}
          apply.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}
