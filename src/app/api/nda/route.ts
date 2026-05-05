/**
 * GET /api/nda — returns { accepted: boolean } for current user (ZenStack User.ndaAcceptedAt).
 * POST /api/nda — sets User.ndaAcceptedAt = now; returns { accepted: true }.
 * Replaces in-memory handler (handlers/nda.js); data stored in Neon DB via ZenStack.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json(
      { error: "Not signed in", accepted: false },
      { status: 401 }
    );
  }

  try {
    const db = createClient(user);
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { ndaAcceptedAt: true },
    });
    const accepted = record?.ndaAcceptedAt != null;
    return NextResponse.json({ accepted });
  } catch (err) {
    console.error("[api/nda] GET:", err);
    return NextResponse.json(
      { error: "Failed to load NDA status", accepted: false },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json(
      { error: "Not signed in", accepted: false },
      { status: 401 }
    );
  }

  try {
    const db = createClient(user);
    await db.user.update({
      where: { id: user.id },
      data: { ndaAcceptedAt: new Date() },
    });
    return NextResponse.json({ accepted: true });
  } catch (err) {
    console.error("[api/nda] POST:", err);
    return NextResponse.json(
      { error: "Failed to accept NDA", accepted: false },
      { status: 500 }
    );
  }
}
