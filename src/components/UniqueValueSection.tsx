"use client";

import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import { SectionWrapper } from "@/components/SectionWrapper";

const INTEGRATIONS: { name: string; descKey: string; logo: string }[] = [
  { name: "Ticketmaster", descKey: "unique_value.ticketmaster", logo: "/images/ticketmaster.svg" },
  { name: "Eventbrite", descKey: "unique_value.eventbrite", logo: "/images/eventbrite.svg" },
  { name: "Megatix", descKey: "unique_value.megatix", logo: "/images/megatix.png" },
  { name: "StubHub", descKey: "unique_value.stubhub", logo: "/images/stubhub.svg" },
  { name: "Ticketspice", descKey: "unique_value.ticketspice", logo: "/images/ticketspice.svg" },
];

export function UniqueValueSection() {
  const { t } = useTranslation();

  return (
    <SectionWrapper sectionId="unique-value">
      <div className="mt-6 w-full rounded-lg bg-muted-bg px-4 py-4 font-serif text-[1.25em] [&_strong]:font-bold">
        <p className="font-bold text-foreground">{t("unique_value.crypto_title")}</p>
        <ul className="mt-4 grid list-none grid-cols-1 gap-6 pl-0 md:grid-cols-3">
          <li className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md border border-white bg-muted-bg">
              <Image
                src="/images/crypto-1.png"
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="min-w-0 flex-1 text-foreground">
              <strong dangerouslySetInnerHTML={{ __html: t("unique_value.crypto_step1_title") }} />
              <span className="block text-sm font-sans font-normal opacity-90">— {t("unique_value.crypto_step1_desc")}</span>
            </div>
          </li>
          <li className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md border border-white bg-muted-bg">
              <Image
                src="/images/crypto-2.png"
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="min-w-0 flex-1 text-foreground">
              <strong dangerouslySetInnerHTML={{ __html: t("unique_value.crypto_step2_title") }} />
              <span className="block text-sm font-sans font-normal opacity-90">— {t("unique_value.crypto_step2_desc")}</span>
            </div>
          </li>
          <li className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md border border-white bg-muted-bg">
              <Image
                src="/images/crypto-3.png"
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="min-w-0 flex-1 text-foreground">
              <strong dangerouslySetInnerHTML={{ __html: t("unique_value.crypto_step3_title") }} />
              <span className="block text-sm font-sans font-normal opacity-90">— {t("unique_value.crypto_step3_desc")}</span>
            </div>
          </li>
        </ul>
      </div>
    </SectionWrapper>
  );
}
