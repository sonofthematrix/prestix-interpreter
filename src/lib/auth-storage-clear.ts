/**
 * Clear all localStorage on sign-out.
 * Call from every sign-out path (SIWE/AppKit, NavDrawer, account page, SessionSync, auth-guard)
 * so that no auth or app state persists after the user signs out.
 */
export function clearLocalStorageOnSignOut(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
}
