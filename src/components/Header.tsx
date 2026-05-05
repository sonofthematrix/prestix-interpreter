"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTheme, setDrawerOpen, setModelVariant } from "@/store/slices/uiSlice";
import type { Theme, ModelVariant } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { ShareDropdown } from "./ShareDropdown";
import { persistTheme } from "./ThemeSync";
import { patchUserSettings } from "@/lib/api";
import { BREAKOUTS_SECTION_INDEX } from "@/config/pageSections";

const BIKE_ROW_MIN_HEIGHT = 48;
const BREAKOUTS_MAX_HEIGHT = 165;

/** All four breakouts in display order: one row below the Bike/E-Bike buttons. */
const VIP_BREAKOUT_KEYS = [
  { titleKey: "vip.breakout_left_1_title", lineKey: "vip.breakout_left_1_line" },
  { titleKey: "vip.breakout_left_2_title", lineKey: "vip.breakout_left_2_line" },
  { titleKey: "vip.breakout_right_1_title", lineKey: "vip.breakout_right_1_line" },
  { titleKey: "vip.breakout_right_2_title", lineKey: "vip.breakout_right_2_line" },
] as const;

function BreakoutCard({ title, line }: { title: string; line: string }) {
  return (
    <div className="px-3 py-2.5 text-center min-w-0">
      <p className="font-serif text-sm font-bold text-foreground md:text-base">{title}</p>
      <p className="mt-1 font-sans text-sm font-normal text-foreground/85">{line}</p>
    </div>
  );
}

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  id: "Bahasa Indonesia",
};

