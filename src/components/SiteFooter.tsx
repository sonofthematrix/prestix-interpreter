"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setModelViewerFocused } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { BREAKOUTS_SECTION_INDEX } from "@/config/pageSections";
import { buildSectionQueryString } from "@/config/pageSections";

const FOOTER_HEIGHT = 40;
const SCROLL_ROW_HEIGHT = 48;

/** Total height of the fixed footer (base row + optional scroll/close row). Syncs to --footer-height for main container and NavDrawer. */
function useFooterHeightSync(showFooterRow: boolean) {
  const totalHeight = FOOTER_HEIGHT + (showFooterRow ? SCROLL_ROW_HEIGHT : 0);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--footer-height", `${totalHeight}px`);
    return () => {
      document.documentElement.style.setProperty("--footer-height", "40px");
    };
  }, [totalHeight]);
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function SiteFooter() {
  const { t, locale } = useTranslation();
  const dispatch = useAppDispatch();
  const modelViewerFocused = useAppSelector((s) => s.ui.modelViewerFocused);
  const lastScrollY = useRef(0);

  // Show scroll/close row only when user has focused/clicked the model viewer (not by scroll position).
  const showFooterRow = modelViewerFocused;

  useFooterHeightSync(showFooterRow);

  const handleCloseScroll = () => {
    dispatch(setModelViewerFocused(false));
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // When user scrolls the page while the model is focused (e.g. keyboard, scrollbar, touch),
  // unfocus the model so the Scroll/close button disappears.
  useEffect(() => {
    if (!modelViewerFocused) return;
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const current = window.scrollY;
      if (current !== lastScrollY.current) {
        lastScrollY.current = current;
        dispatch(setModelViewerFocused(false));
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [modelViewerFocused, dispatch]);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-[1999] flex shrink-0 flex-col border-t border-border bg-background"
      style={{ minHeight: FOOTER_HEIGHT }}
      aria-label="Page footer"
    >
      {/* Scroll/close row: only when model viewer has focus (user clicked inside it) */}
      <div
        className={`flex flex-shrink-0 flex-col overflow-hidden transition-all duration-300 ease-out ${
          !showFooterRow && "pointer-events-none"
        }`}
        style={{
          height: showFooterRow ? SCROLL_ROW_HEIGHT : 0,
          minHeight: 0,
          opacity: showFooterRow ? 1 : 0,
        }}
      >
        <div
          className={`flex flex-1 items-center justify-center border-b border-border px-4 py-2 transition-transform duration-300 ease-out ${
            showFooterRow ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ minHeight: SCROLL_ROW_HEIGHT }}
        >
          <button
            type="button"
            onClick={handleCloseScroll}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow hover:bg-muted-bg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            aria-label={t("vip.scroll")}
          >
            <CloseIcon className="h-5 w-5 shrink-0" />
            <span>{t("vip.scroll")}</span>
          </button>
        </div>
      </div>
      <div
        className="flex flex-1 items-center px-4 py-2"
        style={{ height: FOOTER_HEIGHT }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href={`/?${buildSectionQueryString(BREAKOUTS_SECTION_INDEX, locale)}`}
            className="inline-flex shrink-0 items-center gap-2 text-foreground/70 transition hover:text-foreground"
          >
            <Image
              src="/images/bike/VIP-Bike-Experience-removebg-preview.png"
              alt=""
              width={48}
              height={32}
              className="h-8 w-auto object-contain"
            />
            <span className="text-xs font-medium">Unlock the exclusive offers</span>
          </Link>
          <a
            href="https://tokenizin.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-foreground/70 transition hover:text-foreground"
          >
            <Image
              src="/tokenizin-logo.png"
              alt="Tokenizin"
              width={64}
              height={20}
              className="h-4 w-auto object-contain"
            />
            <span className="text-xs font-medium">Powered by Tokenizin</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

export const SITE_FOOTER_HEIGHT = FOOTER_HEIGHT;
