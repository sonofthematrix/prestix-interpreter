/**
 * POST /api/user/sync-appkit-email
 *
 * Syncs the AppKit wallet email (@appkit-wallet/EMAIL from localStorage) into the
 * current user record. Only updates when the user's current email is a placeholder
 * (e.g. ends with @wallet.local) so we don't overwrite a real email.
 * Called by the client after syncAppkitWalletEmail so the DB has the email for
 * future sessions and admin/backend use.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLACEHOLDER_SUFFIX = "@wallet.local";

function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email;
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const currentEmail = (user.email || "").trim();
  if (!currentEmail.endsWith(PLACEHOLDER_SUFFIX)) {
    return NextResponse.json({ ok: true, skipped: "User already has a real email" });
  }

  try {
    const db = createClient(user);
    await db.user.update({
      where: { id: user.id } as any,
      data: { email: email.trim() },
    });
    return NextResponse.json({ ok: true, synced: true });
  } catch (err: unknown) {
    const e = err as { code?: string; dbErrorCode?: string; cause?: { code?: string; dbErrorCode?: string } };
    const code = e?.code ?? e?.dbErrorCode ?? e?.cause?.code ?? e?.cause?.dbErrorCode;
    if (code === "23505") {
      // Email already exists on another user - treat as success (no overwrite)
      return NextResponse.json({ ok: true, skipped: "Email already in use by another account" });
    }
    console.error("[api/user/sync-appkit-email]", err);
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}
