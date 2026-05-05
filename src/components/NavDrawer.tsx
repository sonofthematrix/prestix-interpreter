"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setDrawerOpen, setDrawerCopyFeedback, setTheme, setLanguage } from "@/store/slices/uiSlice";
import type { Theme } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { apiFetch, patchUserSettings } from "@/lib/api";
import { clearLocalStorageOnSignOut } from "@/lib/auth-storage-clear";
import { setLang, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { persistTheme } from "./ThemeSync";
import { obfuscateWalletAddress } from "@/lib/utils";
import { UpcomingReservations } from "@/components/account/UpcomingReservations";

const DRAWER_DURATION_MS = 280;

/** Inner panel so that key={drawerKey} remounts it each open and enter animation runs. */
function DrawerPanel({
  closing,
  onClose,
  children,
}: {
  closing: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (closing) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHasEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [closing]);

  const slideIn = !closing && hasEntered;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-[280ms] ease-out md:bg-transparent md:duration-300"
        style={{ opacity: closing ? 0 : 1 }}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-xl transition-transform duration-[280ms] ease-out md:w-96 md:duration-300"
        style={{
          bottom: "var(--footer-height)",
          height: "calc(100vh - var(--footer-height))",
          transform: slideIn ? "translateX(0)" : "translateX(100%)",
        }}
        role="dialog"
        aria-label="Account menu"
      >
        {children}
      </aside>
    </>
  );
}

const THEMES: { value: Theme; labelKey: string }[] = [
  { value: "dark", labelKey: "settings.theme_dark" },
  { value: "light", labelKey: "settings.theme_light" },
];

const LANG_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  id: "Bahasa Indonesia",
};

