import { z } from "zod";
import { aroundMe } from "@/lib/pipeline/around";
import { Interest } from "@/lib/pipeline/intent";
import { logEvent } from "@/lib/log";
import { overpass } from "@/lib/providers/overpass";

const Body = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), interests: z.array(Interest).min(1).default(["history", "cafes", "views"]), language: z.string().max(35).default("en"), when: z.string().default("now"), sessionId: z.string().max(64).optional() });

/** Around me: five open options within ten minutes of the phone's location. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Send lat, lon and interests." }, { status: 400 });
  const b = parsed.data;
  try {
    const options = await aroundMe({ lat: b.lat, lon: b.lon }, b.interests, b.language, overpass, b.when);
    logEvent("around.served", { options: options.length, interests: b.interests }, { sessionId: b.sessionId ?? null });
    return Response.json({ options });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
