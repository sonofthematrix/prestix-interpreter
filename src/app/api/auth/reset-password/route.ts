/**
 * POST /api/auth/reset-password — Body: { token, newPassword }.
 * Validates PasswordResetToken, updates User.password, marks token used.
 * Replaces handlers/auth/reset-password.js and reset-tokens-store/credentials-store.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { hashPassword } from "@/lib/auth-password";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { token?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const newPassword = body.newPassword;

  if (!token) {
    return NextResponse.json(
      { error: "Reset link is invalid or expired" },
      { status: 400 }
    );
  }
  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json(
      { error: "New password is required" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const systemUser = await getSystemUser();
    const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
    const db = createClient(adminContext);

    const record = await (db as any).passwordResetToken.findFirst({
      where: { token },
      include: { user: true },
    });

    if (!record || !record.user) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (new Date(record.expires) < now) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    if (record.usedAt) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await (db as any).user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    });

    await (db as any).passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });
  } catch (err) {
    console.error("[api/auth/reset-password]", err);
    return NextResponse.json(
      { error: "Reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message:
      "Password set. You can now sign in with your email and new password.",
  });
}
