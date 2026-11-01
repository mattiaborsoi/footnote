import { setAdminCookie } from "@/lib/admin/gate";

export async function POST() {
  await setAdminCookie(false);
  return Response.json({ ok: true });
}
