import { ZodError } from "zod";
import { configFromEnv, httpTransport, LlmError } from "../llm/client";
import { logEvent } from "../log";
import { nominatim } from "../providers/nominatim";
import { overpass } from "../providers/overpass";
import { osrm } from "../providers/osrm";
import { findRecent, saveWalk } from "../walks";
import { fingerprint } from "./fingerprint";
import { planWalk } from "./plan";

/** Build a walk and stream it as server-sent events: `stage` while it builds, then `walk`, or `error`. */
export function streamWalk(body: Record<string, unknown>, meta: { cityId?: string; fromWalkId?: string } = {}): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const started = performance.now();
      const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
      try {
        const fp = fingerprint(body);
        const recent = body.fresh ? null : await findRecent(fp).catch(() => null);
        if (recent) {
          send("stage", { stage: "understood", ms: 0, detail: { cached: true, minutes: recent.totalMinutes, interests: [], start: recent.start, end: recent.end } });
          logEvent("walk.cache_hit", { stops: recent.stops.length }, { walkId: recent.id, sessionId });
          send("walk", { ...recent, url: `/w/${recent.id}` });
          return;
        }
        const cfg = configFromEnv();
        const walk = await planWalk(body, { geocoder: nominatim, places: overpass, router: osrm }, { transport: httpTransport(cfg), models: cfg.models }, (e) => send("stage", e));
        const id = await saveWalk(walk, body, sessionId, { ...meta, fingerprint: fp }).catch((err) => { console.error("walk not stored", err); return null; });
        logEvent("walk.served", { stops: walk.stops.length, totalMinutes: walk.totalMinutes, ms: Math.round(performance.now() - started), fromWalkId: meta.fromWalkId ?? null }, { walkId: id, sessionId });
        send("walk", { id, url: id ? `/w/${id}` : null, ...walk });
      } catch (e) {
        const message = e instanceof LlmError ? e.userMessage : e instanceof ZodError ? `Please check the request: ${e.issues.map((i) => i.path.join(".")).join(", ")}.` : e instanceof Error ? e.message : "Something went wrong.";
        logEvent("walk.error", { message, ms: Math.round(performance.now() - started) }, { sessionId });
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
