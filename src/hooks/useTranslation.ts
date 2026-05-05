"use client";

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setLanguage } from "@/store/slices/uiSlice";
import { setLang as setStoredLang, t as tRaw, type Lang } from "@/lib/i18n";

export function useTranslation() {
  const locale = useAppSelector((s) => s.ui.language) as Lang;
  const dispatch = useAppDispatch();
  const t = useCallback((key: string) => tRaw(key, locale), [locale]);
  const setLocale = useCallback(
    (lang: Lang) => {
      setStoredLang(lang);
      dispatch(setLanguage(lang));
    },
    [dispatch]
  );
  return { t, locale, setLocale };
}
