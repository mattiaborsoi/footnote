import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cities } from "@/lib/db/schema";
import { listPresets } from "@/lib/scout/presets";

/** A city and its ready-made walks. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db || !/^[a-z0-9-]{2,60}$/.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  const city = await db.query.cities.findFirst({ where: eq(cities.id, id) });
  if (!city) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ id: city.id, name: city.name, status: city.status, placesAt: city.placesAt, scoutedAt: city.scoutedAt, presets: await listPresets(id) });
}
