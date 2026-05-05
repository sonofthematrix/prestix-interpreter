/**
 * Admin verification cookie: set after 6-digit code is verified; allows access to admin pages
 * without re-entering code for 1 hour. Must match legacy handler behavior for verify-session.
 */

export const ADMIN_VERIFIED_COOKIE = "prestix.admin_verified";
export const VERIFIED_MAX_AGE_SECONDS = 60 * 60; // 1 hour

/** For signout and other callers that need the cookie name (e.g. to clear it). */
export function getAdminVerifiedCookieName(): string {
  return ADMIN_VERIFIED_COOKIE;
}
