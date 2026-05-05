import { runVercelHandler } from "../auth/vercel-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const handler = (await import("../../../../handlers/contact.js")).default;
  return runVercelHandler(request, handler);
}

export async function OPTIONS(request: Request) {
  const handler = (await import("../../../../handlers/contact.js")).default;
  return runVercelHandler(request, handler);
}
