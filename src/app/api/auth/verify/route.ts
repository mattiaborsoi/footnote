import { verifyCode } from "@/lib/auth";
import { createSession, setSessionCookie } from "@/lib/auth/session";

/** POST { email, code }: signs the browser in with the session cookie. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  if (!body || typeof body.email !== "string" || typeof body.code !== "string") return Response.json({ error: "Send the email and the code." }, { status: 400 });
  const r = await verifyCode(body.email, body.code);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  await setSessionCookie(await createSession(r.user.id));
  return Response.json({ ok: true, next: r.next });
}
