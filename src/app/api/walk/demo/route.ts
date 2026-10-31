import { nominatim } from "@/lib/providers/nominatim";
import { overpass } from "@/lib/providers/overpass";
import { osrm } from "@/lib/providers/osrm";
import { buildWalk } from "@/lib/pipeline/walk";

/** Milestone 1: a walk from a hard-coded intent shape, no model. Example: /api/walk/demo?start=Bath%20Abbey&minutes=60&interests=architecture,parks */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const raw = {
    start: q.get("start") ?? "",
    end: q.get("end") || null,
    minutes: Number(q.get("minutes") ?? 90),
    pace: q.get("pace") ?? "normal",
    interests: (q.get("interests") ?? "architecture").split(",").filter(Boolean),
  };
  try {
    const walk = await buildWalk(raw, { geocoder: nominatim, places: overpass, router: osrm });
    return Response.json(walk);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
