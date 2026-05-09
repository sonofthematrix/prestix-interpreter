/**
 * Adapter to run Vercel serverless handlers (req/res) from Next.js Route Handlers (Web Request/Response).
 * Used so /api/auth/* works under `next dev` without running `vercel dev`.
 */

import { NextResponse } from "next/server";

/** Session payload from getCurrentUser (AppKit/wallet or social). When set, handlers use this instead of cookie-based getSessionFromRequest. */
export type SessionPayload = { sub: string; id?: string; email?: string };

export type VercelHandler = (
  req: {
    method?: string;
    headers: Record<string, string>;
    query: Record<string, string | string[] | undefined>;
    body?: unknown;
    /** Injected by route when using getCurrentUser (AppKit/social session). */
    session?: SessionPayload;
  },
  res: {
    setHeader: (name: string, value: string | string[]) => void;
    status: (code: number) => {
      json: (body: unknown) => void;
      redirect: (code: number, url: string) => void;
      end: () => void;
    };
    redirect: (code: number, url: string) => void;
  }
) => void | Promise<void>;

function headersToRecord(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  request.headers.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

function parseQuery(url: string): Record<string, string | string[] | undefined> {
  const u = new URL(url);
  const out: Record<string, string | string[] | undefined> = {};
  u.searchParams.forEach((v, k) => {
    const prev = out[k];
    if (prev === undefined) out[k] = v;
    else if (Array.isArray(prev)) prev.push(v);
    else out[k] = [prev, v];
  });
  return out;
}

export function createMockRes() {
  const headers: [string, string][] = [];
  let statusCode = 200;
  let body: unknown = null;
  let sentBody: ArrayBuffer | Uint8Array | null = null;
  let redirect: { code: number; url: string } | null = null;

  const res = {
    setHeader(name: string, value: string | string[]) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.push([name.toLowerCase(), v]));
      } else {
        headers.push([name.toLowerCase(), value]);
      }
    },
    status(code: number) {
      statusCode = code;
      return {
        json(b: unknown) {
          body = b;
          sentBody = null;
        },
        redirect(_code: number, url: string) {
          redirect = { code: _code, url };
        },
        end() {
          body = null;
          sentBody = null;
        },
        send(b: unknown) {
          if (b == null) return;
          if (typeof b === "string") body = b;
          else if (b instanceof Uint8Array) sentBody = b;
          else if (typeof Buffer !== "undefined" && Buffer.isBuffer(b)) sentBody = new Uint8Array(b);
          else sentBody = b as Uint8Array;
        },
      };
    },
    redirect(code: number, url: string) {
      redirect = { code, url };
    },
  };

  function buildResponse(): NextResponse {
    const nextHeaders = new Headers();
    headers.forEach(([k, v]) => nextHeaders.append(k, v));
    if (redirect) {
      const r = NextResponse.redirect(redirect.url, redirect.code);
      nextHeaders.forEach((v, k) => r.headers.append(k, v));
      return r;
    }
    if (sentBody != null) {
      const raw = sentBody instanceof ArrayBuffer ? sentBody : sentBody.buffer;
      return new NextResponse(raw as BodyInit, {
        status: statusCode,
        headers: nextHeaders,
      });
    }
    const responseBody = statusCode === 204 ? null : body != null ? JSON.stringify(body) : null;
    return new NextResponse(responseBody, {
      status: statusCode,
      headers: nextHeaders,
    });
  }

  return { res, buildResponse };
}

async function headersWithCookieFallback(
  request: Request,
  headers: Record<string, string>
): Promise<Record<string, string>> {
  // Ensure cookie is available so handlers see the same session as getCurrentUser()
  if (headers.cookie?.trim()) return headers;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const cookieHeader = all.map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieHeader) return { ...headers, cookie: cookieHeader };
  } catch {
    // next/headers not available or cookies() threw
  }
  return headers;
}

export async function createMockReq(
  request: Request,
  body?: unknown,
  options?: { sessionPayload?: SessionPayload }
): Promise<{
  method: string;
  headers: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  session?: SessionPayload;
}> {
  const headers = await headersWithCookieFallback(
    request,
    headersToRecord(request)
  );
  const req = {
    method: request.method || "GET",
    headers,
    query: parseQuery(request.url),
    ...(body !== undefined && { body }),
    ...(options?.sessionPayload && { session: options.sessionPayload }),
  };
  return req;
}

export type RunVercelHandlerOptions = { sessionPayload?: SessionPayload };

export async function runVercelHandler(
  request: Request,
  handler: VercelHandler,
  options?: RunVercelHandlerOptions
): Promise<NextResponse> {
  let body: unknown = undefined;
  const method = request.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    try {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    } catch {
      // leave body undefined
    }
  }
  const req = await createMockReq(request, body, options);
  const { res, buildResponse } = createMockRes();
  await handler(req, res);
  return buildResponse();
}
