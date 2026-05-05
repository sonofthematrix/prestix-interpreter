"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function MarketplacePage() {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-5xl font-bold text-foreground">
          {t("section.marketplace")}
        </h1>
        <p className="mt-4 font-serif text-[1.25em] leading-snug text-foreground opacity-90" style={{ fontWeight: 700 }}>
          {t("section.platform_sub")}
        </p>
        <p className="mt-6 max-w-2xl text-foreground opacity-80">
          {t("marketplace.page_lead")}
        </p>

        <div className="mt-10 rounded-xl border border-border bg-muted-bg p-6 text-foreground">
          <p className="text-foreground opacity-90">
            {t("marketplace.listings_intro")}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-medium text-background hover:opacity-90"
            >
              {t("marketplace.back_home")}
            </Link>
            <Link
              href="/become-a-member"
              className="inline-flex items-center rounded-lg border border-border bg-background px-5 py-2.5 font-medium text-foreground hover:bg-muted-bg"
            >
              {t("marketplace.become_member")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
