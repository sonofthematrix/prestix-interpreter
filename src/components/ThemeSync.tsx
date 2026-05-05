"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTheme, setLanguage } from "@/store/slices/uiSlice";
import type { Theme } from "@/store/slices/uiSlice";
import { getLang } from "@/lib/i18n";

const THEME_KEY = "prestix.theme";

export function ThemeSync() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const language = useAppSelector((s) => s.ui.language);

  // Bootstrap: read localStorage and sync to Redux once
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const initialTheme: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    dispatch(setTheme(initialTheme));
    const lang = getLang();
    dispatch(setLanguage(lang));
  }, [dispatch]);

  // Single source of truth: Redux theme -> document classList
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Single source of truth: Redux language -> document lang (so UI and a11y reflect current language without reload)
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}

export function persistTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}
