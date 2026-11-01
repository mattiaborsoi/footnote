import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cities } from "@/lib/db/schema";

/** The cities with cached places and ready-made walks: what the idle map shows. */
export async function GET() {
  const db = getDb();
  if (!db) return Response.json({ cities: [] });
  const rows = await db.select({ id: cities.id, name: cities.name, lat: cities.lat, lon: cities.lon }).from(cities).where(eq(cities.status, "ready")).limit(40);
  return Response.json({ cities: rows }, { headers: { "Cache-Control": "public, max-age=300" } });
}
