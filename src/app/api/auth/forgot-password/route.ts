/**
 * POST /api/auth/forgot-password — Body: { email }.
 * If a User exists with that email, creates a PasswordResetToken and sends reset link via Resend.
 * Always returns the same message to avoid email enumeration.
 * Replaces handlers/auth/forgot-password.js and reset-tokens-store.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getBaseUrl(): string {
  return (
    process.env.SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://prestix.vip")
  ).replace(/\/$/, "");
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const systemUser = await getSystemUser();
    const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
    const db = createClient(adminContext);

    const user = await (db as any).user.findFirst({
      where: { email: emailLower },
    });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + TOKEN_TTL_MS);

      await (db as any).passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expires,
        },
      });

      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(apiKey);
          const resetUrl = `${getBaseUrl()}/account?reset=${token}`;
          const fromAddress =
            process.env.CONTACT_FROM_EMAIL && process.env.CONTACT_FROM_NAME
              ? `${process.env.CONTACT_FROM_NAME} <${process.env.CONTACT_FROM_EMAIL}>`
              : "PRESTIX.VIP <onboarding@resend.dev>";
          await resend.emails.send({
            from: fromAddress,
            to: [email],
            subject: "Reset your PRESTIX.VIP password",
            html: `
              <p>You requested a password reset for your PRESTIX.VIP account.</p>
              <p><a href="${resetUrl}">Set a new password</a></p>
              <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
              <p>— PRESTIX.VIP</p>
            `,
          });
        } catch (err) {
          console.error("[api/auth/forgot-password] send email:", err);
        }
      }
    }
  } catch (err) {
    console.error("[api/auth/forgot-password]", err);
  }

  return NextResponse.json({
    message:
      "If an account exists with this email, you will receive a link to set a new password. Check your inbox and spam folder.",
  });
}
