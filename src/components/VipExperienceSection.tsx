"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { useAppDispatch } from "@/store/hooks";
import { setBreakoutsVisible } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { BikeModelViewer } from "./BikeModelViewer";
import { apiFetch } from "@/lib/api";
import { SectionAnchorLink } from "@/components/SectionAnchorLink";
import { getSectionIndexLabel } from "@/config/sections";

export function VipExperienceSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const sectionRef = useRef<HTMLElement>(null);
  const sectionTitleRef = useRef<HTMLDivElement>(null);
  const modelViewerContainerRef = useRef<HTMLDivElement>(null);
  const [hireAnswer, setHireAnswer] = useState<"yes" | "no" | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    automated: false,
    priority: false,
    methodology: false,
  });

  // Show breakouts when section is in view AND model viewer is at least 10% visible.
  // Animate out only when model viewer is 0% visible (no early exit from viewport offset or title).
  useEffect(() => {
    const sectionEl = sectionRef.current;
    const modelEl = modelViewerContainerRef.current;
    if (!sectionEl || !modelEl) return;

    let sectionInView = false;
    let modelViewerVisibleEnough = false; // true when >= 10% visible

    const updateBreakouts = () => {
      const visible = sectionInView && modelViewerVisibleEnough;
      dispatch(setBreakoutsVisible(visible));
    };

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) {
          sectionInView = e.isIntersecting;
          updateBreakouts();
        }
      },
      { rootMargin: "0px", threshold: 0 }
    );

    // In: model viewer at least 10% visible. Out: only when 0% visible (with 20% extra scroll before triggering).
    const modelObserver = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) {
          const ratio = e.intersectionRatio;
          if (ratio >= 0.1) modelViewerVisibleEnough = true;
          else if (ratio === 0) modelViewerVisibleEnough = false;
          updateBreakouts();
        }
      },
      { root: null, rootMargin: "20% 0px 0px 0px", threshold: [0, 0.1] }
    );

    sectionObserver.observe(sectionEl);
    modelObserver.observe(modelEl);

    const onScrollOrResize = () => {
      updateBreakouts();
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      sectionObserver.disconnect();
      modelObserver.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [dispatch]);

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submitHireAnswer = useCallback((value: "yes" | "no") => {
    setHireAnswer(value);
    apiFetch("/api/analytics", {
      method: "POST",
      body: JSON.stringify({
        event: "experience_hire_bike",
        payload: { wouldHire: value },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }, []);

  return (
    <section
      ref={sectionRef}
      id="vip-experience"
      className="border-t border-border px-4 py-12 md:px-6 md:py-16 bg-background overflow-x-hidden"
      aria-labelledby="vip-experience-title"
    >
      <div className="mx-auto max-w-4xl">
        <div ref={sectionTitleRef}>
          <span className="text-sm font-medium text-accent">
            {getSectionIndexLabel("vip-experience")}
          </span>
          <h2
            id="vip-experience-title"
            className="mt-2 font-serif text-2xl font-bold text-foreground md:text-3xl flex items-center gap-2 flex-wrap"
          >
            {t("section.vip_experience")}
            <SectionAnchorLink sectionId="vip-experience" />
          </h2>
          <div className="my-4 h-px w-12 bg-accent" aria-hidden />
        </div>
        <div className="flex flex-wrap items-center gap-4 gap-y-2 max-w-3xl">
          <Image
            src="/model/DEUS-logo-white.png"
            alt="DEUS — Custom Motorcycles Bali"
            width={350}
            height={48}
            className="h-12 w-auto object-contain"
            style={{ height: 'calc(var(--spacing) * 28)' }}
          />
          <p className="text-foreground opacity-90 flex-1 min-w-0 [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: t("vip.deus_partnership") }} />
        </div>
        <p className="mt-4 max-w-3xl text-foreground opacity-80">
          {t("section.vip_experience_sub")}
        </p>

        <div
          ref={modelViewerContainerRef}
          className="mt-10 relative left-1/2 w-screen -translate-x-1/2 h-[100dvh] overflow-hidden"
        >
          <div className="h-full w-full">
            <BikeModelViewer />
          </div>
        </div>

        <div className="mt-10 space-y-2 text-foreground opacity-90">
          <p>{t("vip.intro")}</p>

          <div className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("automated")}
              aria-expanded={expanded.automated}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-serif text-lg font-semibold text-foreground hover:bg-muted-bg transition-colors"
            >
              {t("vip.automated_title")}
              <span
                className={`shrink-0 transition-transform duration-200 ${expanded.automated ? "rotate-180" : ""}`}
                aria-hidden
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: expanded.automated ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-0">
                  <p className="mt-2">{t("vip.automated_p1")}</p>
                  <p className="mt-4">{t("vip.automated_p2")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("priority")}
              aria-expanded={expanded.priority}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-serif text-lg font-semibold text-foreground hover:bg-muted-bg transition-colors"
            >
              {t("vip.priority_title")}
              <span
                className={`shrink-0 transition-transform duration-200 ${expanded.priority ? "rotate-180" : ""}`}
                aria-hidden
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: expanded.priority ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-0">
                  <p className="mt-2">{t("vip.priority_p1")}</p>
                  <p className="mt-4">{t("vip.priority_p2")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("methodology")}
              aria-expanded={expanded.methodology}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-serif text-lg font-semibold text-foreground hover:bg-muted-bg transition-colors"
            >
              {t("vip.methodology_title")}
              <span
                className={`shrink-0 transition-transform duration-200 ${expanded.methodology ? "rotate-180" : ""}`}
                aria-hidden
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: expanded.methodology ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-0">
                  <p className="mt-2">{t("vip.methodology_intro")}</p>
                  <p className="mt-4">
                    <strong className="font-semibold text-foreground">
                      {t("vip.methodology_entertainment_title")}
                    </strong>{" "}
                    {t("vip.methodology_entertainment")}
                  </p>
                  <p className="mt-4">
                    <strong className="font-semibold text-foreground">
                      {t("vip.methodology_connecting_title")}
                    </strong>{" "}
                    {t("vip.methodology_connecting")}
                  </p>
                  <p className="mt-4">
                    <strong className="font-semibold text-foreground">
                      {t("vip.methodology_instant_title")}
                    </strong>{" "}
                    {t("vip.methodology_instant")}
                  </p>
                  <p className="mt-6">{t("vip.closing")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-10">
          <p className="font-serif text-lg font-semibold text-foreground">
            {t("vip.hire_question")}
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => submitHireAnswer("yes")}
              className={`rounded-lg border-2 px-6 py-3 font-medium transition-colors ${
                hireAnswer === "yes"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-muted-bg text-foreground hover:border-foreground/30"
              }`}
            >
              {t("vip.yes")}
            </button>
            <button
              type="button"
              onClick={() => submitHireAnswer("no")}
              className={`rounded-lg border-2 px-6 py-3 font-medium transition-colors ${
                hireAnswer === "no"
                  ? "border-foreground/40 bg-muted-bg text-foreground"
                  : "border-border bg-muted-bg text-foreground hover:border-foreground/30"
              }`}
            >
              {t("vip.no")}
            </button>
          </div>
          {hireAnswer === "yes" && (
            <p className="mt-4 text-sm text-foreground opacity-80">
              {t("vip.hire_answer_thanks")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
