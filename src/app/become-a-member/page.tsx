"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setSignInOpen } from "@/store/slices/uiSlice";
import { fetchMembershipStatus } from "@/store/slices/dataSlice";
import { purchaseMembership, createMembershipCheckoutSession, getRoleAgreementStatus } from "@/lib/api";
import type { MembershipTier } from "@/lib/api";

// Force dynamic rendering - this page uses client-side hooks that require browser APIs
export const dynamic = 'force-dynamic';

/** Valid promo codes: code -> extra percentage off (e.g. 10 = 10% off). Can be moved to API later. */
const PROMO_CODES: Record<string, number> = {
  SAVE10: 10,
  VIP20: 20,
  PRESTIX15: 15,
};

const TIERS = [
  {
    id: "essential",
    nameKey: "membership.tier_essential_name",
    descKey: "membership.tier_essential_desc",
    priceMonthly: 25,
    priceYearly: 225,
    priceMonthlyKey: "membership.tier_essential_price_monthly",
    priceYearlyKey: "membership.tier_essential_price_yearly",
    featuresKey: "membership.tier_essential_features",
    ctaKey: "membership.cta_choose",
    highlight: false,
  },
  {
    id: "pro",
    nameKey: "membership.tier_pro_name",
    descKey: "membership.tier_pro_desc",
    priceMonthly: 69,
    priceYearly: 621,
    priceMonthlyKey: "membership.tier_pro_price_monthly",
    priceYearlyKey: "membership.tier_pro_price_yearly",
    featuresKey: "membership.tier_pro_features",
    ctaKey: "membership.cta_choose",
    highlight: false,
  },
  {
    id: "event_organizer",
    nameKey: "membership.tier_event_organizer_name",
    descKey: "membership.tier_event_organizer_desc",
    priceMonthly: 199,
    priceYearly: 1791,
    priceMonthlyKey: "membership.tier_event_organizer_price_monthly",
    priceYearlyKey: "membership.tier_event_organizer_price_yearly",
    featuresKey: "membership.tier_event_organizer_features",
    ctaKey: "membership.cta_choose",
    highlight: false,
  },
  {
    id: "elite",
    nameKey: "membership.tier_elite_name",
    descKey: "membership.tier_elite_desc",
    priceMonthly: 500,
    priceYearly: 4500,
    priceMonthlyKey: "membership.tier_elite_price_monthly",
    priceYearlyKey: "membership.tier_elite_price_yearly",
    featuresKey: "membership.tier_elite_features",
    ctaKey: "membership.cta_choose",
    highlight: false,
  },
] as const;

type TierId = (typeof TIERS)[number]["id"];

function formatPrice(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const main = rounded % 1 === 0 ? rounded.toLocaleString() : rounded.toFixed(2);
  return `$${main} USD`;
}

function parseFeatureList(features: string): string[] {
  return features
    .split("\n")
    .map((s) => s.replace(/^[\s•\-]+/, "").trim())
    .filter(Boolean);
}

