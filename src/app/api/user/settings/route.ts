/**
 * GET /api/user/settings — return current user's theme & language (ZenStack User.preferredTheme, preferredLanguage).
 * PATCH /api/user/settings — update theme and/or language. Body: { theme?, language? }.
 * Replaces Blob user-settings-store; data stored in Neon DB via ZenStack.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", settings: null },
      { status: 401 }
    );
  }

  try {
    const db = createClient(user);
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { preferredTheme: true, preferredLanguage: true },
    });
    const theme = record?.preferredTheme ?? null;
    const language = record?.preferredLanguage ?? null;
    return NextResponse.json({ theme, language });
  } catch (err) {
    console.error("[api/user/settings] GET:", err);
    return NextResponse.json(
      { error: "Failed to load settings", settings: null },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", settings: null },
      { status: 401 }
    );
  }

  let body: { theme?: string; language?: string } = {};
  try {
    body = (await request.json()) as { theme?: string; language?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const theme =
    body.theme !== undefined
      ? (String(body.theme).trim() || null)
      : undefined;
  const language =
    body.language !== undefined
      ? (String(body.language).trim() || null)
      : undefined;

  if (theme === undefined && language === undefined) {
    const db = createClient(user);
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { preferredTheme: true, preferredLanguage: true },
    });
    return NextResponse.json({
      theme: record?.preferredTheme ?? null,
      language: record?.preferredLanguage ?? null,
    });
  }

  try {
    const db = createClient(user);
    const data: { preferredTheme?: string | null; preferredLanguage?: string | null } = {};
    if (theme !== undefined) data.preferredTheme = theme;
    if (language !== undefined) data.preferredLanguage = language;

    await db.user.update({
      where: { id: user.id },
      data,
    });

    const updated = await db.user.findUnique({
      where: { id: user.id },
      select: { preferredTheme: true, preferredLanguage: true },
    });
    return NextResponse.json({
      theme: updated?.preferredTheme ?? null,
      language: updated?.preferredLanguage ?? null,
    });
  } catch (err) {
    console.error("[api/user/settings] PATCH:", err);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
