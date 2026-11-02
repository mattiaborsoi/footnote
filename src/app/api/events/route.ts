import { ZodError } from "zod";
import { ClientEvent } from "@/lib/events";
import { clientIpKey } from "@/lib/ip";
import { logEvent } from "@/lib/log";
import { allow } from "@/lib/ratelimit";

/** Event names the server writes itself; a beacon may not forge them (the dashboard counts them as real). */
const SERVER_ONLY = /^(walk\.(built|served|error|cache_hit|limited|claimed)|auth\.(start|signed_up|signed_in)|billing\.|scout\.|scheduler\.|city\.|cache\.|feedback\.received|around\.served)/;

/** Client beacons: page views, taps, waits, errors seen. No cookies; the client brings its own ids. */
export async function POST(req: Request) {
  if (!allow(`events-ip:${clientIpKey(req)}`, 300, 3_600_000)) return new Response(null, { status: 429 });
  try {
    const e = ClientEvent.parse(await req.json());
    if (SERVER_ONLY.test(e.type)) return Response.json({ error: "reserved event" }, { status: 400 });
    logEvent(e.type, e.fields, { walkId: e.walkId, sessionId: e.sessionId });
    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: err instanceof ZodError ? "invalid event" : "bad request" }, { status: 400 });
  }
}
