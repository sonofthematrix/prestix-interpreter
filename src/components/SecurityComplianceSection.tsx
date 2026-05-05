"use client";

import { useTranslation } from "@/hooks/useTranslation";

const BENEFIT_KEYS = [
  "security.benefit_easy",
  "security.benefit_fast",
  "security.benefit_safe",
  "security.benefit_scale",
  "security.benefit_future",
  "security.benefit_automation",
  "security.benefit_cost",
] as const;

const TECH_KEYS = [
  "security.tech_zenstack",
  "security.tech_zustand",
  "security.tech_nextjs",
  "security.tech_vercel",
  "security.tech_blob",
  "security.tech_hardhat",
  "security.tech_erc404",
  "security.tech_reown",
  "security.tech_deploy",
] as const;

export function SecurityComplianceSection() {
  const { t } = useTranslation();

  return (
    <section
      id="security-compliance"
      className="border-t border-border px-4 py-12 md:px-6 md:py-16 bg-background"
      aria-labelledby="security-compliance-title"
    >
      <div className="mx-auto max-w-4xl">
        <span className="text-sm font-medium text-accent">07</span>
        <h2
          id="security-compliance-title"
          className="mt-2 font-serif text-2xl font-bold text-foreground md:text-3xl"
        >
          {t("section.security_compliance")}
        </h2>
        <div className="my-4 h-px w-12 bg-accent" aria-hidden />
        <p className="max-w-3xl text-foreground opacity-80 text-[1.1em]">
          {t("section.security_compliance_sub")}
        </p>

        <div className="mt-8">
          <p className="font-serif text-lg font-semibold text-foreground">
            {t("security.benefits_intro")}
          </p>
          <ul className="mt-4 space-y-3 text-foreground opacity-90 [&_strong]:font-semibold">
            {BENEFIT_KEYS.map((key) => (
              <li key={key} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <p className="font-serif text-lg font-semibold text-foreground">
            {t("security.tech_intro")}
          </p>
          <ul className="mt-4 space-y-4">
            {TECH_KEYS.map((key) => (
              <li
                key={key}
                className="border-l-2 border-foreground/20 pl-6"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="text-foreground opacity-90 text-[0.95em]">{t(key)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
