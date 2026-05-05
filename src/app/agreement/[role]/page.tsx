"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setSignInOpen } from "@/store/slices/uiSlice";
import { getRoleAgreementStatus, submitRoleAgreement } from "@/lib/api";
import type { RoleAgreementRole } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { PhoneFieldWithCountry } from "@/components/PhoneFieldWithCountry";
import { SocialHandlesField } from "@/components/SocialHandlesField";
import { formatPhoneForSubmit, getPhoneNationalError, DEFAULT_PHONE_COUNTRY_CODE } from "@/lib/phone-country";
import { getDisplayNameForUser } from "@/lib/display-name";

export const dynamic = "force-dynamic";

const VALID_SLUGS = ["event-organizer", "promoter", "influencer"] as const;
type RoleSlug = (typeof VALID_SLUGS)[number];

const SLUG_TO_ROLE: Record<RoleSlug, RoleAgreementRole> = {
  "event-organizer": "event_organizer",
  promoter: "promoter",
  influencer: "influencer",
};

const ROLE_TO_TIER: Record<RoleAgreementRole, string> = {
  event_organizer: "event_organizer",
  promoter: "pro",
  influencer: "pro",
};

const ROLE_AGREEMENT_HEADING_KEYS: Record<RoleAgreementRole, string> = {
  event_organizer: "eventOrganizers.agreement_heading",
  promoter: "promoters.agreement_heading",
  influencer: "influencers.agreement_heading",
};

const ROLE_AGREEMENT_BODY_KEYS: Record<RoleAgreementRole, string> = {
  event_organizer: "eventOrganizers.agreement",
  promoter: "promoters.agreement",
  influencer: "influencers.agreement",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(String(email).trim());
}

/** Event type options for event organizer agreement (value stored in extraData.eventTypes). */
const EVENT_ORGANIZER_EVENT_TYPES = ["concerts", "corporate", "private", "other"] as const;
/** Default extra-data keys per role; all optional in UI except we require one primary field per role for submission. */
const EVENT_ORGANIZER_KEYS = ["contactName", "email", "organizationName", "eventTypes", "website", "phone", "address", "country", "comments"] as const;
const PROMOTER_KEYS = ["brandName", "socialHandles", "phone", "city", "country", "comments"] as const;
const INFLUENCER_KEYS = ["brandName", "socialHandles", "niche", "audienceSize", "phone", "country", "comments"] as const;

function parseSlug(slug: string | string[] | undefined): RoleSlug | null {
  const s = typeof slug === "string" ? slug : slug?.[0];
  if (!s || !VALID_SLUGS.includes(s as RoleSlug)) return null;
  return s as RoleSlug;
}

