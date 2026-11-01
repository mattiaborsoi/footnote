import { isAdmin } from "@/lib/admin/gate";
import { setMark } from "@/lib/admin/queries";

/** POST { kind, key, on }: the owner's mark on a record, kept locally. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "not allowed" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { kind?: unknown; key?: unknown; on?: unknown } | null;
  if (!body || typeof body.kind !== "string" || !/^[a-z.]{3,40}$/.test(body.kind) || typeof body.key !== "string" || body.key.length > 80) return Response.json({ error: "bad request" }, { status: 400 });
  await setMark(body.kind, body.key, body.on !== false);
  return Response.json({ ok: true });
}
