import { getCurrentUser } from "@/lib/auth";
import { runVercelHandler, type VercelHandler } from "@/app/api/auth/vercel-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  const sessionPayload =
    user ? { sub: user.id, id: user.id, email: user.email } : undefined;
  const handlerModule = await import("../../../../../handlers/stripe-create-checkout.js");
  const handler = handlerModule.default as VercelHandler;
  return runVercelHandler(request, handler, { sessionPayload });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
