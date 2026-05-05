"use client";

import {
  COUNTRY_DIAL_CODES,
  DEFAULT_PHONE_COUNTRY_CODE,
  getPhoneNationalError,
  type CountryDial,
} from "@/lib/phone-country";
import { useTranslation } from "@/hooks/useTranslation";

export interface PhoneFieldWithCountryProps {
  id: string;
  label: string;
  countryCode: string;
  nationalNumber: string;
  onCountryCodeChange: (dial: string) => void;
  onNationalNumberChange: (value: string) => void;
  optional?: boolean;
  error?: string | null;
  className?: string;
  inputClassName?: string;
}

export function PhoneFieldWithCountry({
  id,
  label,
  countryCode,
  nationalNumber,
  onCountryCodeChange,
  onNationalNumberChange,
  optional = true,
  error: controlledError,
  className = "",
  inputClassName = "",
}: PhoneFieldWithCountryProps) {
  const { t } = useTranslation();
  const internalError = getPhoneNationalError(nationalNumber, optional);
  const errorMessage = controlledError ?? (internalError ? t(`role_agreement.${internalError}`) : null);
  const dial = countryCode && COUNTRY_DIAL_CODES.some((c) => c.dial === countryCode)
    ? countryCode
    : DEFAULT_PHONE_COUNTRY_CODE;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
        {label}
        {!optional && <span className="text-red-500"> *</span>}
      </label>
      <div className="flex flex-wrap gap-2 items-stretch">
        <select
          aria-label="Country code"
          value={dial}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className="rounded-lg border border-border bg-input-bg px-3 py-2 text-foreground min-w-[100px]"
        >
          {COUNTRY_DIAL_CODES.map((c: CountryDial) => (
            <option key={c.code} value={c.dial}>
              {c.dial} {c.label}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={t("role_agreement.phone_placeholder")}
          value={nationalNumber}
          onChange={(e) => onNationalNumberChange(e.target.value)}
          aria-invalid={!!errorMessage}
          className={`flex-1 min-w-[140px] rounded-lg border bg-input-bg px-3 py-2 text-foreground ${errorMessage ? "border-red-500" : "border-border"} ${inputClassName}`}
        />
      </div>
      {errorMessage && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
