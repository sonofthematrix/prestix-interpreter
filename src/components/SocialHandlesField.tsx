"use client";

import { useTranslation } from "@/hooks/useTranslation";

/** Stored format: one per line, "Platform | handle" (e.g. "Instagram | @user"). Pipe avoids trim issues when handle is empty. */
const STORAGE_SEP = " | ";
const LINE_SEP = "\n";

export const SOCIAL_PLATFORMS = [
  "Instagram",
  "TikTok",
  "Twitter",
  "YouTube",
  "Facebook",
  "LinkedIn",
  "Other",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialHandleEntry {
  platform: SocialPlatform;
  handle: string;
}

function parseSocialHandles(value: string): SocialHandleEntry[] {
  if (!value || typeof value !== "string") return [];
  const lines = value.split(LINE_SEP).map((s) => s.trim()).filter(Boolean);
  const out: SocialHandleEntry[] = [];
  for (const line of lines) {
    // Prefer " | " then " • " so empty handle parses; fallback " •" for legacy "Platform •" (no trailing space)
    let sep = STORAGE_SEP;
    if (!line.includes(STORAGE_SEP)) sep = line.includes(" • ") ? " • " : " •";
    const sepIndex = line.indexOf(sep);
    if (sepIndex >= 0) {
      const platform = line.slice(0, sepIndex).trim() as SocialPlatform;
      const handle = line.slice(sepIndex + sep.length).trim();
      if (SOCIAL_PLATFORMS.includes(platform)) {
        out.push({ platform, handle });
      }
    }
  }
  if (out.length === 0 && value.trim()) {
    out.push({ platform: "Other", handle: value.trim() });
  }
  return out;
}

function serializeSocialHandles(entries: SocialHandleEntry[]): string {
  // Include all entries (including empty handle) so new rows persist when user clicks "Add another handle"
  return entries
    .map((e) => `${e.platform}${STORAGE_SEP}${e.handle.trim()}`)
    .join(LINE_SEP);
}

export interface SocialHandlesFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  maxEntries?: number;
}

export function SocialHandlesField({
  id,
  value,
  onChange,
  label,
  maxEntries = 5,
}: SocialHandlesFieldProps) {
  const { t } = useTranslation();
  const entries = parseSocialHandles(value);

  const updateEntries = (next: SocialHandleEntry[]) => {
    onChange(serializeSocialHandles(next));
  };

  const setEntry = (index: number, updates: Partial<SocialHandleEntry>) => {
    const next = [...entries];
    if (!next[index]) next[index] = { platform: "Instagram", handle: "" };
    next[index] = { ...next[index], ...updates };
    updateEntries(next);
  };

  const addEntry = () => {
    if (entries.length >= maxEntries) return;
    updateEntries([...entries, { platform: "Instagram", handle: "" }]);
  };

  const removeEntry = (index: number) => {
    updateEntries(entries.filter((_, i) => i !== index));
  };

  const displayEntries = entries.length ? entries : [{ platform: "Instagram" as SocialPlatform, handle: "" }];

  return (
    <div>
      <p className="mb-2 block text-sm font-medium text-foreground">{label}</p>
      <p className="mb-2 text-xs text-foreground opacity-70">
        {t("role_agreement.social_handles_hint")}
      </p>
      <div className="space-y-3">
        {displayEntries.map((entry, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              id={index === 0 ? id : undefined}
              aria-label={t("role_agreement.social_platform")}
              value={entry.platform}
              onChange={(e) =>
                setEntry(index, { platform: e.target.value as SocialPlatform })
              }
              className="rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground min-w-[8rem]"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label={t("role_agreement.social_handle_placeholder")}
              value={entry.handle}
              onChange={(e) => setEntry(index, { handle: e.target.value })}
              placeholder={t("role_agreement.social_handle_placeholder")}
              className="flex-1 min-w-[10rem] rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
            {displayEntries.length > 1 || entry.handle ? (
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted-bg"
              >
                {t("role_agreement.remove")}
              </button>
            ) : null}
          </div>
        ))}
        {displayEntries.length < maxEntries && (
          <button
            type="button"
            onClick={addEntry}
            className="rounded-lg border border-dashed border-border bg-transparent px-3 py-2 text-sm text-foreground opacity-80 hover:opacity-100"
          >
            {t("role_agreement.add_social_handle")}
          </button>
        )}
      </div>
    </div>
  );
}