export function Header() {
  const dispatch = useAppDispatch();
  const { t, locale, setLocale } = useTranslation();
  const theme = useAppSelector((s) => s.ui.theme);
  const breakoutsVisible = useAppSelector((s) => s.ui.breakoutsVisible);
  const sectionIndex = useAppSelector((s) => s.ui.sectionIndex);
  const modelVariant = useAppSelector((s) => s.ui.modelVariant);
  const user = useAppSelector((s) => s.auth.user);
  const showBreakouts = breakoutsVisible || sectionIndex === BREAKOUTS_SECTION_INDEX;
  const [langOpen, setLangOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const langTriggerRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  useLayoutEffect(() => {
    if (!langOpen || !langTriggerRef.current) {
      setMenuPosition(null);
      return;
    }
    const rect = langTriggerRef.current.getBoundingClientRect();
    const gap = 4;
    const minWidth = 160;
    const padding = 16;
    let left = rect.left;
    const maxLeft = typeof window !== "undefined" ? window.innerWidth - minWidth - padding : left + minWidth;
    if (left + minWidth > (typeof window !== "undefined" ? window.innerWidth - padding : 0)) {
      left = maxLeft;
    }
    left = Math.max(padding, left);
    setMenuPosition({
      top: rect.bottom + gap,
      left,
      minWidth: Math.min(minWidth, rect.width),
    });
  }, [langOpen]);

  useEffect(() => {
    if (!langOpen) return;
    const close = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [langOpen]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    dispatch(setTheme(next));
    persistTheme(next);
    if (user) {
      patchUserSettings({ theme: next }).catch(() => {});
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.classList.toggle("light", next === "light");
    }
  };

  const handleLangSelect = (lang: Lang) => {
    setLocale(lang);
    if (user) patchUserSettings({ language: lang }).catch(() => {});
    setLangOpen(false);
  };

  const setVariant = (variant: ModelVariant) => {
    dispatch(setModelVariant(variant));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-row items-center justify-between gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-4">
          <Link
            href="/"
            className="font-serif text-xl font-bold text-foreground hover:opacity-90"
          >
            PRESTIX<span className="text-red-500">.vip</span>
          </Link>
          {user && (
            <Link
              href="/hub"
              className="hidden text-sm font-medium text-foreground opacity-85 hover:opacity-100 sm:block"
            >
              Hub
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/hub/bookings/new"
            aria-label="Book a table or ticket"
            className="rounded-lg p-2 text-foreground opacity-80 hover:bg-muted-bg hover:opacity-100"
          >
            <CalendarCheck className="h-5 w-5" />
          </Link>
          <div className="relative" ref={langMenuRef}>
            <button
              ref={langTriggerRef}
              type="button"
              onClick={() => setLangOpen((o) => !o)}
              aria-label="Change language"
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              className="rounded-lg p-2 text-foreground opacity-80 hover:bg-muted-bg hover:opacity-100"
            >
              <LanguageIcon />
            </button>
            {langOpen && (
              <div
                role="listbox"
                aria-label="Language"
                className="z-50 min-w-[10rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background py-1 shadow-lg md:absolute md:left-auto md:right-0 md:top-full md:mt-1 md:max-w-none md:min-w-[10rem]"
                style={
                  menuPosition
                    ? {
                        position: "fixed",
                        top: menuPosition.top,
                        left: menuPosition.left,
                        minWidth: menuPosition.minWidth,
                      }
                    : { position: "fixed", top: "3.75rem", left: "1rem" }
                }
              >
                {SUPPORTED_LANGS.map((lang) => (
                  <button
                    key={lang}
                    role="option"
                    aria-selected={locale === lang}
                    onClick={() => handleLangSelect(lang)}
                    className={`block w-full px-4 py-2 text-left text-sm transition ${
                      locale === lang
                        ? "bg-foreground/10 font-medium text-foreground"
                        : "text-foreground opacity-80 hover:bg-muted-bg hover:opacity-100"
                    }`}
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="hidden rounded-lg p-2 text-foreground opacity-80 hover:bg-muted-bg hover:opacity-100 md:block"
          >
            {theme === "dark" ? (
              <span className="sr-only">Light</span>
            ) : (
              <span className="sr-only">Dark</span>
            )}
            <ThemeIcon theme={theme} />
          </button>

          <ShareDropdown />

          <button
            type="button"
            onClick={() => dispatch(setDrawerOpen(true))}
            aria-label="Open menu"
            aria-expanded={false}
            className="rounded-lg p-2 text-foreground opacity-80 hover:bg-muted-bg hover:opacity-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      </div>

      {/* Bike / E-Bike + breakouts: animates in when VIP section (model) is in view. Layout: buttons row, then one row of four breakouts with accent borders. */}
      <div
        className={`flex flex-shrink-0 flex-col overflow-hidden border-t border-border transition-all duration-300 ease-out ${
          !showBreakouts && "pointer-events-none"
        }`}
        style={{
          maxHeight: showBreakouts ? BREAKOUTS_MAX_HEIGHT : 0,
          minHeight: 0,
          opacity: showBreakouts ? 1 : 0,
        }}
        aria-hidden={!showBreakouts}
      >
        <div
          className="flex flex-1 flex-col transition-transform duration-300 ease-out"
          style={{
            transform: showBreakouts ? "translateY(0)" : "translateY(-100%)",
          }}
        >
          {/* Row 1: Bike / E-Bike buttons */}
          <div className="flex min-h-[48px] items-center justify-center gap-3 px-4 py-2">
            <button
              type="button"
              onClick={() => setVariant("bike")}
              className={`rounded-lg border px-5 py-2.5 text-sm font-medium shadow focus:outline-none ${
                modelVariant === "bike"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-background text-foreground hover:bg-muted-bg"
              }`}
              aria-label="Bike"
              aria-pressed={modelVariant === "bike"}
            >
              Bike
            </button>
            <button
              type="button"
              onClick={() => setVariant("ebike")}
              className={`rounded-lg border px-5 py-2.5 text-sm font-medium shadow focus:outline-none ${
                modelVariant === "ebike"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-background text-foreground hover:bg-muted-bg"
              }`}
              aria-label="E-Bike"
              aria-pressed={modelVariant === "ebike"}
            >
              E-Bike
            </button>
          </div>
          {/* Row 2: four breakouts in one row, full width, accent top/bottom borders */}
          <div
            className="breakout-section grid grid-cols-2 min-[640px]:grid-cols-4 border-t border-b border-accent bg-background"
            aria-label="VIP experience benefits"
          >
            {VIP_BREAKOUT_KEYS.map((item, i) => (
              <BreakoutCard key={i} title={t(item.titleKey)} line={t(item.lineKey)} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function LanguageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
