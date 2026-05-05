/**
 * POST /api/admin/set-password — admin only. Body: { email, newPassword }.
 * Sets or updates User.password for the given email (ZenStack).
 * Replaces handlers/admin/set-password.js and credentials-store.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { hashPassword } from "@/lib/auth-password";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; newPassword?: string };
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  const email = (body.email ?? "").trim();
  const newPassword = body.newPassword;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json({ error: "newPassword is required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const db = createClient(user);
    const existing = await (db as any).user.findFirst({
      where: { email: emailLower },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await (db as any).user.update({
      where: { id: existing.id },
      data: { password: passwordHash },
    });

    return NextResponse.json({
      ok: true,
      message: "Password set. This user can now sign in with email and password.",
    });
  } catch (err) {
    console.error("[api/admin/set-password]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
