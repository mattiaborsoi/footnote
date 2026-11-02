import { clientIpKey } from "@/lib/ip";
import { allow } from "@/lib/ratelimit";
import { ID_PATTERN } from "@/lib/ids";
import { refreshWalk } from "@/lib/pipeline/refresh";
import { loadWalk } from "@/lib/walks";

/** A stored walk re-checked for a day and time: arrivals, hours and weather. No model, no search, nothing stored. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!allow(`refresh-ip:${clientIpKey(req)}`, 60, 3_600_000)) return Response.json({ error: "Too many re-checks from this connection. Try again in an hour." }, { status: 429 });
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  const walk = await loadWalk(id);
  if (!walk) return Response.json({ error: "not found" }, { status: 404 });
  const body = ((await req.json().catch(() => ({}))) ?? {}) as { when?: string; pace?: "relaxed" | "normal" | "brisk" };
  return Response.json(await refreshWalk(walk, typeof body.when === "string" ? body.when : "now", body.pace ?? "normal"));
}
