"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { SectionWrapper } from "@/components/SectionWrapper";

const BULLET_KEYS = [
  "promoters.bullet_1",
  "promoters.bullet_2",
  "promoters.bullet_3",
  "promoters.bullet_4",
];

export function PromotersSection() {
  const { t } = useTranslation();
  const audience = useAppSelector((s) => s.ui.audience);

  const showSection = audience === null || audience === "promoter";

  if (!showSection) return null;

  return (
    <SectionWrapper
      sectionId="promoters"
      subtitleClassName="font-serif text-[1.25em]"
      subtitleStyle={{ fontWeight: 700 }}
    >
      <p className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold">
        {t("promoters.lead")}
      </p>
      <ul className="mt-6 list-none space-y-4 pl-0">
        {BULLET_KEYS.map((key) => (
          <li
            key={key}
            className="flex gap-3 rounded-xl border border-border bg-muted-bg p-4 text-foreground"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
              —
            </span>
            <span
              className="opacity-90 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: t(key) }}
            />
          </li>
        ))}
      </ul>
      {t("promoters.close") && (
        <p
          className="mt-8 max-w-3xl text-foreground opacity-80 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: t("promoters.close") }}
        />
      )}
      <p className="mt-6">
        <Link
          href="/agreement/promoter"
          className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
        >
          {t("cta.become_promoter")}
        </Link>
      </p>
    </SectionWrapper>
  );
}
