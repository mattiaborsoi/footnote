import { verifyLink } from "@/lib/auth";
import { createSession, setSessionCookie } from "@/lib/auth/session";

/** POST { token }: the emailed link, confirmed by a tap on the page it opens, so a mail scanner cannot spend it. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  if (!body || typeof body.token !== "string") return Response.json({ error: "No token." }, { status: 400 });
  const r = await verifyLink(body.token);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  await setSessionCookie(await createSession(r.user.id));
  return Response.json({ ok: true, next: r.next });
}
