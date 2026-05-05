/**
 * GET /api/user/contact — return current user's phone (User.phone).
 * PATCH /api/user/contact — update User.phone. Body: { phone?: string }.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sanitizePhone(value: string): string {
  return String(value ?? "").trim().slice(0, 50);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", phone: null }, { status: 401 });
  }

  try {
    const db = createClient(user);
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });
    return NextResponse.json({ phone: record?.phone ?? null });
  } catch (err) {
    console.error("[api/user/contact] GET:", err);
    return NextResponse.json(
      { error: "Failed to load contact", phone: null },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phone?: string } = {};
  try {
    body = (await request.json()) as { phone?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phone = body.phone !== undefined ? sanitizePhone(body.phone) || null : undefined;
  if (phone === undefined) {
    const db = createClient(user);
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });
    return NextResponse.json({ phone: record?.phone ?? null });
  }

  try {
    const db = createClient(user);
    await db.user.update({
      where: { id: user.id },
      data: { phone },
    });
    return NextResponse.json({ phone });
  } catch (err) {
    console.error("[api/user/contact] PATCH:", err);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}
