import { ZodError } from "zod";
import { ClientEvent } from "@/lib/events";
import { logEvent } from "@/lib/log";

/** Client beacons: page views, taps, waits, errors seen. No cookies; the client brings its own ids. */
export async function POST(req: Request) {
  try {
    const e = ClientEvent.parse(await req.json());
    logEvent(e.type, e.fields, { walkId: e.walkId, sessionId: e.sessionId });
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: err instanceof ZodError ? "invalid event" : "bad request" }, { status: 400 });
  }
}