export default function RoleAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const appkitWalletEmail = useAppSelector((s) => s.auth.appkitWalletEmail);
  const slug = parseSlug(params.role);
  const role = slug ? SLUG_TO_ROLE[slug] : null;
  const tier = role ? ROLE_TO_TIER[role] : null;

  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [agreeTerm1, setAgreeTerm1] = useState(false);
  const [agreeTerm2, setAgreeTerm2] = useState(false);
  const [agreeTerm3, setAgreeTerm3] = useState(false);
  const [agreeTerm4, setAgreeTerm4] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [extra, setExtra] = useState<Record<string, string>>({
    contactName: "",
    email: "",
    organizationName: "",
    eventTypes: "",
    website: "",
    phone: "",
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
    address: "",
    country: "",
    comments: "",
    brandName: "",
    socialHandles: "",
    city: "",
    niche: "",
    audienceSize: "",
  });
  /** Tracks event type dropdown so "Other" shows the text input only when selected. */
  const [eventTypeChoice, setEventTypeChoice] = useState<
    "" | "concerts" | "corporate" | "private" | "other"
  >("");

  useEffect(() => {
    if (user) {
      // Use same display name as Contact Us form (e.g. "Reward2learn" from email, not "Wallet User 0x...")
      const displayName = getDisplayNameForUser(user, appkitWalletEmail);
      if (signatureName === "" && displayName) setSignatureName(displayName);
      if (role === "event_organizer") {
        const email = ((appkitWalletEmail && appkitWalletEmail.trim()) || user.email) ?? "";
        setExtra((prev) => ({
          ...prev,
          ...(email && !prev.email ? { email } : {}),
          ...(displayName && !prev.contactName ? { contactName: displayName } : {}),
        }));
      }
    }
  }, [user, role, appkitWalletEmail, signatureName]);

  useEffect(() => {
    if (!role) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getRoleAgreementStatus(role).then((res) => {
      if (!cancelled) {
        setSigned(res.signed);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      dispatch(setSignInOpen(true));
      return;
    }
    if (!role || !agreeTerm1 || !agreeTerm2 || !agreeTerm3 || !agreeTerm4 || !signatureName.trim()) {
      setSubmitError("Please agree to all terms and enter your full name.");
      return;
    }
    if (role === "event_organizer" && !extra.organizationName.trim()) {
      setSubmitError("Organization / Company name is required.");
      return;
    }
    if (role === "event_organizer" && (!extra.contactName?.trim() || !extra.email?.trim())) {
      setSubmitError("Contact name and email are required.");
      return;
    }
    if (role === "event_organizer" && extra.email?.trim() && !isValidEmail(extra.email)) {
      setSubmitError("Please enter a valid email address.");
      return;
    }
    if ((role === "promoter" || role === "influencer") && !extra.brandName.trim()) {
      setSubmitError("Brand / Promoter name is required.");
      return;
    }
    if (extra.phone?.trim()) {
      const phoneError = getPhoneNationalError(extra.phone, true);
      if (phoneError) {
        setSubmitError(
          phoneError === "phone_no_leading_zero"
            ? "Enter phone number without leading 0 (e.g. 4... not 04...)."
            : phoneError === "phone_min_digits"
              ? "Phone must have at least 7 digits."
              : "Invalid phone number."
        );
        return;
      }
    }
    setSubmitting(true);
    setSubmitError("");
    const extraData: Record<string, string> = {};
    if (role === "event_organizer") {
      EVENT_ORGANIZER_KEYS.forEach((k) => {
        if (k === "phone") {
          const full = formatPhoneForSubmit(
            extra.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
            extra.phone || ""
          );
          if (full) extraData[k] = full;
        } else if (extra[k]?.trim()) extraData[k] = extra[k].trim();
      });
    } else if (role === "promoter") {
      PROMOTER_KEYS.forEach((k) => {
        if (k === "phone") {
          const full = formatPhoneForSubmit(
            extra.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
            extra.phone || ""
          );
          if (full) extraData[k] = full;
        } else if (extra[k]?.trim()) extraData[k] = extra[k].trim();
      });
    } else if (role === "influencer") {
      INFLUENCER_KEYS.forEach((k) => {
        if (k === "phone") {
          const full = formatPhoneForSubmit(
            extra.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
            extra.phone || ""
          );
          if (full) extraData[k] = full;
        } else if (extra[k]?.trim()) extraData[k] = extra[k].trim();
      });
    }
    const result = await submitRoleAgreement({
      role,
      agreeTerms: true,
      signatureName: signatureName.trim(),
      ...(Object.keys(extraData).length > 0 && { extraData }),
    });
    setSubmitting(false);
    if (result.ok) {
      setSuccess(true);
      setSigned(true);
      return;
    }
    setSubmitError(result.error ?? "Failed to submit agreement.");
  };

  const setExtraField = (key: string, value: string) => {
    setExtra((prev) => ({ ...prev, [key]: value }));
  };

  if (params.role === undefined || slug === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-serif text-2xl font-bold text-foreground">Invalid agreement</h1>
        <p className="mt-2 text-foreground opacity-80">Please use a valid link (event-organizer, promoter, or influencer).</p>
        <Link href="/" className="mt-6 inline-block text-accent underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-foreground opacity-80">Loading…</p>
      </div>
    );
  }

  const headingKey = role ? ROLE_AGREEMENT_HEADING_KEYS[role] : "";
  const bodyKey = role ? ROLE_AGREEMENT_BODY_KEYS[role] : "";
  const membershipUrl = tier ? `/become-a-member?tier=${tier}` : "/become-a-member";

  const canSubmit =
    agreeTerm1 &&
    agreeTerm2 &&
    agreeTerm3 &&
    agreeTerm4 &&
    signatureName.trim() &&
    (role === "event_organizer" ? extra.organizationName.trim() && extra.contactName.trim() && extra.email.trim() : true) &&
    (role === "promoter" || role === "influencer" ? extra.brandName.trim() : true);

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
        {t(headingKey) || "Agreement"}
      </h1>

      {signed || success ? (
        <div className="mt-8 rounded-xl border border-green-500/50 bg-green-500/10 p-6">
          <p className="font-medium text-foreground">
            {t("role_agreement.success_message")}
          </p>
          <Link
            href={membershipUrl}
            className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
          >
            {t("role_agreement.continue_to_membership")}
          </Link>
        </div>
      ) : !user ? (
        <div className="mt-8">
          <p className="text-foreground opacity-80">{t("role_agreement.sign_in_prompt")}</p>
          <button
            type="button"
            onClick={() => dispatch(setSignInOpen(true))}
            className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
          >
            Sign in
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-border bg-muted-bg p-4">
            <p className="text-sm text-foreground opacity-90 whitespace-pre-wrap">
              {t(bodyKey)}
            </p>
          </div>
          <div className="mt-6 rounded-xl border border-border bg-muted-bg p-4">
            <p className="text-sm text-foreground opacity-90 whitespace-pre-wrap">
              {t(bodyKey)}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="rounded-xl border border-border bg-muted-bg/50 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t("role_agreement.details_heading")}</h3>
              {role === "event_organizer" && (
                <>
                  <div>
                    <label htmlFor="contactName_eo" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.contact_name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contactName_eo"
                      type="text"
                      value={extra.contactName}
                      onChange={(e) => setExtraField("contactName", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="email_eo" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.email")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email_eo"
                      type="email"
                      value={extra.email}
                      onChange={(e) => setExtraField("email", e.target.value)}
                      placeholder="you@example.com"
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="organizationName" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.organization_name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="organizationName"
                      type="text"
                      value={extra.organizationName}
                      onChange={(e) => setExtraField("organizationName", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="eventTypes" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.event_types")}
                    </label>
                    <select
                      id="eventTypes"
                      value={eventTypeChoice}
                      onChange={(e) => {
                        const v = e.target.value as "" | "concerts" | "corporate" | "private" | "other";
                        setEventTypeChoice(v);
                        if (v && v !== "other") setExtraField("eventTypes", v);
                        if (v === "other") setExtraField("eventTypes", extra.eventTypes || "");
                      }}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    >
                      <option value="">{t("role_agreement.event_type_placeholder")}</option>
                      {EVENT_ORGANIZER_EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(`role_agreement.event_type_${type}`)}
                        </option>
                      ))}
                    </select>
                    {eventTypeChoice === "other" && (
                      <input
                        type="text"
                        aria-label={t("role_agreement.event_type_other_placeholder")}
                        value={extra.eventTypes}
                        onChange={(e) => setExtraField("eventTypes", e.target.value)}
                        placeholder={t("role_agreement.event_type_other_placeholder")}
                        className="mt-2 w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.website")}
                    </label>
                    <input
                      id="website"
                      type="url"
                      value={extra.website}
                      onChange={(e) => setExtraField("website", e.target.value)}
                      placeholder="https://..."
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <PhoneFieldWithCountry
                      id="phone_eo"
                      label={t("role_agreement.phone")}
                      countryCode={extra.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE}
                      nationalNumber={extra.phone}
                      onCountryCodeChange={(v) => setExtraField("phoneCountryCode", v)}
                      onNationalNumberChange={(v) => setExtraField("phone", v)}
                      optional
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.address")}
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={extra.address}
                      onChange={(e) => setExtraField("address", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="country_eo" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.country")}
                    </label>
                    <input
                      id="country_eo"
                      type="text"
                      value={extra.country}
                      onChange={(e) => setExtraField("country", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="comments_eo" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.comments")}
                    </label>
                    <textarea
                      id="comments_eo"
                      rows={2}
                      value={extra.comments}
                      onChange={(e) => setExtraField("comments", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                </>
              )}
              {role === "promoter" && (
                <>
                  <div>
                    <label htmlFor="brandName_p" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.brand_name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="brandName_p"
                      type="text"
                      value={extra.brandName}
                      onChange={(e) => setExtraField("brandName", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <SocialHandlesField
                      id="socialHandles_p"
                      label={t("role_agreement.social_handles")}
                      value={extra.socialHandles}
                      onChange={(v) => setExtraField("socialHandles", v)}
                    />
                  </div>
                  <div>
                    <PhoneFieldWithCountry
                      id="phone_p"
                      label={t("role_agreement.phone")}
                      countryCode={extra.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE}
                      nationalNumber={extra.phone}
                      onCountryCodeChange={(v) => setExtraField("phoneCountryCode", v)}
                      onNationalNumberChange={(v) => setExtraField("phone", v)}
                      optional
                    />
                  </div>
                  <div>
                    <label htmlFor="city_p" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.city")}
                    </label>
                    <input
                      id="city_p"
                      type="text"
                      value={extra.city}
                      onChange={(e) => setExtraField("city", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="country_p" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.country")}
                    </label>
                    <input
                      id="country_p"
                      type="text"
                      value={extra.country}
                      onChange={(e) => setExtraField("country", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="comments_p" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.comments")}
                    </label>
                    <textarea
                      id="comments_p"
                      rows={2}
                      value={extra.comments}
                      onChange={(e) => setExtraField("comments", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                </>
              )}
              {role === "influencer" && (
                <>
                  <div>
                    <label htmlFor="brandName_i" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.brand_name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="brandName_i"
                      type="text"
                      value={extra.brandName}
                      onChange={(e) => setExtraField("brandName", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <SocialHandlesField
                      id="socialHandles_i"
                      label={t("role_agreement.social_handles")}
                      value={extra.socialHandles}
                      onChange={(v) => setExtraField("socialHandles", v)}
                    />
                  </div>
                  <div>
                    <label htmlFor="niche" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.niche")}
                    </label>
                    <input
                      id="niche"
                      type="text"
                      value={extra.niche}
                      onChange={(e) => setExtraField("niche", e.target.value)}
                      placeholder={t("role_agreement.niche")}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="audienceSize" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.audience_size")}
                    </label>
                    <input
                      id="audienceSize"
                      type="text"
                      value={extra.audienceSize}
                      onChange={(e) => setExtraField("audienceSize", e.target.value)}
                      placeholder="e.g. 50K"
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <PhoneFieldWithCountry
                      id="phone_i"
                      label={t("role_agreement.phone")}
                      countryCode={extra.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE}
                      nationalNumber={extra.phone}
                      onCountryCodeChange={(v) => setExtraField("phoneCountryCode", v)}
                      onNationalNumberChange={(v) => setExtraField("phone", v)}
                      optional
                    />
                  </div>
                  <div>
                    <label htmlFor="country_i" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.country")}
                    </label>
                    <input
                      id="country_i"
                      type="text"
                      value={extra.country}
                      onChange={(e) => setExtraField("country", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="comments_i" className="block text-sm font-medium text-foreground mb-1">
                      {t("role_agreement.comments")}
                    </label>
                    <textarea
                      id="comments_i"
                      rows={2}
                      value={extra.comments}
                      onChange={(e) => setExtraField("comments", e.target.value)}
                      className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted-bg p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">{t("role_agreement.agreement_terms")}</p>
              {role === "event_organizer" && (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm1}
                      onChange={(e) => setAgreeTerm1(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.event_organizer_agree_1")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm2}
                      onChange={(e) => setAgreeTerm2(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.event_organizer_agree_2")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm3}
                      onChange={(e) => setAgreeTerm3(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.event_organizer_agree_3")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm4}
                      onChange={(e) => setAgreeTerm4(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.event_organizer_agree_4")}</span>
                  </label>
                </>
              )}
              {role === "promoter" && (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm1}
                      onChange={(e) => setAgreeTerm1(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.promoter_agree_1")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm2}
                      onChange={(e) => setAgreeTerm2(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.promoter_agree_2")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm3}
                      onChange={(e) => setAgreeTerm3(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.promoter_agree_3")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm4}
                      onChange={(e) => setAgreeTerm4(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.promoter_agree_4")}</span>
                  </label>
                </>
              )}
              {role === "influencer" && (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm1}
                      onChange={(e) => setAgreeTerm1(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.influencer_agree_1")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm2}
                      onChange={(e) => setAgreeTerm2(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.influencer_agree_2")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm3}
                      onChange={(e) => setAgreeTerm3(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.influencer_agree_3")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeTerm4}
                      onChange={(e) => setAgreeTerm4(e.target.checked)}
                      className="mt-1 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{t("role_agreement.influencer_agree_4")}</span>
                  </label>
                </>
              )}
              <p className="text-xs text-foreground opacity-90 pt-2 border-t border-border mt-2">
                {t("role_agreement.membership_info")}
              </p>
            </div>
            <div>
              <label htmlFor="signatureName" className="block text-sm font-medium text-foreground mb-1">
                {user?.walletAddress ? t("role_agreement.signature_wallet_label") : t("role_agreement.signature_placeholder")}
              </label>
              <input
                id="signatureName"
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder={user?.walletAddress ? undefined : t("role_agreement.signature_placeholder")}
                readOnly={!!user?.walletAddress}
                className="w-full max-w-md rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-500" role="alert">
                {submitError}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="rounded-lg bg-accent px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "…" : t("role_agreement.submit_btn")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground hover:bg-muted-bg"
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
