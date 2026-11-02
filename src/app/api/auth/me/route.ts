import { allowanceFor } from "@/lib/account/allowance";
import { currentUser } from "@/lib/auth/session";
import { SESSION_PATTERN } from "@/lib/ids";

/** Who is signed in and how many walks are left; { user: null } otherwise. Never cached. */
export async function GET(req: Request) {
  const user = await currentUser();
  const sessionId = new URL(req.url).searchParams.get("session");
  const allowance = await allowanceFor(user, sessionId && SESSION_PATTERN.test(sessionId) ? sessionId : null);
  return Response.json({ user: user ? { email: user.email, plan: user.plan, planStatus: user.planStatus, planEndsAt: user.planEndsAt?.toISOString() ?? null } : null, allowance }, { headers: { "Cache-Control": "no-store" } });
}
