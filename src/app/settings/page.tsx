"use client";

import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setTheme, setLanguage } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { patchUserSettings } from "@/lib/api";
import { setLang, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

const THEMES = [
  { value: "dark" as const, labelKey: "settings.theme_dark" },
  { value: "light" as const, labelKey: "settings.theme_light" },
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const [saving, setSaving] = useState(false);

  const handleThemeChange = async (value: "light" | "dark") => {
    dispatch(setTheme(value));
    setSaving(true);
    await patchUserSettings({ theme: value });
    setSaving(false);
  };

  const handleLanguageChange = async (value: Lang) => {
    setLocale(value);
    setSaving(true);
    await patchUserSettings({ language: value });
    setSaving(false);
  };

  return (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-5xl font-bold text-foreground">
          {t("settings.title")}
        </h1>

        <section
          className="mt-10 rounded-xl border border-border bg-muted-bg p-6"
          aria-labelledby="settings-theme-heading"
        >
          <h2
            id="settings-theme-heading"
            className="font-serif text-xl font-bold text-foreground"
          >
            {t("settings.theme")}
          </h2>
          <p className="mt-1 text-sm text-foreground opacity-70">{t("settings.theme_desc")}</p>
          <div className="mt-4 flex gap-4">
            {THEMES.map(({ value, labelKey }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="theme"
                  checked={theme === value}
                  onChange={() => handleThemeChange(value)}
                  className="border-border bg-input-bg text-foreground"
                />
                <span className="text-foreground">{t(labelKey)}</span>
              </label>
            ))}
          </div>
        </section>

        <section
          className="mt-8 rounded-xl border border-border bg-muted-bg p-6"
          aria-labelledby="settings-language-heading"
        >
          <h2
            id="settings-language-heading"
            className="font-serif text-xl font-bold text-foreground"
          >
            {t("settings.language")}
          </h2>
          <p className="mt-1 text-sm text-foreground opacity-70">
            {t("settings.language_desc")}
          </p>
          <select
            value={locale}
            onChange={(e) => handleLanguageChange(e.target.value as Lang)}
            className="mt-4 rounded-lg border border-border bg-input-bg px-4 py-2 text-foreground"
            aria-label={t("settings.language")}
          >
            {SUPPORTED_LANGS.map((lang) => (
              <option key={lang} value={lang}>
                {lang === "en"
                  ? "English"
                  : lang === "es"
                    ? "Español"
                    : lang === "fr"
                      ? "Français"
                      : lang === "de"
                        ? "Deutsch"
                        : "Bahasa Indonesia"}
              </option>
            ))}
          </select>
        </section>

        {saving && (
          <p className="mt-4 text-sm text-foreground opacity-50" role="status">
            Saving…
          </p>
        )}
      </div>
    </div>
  );
}
