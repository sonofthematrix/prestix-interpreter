"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAdminVerifySession,
  requestAdminCode,
  verifyAdminCode,
} from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/store/hooks";

const APPKIT_WALLET_EMAIL_KEY = "@appkit-wallet/EMAIL";

type Status = "loading" | "not_admin" | "unverified" | "verified";

/** Email to show and use for admin verification when user has wallet placeholder. Prefer Redux, then localStorage. */
function getAdminVerificationEmail(userEmail: string | null | undefined, appkitWalletEmail: string | null): string {
  const isPlaceholder = typeof userEmail === "string" && userEmail.endsWith("@wallet.local");
  if (isPlaceholder && appkitWalletEmail?.trim()) return appkitWalletEmail.trim();
  if (isPlaceholder && typeof window !== "undefined") {
    const fromStorage = localStorage.getItem(APPKIT_WALLET_EMAIL_KEY);
    if (typeof fromStorage === "string" && fromStorage.trim()) return fromStorage.trim();
  }
  return userEmail?.trim() ?? "your email";
}

/**
 * Gate for admin pages (/users, /users/feedback). Ensures:
 * 1. User is admin (canManageUsers). If not, redirects back.
 * 2. User is verified via ?verify-code=XXXXXX (valid, not expired) or existing cookie. If not, shows code modal.
 * Content and data APIs (e.g. GET /api/admin/users) are only loaded when verified.
 */
export function AdminPageGate({
  children,
  pageTitle,
}: {
  children: React.ReactNode;
  pageTitle: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const appkitWalletEmail = useAppSelector((s) => s.auth.appkitWalletEmail);
  const profileCapabilities = useAppSelector((s) => s.data.profileCapabilities);
  const profileCapabilitiesLoading = useAppSelector((s) => s.data.profileCapabilitiesLoading);
  const [status, setStatus] = useState<Status>("loading");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const verifyCodeFromUrl = searchParams.get("verify-code")?.trim().replace(/\D/g, "") ?? "";

  const checkVerify = useCallback(async () => {
    const session = await getAdminVerifySession(
      verifyCodeFromUrl.length === 6 ? verifyCodeFromUrl : undefined
    );
    if (session.verified) {
      setStatus("verified");
    } else {
      setStatus("unverified");
    }
  }, [verifyCodeFromUrl]);

  useEffect(() => {
    if (profileCapabilitiesLoading) return;
    if (!profileCapabilities?.canManageUsers) {
      setStatus("not_admin");
      return;
    }
    checkVerify();
  }, [profileCapabilitiesLoading, profileCapabilities?.canManageUsers, checkVerify]);

  // Pre-fill code input from URL so admin doesn't have to copy-paste (e.g. /users?verify-code=611265)
  useEffect(() => {
    if (verifyCodeFromUrl.length === 6) {
      setCode(verifyCodeFromUrl);
    }
  }, [verifyCodeFromUrl]);

  useEffect(() => {
    if (status === "not_admin") {
      router.back();
    }
  }, [status, router]);

  const sendCode = useCallback(async () => {
    setSending(true);
    const verificationEmail = getAdminVerificationEmail(user?.email, appkitWalletEmail);
    const emailOverride =
      user?.email?.endsWith("@wallet.local") && verificationEmail !== (user?.email ?? "your email")
        ? verificationEmail
        : undefined;
    const result = await requestAdminCode(emailOverride);
    setSending(false);
    if (result.ok) {
      setCodeSent(true);
      toast("Verification code sent to your email", "success");
    } else {
      toast(result.error ?? "Failed to send code", "error");
    }
  }, [toast, user?.email, appkitWalletEmail]);

  const handleResend = (e: React.MouseEvent) => {
    e.preventDefault();
    sendCode();
  };

  const handleVerify = async () => {
    const digits = code.trim().replace(/\D/g, "");
    if (digits.length !== 6) {
      toast("Enter a 6-digit code", "error");
      return;
    }
    setVerifying(true);
    const result = await verifyAdminCode(code);
    setVerifying(false);
    if (result.ok) {
      setStatus("verified");
    } else {
      toast(result.error ?? "Invalid or expired code", "error");
    }
  };

  if (status === "loading") {
    return (
      <div className="px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto ">
          <h1 className="font-serif text-5xl font-bold text-foreground">{pageTitle}</h1>
          <p className="mt-4 text-foreground opacity-80">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "not_admin") {
    return (
      <div className="px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto">
          <h1 className="font-serif text-5xl font-bold text-foreground">{pageTitle}</h1>
          <p className="mt-4 text-foreground opacity-80">Redirecting…</p>
        </div>
      </div>
    );
  }

  if (status === "unverified") {
    const email = getAdminVerificationEmail(user?.email, appkitWalletEmail);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
            {codeSent ? "We sent you a code" : "Verification required"}
          </h1>
          <p className="mt-2 text-foreground opacity-90">
            {codeSent
              ? `Enter it below to verify ${email}.`
              : `Request a code to verify ${email}, or enter one you already have.`}
          </p>
          <div className="mt-8">
            <label
              htmlFor="placeholder"
              className="block text-left text-sm font-medium text-foreground"
            >
              Verification code
            </label>
            <input
              id="placeholder"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 w-full rounded-lg border border-border bg-input-bg px-4 py-3 text-center font-mono text-lg tracking-[0.35em] text-foreground placeholder:opacity-50"
              aria-label="Verification code"
            />
            <a
              href="#"
              onClick={handleResend}
              className="mt-3 inline-block text-sm text-accent hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              {sending ? "Sending…" : codeSent ? "Didn't receive email? Send again" : "Send code to my email"}
            </a>
          </div>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying || code.replace(/\D/g, "").length !== 6}
            className="mt-8 w-full rounded-full bg-foreground px-6 py-3.5 text-base font-semibold text-background hover:opacity-90 disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Next"}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
