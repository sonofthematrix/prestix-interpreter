/**
 * PATCH /api/admin/partnership-agreement — admin only. Update/approve a user's agreement.
 * DELETE /api/admin/partnership-agreement — admin only. Remove agreement (body: { userId }).
 * Uses ZenStack PartnershipAgreement; replaces users-store and handlers/admin/partnership-agreement.js.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_FROM = "PRESTIX.VIP Partnership <onboarding@resend.dev>";

function sanitize(str: unknown, maxLen: number = 2000): string {
  if (str == null) return "";
  return String(str).slice(0, maxLen).replace(/[<>]/g, "");
}

function sanitizeGoogleMapsUrl(str: unknown): string {
  if (str == null || typeof str !== "string") return "";
  const s = str.trim().slice(0, 2000);
  if (!s) return "";
  try {
    const u = new URL(s);
    const allowed = [
      "https://www.google.com/maps",
      "https://google.com/maps",
      "https://maps.google.com",
      "https://goo.gl/maps",
    ];
    const origin = u.origin.toLowerCase();
    const pathStart = (u.pathname || "").toLowerCase();
    const ok = allowed.some((base) => {
      const b = new URL(base);
      return origin === b.origin && (pathStart === b.pathname || pathStart.startsWith(b.pathname + "/"));
    });
    return ok ? s : "";
  } catch {
    return "";
  }
}

async function sendApprovalNotificationToPartner(
  agreement: { venueName?: string | null; email?: string | null },
  toEmail: string
) {
  const email = (toEmail || agreement?.email || "").toString().trim();
  if (!email || !email.includes("@")) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const fromAddress =
      process.env.CONTACT_FROM_EMAIL && process.env.CONTACT_FROM_NAME
        ? `${process.env.CONTACT_FROM_NAME} <${process.env.CONTACT_FROM_EMAIL}>`
        : DEFAULT_FROM;
    const venueName = (agreement?.venueName || "Your venue").slice(0, 200);
    await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: "[PRESTIX.VIP] Your partnership agreement has been approved",
      html: `
        <p>Hello,</p>
        <p>Your partnership agreement for <strong>${venueName}</strong> has been approved by PRESTIX.VIP.</p>
        <p>You are now a partner on the platform.</p>
        <p>— The PRESTIX.VIP team</p>
      `,
    });
  } catch (err) {
    console.error("[api/admin/partnership-agreement] Partner approval email failed:", err);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string; approved?: boolean; venueName?: string; contactName?: string; email?: string; phone?: string; address?: string; country?: string; venueGoogleMapsUrl?: string; businessTaxNumber?: string; signatureName?: string; comments?: string; logoUrl?: string; walletAddress?: string; agreeLogoOnBike?: boolean; agreeVipExperience?: boolean; agreeTerms?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const userId = body.userId != null ? String(body.userId).trim() : "";
  if (!userId || userId.startsWith("profile-")) {
    return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
  }

  try {
    const db = createClient(user);
    const existing = await (db as any).partnershipAgreement.findUnique({
      where: { userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "No partnership agreement found for this user" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.approved === true) {
      data.approved = true;
      data.approvedAt = new Date();
      data.approvedBy = (user.email || user.name || "Admin").toString().trim();
    } else if (body.approved === false) {
      data.approved = false;
      data.approvedAt = null;
      data.approvedBy = null;
    }
    if (body.venueName !== undefined) data.venueName = sanitize(body.venueName, 200) || null;
    if (body.contactName !== undefined) data.contactName = sanitize(body.contactName, 200) || null;
    if (body.email !== undefined) data.email = sanitize(body.email, 320) || null;
    if (body.phone !== undefined) data.phone = sanitize(body.phone, 50) || null;
    if (body.address !== undefined) data.venueAddress = sanitize(body.address, 500) || null;
    if (body.country !== undefined) data.country = sanitize(body.country, 100) || null;
    if (body.venueGoogleMapsUrl !== undefined) data.googleMapsUrl = sanitizeGoogleMapsUrl(body.venueGoogleMapsUrl) || null;
    if (body.businessTaxNumber !== undefined) data.businessTaxNumber = sanitize(body.businessTaxNumber, 100) || null;
    if (body.signatureName !== undefined) data.signatureName = sanitize(body.signatureName, 200) || null;
    if (body.comments !== undefined) data.comments = sanitize(body.comments, 2000) || null;
    if (body.logoUrl !== undefined) data.logoUrl = sanitize(body.logoUrl, 500) || null;
    if (body.walletAddress !== undefined) data.walletAddress = sanitize(body.walletAddress, 100) || null;
    if (body.agreeLogoOnBike !== undefined) data.agreeLogoOnBike = body.agreeLogoOnBike === true;
    if (body.agreeVipExperience !== undefined) data.agreeVipExperience = body.agreeVipExperience === true;
    if (body.agreeTerms !== undefined) data.agreeTerms = body.agreeTerms === true;

    await (db as any).partnershipAgreement.update({
      where: { userId },
      data,
    });

    if (body.approved === true) {
      const merged = { ...existing, ...data };
      const partnerEmail = (merged.email && String(merged.email).trim()) || "";
      if (partnerEmail) {
        await sendApprovalNotificationToPartner(merged, partnerEmail);
      }
    }

    return NextResponse.json({ ok: true, message: "Agreement updated." });
  } catch (err) {
    console.error("[api/admin/partnership-agreement] PATCH:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const userId = body.userId != null ? String(body.userId).trim() : "";
  if (!userId || userId.startsWith("profile-")) {
    return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
  }

  try {
    const db = createClient(user);
    const existing = await (db as any).partnershipAgreement.findUnique({
      where: { userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "No partnership agreement found for this user" },
        { status: 404 }
      );
    }
    await (db as any).partnershipAgreement.delete({
      where: { userId },
    });
    return NextResponse.json({ ok: true, message: "Agreement deleted." });
  } catch (err) {
    console.error("[api/admin/partnership-agreement] DELETE:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