export function NavDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.drawerOpen);
  const user = useAppSelector((s) => s.auth.user);
  const appkitWalletEmail = useAppSelector((s) => s.auth.appkitWalletEmail);
  const copyFeedback = useAppSelector((s) => s.ui.drawerCopyFeedback);
  const theme = useAppSelector((s) => s.ui.theme);
  const { t, setLocale } = useTranslation();
  const language = useAppSelector((s) => s.ui.language);
  const linkQuery = language ? `?lang=${language}` : "";
  const profileCapabilities = useAppSelector((s) => s.data.profileCapabilities);
  const partnershipStatus = useAppSelector((s) => s.data.partnershipStatus);
  const membershipStatus = useAppSelector((s) => s.data.membershipStatus);
  const capabilities = {
    canDownloadUsers: profileCapabilities?.canDownloadUsers,
    canManageUsers: profileCapabilities?.canManageUsers,
  };
  const classification = partnershipStatus?.role ?? null;
  const hasAgreement = partnershipStatus?.hasAgreement ?? false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(setDrawerOpen(false));
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dispatch]);

  const [isExiting, setIsExiting] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const visible = open || isExiting;
  const closing = isExiting;
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  const copyWalletToClipboard = useCallback(
    (address: string) => {
      const full = address.startsWith("0x") ? address : address;
      if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current);
      navigator.clipboard.writeText(full).then(
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

  useEffect(() => {
    if (!open) {
      setIsExiting(true);
      return;
    }
    setDrawerKey((k) => k + 1);
    setIsExiting(false);
  }, [open]);

  useEffect(() => {
    if (!isExiting) return;
    const t = window.setTimeout(() => setIsExiting(false), DRAWER_DURATION_MS);
    return () => clearTimeout(t);
  }, [isExiting]);

  const handleSignOut = async () => {
    try {
      sessionStorage.setItem("__just_signed_out__", String(Date.now()));
      clearLocalStorageOnSignOut();
      await apiFetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const handleThemeChange = (value: Theme) => {
    dispatch(setTheme(value));
    persistTheme(value);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(value);
    if (user) patchUserSettings({ theme: value }).catch(() => {});
  };

  const handleLanguageChange = (value: Lang) => {
    setLocale(value);
    if (user) patchUserSettings({ language: value }).catch(() => {});
  };

  if (!visible) return null;

  return (
    <DrawerPanel
      key={drawerKey}
      closing={closing}
      onClose={() => dispatch(setDrawerOpen(false))}
    >
      <div className="flex items-center justify-between border-b border-border p-4" style={{ padding: "10px 16px" }}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted-bg text-foreground" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="font-medium text-foreground">{t("drawer.account")}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(setDrawerOpen(false))}
            className="rounded p-2 text-foreground opacity-70 hover:bg-muted-bg hover:opacity-100"
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* ACCOUNT DATA — Single source of truth: Redux (s.auth.user). User and avatar (user.image) are populated by fetchSession / SessionSync / SignInSignUpModal from /api/auth/session; drawer only reads from store. */}
          <section className="mb-6" aria-labelledby="drawer-account-data-heading">
            <h2
              id="drawer-account-data-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground opacity-70"
            >
              {t("drawer.account_data")}
            </h2>
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-muted-bg p-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-lg font-medium text-foreground"
                    aria-hidden
                  >
                    {(user.profileImageUrl || user.image) ? (
                      <img
                        src={(user.profileImageUrl || user.image ) as string}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      (user.name || user.email || "?").charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Email first (from Reown/Toaster or session) when user has wallet/social */}
                    {/* Email from AppKit wallet (@appkit-wallet/EMAIL) or session when wallet/social */}
                    {(appkitWalletEmail || (user.email && !user.email.endsWith("@wallet.local"))) ? (
                      <p className="truncate text-sm text-foreground opacity-90">
                        {appkitWalletEmail || user.email}
                      </p>
                    ) : null}
                    <p className={appkitWalletEmail || (user.email && !user.email.endsWith("@wallet.local")) ? "mt-0.5 truncate font-medium text-foreground" : "truncate font-medium text-foreground"}>
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
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-foreground opacity-80">
                      {t("drawer.classification")}: {classification === "partner" ? t("role.partner") : classification === "promoter" ? t("role.promoter") : classification === "event_organizer" ? t("role.organizer") : t("drawer.role_member")}
                      {capabilities.canManageUsers && `/${t("drawer.role_admin")}`}
                    </p>
                  </div>
                </div>
                {membershipStatus?.tier && membershipStatus?.expiryDate && (
                  <div className="rounded-lg bg-muted-bg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground opacity-70">
                      {t("drawer.membership")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {membershipStatus.tier === "essential"
                        ? t("membership.tier_essential_name")
                        : membershipStatus.tier === "pro"
                          ? t("membership.tier_pro_name")
                          : membershipStatus.tier === "event_organizer"
                            ? t("membership.tier_event_organizer_name")
                            : t("membership.tier_elite_name")}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground opacity-80">
                      {t("drawer.membership_expires")}: {new Date(membershipStatus.expiryDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </p>
                  </div>
                )}
                <Link
                  href={`/become-a-member${linkQuery}`}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted-bg"
                  onClick={() => dispatch(setDrawerOpen(false))}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  {t("drawer.purchase_membership")}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground opacity-90 hover:bg-muted-bg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  {t("drawer.sign_out")}
                </button>
                <UpcomingReservations linkQuery={linkQuery} />
              </div>
            ) : (
              <p className="text-sm text-foreground opacity-70">{t("drawer.not_signed_in")}</p>
            )}
          </section>

          {/* Partnership agreement: signed + approval status + edit optional details */}
          {user && hasAgreement && (
            <section className="mb-6 border-t border-border pt-4" aria-labelledby="drawer-partnership-heading">
              <h2
                id="drawer-partnership-heading"
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground opacity-70"
              >
                {t("drawer.partnership_agreement")}
              </h2>
              <p className="mb-1 text-sm text-foreground opacity-90">
                {t("drawer.partnership_signed")}
              </p>
              <p className="mb-2 text-sm text-foreground opacity-80">
                {partnershipStatus?.agreement?.approved === true
                  ? t("drawer.partnership_status_approved")
                  : t("drawer.partnership_status_pending")}
              </p>
              <Link
                href="/agreement/partner/edit"
                className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted-bg"
                onClick={() => dispatch(setDrawerOpen(false))}
              >
                {t("drawer.partnership_edit_optional")}
              </Link>
            </section>
          )}

          {/* Admin: links to admin pages */}
          {capabilities.canManageUsers && (
            <section className="mb-6 border-t border-border pt-4">
              <div className="space-y-2">
                <Link
                  href="/users"
                  className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted-bg"
                  onClick={() => dispatch(setDrawerOpen(false))}
                >
                  View User Data
                </Link>
                <Link
                  href="/users/feedback"
                  className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted-bg"
                  onClick={() => dispatch(setDrawerOpen(false))}
                >
                  View Feedback Data
                </Link>
              </div>
            </section>
          )}

          {/* THEME & LANGUAGE */}
          <section
            className="border-t border-border pt-4"
            aria-labelledby="drawer-theme-language-heading"
          >
            <h2
              id="drawer-theme-language-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground opacity-70"
            >
              {t("drawer.theme_language")}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">{t("settings.theme")}</p>
                <div className="flex gap-4">
                  {THEMES.map(({ value, labelKey }) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="drawer-theme"
                        checked={theme === value}
                        onChange={() => handleThemeChange(value)}
                        className="border-border bg-input-bg text-foreground"
                      />
                      <span className="text-sm text-foreground">{t(labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">{t("settings.language")}</p>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as Lang)}
                  className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground"
                  aria-label={t("settings.language")}
                >
                  {SUPPORTED_LANGS.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANG_LABELS[lang] ?? lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Account links */}
          <nav className="mt-6 flex flex-col gap-1 border-t border-border pt-4" aria-label="Account links">
            {user && (
              <>
                <Link
                  href="/hub"
                  className="rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted-bg"
                  onClick={() => dispatch(setDrawerOpen(false))}
                >
                  Hub
                </Link>
                <Link
                  href={`/hub/bookings${linkQuery}`}
                  className="rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted-bg"
                  onClick={() => dispatch(setDrawerOpen(false))}
                >
                  Bookings
                </Link>
              </>
            )}
            <Link
              href={`/account${linkQuery}`}
              className="rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted-bg"
              onClick={() => dispatch(setDrawerOpen(false))}
            >
              {t("nav.account")}
            </Link>
            <Link
              href={`/profile${linkQuery}`}
              className="rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted-bg"
              onClick={() => dispatch(setDrawerOpen(false))}
            >
              {t("nav.profile")}
            </Link>
            <Link
              href={`/settings${linkQuery}`}
              className="rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted-bg"
              onClick={() => dispatch(setDrawerOpen(false))}
            >
              {t("nav.settings")}
            </Link>
          </nav>
        </div>
      </DrawerPanel>
  );
}
