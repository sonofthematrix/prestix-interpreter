/**
 * GET /api/site-settings — public. Returns { marketplaceUrl } from ZenStack SiteSetting.
 * Replaces Blob site-settings-store; data stored in Neon DB.
 */

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
      Allow: "GET, OPTIONS",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function GET() {
  try {
    const db = createClient();
    const row = await db.siteSetting.findUnique({
      where: { key: "marketplaceUrl" },
      select: { value: true },
    });
    const url = sanitizeUrl(row?.value ?? null) || DEFAULT_MARKETPLACE_URL;
    return NextResponse.json({ marketplaceUrl: url });
  } catch (err) {
    console.error("[api/site-settings] GET:", err);
    return NextResponse.json(
      { error: "Server error", marketplaceUrl: DEFAULT_MARKETPLACE_URL },
      { status: 500 }
    );
  }
}
