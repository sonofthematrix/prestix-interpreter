"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setSignInOpen } from "@/store/slices/uiSlice";
import { submitPartnershipAgreement } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fetchPartnershipStatus } from "@/store/slices/dataSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { PhoneFieldWithCountry } from "@/components/PhoneFieldWithCountry";
import { formatPhoneForSubmit, getPhoneNationalError, DEFAULT_PHONE_COUNTRY_CODE } from "@/lib/phone-country";
import { getDisplayNameForUser } from "@/lib/display-name";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(String(email).trim());
}

export default function PartnerAgreementPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const appkitWalletEmail = useAppSelector((s) => s.auth.appkitWalletEmail);
  const authLoading = useAppSelector((s) => s.auth.loading);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoDropActive, setLogoDropActive] = useState(false);
  const [logoFileName, setLogoFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    venueName: "",
    venueGoogleMapsUrl: "",
    contactName: "",
    email: "",
    phone: "",
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
    address: "",
    country: "",
    businessTaxNumber: "",
    walletAddress: "",
    agreeLogoOnBike: false,
    agreeVipExperience: false,
    agreeTerms: false,
    signatureName: "",
    comments: "",
    logoUrl: "",
  });

  useEffect(() => {
    if (user) {
      const email = ((appkitWalletEmail && appkitWalletEmail.trim()) || user.email) ?? "";
      const contactName = getDisplayNameForUser(user, appkitWalletEmail);
      setForm((prev) => ({
        ...prev,
        email,
        contactName,
        signatureName: contactName || prev.signatureName,
      }));
    }
  }, [user, appkitWalletEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const name = e.target.name;
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoFileName("");
      return;
    }
    setLogoFileName(file.name);
    await uploadLogoFile(file);
    e.target.value = "";
  };

  const uploadLogoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast(t("partnership.toast_logo_image"), "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast(t("partnership.toast_logo_size"), "error");
      return;
    }
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const base = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000";
      const res = await fetch(`${base}/api/partner-logo`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data?.error ?? t("partnership.toast_logo_failed"), "error");
        return;
      }
      if (data.url) setForm((prev) => ({ ...prev, logoUrl: data.url }));
    } finally {
      setUploadingLogo(false);
    }
  }, [toast, t]);

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogoFile(file);
  }, [uploadLogoFile]);

  const handleLogoPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const item = Array.from(items).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    const file = item.getAsFile();
    if (file) uploadLogoFile(file);
  }, [uploadLogoFile]);

  const canSubmit = useMemo(() => {
    if (!form.venueName.trim() || !form.contactName.trim() || !form.email.trim()) return false;
    if (!form.venueGoogleMapsUrl.trim()) return false;
    if (!isValidEmail(form.email)) return false;
    if (form.phone.trim() && getPhoneNationalError(form.phone, true)) return false;
    if (!form.agreeLogoOnBike || !form.agreeVipExperience || !form.agreeTerms) return false;
    return true;
  }, [form]);

  const emailError = form.email.trim() ? (isValidEmail(form.email) ? null : t("partnership.email_error")) : null;
  const phoneErrorKey = form.phone.trim() ? getPhoneNationalError(form.phone, true) : null;
  const phoneError = phoneErrorKey ? t(`role_agreement.${phoneErrorKey}`) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !user || !canSubmit) return;
    if (!form.agreeLogoOnBike || !form.agreeVipExperience || !form.agreeTerms) {
      toast(t("partnership.toast_agree_all"), "error");
      return;
    }
    if (!form.venueName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast(t("partnership.toast_required"), "error");
      return;
    }
    if (!form.venueGoogleMapsUrl.trim()) {
      toast(t("partnership.venue_location_required"), "error");
      return;
    }
    if (!isValidEmail(form.email)) {
      toast(t("partnership.toast_valid_email"), "error");
      return;
    }
    if (form.phone.trim() && getPhoneNationalError(form.phone, true)) {
      toast(t("role_agreement.phone_no_leading_zero"), "error");
      return;
    }
    setSubmitting(true);
    const phoneValue = form.phone.trim()
      ? formatPhoneForSubmit(form.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE, form.phone)
      : undefined;
    const result = await submitPartnershipAgreement({
      venueName: form.venueName.trim(),
      venueGoogleMapsUrl: form.venueGoogleMapsUrl.trim() || undefined,
      businessTaxNumber: form.businessTaxNumber.trim() || undefined,
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: phoneValue,
      address: form.address.trim() || undefined,
      country: form.country.trim() || undefined,
      walletAddress: form.walletAddress.trim() || undefined,
      agreeLogoOnBike: form.agreeLogoOnBike,
      agreeVipExperience: form.agreeVipExperience,
      agreeTerms: form.agreeTerms,
      signatureName: form.signatureName.trim() || undefined,
      comments: form.comments.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      setSuccess(true);
      dispatch(fetchPartnershipStatus());
      toast(result.message ?? t("partnership.toast_submitted"), "success");
    } else {
      toast(result.error ?? t("partnership.toast_failed"), "error");
    }
  };

  if (authLoading) {
    return (
      <div className="px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-2xl">
          <p className="text-foreground opacity-80">{t("partnership.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-3xl font-bold text-foreground">{t("partnership.title")}</h1>
          <p className="mt-4 text-foreground opacity-90">
            {t("partnership.sign_in_prompt")}
          </p>
          <button
            type="button"
            onClick={() => dispatch(setSignInOpen(true))}
            className="mt-6 rounded-lg bg-accent px-4 py-2 font-medium text-background hover:opacity-90"
          >
            {t("partnership.sign_in")}
          </button>
          <p className="mt-6">
            <Link href="/" className="text-foreground underline opacity-80 hover:opacity-100">
              {t("partnership.back_home")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-3xl font-bold text-foreground">{t("partnership.thank_you")}</h1>
          <p className="mt-4 text-foreground opacity-90">
            {t("partnership.submitted_message")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-background hover:opacity-90"
          >
            {t("partnership.back_home")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-foreground opacity-70">
          <Link href="/" className="hover:underline">{t("partnership.home")}</Link>
          <span>/</span>
          <Link href="/become-a-member" className="hover:underline">Agreement</Link>
          <span>/</span>
          <span>{t("partnership.title")}</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">{t("partnership.title")}</h1>
        <p className="mt-2 text-foreground opacity-80">
          {t("partnership.intro")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="venueName" className="block text-sm font-medium text-foreground">
              {t("partnership.venue_name")}
            </label>
            <input
              id="venueName"
              name="venueName"
              type="text"
              required
              value={form.venueName}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="venueGoogleMapsUrl" className="block text-sm font-medium text-foreground">
              {t("partnership.venue_location")}
            </label>
            <p className="mt-0.5 text-xs text-foreground opacity-70">
              {t("partnership.venue_location_hint")}
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="venueGoogleMapsUrl"
                name="venueGoogleMapsUrl"
                type="url"
                required
                value={form.venueGoogleMapsUrl}
                onChange={handleChange}
                placeholder="https://www.google.com/maps/place/..."
                aria-invalid={!!(!form.venueGoogleMapsUrl.trim() && (form.venueName.trim() || form.contactName.trim()))}
                className={`min-w-0 flex-1 rounded-lg border bg-input-bg px-3 py-2 text-sm text-foreground ${!form.venueGoogleMapsUrl.trim() && form.venueName.trim() ? "border-red-500" : "border-border"}`}
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.venueName.trim() || "venue")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted-bg px-3 py-2 text-sm font-medium text-foreground hover:bg-border/50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                {t("partnership.search_google_maps")}
              </a>
            </div>
            {!form.venueGoogleMapsUrl.trim() && (form.venueName.trim() || form.contactName.trim()) && (
              <p className="mt-1 text-sm text-red-600" role="alert">{t("partnership.venue_location_required")}</p>
            )}
          </div>
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-foreground">
              {t("partnership.contact_name")}
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              required
              value={form.contactName}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              {t("partnership.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              aria-invalid={!!emailError}
              className={`mt-1 w-full rounded-lg border bg-input-bg px-3 py-2 text-foreground ${emailError ? "border-red-500" : "border-border"}`}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600" role="alert">{emailError}</p>
            )}
          </div>
          <div>
            <PhoneFieldWithCountry
              id="phone"
              label={t("partnership.phone")}
              countryCode={form.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE}
              nationalNumber={form.phone}
              onCountryCodeChange={(v) => setForm((prev) => ({ ...prev, phoneCountryCode: v }))}
              onNationalNumberChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
              optional
              error={phoneError}
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-foreground">
              {t("partnership.address")}
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-foreground">
              {t("partnership.country")}
            </label>
            <input
              id="country"
              name="country"
              type="text"
              value={form.country}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="businessTaxNumber" className="block text-sm font-medium text-foreground">
              {t("partnership.business_tax_number")}
            </label>
            <p className="mt-0.5 text-xs text-foreground opacity-70">
              {t("partnership.business_tax_number_hint")}
            </p>
            <input
              id="businessTaxNumber"
              name="businessTaxNumber"
              type="text"
              value={form.businessTaxNumber}
              onChange={handleChange}
              placeholder={t("partnership.business_tax_number_placeholder")}
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium text-foreground">
              {t("partnership.wallet_label")}
            </label>
            <p className="mt-0.5 text-xs text-foreground opacity-70">
              {t("partnership.wallet_hint")}
            </p>
            <input
              id="walletAddress"
              name="walletAddress"
              type="text"
              value={form.walletAddress}
              onChange={handleChange}
              placeholder="0x..."
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 font-mono text-sm text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              {t("partnership.venue_logo")}
            </label>
            <p className="mt-0.5 text-xs text-foreground opacity-70">
              {t("partnership.venue_logo_hint")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <input
                ref={fileInputRef}
                id="logo"
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
                className="sr-only"
                aria-label={t("partnership.choose_file")}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="rounded border-0 bg-accent px-4 py-2 text-sm font-medium text-foreground hover:opacity-90 disabled:opacity-50"
              >
                {t("partnership.choose_file")}
              </button>
              <span className="text-sm text-foreground opacity-70">
                {logoFileName || t("partnership.no_file_chosen")}
              </span>
              {form.logoUrl && (
                <div className="relative h-14 w-28 shrink-0 overflow-hidden rounded border border-border bg-white">
                  <Image src={form.logoUrl} alt={t("partnership.venue_logo_alt")} fill className="object-contain" unoptimized />
                </div>
              )}
              {uploadingLogo && <span className="text-sm text-foreground opacity-70">{t("partnership.uploading")}</span>}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted-bg p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">{t("partnership.agreement_terms")}</p>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="agreeLogoOnBike"
                checked={form.agreeLogoOnBike}
                onChange={handleChange}
                className="mt-1 rounded border-border"
              />
              <span className="text-sm text-foreground">
                {t("partnership.agree_logo")}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="agreeVipExperience"
                checked={form.agreeVipExperience}
                onChange={handleChange}
                className="mt-1 rounded border-border"
              />
              <span className="text-sm text-foreground">
                {t("partnership.agree_vip")}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={form.agreeTerms}
                onChange={handleChange}
                className="mt-1 rounded border-border"
              />
              <span className="text-sm text-foreground">
                {t("partnership.agree_terms")}
              </span>
            </label>
            <p className="text-xs text-foreground opacity-90 pt-2 border-t border-border mt-2">
              {t("partnership.membership_includes_30")}
            </p>
          </div>

          <div>
            <label htmlFor="signatureName" className="block text-sm font-medium text-foreground">
              {t("partnership.signature_label")}
            </label>
            <input
              id="signatureName"
              name="signatureName"
              type="text"
              value={form.signatureName}
              onChange={handleChange}
              placeholder={t("partnership.signature_placeholder")}
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-foreground">
              {t("partnership.comments")}
            </label>
            <textarea
              id="comments"
              name="comments"
              rows={3}
              value={form.comments}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="rounded-lg bg-accent px-6 py-2.5 font-medium text-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t("partnership.submitting") : t("partnership.submit_btn")}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="text-foreground underline opacity-80 hover:opacity-100"
            >
              {t("partnership.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
