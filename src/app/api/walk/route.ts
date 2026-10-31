import { configFromEnv, httpTransport, LlmError } from "@/lib/llm/client";
import { planWalk } from "@/lib/pipeline/plan";
import { nominatim } from "@/lib/providers/nominatim";
import { overpass } from "@/lib/providers/overpass";
import { osrm } from "@/lib/providers/osrm";
import { logEvent } from "@/lib/log";
import { ZodError } from "zod";
import { saveWalk } from "@/lib/walks";

/**
 * POST the six-question form; receive server-sent events: `stage` (understood, searching,
 * choosing, routing), then `walk`, or `error`. The connection stays open for the whole build.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Send the request form as JSON." }, { status: 400 });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const started = performance.now();
      try {
        const cfg = configFromEnv();
        const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
        const walk = await planWalk(body, { geocoder: nominatim, places: overpass, router: osrm }, { transport: httpTransport(cfg), models: cfg.models }, (e) => send("stage", e));
        const id = await saveWalk(walk, body, sessionId).catch((err) => { console.error("walk not stored", err); return null; });
        logEvent("walk.served", { stops: walk.stops.length, totalMinutes: walk.totalMinutes, ms: Math.round(performance.now() - started) }, { walkId: id, sessionId });
        send("walk", { id, url: id ? `/w/${id}` : null, ...walk });
      } catch (e) {
        const message = e instanceof LlmError ? e.userMessage : e instanceof ZodError ? `Please check the request: ${e.issues.map((i) => i.path.join(".")).join(", ")}.` : e instanceof Error ? e.message : "Something went wrong.";
        logEvent("walk.error", { message, ms: Math.round(performance.now() - started) });
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
