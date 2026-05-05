"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/store/hooks";
import {
  getPageSectionIndex,
  buildSectionQueryString,
} from "@/config/pageSections";

export interface SectionAnchorLinkProps {
  sectionId: string;
  className?: string;
}

/** Button that copies the section URL to the clipboard (e.g. ?lang=en&section=02). Does not navigate or change the page. */
export function SectionAnchorLink({ sectionId, className = "" }: SectionAnchorLinkProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const pathname = usePathname();
  const language = useAppSelector((s) => s.ui.language);
  const index = getPageSectionIndex(sectionId);
  const queryString = index != null ? buildSectionQueryString(index, language || undefined) : "";

  const fullUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    const path = pathname || "/";
    const q = queryString ? `?${queryString}` : "";
    return `${window.location.origin}${path}${q}`;
  }, [pathname, queryString]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const url = fullUrl();
      if (url) {
        navigator.clipboard.writeText(url).then(
          () => toast(t("section.link_copied") ?? "Link copied"),
          () => {}
        );
      }
    },
    [fullUrl, toast, t]
  );

  if (index == null) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex shrink-0 items-center justify-center rounded p-1 text-foreground/60 hover:bg-muted-bg hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
      aria-label={t("section.copy_link") ?? "Copy section link"}
      title={t("section.copy_link") ?? "Copy section link"}
    >
      <LinkIcon />
    </button>
  );
}

function LinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
