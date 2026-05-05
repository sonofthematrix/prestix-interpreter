/**
 * POST /api/analytics — record feedback/analytics events (e.g. experience_hire_bike).
 * Creates a ZenStack Feedback row; replaces feedback-store Blob.
 * Session optional: when present, user email/name are stored on the record.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = ["experience_hire_bike"] as const;

function sanitize(str: unknown, maxLen: number = 500): string {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLen).replace(/[<>]/g, "");
}

function sanitizePayload(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return {};
  const out: Record<string, unknown> = {};
  const raw = obj as Record<string, unknown>;
  if (raw.comment != null) out.comment = sanitize(String(raw.comment), 500);
  if (raw.wouldHire != null) out.wouldHire = sanitize(String(raw.wouldHire), 100);
  return out;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request as import("next/server").NextRequest);
    const body = await request.json().catch(() => ({}));
    const event = sanitize(body.event ?? "", 80);
    const payloadBody = body.payload && typeof body.payload === "object" ? body.payload : {};
    const userIdFromBody = body.userId != null ? sanitize(String(body.userId), 320) : null;

    if (!event) {
      return NextResponse.json({ error: "event is required" }, { status: 400 });
    }
    if (!ALLOWED_EVENTS.includes(event as (typeof ALLOWED_EVENTS)[number])) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const payload = sanitizePayload(payloadBody);
    if (user) {
      if (user.email) (payload as Record<string, unknown>).userEmail = sanitize(user.email, 320);
      if (user.name) (payload as Record<string, unknown>).userName = sanitize(user.name, 200);
    }

    const db = createClient();
    await (db as any).feedback.create({
      data: {
        event,
        payload: Object.keys(payload).length ? payload : undefined,
        userId: userIdFromBody || user?.id || undefined,
        userEmail: user?.email ? sanitize(user.email, 320) : undefined,
        userName: user?.name ? sanitize(user.name, 200) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/analytics] POST:", err);
    return NextResponse.json(
      { error: "Something went wrong", hint: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
