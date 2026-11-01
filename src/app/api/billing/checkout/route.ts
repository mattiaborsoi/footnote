import { currentUser } from "@/lib/auth/session";
import { checkoutUrl, paymentsReady } from "@/lib/billing/stripe";

/** POST { plan }: where to pay. 401 when signed out, 503 when this instance has no payments. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!paymentsReady()) return Response.json({ error: "Payments are not set up on this instance yet." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { plan?: unknown } | null;
  const plan = body?.plan === "week" || body?.plan === "month" ? body.plan : null;
  if (!plan) return Response.json({ error: "Pick a plan." }, { status: 400 });
  try {
    return Response.json({ url: await checkoutUrl(user, plan) });
  } catch (e) {
    console.error("checkout failed", e);
    return Response.json({ error: "Could not start the payment. Try again in a moment." }, { status: 502 });
  }
}
