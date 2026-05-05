/**
 * GET /api/admin/export-feedback — admin only. Returns xlsx of feedback (Would you hire the bike? etc.).
 * Data from ZenStack Feedback; replaces feedback-store and admin/export-feedback.js handler.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

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

    const headers = ["Timestamp", "User ID", "Email", "Full name", "Would Hire", "Comment"];
    const dataRows = rows.map((r: { createdAt: Date; userId: string | null; userEmail: string | null; userName: string | null; payload: unknown }) => {
      const { wouldHire, comment } = payloadFields(r.payload);
      const p = r.payload && typeof r.payload === "object" ? (r.payload as Record<string, unknown>) : {};
      return [
        r.createdAt ? new Date(r.createdAt).toISOString() : "",
        r.userId ?? "",
        r.userEmail ?? (p.userEmail != null ? String(p.userEmail) : ""),
        r.userName ?? (p.userName != null ? String(p.userName) : ""),
        wouldHire,
        comment,
      ];
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Question data");
    ws.addRows([headers, ...dataRows]);

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `prestix-question-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[api/admin/export-feedback] GET:", err);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
