import { handleWebhook } from "@/lib/billing/stripe";

/** Stripe's webhook: the raw body is verified against the signing secret. */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    return Response.json(await handleWebhook(raw, req.headers.get("stripe-signature") ?? ""));
  } catch (e) {
    console.error("webhook rejected", e instanceof Error ? e.message : e);
    return Response.json({ error: "rejected" }, { status: 400 });
  }
}
