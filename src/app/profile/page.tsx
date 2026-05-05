"use client";

import { ProfileQuestionnaire } from "@/components/ProfileQuestionnaire";
import { useTranslation } from "@/hooks/useTranslation";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-5xl font-bold text-foreground">
          {t("profile.title")}
        </h1>
        <p className="mt-4 text-foreground opacity-80">
          {t("profile.description")}
        </p>

        <div className="mt-12">
          <ProfileQuestionnaire />
        </div>
      </div>
    </div>
  );
}
