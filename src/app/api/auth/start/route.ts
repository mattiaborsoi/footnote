import { startSignIn } from "@/lib/auth";
import { clientIpKey } from "@/lib/ip";

/** POST { email, next? }: emails a code and a link. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; next?: unknown } | null;
  if (!body || typeof body.email !== "string") return Response.json({ error: "Send an email address." }, { status: 400 });
  const r = await startSignIn(body.email, typeof body.next === "string" ? body.next : null, clientIpKey(req));
  return r.ok ? Response.json({ ok: true, masked: r.masked }) : Response.json({ error: r.error }, { status: r.status });
}