export default function BecomeAMemberPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const membershipStatus = useAppSelector((s) => s.data.membershipStatus);
  const partnershipStatus = useAppSelector((s) => s.data.partnershipStatus);
  const hasExistingMembership =
    !!membershipStatus?.tier &&
    !!membershipStatus?.expiryDate &&
    new Date(membershipStatus.expiryDate) > new Date();
  const isPartnerApproved = partnershipStatus?.agreement?.approved === true;
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [displayBilling, setDisplayBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedTier, setSelectedTier] = useState<TierId | null>("essential");
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "yearly">("monthly");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [paymentCanceled, setPaymentCanceled] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTier = searchParams.get("tier") as TierId | null;
  const validUrlTier: TierId | null =
    urlTier && TIERS.some((x) => x.id === urlTier) ? urlTier : null;

  const [agreementCheckDone, setAgreementCheckDone] = useState(false);

  useEffect(() => {
    if (validUrlTier && validUrlTier !== selectedTier) {
      setSelectedTier(validUrlTier);
    }
  }, [validUrlTier]);

  useEffect(() => {
    if (!user || agreementCheckDone) return;
    if (validUrlTier !== "event_organizer" && validUrlTier !== "pro") {
      setAgreementCheckDone(true);
      return;
    }
    let cancelled = false;
    if (validUrlTier === "event_organizer") {
      getRoleAgreementStatus("event_organizer").then((res) => {
        if (!cancelled && !res.signed) {
          router.push("/agreement/event-organizer");
          return;
        }
        if (!cancelled) setAgreementCheckDone(true);
      });
      return () => {
        cancelled = true;
      };
    }
    if (validUrlTier === "pro") {
      Promise.all([
        getRoleAgreementStatus("promoter"),
        getRoleAgreementStatus("influencer"),
      ]).then(([promoter, influencer]) => {
        if (!cancelled && !promoter.signed && !influencer.signed) {
          router.push("/agreement/promoter");
          return;
        }
        if (!cancelled && promoter.signed && !influencer.signed) {
          router.push("/agreement/influencer");
          return;
        }
        if (!cancelled) setAgreementCheckDone(true);
      });
      return () => {
        cancelled = true;
      };
    }
    setAgreementCheckDone(true);
    return () => {
      cancelled = true;
    };
  }, [user, validUrlTier, agreementCheckDone, router]);

  useEffect(() => {
    if (hasExistingMembership) setDisplayBilling("yearly");
  }, [hasExistingMembership]);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setPurchaseSuccess(true);
      setShowCheckout(false);
      dispatch(fetchMembershipStatus());
    }
    if (searchParams.get("canceled") === "1") {
      setPaymentCanceled(true);
    }
  }, [searchParams, dispatch]);

  const effectiveDisplayBilling = hasExistingMembership ? "yearly" : displayBilling;

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    setPromoError("");
    if (!code) return;
    const percent = PROMO_CODES[code];
    if (percent == null) {
      setPromoError(t("membership.promo_invalid"));
      return;
    }
    setAppliedPromo({ code, percent });
    setPromoInput("");
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoError("");
  };

  const promoOffText = appliedPromo
    ? t("membership.promo_off")
        .replace("{{percent}}", String(appliedPromo.percent))
        .replace("{{code}}", appliedPromo.code)
    : "";

  const selectedTierConfig = selectedTier ? TIERS.find((x) => x.id === selectedTier) : null;
  const discount = appliedPromo ? appliedPromo.percent / 100 : 0;
  const finalPrice =
    selectedTierConfig &&
    (selectedBilling === "yearly"
      ? selectedTierConfig.priceYearly * (1 - discount)
      : selectedTierConfig.priceMonthly * (1 - discount));

  const handleChooseTier = (tierId: TierId) => {
    if (!user) {
      dispatch(setSignInOpen(true));
      return;
    }
    if (tierId === "elite" && !isPartnerApproved) return;
    setSelectedBilling(hasExistingMembership ? "yearly" : displayBilling);
    setSelectedTier(tierId);
    setShowCheckout(true);
    setPurchaseError("");
    setPurchaseSuccess(false);
    setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleCompletePurchase = async () => {
    if (!selectedTier || !user) return;
    setPurchasing(true);
    setPurchaseError("");
    setPaymentCanceled(false);
    try {
      const checkout = await createMembershipCheckoutSession({
        tier: selectedTier as MembershipTier,
        billingPeriod: selectedBilling,
      });
      if (checkout.ok && checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      if (!checkout.ok && checkout.error?.toLowerCase().includes("not configured")) {
        const result = await purchaseMembership({
          tier: selectedTier as MembershipTier,
          billingPeriod: selectedBilling,
        });
        if (result.ok) {
          setPurchaseSuccess(true);
          setSelectedTier("essential");
          setShowCheckout(false);
          dispatch(fetchMembershipStatus());
        } else {
          setPurchaseError(result.error ?? "Purchase failed");
        }
      } else {
        setPurchaseError(!checkout.ok ? (checkout.error ?? "Something went wrong. Please try again.") : "Something went wrong.");
      }
    } catch {
      setPurchaseError("Something went wrong. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-12 text-center md:mb-16">
        <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
          {t("membership.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-foreground opacity-80">
          {t("membership.subtitle")}
        </p>
      </header>

      <div className="mb-10 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-muted-bg px-4 py-4">
        <span className="text-sm font-medium text-foreground">{t("membership.promo_label")}</span>
        <input
          type="text"
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyPromo()}
          placeholder={t("membership.promo_placeholder")}
          className="max-w-[140px] rounded-lg border border-border bg-input-bg px-3 py-2 text-sm font-medium uppercase tracking-wider text-foreground placeholder:opacity-60"
          aria-label={t("membership.promo_placeholder")}
        />
        <button
          type="button"
          onClick={applyPromo}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t("membership.promo_apply")}
        </button>
        {appliedPromo && (
          <span className="flex items-center gap-2 text-sm">
            <span className="font-medium text-accent">{promoOffText}</span>
            <button
              type="button"
              onClick={removePromo}
              className="text-foreground opacity-70 underline hover:opacity-100"
            >
              {t("membership.promo_remove")}
            </button>
          </span>
        )}
      </div>
      {promoError && (
        <p className="mb-6 text-center text-sm text-red-500" role="alert">
          {promoError}
        </p>
      )}

      {hasExistingMembership && (
        <p className="mb-6 text-center text-sm text-foreground opacity-90">
          {t("membership.existing_member_note")}
        </p>
      )}

      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        <span className="text-sm font-medium text-foreground">{t("membership.billing_period")}</span>
        <div className="inline-flex rounded-lg border border-border bg-muted-bg p-1">
          <button
            type="button"
            onClick={() => setDisplayBilling("monthly")}
            disabled={hasExistingMembership}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              displayBilling === "monthly"
                ? "bg-accent text-white"
                : "text-foreground opacity-80 hover:opacity-100"
            } ${hasExistingMembership ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {t("membership.billing_monthly")}
          </button>
          <button
            type="button"
            onClick={() => setDisplayBilling("yearly")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              displayBilling === "yearly"
                ? "bg-accent text-white"
                : "text-foreground opacity-80 hover:opacity-100"
            }`}
          >
            {t("membership.billing_yearly")}
          </button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-4 md:gap-6">
        {TIERS.map((tier) => {
          const featuresRaw = t(tier.featuresKey);
          const features = parseFeatureList(featuresRaw);
          const discount = appliedPromo ? appliedPromo.percent / 100 : 0;
          const monthlyDisplay = discount > 0 ? tier.priceMonthly * (1 - discount) : tier.priceMonthly;
          const yearlyDisplay = discount > 0 ? tier.priceYearly * (1 - discount) : tier.priceYearly;
          const displayPrice = effectiveDisplayBilling === "yearly" ? yearlyDisplay : monthlyDisplay;
          const isEliteDisabled = tier.id === "elite" && !isPartnerApproved;
          return (
            <article
              key={tier.id}
              role="button"
              tabIndex={isEliteDisabled ? -1 : 0}
              onClick={() => !isEliteDisabled && handleChooseTier(tier.id)}
              onKeyDown={(e) => {
                if (isEliteDisabled) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleChooseTier(tier.id);
                }
              }}
              className={`relative flex flex-col rounded-2xl border bg-muted-bg p-6 md:p-8 transition ${
                isEliteDisabled
                  ? "cursor-not-allowed border-border opacity-60"
                  : "cursor-pointer hover:opacity-95"
              } ${
                selectedTier === tier.id
                  ? "border-accent ring-2 ring-accent/30 shadow-lg"
                  : "border-border"
              }`}
            >
              <h2 className="font-serif text-xl font-bold text-foreground md:text-2xl">
                {t(tier.nameKey)}
              </h2>
              <p className="mt-2 text-sm text-foreground opacity-80">
                {t(tier.descKey)}
              </p>
              <div className="mt-6 flex flex-wrap items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                  {formatPrice(displayPrice)}
                </span>
                {discount > 0 && (
                  <span className="text-sm text-foreground opacity-60 line-through">
                    {effectiveDisplayBilling === "monthly" ? t(tier.priceMonthlyKey) : t(tier.priceYearlyKey)}
                  </span>
                )}
                <span className="text-sm text-foreground opacity-70">
                  / {effectiveDisplayBilling === "yearly" ? t("membership.per_year") : t("membership.per_month")}
                </span>
              </div>
              {effectiveDisplayBilling === "yearly" && (
                <p className="mt-1 text-xs font-medium text-accent">
                  {t("membership.save_annual")}
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-3">
                {features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-foreground opacity-90"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span dangerouslySetInnerHTML={{ __html: feature }} />
                  </li>
                ))}
              </ul>
              {isEliteDisabled && (
                <p className="mt-4 text-xs text-foreground opacity-80">
                  {t("membership.partner_requires_approval")}
                </p>
              )}
              <p className="mt-8">
                <span className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-medium text-foreground">
                  {t(tier.ctaKey)} {t(tier.nameKey)}
                </span>
              </p>
            </article>
          );
        })}
      </div>

      {/* On-page checkout: stay on page, show form when a tier is selected */}
      {purchaseSuccess && (
        <div className="mt-12 rounded-2xl border border-green-500/50 bg-green-500/10 p-6 text-center">
          <h3 className="font-serif text-xl font-bold text-foreground">{t("membership.success_title")}</h3>
          <p className="mt-2 text-foreground opacity-90">{t("membership.success_message")}</p>
        </div>
      )}

      {paymentCanceled && (
        <div className="mt-12 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-6 text-center">
          <p className="text-foreground opacity-90">{t("membership.payment_canceled")}</p>
        </div>
      )}

      {showCheckout && selectedTier && selectedTierConfig && !purchaseSuccess && (
        <div ref={checkoutRef} className="mt-12 rounded-2xl border border-border bg-muted-bg p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold text-foreground">
            {t("membership.checkout_title")}
          </h2>
          <p className="mt-2 text-foreground opacity-80">
            {t(selectedTierConfig.nameKey)} — {formatPrice(finalPrice ?? 0)}{" "}
            / {selectedBilling === "yearly" ? t("membership.per_year") : t("membership.per_month")}
          </p>
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-foreground">{t("membership.billing_period")}</p>
            <div className="flex gap-6">
              {!hasExistingMembership && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="billing"
                    checked={selectedBilling === "monthly"}
                    onChange={() => setSelectedBilling("monthly")}
                    className="border-border bg-input-bg text-accent"
                  />
                  <span className="text-foreground">{t("membership.billing_monthly")}</span>
                </label>
              )}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="billing"
                  checked={selectedBilling === "yearly"}
                  onChange={() => setSelectedBilling("yearly")}
                  className="border-border bg-input-bg text-accent"
                />
                <span className="text-foreground">{t("membership.billing_yearly")}</span>
              </label>
            </div>
          </div>
          {purchaseError && (
            <p className="mt-4 text-sm text-red-500" role="alert">
              {purchaseError}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCompletePurchase}
              disabled={purchasing}
              className="rounded-lg bg-accent px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {purchasing ? "…" : t("membership.complete_purchase")}
            </button>
            <button
              type="button"
              onClick={() => { setShowCheckout(false); setSelectedTier("essential"); setPurchaseError(""); }}
              className="rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground hover:bg-muted-bg"
            >
              {t("membership.cancel")}
            </button>
          </div>
        </div>
      )}

      {!user && (
        <p className="mt-8 text-center text-sm text-foreground opacity-80">
          {t("membership.sign_in_required")}
        </p>
      )}

      <p className="mt-12 text-center text-sm text-foreground opacity-70">
        {t("membership.footer")}{" "}
        <Link href="/#contact" className="font-semibold text-accent underline underline-offset-2 hover:opacity-90">
          {t("membership.contact_link")}
        </Link>
      </p>
    </div>
  );
}
