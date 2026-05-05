/**
 * NextAuth session cookie name utility
 *
 * getToken() from next-auth/jwt uses different cookie names:
 * - Development (HTTP): next-auth.session-token
 * - Production (HTTPS/Vercel): __Secure-next-auth.session-token
 *
 * When we set the cookie, we MUST use the same name getToken expects,
 * or /api/auth/me will return null.
 */

/**
 * Returns the cookie name that getToken() will look for.
 * Must match NextAuth's logic: secureCookie ? __Secure-... : next-auth...
 */
export function getSessionCookieName(): string {
  const isSecure =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXTAUTH_URL?.startsWith('https://') === true ||
    !!process.env.VERCEL;
  return isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
}

/**
 * Returns whether the cookie should use secure: true.
 */
export function isSecureCookie(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXTAUTH_URL?.startsWith('https://') === true ||
    !!process.env.VERCEL
  );
}
