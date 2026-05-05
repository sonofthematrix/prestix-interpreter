/**
 * PATCH /api/admin/site-settings — admin only. Body: { marketplaceUrl }. Saves to ZenStack SiteSetting.
 * Replaces Blob site-settings-store; data stored in Neon DB.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_MARKETPLACE_URL = "https://prestix.vip/marketplace";

function sanitizeUrl(str: string | null | undefined): string {
  if (str == null || typeof str !== "string") return "";
  const s = str.trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.origin + u.pathname + u.search;
  } catch {
    return "";
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "PATCH, OPTIONS",
      "Access-Control-Allow-Methods": "PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
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

  let body: { marketplaceUrl?: string } = {};
  try {
    body = (await request.json()) as { marketplaceUrl?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url =
    body.marketplaceUrl != null
      ? sanitizeUrl(String(body.marketplaceUrl)) || DEFAULT_MARKETPLACE_URL
      : DEFAULT_MARKETPLACE_URL;

  try {
    const db = createClient(user);
    await (db as any).siteSetting.upsert({
      where: { key: "marketplaceUrl" },
      create: { key: "marketplaceUrl", value: url },
      update: { value: url },
    });
    return NextResponse.json({ marketplaceUrl: url });
  } catch (err) {
    console.error("[api/admin/site-settings] PATCH:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
