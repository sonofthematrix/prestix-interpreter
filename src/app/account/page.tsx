"use client";

import Link from "next/link";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { apiFetch } from "@/lib/api";
import { clearLocalStorageOnSignOut } from "@/lib/auth-storage-clear";
import { setSignInOpen } from "@/store/slices/uiSlice";
import { setUser } from "@/store/slices/authSlice";
import { broadcastSignOut } from "@/components/SessionSync";
import { obfuscateWalletAddress } from "@/lib/utils";
import { AccountBookingsAndPayments } from "@/components/account/AccountBookingsAndPayments";
import { useCallback, useRef, useEffect } from "react";
import { setDrawerCopyFeedback } from "@/store/slices/uiSlice";

export const dynamic = "force-dynamic";

const JUST_SIGNED_OUT_KEY = "__just_signed_out__";

export default function AccountPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const appkitWalletEmail = useAppSelector((s) => s.auth.appkitWalletEmail);
  const copyFeedback = useAppSelector((s) => s.ui.drawerCopyFeedback);
  const language = useAppSelector((s) => s.ui.language);
  const linkQuery = language ? `?lang=${language}` : "";
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  const copyWalletToClipboard = useCallback(
    (address: string) => {
      if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current);
      navigator.clipboard.writeText(address).then(
        () => {
          dispatch(setDrawerCopyFeedback(t("share.copy")));
          copyFeedbackTimeoutRef.current = window.setTimeout(() => {
            dispatch(setDrawerCopyFeedback(null));
            copyFeedbackTimeoutRef.current = null;
          }, 2000);
        },
        () => dispatch(setDrawerCopyFeedback("Copy failed"))
      );
    },
    [dispatch, t]
  );

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current);
    };
  }, []);

  const authMethodLabel =
    user?.authMethod === "email"
      ? t("account.auth_method_email")
      : user?.authMethod === "wallet"
        ? t("account.auth_method_wallet")
        : user?.authMethod
          ? String(user.authMethod)
          : null;

  const avatarUrl = user?.image ?? user?.profileImageUrl;

  const handleSignOut = async () => {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(JUST_SIGNED_OUT_KEY, String(Date.now()));
      }
      clearLocalStorageOnSignOut();
      await apiFetch("/api/auth/signout", { method: "POST" });
      broadcastSignOut();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appkit-signout"));
      }
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const handleChangeAccount = async () => {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(JUST_SIGNED_OUT_KEY, String(Date.now()));
      }
      clearLocalStorageOnSignOut();
      await apiFetch("/api/auth/signout", { method: "POST" });
      broadcastSignOut();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("appkit-signout"));
      }
      dispatch(setUser(null));
      dispatch(setSignInOpen(true));
    } catch {
      dispatch(setUser(null));
      dispatch(setSignInOpen(true));
    }
  };

  return (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-5xl font-bold text-foreground">
          {t("account.title")}
        </h1>
        <p className="mt-4 text-foreground opacity-80">
          {t("account.description")}
        </p>

        {user ? (
          <div className="mt-12 space-y-8">
            <section
              className="rounded-xl border border-border bg-muted-bg p-6"
              aria-labelledby="account-logged-in-heading"
            >
              <h2
                id="account-logged-in-heading"
                className="font-serif text-xl font-bold text-foreground"
              >
                {t("account.logged_in_as")}
              </h2>
              <div className="mt-4 flex items-center gap-4">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-xl font-medium text-foreground"
                  aria-hidden
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (user.name || appkitWalletEmail || user.email || "?").charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  {/* AppKit wallet email (@appkit-wallet/EMAIL) when user signed in with email/wallet */}
                  {(appkitWalletEmail || (user.email && !user.email.endsWith("@wallet.local"))) ? (
                    <p className="text-sm text-foreground opacity-90">
                      {appkitWalletEmail || user.email}
                    </p>
                  ) : null}
                  <p className={appkitWalletEmail || (user.email && !user.email.endsWith("@wallet.local")) ? "mt-0.5 font-medium text-foreground" : "font-medium text-foreground"}>
                    {user.name || user.email}
                  </p>
                  {user.walletAddress ? (
                    <button
                      type="button"
                      onClick={() => copyWalletToClipboard(user.walletAddress!)}
                      className="mt-1 block w-full truncate text-left text-xs text-foreground opacity-70 hover:opacity-100 hover:underline"
                      title="Click to copy full address"
                    >
                      {obfuscateWalletAddress(user.walletAddress)}
                      {copyFeedback ? (
                        <span className="ml-1 text-accent">{copyFeedback}</span>
                      ) : null}
                    </button>
                  ) : null}
                  {authMethodLabel && (
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-foreground opacity-80">
                      {t("account.auth_method")}: {authMethodLabel}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-muted-bg p-6">
              <h2 className="font-serif text-xl font-bold text-foreground">
                {t("account.details_heading")}
              </h2>
              <p className="mt-2 text-sm text-foreground opacity-80">
                {t("account.details_description")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/profile${linkQuery}`}
                  className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-bg"
                >
                  {t("nav.profile")} →
                </Link>
                <Link
                  href={`/settings${linkQuery}`}
                  className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-bg"
                >
                  {t("nav.settings")} →
                </Link>
                <button
                  type="button"
                  onClick={handleChangeAccount}
                  className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-bg"
                >
                  {t("account.change_account")}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/20"
                >
                  {t("drawer.sign_out")}
                </button>
              </div>
            </section>

            <AccountBookingsAndPayments />
          </div>
        ) : (
          <p className="mt-12 text-foreground opacity-70">
            {t("account.sign_in_required")}
          </p>
        )}
      </div>
    </div>
  );
}
