/**
 * API client for /api/* calls.
 * Use credentials: 'include' for session cookies.
 */

const getBase = () =>
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000";

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getBase();
  return fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image?: string | null;
  profileImageUrl?: string | null;
  authMethod?: string | null;
  role?: string | null;
  walletAddress?: string | null;
}

export interface SessionResponse {
  user: SessionUser | null;
}

export async function getSession(): Promise<SessionResponse> {
  const res = await apiFetch("/api/auth/session", { cache: "no-store" });
  return res.json();
}

export interface NdaResponse {
  accepted: boolean;
}

export async function getNda(): Promise<NdaResponse | null> {
  const res = await apiFetch("/api/nda");
  if (res.status === 401) return null;
  return res.json();
}

export async function acceptNda(): Promise<NdaResponse> {
  const res = await apiFetch("/api/nda", { method: "POST" });
  return res.json();
}

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch("/api/auth/credentials/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json();
  return { ok: res.ok, error: data?.error };
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password,
      name: (name || "").trim(),
    }),
  });
  const data = await res.json();
  return { ok: res.ok, error: data?.error };
}

export async function forgotPassword(
  email: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await res.json();
  return {
    ok: res.ok,
    message: data?.message ?? "Check your email for a link to set a new password.",
  };
}

export function getSignInUrl(callbackUrl?: string): string {
  const base = getBase();
  let url = callbackUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  if (typeof window !== "undefined") {
    const path = window.location.pathname || "/";
    if (path.startsWith("/api/auth")) {
      url = window.location.origin + "/";
    } else if (!url || url.startsWith(base + "/api/auth")) {
      url = window.location.origin + path + (window.location.search || "");
    }
  }
  return `${base}/api/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
}

export interface UserSettingsResponse {
  theme?: "light" | "dark";
  language?: string;
}

export async function getUserSettings(): Promise<UserSettingsResponse | null> {
  const res = await apiFetch("/api/user/settings");
  if (!res.ok) return null;
  return res.json();
}

export async function patchUserSettings(body: {
  theme?: "light" | "dark";
  language?: string;
}): Promise<UserSettingsResponse | null> {
  const res = await apiFetch("/api/user/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function submitContact(body: {
  name?: string;
  email: string;
  message?: string;
  newsletter?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch("/api/contact", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint = data?.hint;
    const error = data?.error ?? "Failed to send";
    return { ok: false, error: hint ? `${error}. ${hint}` : error };
  }
  return { ok: true };
}

export interface ProfileCapabilities {
  canUpload: boolean;
  canDownloadUsers?: boolean;
  canManageUsers?: boolean;
}

export async function getProfileCapabilities(): Promise<ProfileCapabilities> {
  const res = await apiFetch("/api/profile");
  const data = await res.json().catch(() => ({}));
  return {
    canUpload: !!data.canUpload,
    canDownloadUsers: !!data.canDownloadUsers,
    canManageUsers: !!data.canManageUsers,
  };
}

export interface ProfilePayload {
  profileType: string;
  name?: string;
  email?: string;
  companyOrHandle?: string;
  venueName?: string;
  roleAtVenue?: string;
  market?: string;
  eventTypes?: string;
  volume?: string;
  investmentFocus?: string;
  contactPreference?: string;
  howHeard?: string;
  comments?: string;
}

export async function submitProfile(
  body: ProfilePayload
): Promise<{ ok: boolean; saved?: boolean; canUpload?: boolean; error?: string; message?: string }> {
  const res = await apiFetch("/api/profile", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error ?? "Failed to save" };
  }
  return {
    ok: true,
    saved: !!data.saved,
    canUpload: !!data.canUpload,
    message: data?.message,
  };
}

export interface AdminUserMembership {
  tier: string;
  billingPeriod: string;
  startDate?: string;
  expiryDate: string;
}

export interface AdminUser {
  id: string;
  email: string | null;
  name?: string | null;
  lastSeenAt: string | null;
  isAdmin: boolean;
  active: boolean;
  isPartner?: boolean;
  role?: "partner" | "promoter" | "event_organizer" | null;
  partnershipAgreement?: PartnershipAgreement | null;
  partnershipAgreedAt?: string | null;
  membership?: AdminUserMembership | null;
}

export interface PartnershipAgreement {
  venueName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  venueGoogleMapsUrl?: string;
  businessTaxNumber?: string;
  agreeLogoOnBike: boolean;
  agreeVipExperience: boolean;
  agreeTerms: boolean;
  signatureName?: string;
  comments?: string;
  logoUrl?: string;
  walletAddress?: string;
  submittedAt: string;
  /** Set by admin when approving the agreement */
  approved?: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export async function getAdminUsers(): Promise<{ users: AdminUser[] } | { error: string }> {
  const res = await apiFetch("/api/admin/users");
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) return { error: "Forbidden" };
  if (!res.ok) return { error: data?.error ?? "Failed to load users" };
  return { users: Array.isArray(data.users) ? data.users : [] };
}

export async function patchAdminUser(payload: {
  userId: string;
  isAdmin?: boolean;
  active?: boolean;
  isPartner?: boolean;
  role?: "partner" | "promoter" | "event_organizer" | null;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? "Update failed" };
  return { ok: true };
}

/** Admin only: update a user's partnership agreement (amend fields) and/or approve it. */
export async function patchAdminPartnershipAgreement(payload: {
  userId: string;
  approved?: boolean;
  venueName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  venueGoogleMapsUrl?: string;
  businessTaxNumber?: string;
  signatureName?: string;
  comments?: string;
  logoUrl?: string;
  walletAddress?: string;
  agreeLogoOnBike?: boolean;
  agreeVipExperience?: boolean;
  agreeTerms?: boolean;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await apiFetch("/api/admin/partnership-agreement", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) return { ok: false, error: "Forbidden" };
  if (res.status === 404) return { ok: false, error: data?.error ?? "Agreement not found" };
  if (!res.ok) return { ok: false, error: data?.error ?? "Update failed" };
  return { ok: true, message: data?.message };
}

/** Admin only: delete a user's partnership agreement from the blob. */
export async function deleteAdminPartnershipAgreement(payload: {
  userId: string;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await apiFetch("/api/admin/partnership-agreement", {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) return { ok: false, error: "Forbidden" };
  if (res.status === 404) return { ok: false, error: data?.error ?? "Agreement not found" };
  if (!res.ok) return { ok: false, error: data?.error ?? "Delete failed" };
  return { ok: true, message: data?.message };
}

export async function submitPartnershipAgreement(body: {
  venueName: string;
  venueGoogleMapsUrl?: string;
  businessTaxNumber?: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  walletAddress?: string;
  agreeLogoOnBike: boolean;
  agreeVipExperience: boolean;
  agreeTerms: boolean;
  signatureName?: string;
  comments?: string;
  logoUrl?: string;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await apiFetch("/api/partnership-agreement", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? "Failed to submit" };
  return { ok: true, message: data?.message };
}

export async function setUserPassword(email: string, newPassword: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await apiFetch("/api/admin/set-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? "Failed to set password" };
  return { ok: true, message: data?.message };
}

export interface AdminFeedbackRow {
  timestamp: string;
  userId: string;
  email: string;
  fullName: string;
  wouldHire: string;
  comment: string;
}

export async function getAdminFeedback(): Promise<{ feedback: AdminFeedbackRow[] } | { error: string }> {
  const res = await apiFetch("/api/admin/feedback");
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) return { error: "Forbidden" };
  if (!res.ok) return { error: data?.error ?? "Failed to load question data" };
  return { feedback: Array.isArray(data.feedback) ? data.feedback : [] };
}

export async function requestAdminCode(emailOverride?: string): Promise<{ ok: boolean; error?: string }> {
  const body = emailOverride && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOverride) ? { email: emailOverride } : {};
  const res = await apiFetch("/api/admin/request-code", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) return { ok: false, error: "Forbidden" };
  if (!res.ok) return { ok: false, error: data?.error ?? "Failed to send code" };
  return { ok: true };
}

export async function verifyAdminCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const res = await apiFetch("/api/admin/verify-code", {
    method: "POST",
    body: JSON.stringify({ code: code.trim().replace(/\D/g, "") }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? "Invalid or expired code" };
  return { ok: true };
}

export async function getAdminVerifySession(verifyCode?: string): Promise<{ verified: boolean }> {
  const url =
    typeof verifyCode === "string" && verifyCode.trim().replace(/\D/g, "").length === 6
      ? `/api/admin/verify-session?verify-code=${encodeURIComponent(verifyCode.trim().replace(/\D/g, ""))}`
      : "/api/admin/verify-session";
  const res = await apiFetch(url);
  const data = await res.json().catch(() => ({}));
  return { verified: !!data?.verified };
}

export async function getSiteSettings(): Promise<{ marketplaceUrl: string }> {
  const res = await apiFetch("/api/site-settings");
  const data = await res.json().catch(() => ({}));
  return {
    marketplaceUrl: typeof data?.marketplaceUrl === "string" && data.marketplaceUrl
      ? data.marketplaceUrl
      : "https://prestix.vip/marketplace",
  };
}

export async function getPartnershipStatus(): Promise<{
  hasAgreement: boolean;
  isPartner: boolean;
  role: "partner" | "promoter" | "event_organizer" | null;
  agreement?: PartnershipAgreement | null;
}> {
  const res = await apiFetch("/api/partnership-agreement");
  const data = await res.json().catch(() => ({}));
  return {
    hasAgreement: !!data?.hasAgreement,
    isPartner: !!data?.isPartner,
    role:
      data?.role === "partner" || data?.role === "promoter" || data?.role === "event_organizer"
        ? data.role
        : null,
    agreement: data?.agreement ?? null,
  };
}

export type RoleAgreementRole = "event_organizer" | "promoter" | "influencer";

export async function getRoleAgreementStatus(role: RoleAgreementRole): Promise<{
  signed: boolean;
  agreedAt: string | null;
}> {
  const res = await apiFetch(`/api/role-agreement?role=${encodeURIComponent(role)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { signed: false, agreedAt: null };
  return {
    signed: !!data?.signed,
    agreedAt: data?.agreedAt ?? null,
  };
}

export async function submitRoleAgreement(body: {
  role: RoleAgreementRole;
  agreeTerms: boolean;
  signatureName: string;
  extraData?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await apiFetch("/api/role-agreement", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? "Failed to submit agreement" };
  return { ok: true, message: data?.message };
}

export type PartnershipAgreementOptionalPayload = {
  phone?: string;
  address?: string;
  country?: string;
  walletAddress?: string;
  logoUrl?: string;
  venueGoogleMapsUrl?: string;
  businessTaxNumber?: string;
  signatureName?: string;
  comments?: string;
};

export async function updatePartnershipAgreement(
  payload: PartnershipAgreementOptionalPayload
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await apiFetch("/api/partnership-agreement", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? "Failed to update" };
  return { ok: true, message: data?.message };
}

export interface PartnerPublic {
  venueName: string;
  logoUrl?: string;
}

export async function getPartners(): Promise<{ partners: PartnerPublic[] }> {
  const res = await apiFetch("/api/partners");
  const data = await res.json().catch(() => ({}));
  const partners = Array.isArray(data?.partners) ? data.partners : [];
  return { partners };
}

export async function patchSiteSettings(body: {
  marketplaceUrl?: string;
}): Promise<{ marketplaceUrl: string } | { error: string }> {
  const res = await apiFetch("/api/admin/site-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) return { error: "Forbidden" };
  if (!res.ok) return { error: data?.error ?? "Update failed" };
  return { marketplaceUrl: data?.marketplaceUrl ?? "https://prestix.vip/marketplace" };
}

export type MembershipTier = "essential" | "pro" | "event_organizer" | "elite";
export type MembershipBillingPeriod = "monthly" | "yearly";

export interface MembershipStatus {
  tier: MembershipTier | null;
  billingPeriod: MembershipBillingPeriod | null;
  startDate: string | null;
  expiryDate: string | null;
}

export async function getMembershipStatus(): Promise<MembershipStatus> {
  const res = await apiFetch("/api/membership");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { tier: null, billingPeriod: null, startDate: null, expiryDate: null };
  return {
    tier: data?.tier ?? null,
    billingPeriod: data?.billingPeriod ?? null,
    startDate: data?.startDate ?? null,
    expiryDate: data?.expiryDate ?? null,
  };
}

export async function purchaseMembership(body: {
  tier: MembershipTier;
  billingPeriod: MembershipBillingPeriod;
}): Promise<{ ok: boolean; error?: string; message?: string; expiryDate?: string; tier?: string }> {
  const res = await apiFetch("/api/membership", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? "Purchase failed" };
  return {
    ok: true,
    message: data?.message,
    expiryDate: data?.expiryDate,
    tier: data?.tier,
  };
}

/** Creates a Stripe Checkout Session and returns the redirect URL. Use when Stripe is configured. */
export async function createMembershipCheckoutSession(body: {
  tier: MembershipTier;
  billingPeriod: MembershipBillingPeriod;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const res = await apiFetch("/api/stripe/create-checkout-session", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data?.error as string) ?? "Failed to create checkout" };
  }
  if (data?.url) {
    return { ok: true, url: data.url };
  }
  return { ok: false, error: "No checkout URL returned" };
}
