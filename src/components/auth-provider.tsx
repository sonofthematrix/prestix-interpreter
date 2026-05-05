"use client";

/**
 * Auth Provider
 *
 * Pure Reown AppKit authentication - NextAuth removed
 * Session management based on wallet connection only
 *
 * ⚠️ CRITICAL: AppKitSessionProvider loads with error fallback.
 * Turbopack can cause "Cannot convert a BigInt value to a number" in @walletconnect/utils.
 * On failure, we render children without session sync so the app loads. Run `bun run dev` (webpack) for full wallet support.
 */

import { ReactNode, useEffect, useState } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [SessionProvider, setSessionProvider] = useState<
    React.ComponentType<{ children: ReactNode }> | null
  >(null);

  useEffect(() => {
    import("./auth/AppKitSessionProvider")
      .then((mod) => setSessionProvider(() => mod.AppKitSessionProvider))
      .catch((err) => {
        const isBigIntError =
          err?.message?.includes("BigInt") || err?.message?.includes("Math.pow");
        console.warn(
          isBigIntError
            ? "⚠️ [AuthProvider] AppKit failed to load (Turbopack BigInt error). App loads without wallet session sync. Run `bun run dev` or `bun run dev:webpack` for full wallet support."
            : "⚠️ [AuthProvider] AppKit failed to load. App loads without wallet session sync.",
          err
        );
        setSessionProvider(() => Passthrough);
      });
  }, []);

  // Render children immediately; SessionProvider mounts when ready (or Passthrough on error)
  const Provider = SessionProvider ?? Passthrough;
  return <Provider>{children}</Provider>;
}
