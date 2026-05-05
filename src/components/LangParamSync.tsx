"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLanguage, setSectionIndex } from "@/store/slices/uiSlice";
import { setLang, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { t as tI18n, getLang } from "@/lib/i18n";
import { parseSectionParam, getSectionParam, PAGE_SECTIONS } from "@/config/pageSections";

const DEFAULT_DOCUMENT_TITLE = "Promote & Earn | PRESTIX.VIP";

/**
 * Single source of truth for URL <-> Redux sync.
 * - Read: URL -> Redux: lang from ?lang=, sectionIndex from ?section=02.
 * - Write: Redux language + sectionIndex -> URL as ?lang=en&section=02 via history.replaceState.
 */
export function LangParamSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.ui.language);
  const sectionIndex = useAppSelector((s) => s.ui.sectionIndex);
  const lastUrlRef = useRef<string>("");

  // 1) URL -> Redux: run on mount and when pathname/search change. No URL write here.
  useEffect(() => {
    const langParam = searchParams.get("lang");
    if (langParam && SUPPORTED_LANGS.includes(langParam as Lang)) {
      const lang = langParam as Lang;
      setLang(lang);
      dispatch(setLanguage(lang));
    }
    if (pathname === "/") {
      const index = parseSectionParam(searchParams.get("section"));
      if (index != null) dispatch(setSectionIndex(index));
    } else {
      dispatch(setSectionIndex(null));
    }
  }, [pathname, searchParams, dispatch]);

  // 2) Redux -> URL: single effect that writes canonical URL and document title. Format: /?lang=en&section=02
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (language) params.set("lang", language);
    // Use section from Redux, or from current URL if Redux not synced yet (avoids dropping section=06 on first load)
    const sectionFromUrl = pathname === "/" ? parseSectionParam(searchParams.get("section")) : null;
    const effectiveSection = sectionIndex ?? sectionFromUrl;
    if (pathname === "/" && effectiveSection != null && effectiveSection >= 1 && effectiveSection <= PAGE_SECTIONS.length) {
      params.set("section", getSectionParam(effectiveSection));
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (href === lastUrlRef.current) return;
    lastUrlRef.current = href;
    window.history.replaceState(null, "", href);

    // Update document title to current section when on home with a section
    if (pathname === "/" && effectiveSection != null && effectiveSection >= 1 && effectiveSection <= PAGE_SECTIONS.length) {
      const section = PAGE_SECTIONS[effectiveSection - 1];
      const lang = getLang();
      const sectionTitle = tI18n(section.titleKey, lang);
      document.title = `${sectionTitle} | PRESTIX.VIP`;
    } else {
      document.title = DEFAULT_DOCUMENT_TITLE;
    }
  }, [pathname, language, sectionIndex, searchParams]);

  return null;
}
