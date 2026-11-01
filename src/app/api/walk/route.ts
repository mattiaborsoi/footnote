import { currentUser } from "@/lib/auth/session";
import { clientIpKey } from "@/lib/ip";
import { streamWalk } from "@/lib/pipeline/stream";
import { allow } from "@/lib/ratelimit";

/** POST the six-question form; receive server-sent events: `stage` (understood, searching, choosing, routing), then `walk`, or `error`. */
export async function POST(req: Request) {
  if (!allow(`walk-ip:${clientIpKey(req)}`, 30, 3_600_000)) return Response.json({ error: "Too many walks from this connection. Try again in an hour." }, { status: 429, headers: { "Retry-After": "3600" } });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Send the request form as JSON." }, { status: 400 });
  return streamWalk(body as Record<string, unknown>, { user: await currentUser(), ipKey: clientIpKey(req) });
}
