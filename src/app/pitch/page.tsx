"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { useTranslation } from "@/hooks/useTranslation";

function PitchContent() {
  const searchParams = useSearchParams();
  const { locale } = useTranslation();
  const slide = searchParams.get("slide");
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (locale) params.set("lang", locale);
    if (slide && /^[1-9]\d*$/.test(slide)) {
      const n = parseInt(slide, 10);
      if (n >= 1 && n <= 7) params.set("slide", String(n));
    }
    const q = params.toString();
    return q ? `/pitch-embed.html?${q}` : "/pitch-embed.html";
  }, [slide, locale]);

  return (
    <div className="relative min-h-0 flex-1">
      <iframe
        src={iframeSrc}
        title="PRESTIX.VIP Investor Pitch 2026"
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
      />
    </div>
  );
}

function PitchFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
      {t("pitch.loading")}
    </div>
  );
}

export default function PitchPage() {
  return (
    <Suspense fallback={<PitchFallback />}>
      <PitchContent />
    </Suspense>
  );
}
