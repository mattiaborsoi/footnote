import { ID_PATTERN } from "@/lib/ids";
import { loadWalk } from "@/lib/walks";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  const walk = await loadWalk(id);
  return walk ? Response.json(walk) : Response.json({ error: "not found" }, { status: 404 });
}
