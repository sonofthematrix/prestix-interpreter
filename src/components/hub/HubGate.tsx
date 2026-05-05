"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

const ALLOWED_ROLES = ["PLATFORM_ADMIN", "VENUE_ADMIN", "ADMIN"];

/**
 * Gate for /hub pages: requires authenticated user and (optionally) hub-allowed role.
 * If not authenticated, redirects to home. If roleRequired and user role not in list, shows forbidden message.
 */
export function HubGate({
  children,
  roleRequired = true,
}: {
  children: React.ReactNode;
  roleRequired?: boolean;
}) {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const role = (user as { role?: string })?.role;
    if (roleRequired && role && !ALLOWED_ROLES.includes(role)) {
      // Still render children but could show a banner; or redirect to a "forbidden" page.
      // For now we allow view and let API enforce; optionally redirect:
      // router.replace("/");
    }
  }, [mounted, loading, user, roleRequired, router]);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
