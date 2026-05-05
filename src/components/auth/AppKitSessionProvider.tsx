'use client';

import type { ReactNode } from 'react';

/**
 * Wraps app with session context. Session sync and appkit-siwe-signin handling
 * are done in AuthGate and SessionSync; this component exists for dynamic
 * import from AuthProvider (with BigInt fallback).
 */
export function AppKitSessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
