"use client";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setAudience } from "@/store/slices/uiSlice";
import type { Audience } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { SectionAnchorLink } from "@/components/SectionAnchorLink";

const ROLES: { value: Audience | null; id: string }[] = [
  { value: null, id: "all" },
  { value: "partner", id: "partner" },
  { value: "organizer", id: "organizer" },
  { value: "promoter", id: "promoter" },
  { value: "influencer", id: "influencer" },
];

export function ChooseRoleSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const audience = useAppSelector((s) => s.ui.audience);

  const currentAudience = audience ?? null;

  return (
    <section
      id="choose-role"
      className="border-t border-border px-4 py-12 md:px-6 md:py-16 bg-background"
      aria-labelledby="role-selector-title"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="role-selector-title"
          className="font-serif text-2xl font-bold text-foreground md:text-3xl flex items-center gap-2 flex-wrap"
        >
          {t("role.title")}
          <SectionAnchorLink sectionId="choose-role" />
        </h2>
        <p className="mt-3 text-foreground opacity-80">{t("role.subtitle")}</p>

        <div className="mt-8 flex flex-col gap-4">
          {/* All option: full width */}
          {ROLES.filter((r) => r.id === "all").map(({ value, id }) => {
            const isActive =
              (value === null && currentAudience === null) ||
              value === currentAudience;
            return (
              <button
                key={id}
                type="button"
                data-audience={value ?? "all"}
                aria-pressed={isActive}
                onClick={() => {
                  dispatch(setAudience(value));
                  if (typeof window !== "undefined") {
                    window.location.hash = value === null ? "all" : value;
                  }
                }}
                className={`w-full rounded-xl border p-6 text-left transition ${
                  isActive
                    ? "border-foreground/40 bg-muted-bg text-foreground"
                    : "border-border bg-input-bg text-foreground opacity-80 hover:border-foreground/30 hover:bg-muted-bg"
                }`}
              >
                <span className="block font-semibold">
                  {t(`role.${id === "all" ? "all" : id}`)}
                </span>
                <span className="mt-2 block text-sm opacity-90">
                  {(() => {
                    const desc = t(`role.${id === "all" ? "all_desc" : id + "_desc"}`);
                    const firstPeriod = desc.indexOf(". ");
                    const firstSentence = firstPeriod >= 0 ? desc.slice(0, firstPeriod + 1) : desc;
                    const rest = firstPeriod >= 0 ? desc.slice(firstPeriod + 2) : "";
                    return (
                      <>
                        <span className="text-[1.25em] font-serif" style={{ fontWeight: 700 }}>{firstSentence}</span>
                        {rest ? ` ${rest}` : ""}
                      </>
                    );
                  })()}
                </span>
              </button>
            );
          })}
          {/* Other 4 options: 4 columns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.filter((r) => r.id !== "all").map(({ value, id }) => {
              const isActive =
                (value === null && currentAudience === null) ||
                value === currentAudience;
              return (
                <button
                  key={id}
                  type="button"
                  data-audience={value ?? "all"}
                  aria-pressed={isActive}
                  onClick={() => {
                    dispatch(setAudience(value));
                    if (typeof window !== "undefined") {
                      window.location.hash = value === null ? "all" : value;
                    }
                  }}
                  className={`rounded-xl border p-6 text-left transition ${
                    isActive
                      ? "border-foreground/40 bg-muted-bg text-foreground"
                      : "border-border bg-input-bg text-foreground opacity-80 hover:border-foreground/30 hover:bg-muted-bg"
                  }`}
                >
                  <span className="block font-semibold">
                    {t(`role.${id === "all" ? "all" : id}`)}
                  </span>
                  <span className="mt-2 block text-sm opacity-90">
                    {(() => {
                      const desc = t(`role.${id === "all" ? "all_desc" : id + "_desc"}`);
                      const firstPeriod = desc.indexOf(". ");
                      const firstSentence = firstPeriod >= 0 ? desc.slice(0, firstPeriod + 1) : desc;
                      const rest = firstPeriod >= 0 ? desc.slice(firstPeriod + 2) : "";
                      return (
                        <>
                          <span className="text-[1.25em] font-serif" style={{ fontWeight: 700 }}>{firstSentence}</span>
                          {rest ? ` ${rest}` : ""}
                        </>
                      );
                    })()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
