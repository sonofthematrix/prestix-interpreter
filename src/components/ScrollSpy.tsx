"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSectionIndex } from "@/store/slices/uiSlice";
import { PAGE_SECTIONS, parseSectionFromSearch, parseSectionParam } from "@/config/pageSections";

const SCROLL_THRESHOLD = 0.2; // Section "in view" when its top is within top 20% of viewport

/** True if the section is already in view (same logic as ScrollSpy). Used to avoid scrolling when URL was updated by scroll. */
function isSectionInView(sectionId: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(sectionId);
  if (!el) return false;
  const vh = window.innerHeight;
  const threshold = vh * SCROLL_THRESHOLD;
  const top = el.getBoundingClientRect().top;
  return top <= threshold;
}

export function ScrollSpy() {
  const dispatch = useAppDispatch();
  const rafRef = useRef<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const updateSection = () => {
      const vh = window.innerHeight;
      const threshold = vh * SCROLL_THRESHOLD;
      let currentIndex: number | null = null;

      for (let i = PAGE_SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(PAGE_SECTIONS[i].id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= threshold) {
          currentIndex = i + 1; // 1-based
          break;
        }
      }
      if (currentIndex === null && PAGE_SECTIONS.length > 0) {
        const first = document.getElementById(PAGE_SECTIONS[0].id);
        const top = first?.getBoundingClientRect().top;
        if (top != null && top < vh) currentIndex = 1;
      }

      if (currentIndex !== lastIndexRef.current) {
        lastIndexRef.current = currentIndex;
        dispatch(setSectionIndex(currentIndex));
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(() => {
        updateSection();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // If the page loaded with a section param, set Redux immediately and delay first scroll-based update so useScrollToSectionParam can scroll first.
    const initialSearch = typeof window !== "undefined" ? window.location.search : "";
    const initialIndex = parseSectionFromSearch(initialSearch || "?");
    if (initialIndex != null) {
      lastIndexRef.current = initialIndex;
      dispatch(setSectionIndex(initialIndex)); // Keep URL and consumers in sync from the start
      const timeoutId = window.setTimeout(() => {
        updateSection();
      }, 900); // Allow time for useScrollToSectionHash to complete the scroll
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        window.clearTimeout(timeoutId);
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      };
    }

    updateSection();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [dispatch]);

  return null;
}

/** Scroll to section by 1-based index when section param is in the URL. Runs on mount and when searchParams change (e.g. client nav to ?section=02).
 * Skips scrolling when the section is already in view (e.g. URL was updated by ScrollSpy from user scroll) to prevent jump. */
export function useScrollToSectionHash() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  useEffect(() => {
    const index = parseSectionParam(sectionParam);
    if (index == null || index < 1 || index > PAGE_SECTIONS.length) return;
    const section = PAGE_SECTIONS[index - 1];

    const scrollToSection = () => {
      const el = document.getElementById(section.id);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        return true;
      }
      return false;
    };

    // If section is already in view, URL was likely updated by ScrollSpy from user scroll — don't scroll (avoids jump).
    if (isSectionInView(section.id)) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const runScroll = () => {
      if (cancelled) return;
      if (scrollToSection()) return;
      let attempts = 0;
      const maxAttempts = 50; // ~2.5s at 50ms
      const id = window.setInterval(() => {
        if (cancelled) return;
        attempts++;
        if (scrollToSection() || attempts >= maxAttempts) window.clearInterval(id);
      }, 50);
      cleanup = () => window.clearInterval(id);
    };

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(runScroll);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      cleanup?.();
    };
  }, [sectionParam]);
}
