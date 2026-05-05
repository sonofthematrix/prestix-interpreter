"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setSignInOpen } from "@/store/slices/uiSlice";
import { updatePartnershipAgreement } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fetchPartnershipStatus } from "@/store/slices/dataSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { PhoneFieldWithCountry } from "@/components/PhoneFieldWithCountry";
import {
  formatPhoneForSubmit,
  getPhoneNationalError,
  parsePhoneInternational,
  DEFAULT_PHONE_COUNTRY_CODE,
} from "@/lib/phone-country";

export default function EditPartnershipAgreementPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const partnershipStatus = useAppSelector((s) => s.data.partnershipStatus);
  const partnershipStatusLoading = useAppSelector((s) => s.data.partnershipStatusLoading);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFileName, setLogoFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [form, setForm] = useState({
    phone: "",
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
    address: "",
    country: "",
    venueGoogleMapsUrl: "",
    businessTaxNumber: "",
    walletAddress: "",
    signatureName: "",
    comments: "",
    logoUrl: "",
  });

  useEffect(() => {
    if (user) dispatch(fetchPartnershipStatus());
  }, [user, dispatch]);

  useEffect(() => {
    if (!user || partnershipStatusLoading || !partnershipStatus?.hasAgreement || !partnershipStatus?.agreement) return;
    const a = partnershipStatus.agreement;
    const { countryCode, nationalNumber } = parsePhoneInternational(a.phone);
    setVenueName(a.venueName || "");
    setForm({
      phone: nationalNumber,
      phoneCountryCode: countryCode,
      address: a.address ?? "",
      country: a.country ?? "",
      venueGoogleMapsUrl: a.venueGoogleMapsUrl ?? "",
      businessTaxNumber: a.businessTaxNumber ?? "",
      walletAddress: a.walletAddress ?? "",
      signatureName: a.signatureName ?? "",
      comments: a.comments ?? "",
      logoUrl: a.logoUrl ?? "",
    });
  }, [user, partnershipStatusLoading, partnershipStatus?.hasAgreement, partnershipStatus?.agreement]);

  useEffect(() => {
    if (!user) return;
    if (!partnershipStatusLoading && (!partnershipStatus?.hasAgreement || !partnershipStatus?.agreement)) {
      router.replace("/agreement/partner");
    }
  }, [user, partnershipStatusLoading, partnershipStatus, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (!file.type.startsWith("image/")) {
      toast("Please choose a JPEG, PNG, WebP, or GIF image.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Image must be 2MB or smaller.", "error");
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
        toast(data?.error ?? "Logo upload failed", "error");
        return;
      }
      if (data.url) setForm((prev) => ({ ...prev, logoUrl: data.url }));
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const phoneErrorKey = form.phone.trim() ? getPhoneNationalError(form.phone, true) : null;
  const phoneError = phoneErrorKey ? t(`role_agreement.${phoneErrorKey}`) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !user) return;
    if (!form.venueGoogleMapsUrl.trim()) {
      toast(t("partnership.venue_location_required"), "error");
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
    const result = await updatePartnershipAgreement({
      phone: phoneValue,
      address: form.address.trim() || undefined,
      country: form.country.trim() || undefined,
      venueGoogleMapsUrl: form.venueGoogleMapsUrl.trim() || undefined,
      businessTaxNumber: form.businessTaxNumber.trim() || undefined,
      walletAddress: form.walletAddress.trim() || undefined,
      signatureName: form.signatureName.trim() || undefined,
      comments: form.comments.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      setSuccess(true);
      dispatch(fetchPartnershipStatus());
      toast(result.message ?? "Agreement updated.", "success");
    } else {
      toast(result.error ?? "Failed to update", "error");
    }
  };

  if (user && partnershipStatusLoading) {
    return (
      <div className="px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-2xl">
          <p className="text-foreground opacity-80">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-3xl font-bold text-foreground">Edit partnership agreement</h1>
          <p className="mt-4 text-foreground opacity-90">Please sign in to edit your agreement.</p>
          <button
            type="button"
            onClick={() => dispatch(setSignInOpen(true))}
            className="mt-6 rounded-lg bg-accent px-4 py-2 font-medium text-background hover:opacity-90"
          >
            Sign in
          </button>
          <p className="mt-6">
            <Link href="/" className="text-foreground underline opacity-80 hover:opacity-100">
              Back to home
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
          <h1 className="font-serif text-3xl font-bold text-foreground">Updated</h1>
          <p className="mt-4 text-foreground opacity-90">
            Your partnership agreement optional details have been updated.
          </p>
          <Link
            href="/agreement/partner"
            className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-background hover:opacity-90"
          >
            Back to partnership agreement
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-foreground opacity-70">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href="/become-a-member" className="hover:underline">Agreement</Link>
          <span>/</span>
          <Link href="/agreement/partner" className="hover:underline">{t("partnership.title")}</Link>
          <span>/</span>
          <span>Edit optional details</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Edit partnership agreement</h1>
        <p className="mt-2 text-foreground opacity-80">
          Update optional details for your signed agreement. Required fields (venue name, contact, email, terms) cannot be changed here.
        </p>
        {venueName && (
          <p className="mt-2 text-sm font-medium text-foreground opacity-90">
            Venue: {venueName}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <PhoneFieldWithCountry
              id="phone"
              label="Phone"
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
              Address
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
              Country / region
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
            <label htmlFor="venueGoogleMapsUrl" className="block text-sm font-medium text-foreground">
              {t("partnership.venue_location")}
            </label>
            <p className="mt-0.5 text-xs text-foreground opacity-70">
              Paste a link from Google Maps (Share → Copy link).
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
                className="min-w-0 flex-1 rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground"
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName || "venue")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted-bg px-3 py-2 text-sm font-medium text-foreground hover:bg-border/50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Search on Google Maps
              </a>
            </div>
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
              Payout wallet address
            </label>
            <p className="mt-0.5 text-xs text-foreground opacity-70">
              Wallet address where your venue share (87.5%) will be sent for instant settlement.
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
              Venue logo
            </label>
            <p className="mt-0.5 text-xs text-foreground opacity-70">
              Upload a logo to display in the Partners section. JPEG, PNG, WebP or GIF, max 2MB.
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
                className="rounded border-0 bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {t("partnership.choose_file")}
              </button>
              <span className="text-sm text-foreground opacity-70">
                {logoFileName || t("partnership.no_file_chosen")}
              </span>
              {form.logoUrl && (
                <div className="relative h-14 w-28 shrink-0 overflow-hidden rounded border border-border bg-white">
                  <Image src={form.logoUrl} alt="Venue logo" fill className="object-contain" unoptimized />
                </div>
              )}
              {uploadingLogo && <span className="text-sm text-foreground opacity-70">{t("partnership.uploading")}</span>}
            </div>
          </div>
          <div>
            <label htmlFor="signatureName" className="block text-sm font-medium text-foreground">
              Full name (signature)
            </label>
            <input
              id="signatureName"
              name="signatureName"
              type="text"
              value={form.signatureName}
              onChange={handleChange}
              placeholder="Type your full name"
              className="mt-1 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-foreground">
              Comments
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
              disabled={submitting || !form.venueGoogleMapsUrl.trim()}
              className="rounded-lg bg-accent px-6 py-2.5 font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="text-foreground underline opacity-80 hover:opacity-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
