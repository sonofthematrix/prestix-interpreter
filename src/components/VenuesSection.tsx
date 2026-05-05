"use client";

import Link from "next/link";
import Image from "next/image";
import { useAppSelector } from "@/store/hooks";
import type { Audience } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import type { PartnerPublic } from "@/lib/api";
import { SectionWrapper } from "@/components/SectionWrapper";

const BENEFIT_KEYS = [
  "venues.benefit_1",
  "venues.benefit_2",
  "venues.benefit_3",
  "venues.benefit_4",
];

function PartnerLogo({ partner }: { partner: PartnerPublic }) {
  const initials = partner.venueName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "V";
  if (partner.logoUrl) {
    return (
      <div className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-white ">
        <Image
          src={partner.logoUrl}
          alt={partner.venueName}
          width={112}
          height={99}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-14 w-28 shrink-0 items-center justify-center rounded border border-border bg-muted-bg text-sm font-semibold text-foreground"
      title={partner.venueName}
    >
      {initials}
    </div>
  );
}

export function VenuesSection() {
  const { t } = useTranslation();
  const audience = useAppSelector((s) => s.ui.audience);
  const partnershipStatus = useAppSelector((s) => s.data.partnershipStatus);
  const partners = useAppSelector((s) => s.data.partners);
  const hasAgreement = partnershipStatus?.hasAgreement ?? false;

  const showPromoter = audience === null || audience === "promoter";
  const showInfluencer = audience === null || audience === "influencer";
  const showManagement = audience === null || audience === "partner" || audience === "organizer";

  return (
    <SectionWrapper sectionId="venues">
        {showPromoter && (
          <p
            className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: t("venues.promoter") }}
          />
        )}
        {showInfluencer && (
          <p
            className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: t("venues.influencer") }}
          />
        )}
        {showManagement && (
          <>
            {t("venues.management_lead") && (
              <p
                className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: t("venues.management_lead") }}
              />
            )}
            <p className="mt-4 text-sm font-semibold text-foreground">
              {t("venues.partner_benefits_heading")}
            </p>
            {t("venues.partner_benefits_intro") && (
              <p className="mt-1 max-w-3xl text-foreground opacity-90">
                {t("venues.partner_benefits_intro")}
              </p>
            )}
            <ul className="mt-4 list-inside list-disc space-y-2 text-foreground opacity-90">
              {BENEFIT_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
            {partners.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-foreground">
                  {t("venues.partner_logos_heading")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {partners.map((p, i) => (
                    <PartnerLogo key={`${p.venueName}-${i}`} partner={p} />
                  ))}
                </div>
              </div>
            )}
            {!hasAgreement && (
              <p className="mt-6">
                <Link
                  href="/agreement/partner"
                  className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-medium text-foreground hover:opacity-90"
                style={{ color: "#ffffff" }}>
                  {t("venues.become_partner")}
                </Link>
              </p>
            )}
          </>
        )}
    </SectionWrapper>
  );
}
