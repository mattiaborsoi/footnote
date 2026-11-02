import { currentUser } from "@/lib/auth/session";
import { ID_PATTERN } from "@/lib/ids";
import { clientIpKey } from "@/lib/ip";
import { streamWalk } from "@/lib/pipeline/stream";
import { loadRequest, loadWalk } from "@/lib/walks";

/** Tailor a stored walk: its request with your changes on top, built again from the city's cached places. Streams like POST /api/walk. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  const user = await currentUser();
  const [base, walk] = await Promise.all([loadRequest(id) as Promise<Record<string, unknown> | null>, loadWalk(id)]);
  if (!base || !walk) return Response.json({ error: "not found" }, { status: 404 });
  if (!user || walk.ownerId !== user.id) delete base.notes; // the free-text line stays with its author
  const changes = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return streamWalk({ ...base, ...changes, fresh: true }, { fromWalkId: id, user, ipKey: clientIpKey(req) });
}
