"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
import {
  submitProfile,
  type ProfilePayload,
} from "@/lib/api";
import type { Audience } from "@/store/slices/uiSlice";

const PROFILE_TYPES: { value: Audience; labelKey: string }[] = [
  { value: "partner", labelKey: "role.partner" },
  { value: "organizer", labelKey: "role.organizer" },
  { value: "promoter", labelKey: "role.promoter" },
  { value: "influencer", labelKey: "role.influencer" },
];

const EVENT_TYPES: { value: string; labelKey: string }[] = [
  { value: "nightlife", labelKey: "profile.event_nightlife" },
  { value: "concerts", labelKey: "profile.event_concerts" },
  { value: "private_events", labelKey: "profile.event_private" },
  { value: "corporate", labelKey: "profile.event_corporate" },
  { value: "festivals", labelKey: "profile.event_festivals" },
  { value: "sports", labelKey: "profile.event_sports" },
  { value: "other", labelKey: "profile.event_other" },
];

const VOLUME_OPTIONS = [
  "under_50",
  "50_200",
  "200_500",
  "500_plus",
  "prefer_not",
] as const;

const ROLE_VENUE_OPTIONS = [
  "gm",
  "owner",
  "events_manager",
  "marketing",
  "other",
] as const;

const HOW_HEARD_OPTIONS = [
  "social_media",
  "referral",
  "online_ad",
  "event",
  "search",
  "other",
] as const;

export function ProfileQuestionnaire() {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const audience = useAppSelector((s) => s.ui.audience);
  const canUpload = useAppSelector((s) => s.data.profileCapabilities?.canUpload) ?? false;

  const [step, setStep] = useState(1);
  const [profileType, setProfileType] = useState<Audience>("promoter");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    companyOrHandle: "",
    venueName: "",
    roleAtVenue: "",
    market: "",
    eventTypes: "" as string,
    volume: "",
    howHeard: "",
    comments: "",
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name ?? "",
        email: user.email ?? "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const a = audience ?? "promoter";
    if (["promoter", "partner", "organizer", "influencer"].includes(a)) {
      setProfileType(a as Audience);
    }
  }, [audience]);

  const totalSteps = 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload: ProfilePayload = {
      profileType,
      name: form.name.trim() || undefined,
      email: form.email.trim() || undefined,
      companyOrHandle: form.companyOrHandle.trim() || undefined,
      venueName: form.venueName.trim() || undefined,
      roleAtVenue: form.roleAtVenue || undefined,
      market: form.market.trim() || undefined,
      eventTypes: form.eventTypes || undefined,
      volume: form.volume || undefined,
      howHeard: form.howHeard || undefined,
      comments: form.comments.trim() || undefined,
    };
    try {
      const result = await submitProfile(payload);
      if (result.ok) {
        if (result.saved && result.canUpload) {
          toast(t("profile.saved_uploaded"), "success");
        } else {
          toast(t("profile.saved_local"), "success");
        }
      } else {
        toast(result.error ?? t("profile.save_failed"), "error");
      }
    } catch {
      toast(t("profile.save_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="profile"
      className="rounded-xl border border-border bg-muted-bg p-6"
      aria-labelledby="profile-questionnaire-title"
    >
      <h2
        id="profile-questionnaire-title"
        className="font-serif text-xl font-bold text-foreground"
      >
        {t("drawer.select_profile")}
      </h2>
      <p className="mt-2 text-sm text-foreground opacity-70">
        {t("profile.tailor_help")}
      </p>

      <p className="mt-4 text-sm text-foreground opacity-50">
        {t("drawer.step_of")
          .replace("{n}", String(step))
          .replace("{total}", String(totalSteps))}
      </p>

      {step === 1 && (
        <div className="mt-6">
          <p className="mb-3 font-medium text-foreground">
            {t("role.title")}
          </p>
          <div className="flex flex-wrap gap-3">
            {PROFILE_TYPES.map(({ value, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setProfileType(value);
                  setStep(2);
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  profileType === value
                    ? "border-border bg-muted-bg text-foreground"
                    : "border-border text-foreground opacity-80 hover:bg-muted-bg"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-4 text-sm text-foreground opacity-60 hover:underline"
          >
            {t("profile.next")}
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-foreground opacity-60 hover:underline"
          >
            {t("profile.back")}
          </button>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
              {t("profile.name")}
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
              {t("profile.email")} *
            </span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </label>

          {(profileType === "promoter" || profileType === "influencer") && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
                  {t("profile.company_or_handle")}
                </span>
                <input
                  type="text"
                  value={form.companyOrHandle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyOrHandle: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
                  {t("profile.event_types")}
                </span>
                <select
                  value={form.eventTypes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, eventTypes: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                >
                  <option value="">{t("questions.opt_empty")}</option>
                  {EVENT_TYPES.map(({ value, labelKey }) => (
                    <option key={value} value={value}>
                      {t(labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
                  {t("profile.volume")}
                </span>
                <select
                  value={form.volume}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, volume: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                >
                  <option value="">{t("questions.opt_empty")}</option>
                  {VOLUME_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {t(`profile.volume_${v}`)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {(profileType === "partner" || profileType === "organizer") && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
                  {t("profile.venue_name")}
                </span>
                <input
                  type="text"
                  value={form.venueName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, venueName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
                  {t("profile.role_at_venue")}
                </span>
                <select
                  value={form.roleAtVenue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, roleAtVenue: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                >
                  <option value="">{t("questions.opt_empty")}</option>
                  {ROLE_VENUE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {t(`profile.role_${v}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
                  {t("profile.market")}
                </span>
                <input
                  type="text"
                  value={form.market}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, market: e.target.value }))
                  }
                  placeholder="e.g. London, Sydney"
                  className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground placeholder:text-foreground/40"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
              {t("profile.how_heard")}
            </span>
            <select
              value={form.howHeard}
              onChange={(e) =>
                setForm((f) => ({ ...f, howHeard: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            >
              <option value="">{t("questions.opt_empty")}</option>
              {HOW_HEARD_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {t(`profile.how_${v}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground opacity-80">
              {t("profile.comments")}
            </span>
            <textarea
              value={form.comments}
              onChange={(e) =>
                setForm((f) => ({ ...f, comments: e.target.value }))
              }
              rows={3}
              className="w-full resize-y rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !form.email.trim()}
            className="rounded-lg bg-foreground px-6 py-2.5 font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("profile.saving") : t("profile.save")}
          </button>
        </form>
      )}
    </section>
  );
}
