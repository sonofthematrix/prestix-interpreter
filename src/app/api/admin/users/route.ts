/**
 * GET /api/admin/users — admin only. Returns all users from ZenStack (User + profileSetup,
 * partnershipAgreement, subscriptions). Replaces handlers/admin/users.js and users-store/profiles-store.
 * PATCH /api/admin/users — admin only. Updates User (role, status) or PartnershipAgreement.approved.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PrestixUserRole =
  | "MEMBER"
  | "PROMOTER"
  | "HOST"
  | "VENUE_STAFF"
  | "VENUE_ADMIN"
  | "PLATFORM_ADMIN";
type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";

function roleToLegacy(role: PrestixUserRole | null): "partner" | "promoter" | "event_organizer" | null {
  if (!role) return null;
  if (role === "PROMOTER") return "promoter";
  if (role === "HOST" || role === "VENUE_ADMIN") return "event_organizer";
  return null;
}

function mapUserToAdminUser(u: {
  id: string;
  email: string | null;
  name: string | null;
  updatedAt: Date;
  lastLoginAt: Date | null;
  role: PrestixUserRole;
  status: UserStatus;
  profileSetup?: {
    profileType: string | null;
    companyOrHandle: string | null;
    venueName: string | null;
    roleAtVenue: string | null;
    market: string | null;
    eventTypes: string | null;
    volume: string | null;
    investmentFocus: string | null;
    contactPreference: string | null;
    howHeard: string | null;
    comments: string | null;
    submittedAt: Date;
    createdAt: Date;
  } | null;
  partnershipAgreement?: {
    venueName: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    venueAddress: string | null;
    country: string | null;
    googleMapsUrl: string | null;
    businessTaxNumber: string | null;
    agreeLogoOnBike: boolean;
    agreeVipExperience: boolean;
    agreeTerms: boolean;
    signatureName: string | null;
    comments: string | null;
    logoUrl: string | null;
    walletAddress: string | null;
    approved: boolean;
    approvedAt: Date | null;
    approvedBy: string | null;
    createdAt: Date;
  } | null;
  subscriptions?: Array<{
    tier: string;
    billingPeriod: string | null;
    startDate: Date;
    expiryDate: Date | null;
  }>;
}) {
  const now = new Date();
  const activeSub = (u.subscriptions ?? []).find(
    (s) => s.expiryDate && new Date(s.expiryDate) > now
  );
  const pa = u.partnershipAgreement;
  return {
    id: u.id,
    email: u.email ?? null,
    name: u.name ?? null,
    lastSeenAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : (u.updatedAt ? new Date(u.updatedAt).toISOString() : null),
    isAdmin: u.role === "PLATFORM_ADMIN",
    active: u.status === "ACTIVE",
    isPartner: pa?.approved === true,
    role: roleToLegacy(u.role),
    partnershipAgreement: pa
      ? {
          venueName: pa.venueName ?? "",
          contactName: pa.contactName ?? "",
          email: pa.email ?? "",
          phone: pa.phone ?? undefined,
          address: pa.venueAddress ?? undefined,
          country: pa.country ?? undefined,
          venueGoogleMapsUrl: pa.googleMapsUrl ?? undefined,
          businessTaxNumber: pa.businessTaxNumber ?? undefined,
          agreeLogoOnBike: pa.agreeLogoOnBike,
          agreeVipExperience: pa.agreeVipExperience,
          agreeTerms: pa.agreeTerms,
          signatureName: pa.signatureName ?? undefined,
          comments: pa.comments ?? undefined,
          logoUrl: pa.logoUrl ?? undefined,
          walletAddress: pa.walletAddress ?? undefined,
          submittedAt: pa.createdAt ? new Date(pa.createdAt).toISOString() : "",
          approved: pa.approved,
          approvedAt: pa.approvedAt ? new Date(pa.approvedAt).toISOString() : undefined,
          approvedBy: pa.approvedBy ?? undefined,
        }
      : null,
    partnershipAgreedAt: pa?.createdAt ? new Date(pa.createdAt).toISOString() : null,
    membership: activeSub
      ? {
          tier: activeSub.tier,
          billingPeriod: activeSub.billingPeriod ?? "",
          startDate: new Date(activeSub.startDate).toISOString(),
          expiryDate: activeSub.expiryDate ? new Date(activeSub.expiryDate).toISOString() : "",
        }
      : null,
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = createClient(user);
    const rows = await (db as any).user.findMany({
      include: {
        profileSetup: true,
        partnershipAgreement: true,
        subscriptions: { orderBy: { startDate: "desc" } },
      },
    });
    const users = (rows as any[]).map(mapUserToAdminUser);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[api/admin/users] GET:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    userId?: string;
    isAdmin?: boolean;
    active?: boolean;
    isPartner?: boolean;
    role?: "partner" | "promoter" | "event_organizer" | null;
    name?: string;
  };
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  const userId = body.userId != null ? String(body.userId).trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Profile-only users (legacy id prefix) are not in ZenStack; reject PATCH for them
  if (userId.startsWith("profile-")) {
    return NextResponse.json(
      { error: "Cannot update profile-only user" },
      { status: 400 }
    );
  }

  try {
    const db = createClient(user);

    if (body.active !== undefined) {
      const status = body.active === true ? "ACTIVE" : "INACTIVE";
      await (db as any).user.update({
        where: { id: userId },
        data: { status },
      });
      return NextResponse.json({ success: true });
    }

    if (body.isPartner !== undefined) {
      const agreement = await (db as any).partnershipAgreement.findUnique({
        where: { userId },
      });
      if (!agreement) {
        return NextResponse.json(
          { error: "User has no partnership agreement" },
          { status: 404 }
        );
      }
      await (db as any).partnershipAgreement.update({
        where: { userId },
        data: {
          approved: body.isPartner === true,
          approvedAt: body.isPartner === true ? new Date() : null,
          approvedBy: body.isPartner === true ? (user.email || user.name || "Admin").trim() : null,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (body.role !== undefined) {
      const roleMap: Record<string, PrestixUserRole> = {
        promoter: "PROMOTER",
        event_organizer: "HOST",
      };
      const newRole = body.role ? roleMap[body.role] ?? "MEMBER" : "MEMBER";
      await (db as any).user.update({
        where: { id: userId },
        data: { role: newRole },
      });
      return NextResponse.json({ success: true });
    }

    if (body.name !== undefined) {
      await (db as any).user.update({
        where: { id: userId },
        data: { name: String(body.name).trim() || undefined },
      });
      return NextResponse.json({ success: true });
    }

    // isAdmin
    if (body.isAdmin !== undefined) {
      const newRole: PrestixUserRole = body.isAdmin === true ? "PLATFORM_ADMIN" : "MEMBER";
      await (db as any).user.update({
        where: { id: userId },
        data: { role: newRole },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No valid update field" }, { status: 400 });
  } catch (err: any) {
    if (err?.code === "P2025" || err?.message?.includes("Record to update not found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("[api/admin/users] PATCH:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
