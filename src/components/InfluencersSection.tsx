"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { SectionWrapper } from "@/components/SectionWrapper";

const BULLET_KEYS = [
  "influencers.bullet_1",
  "influencers.bullet_2",
  "influencers.bullet_3",
  "influencers.bullet_4",
];

export function InfluencersSection() {
  const { t } = useTranslation();
  const audience = useAppSelector((s) => s.ui.audience);

  const showSection = audience === null || audience === "influencer";

  if (!showSection) return null;

  return (
    <SectionWrapper
      sectionId="influencers"
      subtitleClassName="font-serif text-[1.25em]"
      subtitleStyle={{ fontWeight: 700 }}
    >
      <p className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold">
        {t("influencers.lead")}
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
      {t("influencers.close") && (
        <p
          className="mt-8 max-w-3xl text-foreground opacity-80 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: t("influencers.close") }}
        />
      )}
      <p className="mt-6">
        <Link
          href="/agreement/influencer"
          className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
        >
          {t("cta.become_influencer")}
        </Link>
      </p>
    </SectionWrapper>
  );
}
