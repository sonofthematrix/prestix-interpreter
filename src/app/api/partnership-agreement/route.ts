/**
 * GET /api/partnership-agreement — current user's agreement status. POST — submit agreement. PATCH — update own agreement.
 * Uses ZenStack PartnershipAgreement; replaces users-store agreement data and handlers/partnership-agreement.js.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_FROM = "PRESTIX.VIP Partnership <onboarding@resend.dev>";
const ADMIN_NOTIFY_FALLBACK = "support@prestix.vip";

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
      "https://prestix.vip/maps",
      "https://www.prestix.vip/maps",
      "https://prestix.vip/maps",
      "https://www.prestix.vip/maps",
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

function agreementToResponse(agreement: {
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
}) {
  return {
    venueName: agreement.venueName ?? "",
    contactName: agreement.contactName ?? "",
    email: agreement.email ?? "",
    phone: agreement.phone ?? undefined,
    address: agreement.venueAddress ?? undefined,
    country: agreement.country ?? undefined,
    venueGoogleMapsUrl: agreement.googleMapsUrl ?? undefined,
    businessTaxNumber: agreement.businessTaxNumber ?? undefined,
    agreeLogoOnBike: agreement.agreeLogoOnBike,
    agreeVipExperience: agreement.agreeVipExperience,
    agreeTerms: agreement.agreeTerms,
    signatureName: agreement.signatureName ?? undefined,
    comments: agreement.comments ?? undefined,
    logoUrl: agreement.logoUrl ?? undefined,
    walletAddress: agreement.walletAddress ?? undefined,
    submittedAt: agreement.createdAt ? new Date(agreement.createdAt).toISOString() : new Date().toISOString(),
    approved: agreement.approved,
    approvedAt: agreement.approvedAt ? new Date(agreement.approvedAt).toISOString() : undefined,
    approvedBy: agreement.approvedBy ?? undefined,
  };
}

async function sendPartnershipSubmittedNotification(agreement: { venueName?: string; contactName?: string; email?: string; submittedAt?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const toAddress = (process.env.RESEND_TEST_TO || ADMIN_NOTIFY_FALLBACK).trim();
  if (!toAddress || !apiKey) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const fromAddress =
      process.env.CONTACT_FROM_EMAIL && process.env.CONTACT_FROM_NAME
        ? `${process.env.CONTACT_FROM_NAME} <${process.env.CONTACT_FROM_EMAIL}>`
        : DEFAULT_FROM;
    const venueName = (agreement.venueName || "Unknown venue").slice(0, 200);
    const contactName = (agreement.contactName || "").slice(0, 200);
    const email = (agreement.email || "").slice(0, 320);
    await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      replyTo: email || undefined,
      subject: `[PRESTIX.VIP] New partnership agreement to approve – ${venueName}`,
      html: `
        <p>A new partner has submitted a partnership agreement and is waiting for approval.</p>
        <p><strong>Venue:</strong> ${venueName}</p>
        <p><strong>Contact:</strong> ${contactName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Submitted at:</strong> ${agreement.submittedAt ? new Date(agreement.submittedAt).toLocaleString() : "—"}</p>
        <hr />
        <p>Please review and approve in User management.</p>
      `,
    });
  } catch (err) {
    console.error("[api/partnership-agreement] Admin notification failed:", err);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ hasAgreement: false, isPartner: false, role: null, agreement: null });
  }
  try {
    const db = createClient(user);
    const u = await (db as any).user.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        partnershipAgreement: true,
      },
    });
    const agreement = u?.partnershipAgreement ?? null;
    const hasAgreement = !!agreement;
    const role = u?.role && ["partner", "promoter", "event_organizer"].includes(String(u.role)) ? (u.role as "partner" | "promoter" | "event_organizer") : null;
    return NextResponse.json({
      hasAgreement,
      isPartner: hasAgreement,
      role,
      agreement: agreement ? agreementToResponse(agreement) : null,
    });
  } catch (err) {
    console.error("[api/partnership-agreement] GET:", err);
    return NextResponse.json({ hasAgreement: false, isPartner: false, role: null, agreement: null });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const venueName = sanitize(body.venueName ?? "", 200).trim();
  const venueGoogleMapsUrl = sanitizeGoogleMapsUrl(body.venueGoogleMapsUrl ?? "");
  const contactName = sanitize(body.contactName ?? "", 200).trim();
  const email = sanitize(body.email ?? user.email ?? "", 320).trim();
  const phone = sanitize(body.phone ?? "", 50).trim();
  const address = sanitize(body.address ?? "", 500).trim();
  const country = sanitize(body.country ?? "", 100).trim();
  const agreeLogoOnBike = body.agreeLogoOnBike === true;
  const agreeVipExperience = body.agreeVipExperience === true;
  const agreeTerms = body.agreeTerms === true;
  const signatureName = sanitize(body.signatureName ?? "", 200).trim();
  const comments = sanitize(body.comments ?? "", 2000).trim();
  const logoUrl = sanitize(body.logoUrl ?? "", 500).trim() || undefined;
  const walletAddress = sanitize(body.walletAddress ?? "", 100).trim() || undefined;
  const businessTaxNumber = sanitize(body.businessTaxNumber ?? "", 100).trim() || undefined;

  if (!agreeLogoOnBike || !agreeVipExperience || !agreeTerms) {
    return NextResponse.json(
      { error: "You must agree to all terms: logo on bike, VIP experience, and general terms." },
      { status: 400 }
    );
  }
  if (!venueName || !contactName || !email) {
    return NextResponse.json(
      { error: "Venue name, contact name, and email are required." },
      { status: 400 }
    );
  }
  if (!venueGoogleMapsUrl) {
    return NextResponse.json(
      { error: "Venue location (Google Maps link) is required. Please provide a valid Google Maps URL." },
      { status: 400 }
    );
  }

  try {
    const db = createClient(user);
    await (db as any).partnershipAgreement.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        venueName,
        contactName,
        email,
        phone: phone || undefined,
        venueAddress: address || undefined,
        country: country || undefined,
        googleMapsUrl: venueGoogleMapsUrl || undefined,
        businessTaxNumber: businessTaxNumber || undefined,
        agreeLogoOnBike,
        agreeVipExperience,
        agreeTerms,
        signatureName: signatureName || undefined,
        comments: comments || undefined,
        logoUrl,
        walletAddress,
      },
      update: {
        venueName,
        contactName,
        email,
        phone: phone || undefined,
        venueAddress: address || undefined,
        country: country || undefined,
        googleMapsUrl: venueGoogleMapsUrl || undefined,
        businessTaxNumber: businessTaxNumber || undefined,
        agreeLogoOnBike,
        agreeVipExperience,
        agreeTerms,
        signatureName: signatureName || undefined,
        comments: comments || undefined,
        logoUrl,
        walletAddress,
      },
    });

    await sendPartnershipSubmittedNotification({
      venueName,
      contactName,
      email,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, message: "Partnership agreement submitted." });
  } catch (err) {
    console.error("[api/partnership-agreement] POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const db = createClient(user);
    const existing = await (db as any).partnershipAgreement.findUnique({
      where: { userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "No partnership agreement found. Submit the agreement first." },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (body.phone !== undefined) update.phone = sanitize(String(body.phone), 50).trim() || undefined;
    if (body.address !== undefined) update.venueAddress = sanitize(String(body.address), 500).trim() || undefined;
    if (body.country !== undefined) update.country = sanitize(String(body.country), 100).trim() || undefined;
    if (body.walletAddress !== undefined) update.walletAddress = sanitize(String(body.walletAddress), 100).trim() || undefined;
    if (body.logoUrl !== undefined) update.logoUrl = sanitize(String(body.logoUrl), 500).trim() || undefined;
    if (body.venueGoogleMapsUrl !== undefined) {
      const url = sanitizeGoogleMapsUrl(body.venueGoogleMapsUrl);
      if (!url) {
        return NextResponse.json(
          { error: "Venue location (Google Maps link) is required. Please provide a valid Google Maps URL." },
          { status: 400 }
        );
      }
      update.googleMapsUrl = url;
    }
    if (body.signatureName !== undefined) update.signatureName = sanitize(String(body.signatureName), 200).trim() || undefined;
    if (body.comments !== undefined) update.comments = sanitize(String(body.comments), 2000).trim() || undefined;
    if (body.businessTaxNumber !== undefined) update.businessTaxNumber = sanitize(String(body.businessTaxNumber), 100).trim() || undefined;

    await (db as any).partnershipAgreement.update({
      where: { userId: user.id },
      data: update,
    });

    return NextResponse.json({ ok: true, message: "Agreement updated." });
  } catch (err) {
    console.error("[api/partnership-agreement] PATCH:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
