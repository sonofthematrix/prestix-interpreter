"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setAudience } from "@/store/slices/uiSlice";
import type { Audience } from "@/store/slices/uiSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { buildSectionQueryString, BREAKOUTS_SECTION_INDEX } from "@/config/pageSections";

const HERO_AUDIENCES: (Audience | null)[] = [null, "partner", "organizer", "promoter", "influencer"];

/** Section id to scroll to when user clicks the hero arrow, by audience. */
const HERO_AUDIENCE_SECTION: Record<string, string> = {
  "": "choose-role",
  partner: "venues",
  organizer: "platform",
  promoter: "mission",
  influencer: "influencers",
};

function getHeroIndex(audience: Audience | null): number {
  if (audience === null) return 0;
  const idx = HERO_AUDIENCES.indexOf(audience);
  return idx >= 0 ? idx : 0;
}

function getScrollTargetSection(audience: Audience | null): string {
  const key = audience ?? "";
  return HERO_AUDIENCE_SECTION[key] ?? "choose-role";
}

export function HeroSection() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const audience = useAppSelector((s) => s.ui.audience);
  const currentIndex = getHeroIndex(audience ?? null);

  const taglineKey =
    audience === null ? "hero.tagline" : `hero.tagline_${audience}`;
  const taglineHtml = t(taglineKey);
  const benefitKey =
    audience === null
      ? "hero.benefit"
      : `hero.benefit_${audience}`;
  const benefit = t(benefitKey);
  const scrollTargetId = getScrollTargetSection(audience ?? null);

  const scrollToSection = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(scrollTargetId);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToVipSection = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/?${buildSectionQueryString(BREAKOUTS_SECTION_INDEX, locale)}`);
  };

  const goPrev = () => {
    const nextIndex =
      (currentIndex - 1 + HERO_AUDIENCES.length) % HERO_AUDIENCES.length;
    dispatch(setAudience(HERO_AUDIENCES[nextIndex] ?? null));
  };

  const goNext = () => {
    const nextIndex = (currentIndex + 1) % HERO_AUDIENCES.length;
    dispatch(setAudience(HERO_AUDIENCES[nextIndex] ?? null));
  };

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-16 text-center"
      aria-label="Hero"
    >
      {/* Video background (same as non-Next.js version) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      >
        <source src="/video/hero.webm" type="video/webm" />
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
      />

      <div className="relative z-10 max-w-4xl">
        <h1
          className="hero-headline font-serif text-5xl font-bold leading-tight text-white md:text-5xl"
          dangerouslySetInnerHTML={{ __html: taglineHtml }}
        />
        <div className="mx-auto my-6 h-px w-16 bg-white/40" aria-hidden />
        <p className="mx-auto max-w-2xl text-base text-white/80 md:text-lg font-sans">
          {benefit}
        </p>
        <a
          href={`#${scrollTargetId}`}
          onClick={scrollToSection}
          className="mt-8 inline-block rounded-full p-2 text-white/60 hover:text-white"
          aria-label={t("hero.scroll_to_section")}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </a>

        {/* Bike VIP promo: image + copy + CTA to section 10 (VIP experience) */}
        <div className="mt-12 flex flex-col items-center gap-6 rounded-2xl border border-white/20 bg-black/30 p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-center sm:gap-8 md:mt-16">
          <div className="relative h-32 w-48 shrink-0 sm:h-36 sm:w-56">
            <Image
              src="/images/bike/VIP-Bike-Experience-removebg-preview.png"
              alt="VIP Bike Experience"
              fill
              className="object-contain object-center"
              sizes="(max-width: 640px) 192px, 224px"
              priority
            />
          </div>
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <h2 className="font-serif text-2xl font-bold text-white md:text-3xl">
              Unlock the exclusive offers
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/85 md:text-base">
              Get VIP entry service, access to exclusive venues, experience money can&apos;t buy.
            </p>
            <button
              type="button"
              onClick={scrollToVipSection}
              className="mt-4 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Explore VIP experience
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={goPrev}
        className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white md:left-6"
        aria-label="Previous message"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={goNext}
        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white md:right-6"
        aria-label="Next message"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

    </section>
  );
}
