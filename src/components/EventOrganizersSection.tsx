"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { SectionWrapper } from "@/components/SectionWrapper";

const BULLET_KEYS = [
  "eventOrganizers.bullet_1",
  "eventOrganizers.bullet_2",
  "eventOrganizers.bullet_3",
  "eventOrganizers.bullet_4",
];

export function EventOrganizersSection() {
  const { t } = useTranslation();
  const audience = useAppSelector((s) => s.ui.audience);

  const showSection = audience === null || audience === "organizer";

  if (!showSection) return null;

  return (
    <SectionWrapper
      sectionId="event-organizers"
      subtitleClassName="font-serif text-[1.25em]"
      subtitleStyle={{ fontWeight: 700 }}
    >
      <p className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold">
        {t("eventOrganizers.lead")}
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
      {t("eventOrganizers.close") && (
        <p
          className="mt-8 max-w-3xl text-foreground opacity-80 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: t("eventOrganizers.close") }}
        />
      )}
      {t("eventOrganizers.agreement") && (
        <div className="mt-6 rounded-xl border border-border bg-muted-bg p-4 max-w-3xl">
          <p className="text-sm font-semibold text-foreground mb-2">{t("eventOrganizers.agreement_heading")}</p>
          <p className="text-sm text-foreground opacity-90">{t("eventOrganizers.agreement")}</p>
        </div>
      )}
      <p className="mt-6">
        <Link
          href="/agreement/event-organizer"
          className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
        >
          {t("cta.become_organizer")}
        </Link>
      </p>
    </SectionWrapper>
  );
}
