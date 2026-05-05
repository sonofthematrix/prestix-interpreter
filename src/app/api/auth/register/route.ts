/**
 * POST /api/auth/register — Body: { email, password, name? }.
 * Creates or reactivates ZenStack User with hashed password, creates legacy session.
 * Replaces handlers/auth/register.js and credentials-store/users-store.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { hashPassword } from "@/lib/auth-password";
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
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password;
  const name = (body.name ?? "").trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const emailLower = normalizeEmail(email);

  try {
    const systemUser = await getSystemUser();
    const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
    const db = createClient(adminContext);

    const existing = await (db as any).user.findFirst({
      where: { email: emailLower },
    });

    if (existing && existing.status === "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Sign in with your existing method or use a different email.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const displayName = name || emailLower.split("@")[0] || "User";

    let user: { id: string; email: string | null; name: string | null };

    if (existing) {
      await (db as any).user.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          password: passwordHash,
          name: displayName,
          authMethod: "email",
        },
      });
      user = {
        id: existing.id,
        email: emailLower,
        name: displayName,
      };
    } else {
      const created = await (db as any).user.create({
        data: {
          email: emailLower,
          name: displayName,
          password: passwordHash,
          status: "ACTIVE",
          authMethod: "email",
          role: "MEMBER",
        },
      });
      user = {
        id: created.id,
        email: created.email ?? emailLower,
        name: created.name ?? displayName,
      };
    }

    const token = await createLegacySessionToken({
      sub: user.id,
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? null,
      image: null,
      role: "MEMBER",
    });

    const res = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: null,
        },
      },
      { status: 201 }
    );

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[api/auth/register]", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
