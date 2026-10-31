import { streamWalk } from "@/lib/pipeline/stream";

/** POST the six-question form; receive server-sent events: `stage` (understood, searching, choosing, routing), then `walk`, or `error`. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Send the request form as JSON." }, { status: 400 });
  return streamWalk(body as Record<string, unknown>);
}
