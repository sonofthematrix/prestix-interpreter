"use client";

import { useAppSelector } from "@/store/hooks";
import type { Audience } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { SectionWrapper } from "@/components/SectionWrapper";

const CARDS: {
  audience: Audience | null;
  headingKey: string;
  leadKey: string;
  supportKey: string;
}[] = [
  { audience: "partner", headingKey: "platform.for_venues_heading", leadKey: "platform.for_venues_lead", supportKey: "platform.for_venues_support" },
  { audience: "organizer", headingKey: "platform.for_organizers_heading", leadKey: "platform.for_organizers_lead", supportKey: "platform.for_organizers_support" },
  { audience: "promoter", headingKey: "platform.for_promoters_heading", leadKey: "platform.for_promoters_lead", supportKey: "platform.for_promoters_support" },
  { audience: "influencer", headingKey: "platform.for_influencers_heading", leadKey: "platform.for_influencers_lead", supportKey: "platform.for_influencers_support" },
];

const DEFAULT_MARKETPLACE_URL = "https://prestix.vip/marketplace";

export function PlatformSection() {
  const { t } = useTranslation();
  const audience = useAppSelector((s) => s.ui.audience);
  const marketplaceUrl = useAppSelector((s) => s.data.siteSettings.marketplaceUrl) ?? DEFAULT_MARKETPLACE_URL;
  const partnershipStatus = useAppSelector((s) => s.data.partnershipStatus);
  const isPartner = partnershipStatus?.isPartner ?? false;

  const showAll = audience === null;
  const singleRole = audience !== null;
  const showCard = (cardAudience: Audience | null) =>
    showAll || cardAudience === audience;

  return (
    <SectionWrapper
      sectionId="platform"
      subtitleClassName="font-serif text-[1.25em]"
      subtitleStyle={{ fontWeight: 700 }}
    >
      <p className="mt-6 max-w-3xl text-foreground opacity-90">
        {t("platform.lead")}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6">
        {CARDS.map(({ audience: cardAudience, headingKey, leadKey, supportKey }) => {
          if (!showCard(cardAudience)) return null;
          return (
            <div
              key={headingKey}
              className="rounded-xl border border-border bg-muted-bg p-6 text-left"
            >
              <strong className="block font-semibold text-foreground">
                {t(headingKey)}
              </strong>
              <p className="mt-3 font-serif text-[1.25em] leading-snug text-foreground opacity-90" style={{ fontWeight: 700 }}>
                {t(leadKey)}
              </p>
              <p className="mt-3 text-sm text-foreground opacity-80">
                {t(supportKey)}
              </p>
            </div>
          );
        })}
      </div>

      <p
        className="mt-10 max-w-3xl text-foreground opacity-80 [&_strong]:font-semibold"
        dangerouslySetInnerHTML={{ __html: t("platform.close") }}
      />
      {isPartner && (
        <p className="mt-6">
          <a
            href={marketplaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-medium text-background hover:opacity-90"
          >
            {t("platform.visit_marketplace")}
          </a>
        </p>
      )}
    </SectionWrapper>
  );
}
