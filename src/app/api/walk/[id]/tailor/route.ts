import { ID_PATTERN } from "@/lib/ids";
import { streamWalk } from "@/lib/pipeline/stream";
import { loadRequest } from "@/lib/walks";

/** Tailor a stored walk: its request with your changes on top, built again from the city's cached places. Streams like POST /api/walk. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  const base = (await loadRequest(id)) as Record<string, unknown> | null;
  if (!base) return Response.json({ error: "not found" }, { status: 404 });
  const changes = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return streamWalk({ ...base, ...changes, fresh: true }, { fromWalkId: id });
}
