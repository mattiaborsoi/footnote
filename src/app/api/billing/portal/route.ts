import { currentUser } from "@/lib/auth/session";
import { portalUrl } from "@/lib/billing/stripe";

/** POST: where to manage the plan (card, cancellation, invoices). */
export async function POST() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    return Response.json({ url: await portalUrl(user) });
  } catch {
    return Response.json({ error: "No billing account yet." }, { status: 404 });
  }
}
