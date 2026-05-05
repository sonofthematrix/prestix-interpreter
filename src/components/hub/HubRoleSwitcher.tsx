"use client";

import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

export const HUB_ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "PROMOTER", label: "Promoter" },
  { value: "VENUE_STAFF", label: "Venue Staff" },
  { value: "VENUE_ADMIN", label: "Venue Admin" },
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
] as const;

export type HubRoleValue = (typeof HUB_ROLES)[number]["value"];

/**
 * Admin-only role switcher to preview hub content as another role. Shown only when user has canManageUsers.
 */
export function HubRoleSwitcher({
  viewAsRole,
  onViewAsRoleChange,
  className,
}: {
  viewAsRole: HubRoleValue | null;
  onViewAsRoleChange: (role: HubRoleValue | null) => void;
  className?: string;
}) {
  const profileCapabilities = useAppSelector((s) => s.data.profileCapabilities);
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = profileCapabilities?.canManageUsers === true || (user as { role?: string })?.role === "PLATFORM_ADMIN";

  if (!isAdmin) return null;

  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-3", className)}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Test: view hub as role
      </p>
      <select
        value={viewAsRole ?? ""}
        onChange={(e) => onViewAsRoleChange((e.target.value || null) as HubRoleValue | null)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        aria-label="View hub as role"
      >
        <option value="">My role ({((user as { role?: string })?.role) ?? "—"})</option>
        {HUB_ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}
