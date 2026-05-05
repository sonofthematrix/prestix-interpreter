/**
 * GET /api/admin/feedback — admin only. Returns JSON list of feedback (e.g. "Would you hire the bike?").
 * Data from ZenStack Feedback; replaces feedback-store and admin/feedback-list.js handler.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function payloadFields(payload: unknown): { wouldHire: string; comment: string } {
  if (!payload || typeof payload !== "object") return { wouldHire: "", comment: "" };
  const p = payload as Record<string, unknown>;
  return {
    wouldHire: p.wouldHire != null ? String(p.wouldHire) : "",
    comment: p.comment != null ? String(p.comment) : "",
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = createClient(user);
    const rows = await (db as any).feedback.findMany({
      orderBy: { createdAt: "desc" },
    });

    const list = rows.map((r: { createdAt: Date; userId: string | null; userEmail: string | null; userName: string | null; payload: unknown }) => {
      const { wouldHire, comment } = payloadFields(r.payload);
      const p = r.payload && typeof r.payload === "object" ? (r.payload as Record<string, unknown>) : {};
      return {
        timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : "",
        userId: r.userId ?? "",
        email: r.userEmail ?? (p.userEmail != null ? String(p.userEmail) : ""),
        fullName: r.userName ?? (p.userName != null ? String(p.userName) : ""),
        wouldHire,
        comment,
      };
    });

    return NextResponse.json({ feedback: list });
  } catch (err) {
    console.error("[api/admin/feedback] GET:", err);
    return NextResponse.json(
      { error: "Failed to load question data" },
      { status: 500 }
    );
  }
}
