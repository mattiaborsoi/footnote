import { timingSafeEqual } from "node:crypto";
import { adminEnabled, setAdminCookie } from "@/lib/admin/gate";
import { clientIpKey } from "@/lib/ip";
import { allow } from "@/lib/ratelimit";

/** POST { token }: the owner's token, once per browser, for thirty days. */
export async function POST(req: Request) {
  if (!adminEnabled()) return Response.json({ error: "not found" }, { status: 404 });
  if (!allow(`admin-login:${clientIpKey(req)}`, 5, 15 * 60_000)) return Response.json({ error: "Too many attempts." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const given = Buffer.from(typeof body?.token === "string" ? body.token : "");
  const real = Buffer.from(process.env.ADMIN_TOKEN ?? "");
  if (!real.length || given.length !== real.length || !timingSafeEqual(given, real)) return Response.json({ error: "That token is not right." }, { status: 401 });
  await setAdminCookie(true);
  return Response.json({ ok: true });
}
