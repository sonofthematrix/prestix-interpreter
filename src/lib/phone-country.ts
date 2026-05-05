/**
 * Country dial codes and phone validation for agreement forms.
 * National number must not start with 0 (use 4... not 04...); country code is selected from dropdown.
 */

export interface CountryDial {
  dial: string; // e.g. "+44"
  code: string; // ISO 2-letter
  label: string;
}

/** Common country dial codes for dropdown (alphabetical by country name). */
export const COUNTRY_DIAL_CODES: CountryDial[] = [
  { dial: "+971", code: "AE", label: "UAE" },
  { dial: "+61", code: "AU", label: "Australia" },
  { dial: "+43", code: "AT", label: "Austria" },
  { dial: "+32", code: "BE", label: "Belgium" },
  { dial: "+55", code: "BR", label: "Brazil" },
  { dial: "+1", code: "CA", label: "Canada" },
  { dial: "+56", code: "CL", label: "Chile" },
  { dial: "+86", code: "CN", label: "China" },
  { dial: "+57", code: "CO", label: "Colombia" },
  { dial: "+357", code: "CY", label: "Cyprus" },
  { dial: "+420", code: "CZ", label: "Czech Republic" },
  { dial: "+45", code: "DK", label: "Denmark" },
  { dial: "+358", code: "FI", label: "Finland" },
  { dial: "+33", code: "FR", label: "France" },
  { dial: "+49", code: "DE", label: "Germany" },
  { dial: "+30", code: "GR", label: "Greece" },
  { dial: "+852", code: "HK", label: "Hong Kong" },
  { dial: "+36", code: "HU", label: "Hungary" },
  { dial: "+62", code: "ID", label: "Indonesia" },
  { dial: "+353", code: "IE", label: "Ireland" },
  { dial: "+972", code: "IL", label: "Israel" },
  { dial: "+39", code: "IT", label: "Italy" },
  { dial: "+81", code: "JP", label: "Japan" },
  { dial: "+352", code: "LU", label: "Luxembourg" },
  { dial: "+60", code: "MY", label: "Malaysia" },
  { dial: "+52", code: "MX", label: "Mexico" },
  { dial: "+31", code: "NL", label: "Netherlands" },
  { dial: "+64", code: "NZ", label: "New Zealand" },
  { dial: "+47", code: "NO", label: "Norway" },
  { dial: "+48", code: "PL", label: "Poland" },
  { dial: "+351", code: "PT", label: "Portugal" },
  { dial: "+974", code: "QA", label: "Qatar" },
  { dial: "+65", code: "SG", label: "Singapore" },
  { dial: "+27", code: "ZA", label: "South Africa" },
  { dial: "+82", code: "KR", label: "South Korea" },
  { dial: "+34", code: "ES", label: "Spain" },
  { dial: "+46", code: "SE", label: "Sweden" },
  { dial: "+41", code: "CH", label: "Switzerland" },
  { dial: "+886", code: "TW", label: "Taiwan" },
  { dial: "+66", code: "TH", label: "Thailand" },
  { dial: "+90", code: "TR", label: "Turkey" },
  { dial: "+44", code: "GB", label: "United Kingdom" },
  { dial: "+1", code: "US", label: "United States" },
].sort((a, b) => a.label.localeCompare(b.label));

/** Default country code: Indonesia. */
const DEFAULT_DIAL = "+62";

/** Digits only from national number input. */
function digitsOnly(s: string): string {
  return String(s).replace(/\D/g, "");
}

/**
 * National number must not start with 0 (mobile syntax 4... not 04...).
 * Must have at least 7 digits after stripping non-digits.
 */
export function validatePhoneNational(nationalNumber: string): boolean {
  const digits = digitsOnly(nationalNumber);
  if (digits.length < 7) return false;
  if (digits.startsWith("0")) return false;
  return true;
}

/**
 * Returns error message key or null if valid.
 * Empty is allowed (optional phone). Use when phone is required separately.
 */
export function getPhoneNationalError(
  nationalNumber: string,
  optional: boolean
): string | null {
  const trimmed = String(nationalNumber).trim();
  if (!trimmed) return optional ? null : "phone_required";
  const digits = digitsOnly(trimmed);
  if (digits.startsWith("0")) return "phone_no_leading_zero";
  if (digits.length < 7) return "phone_min_digits";
  return null;
}

/** Format for API: dial (e.g. +44) + digits only (no leading 0). */
export function formatPhoneForSubmit(countryDial: string, nationalNumber: string): string {
  const dial = countryDial.trim().replace(/^\+?/, "+").replace(/\+\s*/g, "+");
  const digits = digitsOnly(nationalNumber).replace(/^0+/, "") || "";
  if (!digits) return "";
  return dial === "+" ? digits : `${dial}${digits}`;
}

/**
 * Parse stored international number back into country dial + national.
 * Used when editing a form that already has a phone value.
 */
export function parsePhoneInternational(phone: string | null | undefined): {
  countryCode: string;
  nationalNumber: string;
} {
  const s = String(phone ?? "").trim();
  if (!s) return { countryCode: DEFAULT_DIAL, nationalNumber: "" };
  const digits = digitsOnly(s);
  if (!digits.length) return { countryCode: DEFAULT_DIAL, nationalNumber: "" };
  // Match longest dial code first (e.g. +44 before +4)
  const sorted = [...COUNTRY_DIAL_CODES].sort(
    (a, b) => b.dial.replace(/\D/g, "").length - a.dial.replace(/\D/g, "").length
  );
  for (const { dial } of sorted) {
    const dialDigits = dial.replace(/\D/g, "");
    if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
      const national = digits.slice(dialDigits.length).replace(/^0+/, "");
      return { countryCode: dial, nationalNumber: national };
    }
  }
  return { countryCode: DEFAULT_DIAL, nationalNumber: digits.replace(/^0+/, "") };
}

export { DEFAULT_DIAL as DEFAULT_PHONE_COUNTRY_CODE };
