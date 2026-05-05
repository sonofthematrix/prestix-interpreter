"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { SectionWrapper } from "@/components/SectionWrapper";

export function MissionSection() {
  const { t } = useTranslation();

  return (
    <SectionWrapper
      sectionId="mission"
      subtitleClassName="text-[1.25em] font-serif"
      subtitleStyle={{ fontSize: "1.70em", letterSpacing: "0.05em", fontWeight: 700 }}
    >
      <p
        className="mt-6 max-w-3xl text-foreground opacity-90 [&_strong]:font-semibold"
        dangerouslySetInnerHTML={{ __html: t("mission.all") }}
      />
    </SectionWrapper>
  );
}
