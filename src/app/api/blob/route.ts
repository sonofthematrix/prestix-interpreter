/**
 * GET /api/blob?pathname=xxx — Serve private Vercel Blob files
 *
 * Required when the Blob store is configured with private access.
 * Fetches the blob using the SDK (which uses BLOB_READ_WRITE_TOKEN) and streams to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get("pathname");

    if (!pathname) {
      return NextResponse.json({ error: "Missing pathname parameter" }, { status: 400 });
    }

    const result = await get(pathname, { access: "private" });

    if (!result || result.statusCode !== 200) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[api/blob] GET:", err);
    return new NextResponse("Failed to load file", { status: 500 });
  }
}
