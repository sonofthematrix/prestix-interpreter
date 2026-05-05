/**
 * POST /api/auth/credentials/login — Body: { email, password }.
 * Verifies against ZenStack User.password, creates legacy session (prestix.session) with jti.
 * Replaces handlers/auth/credentials/login.js and credentials-store.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { verifyPassword } from "@/lib/auth-password";
import {
  createLegacySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-session-legacy";
import { isSecureCookie } from "@/lib/auth-cookie-utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const emailLower = normalizeEmail(email);

  try {
    const systemUser = await getSystemUser();
    const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
    const db = createClient(adminContext);

    const user = await (db as any).user.findFirst({
      where: { email: emailLower },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.password || typeof user.password !== "string") {
      return NextResponse.json(
        {
          error:
            "No password set for this account. Use \"Forgot password?\" below to receive a link to set a new password.",
        },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(
      typeof password === "string" ? password : "",
      user.password
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Account disabled. Contact support if you believe this is an error.",
        },
        { status: 403 }
      );
    }

    const token = await createLegacySessionToken({
      sub: user.id,
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? null,
      image: user.profileImageUrl ?? null,
      role: user.role ?? undefined,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.profileImageUrl ?? null,
      },
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[api/auth/credentials/login]", err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
