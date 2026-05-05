import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

async function getSession(request: Request): Promise<{ sub: string } | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/prestix\.session=([^;]+)/);
  if (!match) return null;
  try {
    const { jwtVerify } = await import("jose");
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) return null;
    const { payload } = await jwtVerify(match[1], new TextEncoder().encode(secret));
    const sub = payload.sub ?? (payload as { id?: string }).id;
    return sub ? { sub: String(sub) } : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[partner-logo] BLOB_READ_WRITE_TOKEN is not set");
    return NextResponse.json(
      {
        error:
          "Logo upload is not configured. Set BLOB_READ_WRITE_TOKEN in your environment (e.g. .env.local) for local development, or connect a Vercel Blob store to your project.",
      },
      { status: 503 }
    );
  }

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("logo") ?? formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No logo file provided" }, { status: 400 });
  }

  const type = (file.type || "").toLowerCase().trim();
  if (!type || !type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB." },
      { status: 400 }
    );
  }

  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : "jpg";
  const pathname = `partners/${session.sub}/${Date.now()}-logo.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: type || "image/jpeg",
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[partner-logo] upload error:", err);
    return NextResponse.json(
      {
        error: "Upload failed",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 }
    );
  }
}
