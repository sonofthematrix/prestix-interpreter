"use client";

import { useRef, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setShareOpen } from "@/store/slices/uiSlice";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/hooks/useTranslation";

export function ShareDropdown() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.shareOpen);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        dispatch(setShareOpen(false));
      }
    };
    if (open) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(setShareOpen(false));
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dispatch]);

  const url =
    typeof window !== "undefined" ? window.location.href : "";
  const title = "PRESTIX.VIP";

  const handleShareClick = () => {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 769px)").matches;
    if (isDesktop) {
      dispatch(setShareOpen(!open));
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url }).catch(() => copyUrl());
    } else {
      copyUrl();
    }
  };

  const copyUrl = () => {
    const text = url;
    const doToast = () => toast(t("share.copy"), "success");

    const fallbackCopy = () => {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (ok) doToast();
      } catch {
        // ignore
      }
    };

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(doToast).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={handleShareClick}
        aria-label="Share"
        aria-expanded={open}
        aria-haspopup="true"
        className="cursor-pointer rounded-lg p-2 text-foreground opacity-80 hover:bg-muted-bg hover:opacity-100"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.59 13.51 6.82 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-background py-1 shadow-xl"
          role="menu"
          aria-label="Share via"
        >
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted-bg"
            role="menuitem"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>
          <a
            href="https://www.instagram.com/prestix"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted-bg"
            role="menuitem"
          >
            <InstagramIcon className="h-5 w-5" />
            Instagram
          </a>
          <a
            href="https://x.com/prestixvip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted-bg"
            role="menuitem"
          >
            <XIcon className="h-5 w-5" />
            X
          </a>
          <button
            type="button"
            onClick={() => {
              copyUrl();
              dispatch(setShareOpen(false));
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-muted-bg"
            role="menuitem"
          >
            Copy link
          </button>
        </div>
      )}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
