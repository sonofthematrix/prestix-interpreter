"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { HubRoleSwitcher, type HubRoleValue } from "@/components/hub/HubRoleSwitcher";
import { HubPromoterWidgets } from "@/components/hub/HubPromoterWidgets";
import { HubVenueWidgets } from "@/components/hub/HubVenueWidgets";
import { HubAdminWidgets } from "@/components/hub/HubAdminWidgets";
import { HubMemberWidgets } from "@/components/hub/HubMemberWidgets";

function getEffectiveRole(userRole: string | null | undefined, viewAsRole: HubRoleValue | null): string | null {
  if (viewAsRole) return viewAsRole;
  return userRole ?? null;
}

export default function HubDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [viewAsRole, setViewAsRole] = useState<HubRoleValue | null>(null);

  const effectiveRole = getEffectiveRole((user as { role?: string })?.role ?? null, viewAsRole);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Hub</h1>
          <p className="mt-2 text-muted-foreground">
            {effectiveRole
              ? `Welcome${user?.name ? `, ${user.name}` : ""}. Viewing as ${effectiveRole.replace(/_/g, " ").toLowerCase()}.`
              : "Your dashboard and quick links."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/hub/bookings"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Bookings
          </Link>
          <HubRoleSwitcher
            viewAsRole={viewAsRole}
            onViewAsRoleChange={setViewAsRole}
            className="w-full sm:w-56"
          />
        </div>
      </div>

      {effectiveRole === "PROMOTER" && (
        <>
          <section aria-labelledby="promoter-heading">
            <h2 id="promoter-heading" className="mb-4 font-serif text-xl font-semibold text-foreground">
              Promoter dashboard
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Search and evaluate events by commission rate, venue vibe, capacity, and prerequisites. Match events to your followers for the best conversion and velocity.
            </p>
            <HubPromoterWidgets />
          </section>
        </>
      )}

      {(effectiveRole === "VENUE_ADMIN" || effectiveRole === "VENUE_STAFF") && (
        <>
          <section aria-labelledby="venue-heading">
            <h2 id="venue-heading" className="mb-4 font-serif text-xl font-semibold text-foreground">
              Venue dashboard
            </h2>
            <HubVenueWidgets />
          </section>
        </>
      )}

      {(effectiveRole === "PLATFORM_ADMIN" || effectiveRole === "ADMIN") && (
        <>
          <section aria-labelledby="admin-heading">
            <h2 id="admin-heading" className="mb-4 font-serif text-xl font-semibold text-foreground">
              Hub overview
            </h2>
            <HubAdminWidgets />
          </section>
        </>
      )}

      {(!effectiveRole || effectiveRole === "MEMBER" || effectiveRole === "HOST") && (
        <>
          <section aria-labelledby="member-heading">
            <h2 id="member-heading" className="mb-4 font-serif text-xl font-semibold text-foreground">
              Get started
            </h2>
            <HubMemberWidgets />
          </section>
        </>
      )}
    </div>
  );
}
