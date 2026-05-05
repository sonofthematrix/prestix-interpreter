/**
 * POST /api/admin/request-code — admin only. Generates a 6-digit code, stores it in ZenStack
 * AdminVerificationCode (5 min expiry), and sends it to the current user's email.
 * Replaces handlers/admin/request-code.js and admin-codes-store.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomInt } from "crypto";

export const dynamic = "force-dynamic";

const CODE_VALID_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Prefer the request origin so the verification link matches the host the user is on
 * (e.g. localhost when developing, production URL in prod). Fall back to env when origin is unavailable.
 */
function getOrigin(request: Request): string {
  try {
    const origin = new URL(request.url).origin;
    if (origin && origin !== "null" && !origin.startsWith("file")) {
      return origin;
    }
  } catch {
    // ignore
  }
  const url = process.env.NEXTAUTH_URL;
  if (url && !url.includes("postgresql") && !url.includes("neon.tech") && !url.includes(":42883")) {
    return url.replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = user.id;
  let email = user.email?.trim();
  if (!userId || !email) {
    return NextResponse.json(
      { error: "Session must include user id and email" },
      { status: 400 }
    );
  }

  // When session email is wallet placeholder, allow client to send the real email (e.g. from @appkit-wallet/EMAIL)
  const isPlaceholder = email.endsWith("@wallet.local");
  if (isPlaceholder) {
    try {
      const body = await request.json().catch(() => ({}));
      const override = typeof body?.email === "string" ? body.email.trim() : "";
      if (override && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(override)) {
        email = override;
      }
    } catch {
      // keep session email
    }
  }

  const code = String(randomInt(0, 1e6)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_VALID_MS);

  try {
    const db = createClient(user);
    await (db as any).adminVerificationCode.deleteMany({
      where: { userId },
    });
    await (db as any).adminVerificationCode.create({
      data: { userId, code, expiresAt },
    });
  } catch (err) {
    console.error("[api/admin/request-code] store code:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }

  const baseUrl = getOrigin(request);
  const verifyUrl = `${baseUrl}/users?verify-code=${encodeURIComponent(code)}`;
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const fromAddress =
        process.env.CONTACT_FROM_EMAIL && process.env.CONTACT_FROM_NAME
          ? `${process.env.CONTACT_FROM_NAME} <${process.env.CONTACT_FROM_EMAIL}>`
          : "PRESTIX.VIP <onboarding@resend.dev>";
      await resend.emails.send({
        from: fromAddress,
        to: [email],
        subject: "Your PRESTIX.VIP admin verification code",
        html: `
            <p>Your one-time admin verification code is:</p>
            <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p>This code expires in 5 minutes. If you didn't request this, you can ignore this email.</p>
            <p style="margin-top:24px;">
              <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;font-weight:600;border-radius:9999px;">Open User Management</a>
            </p>
            <p style="margin-top:24px;">— PRESTIX.VIP</p>
          `,
      });
    } catch (err) {
      console.error("[api/admin/request-code] send email:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
  } else if (process.env.NODE_ENV === "development") {
    console.log("[api/admin/request-code] RESEND_API_KEY not set; code (dev only):", code);
  }

  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
