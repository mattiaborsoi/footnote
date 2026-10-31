import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../db";
import { walks } from "../db/schema";
import type { Llm } from "../pipeline/plan";
import { planWalk } from "../pipeline/plan";
import type { Providers } from "../pipeline/walk";
import { saveWalk } from "../walks";

/** The ready-made walks every city gets; served with no model time, re-checked for the person's date. */
export const PRESETS = [
  { key: "highlights", label: "Highlights", minutes: 120, interests: ["history", "architecture", "views"] },
  { key: "cafes-parks", label: "Cafés and parks", minutes: 90, interests: ["cafes", "parks"] },
  { key: "photo", label: "Photo spots", minutes: 60, interests: ["photo", "views", "art"] },
] as const;

export async function buildPresets(city: { id: string; name: string }, p: Providers, llm: Llm): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  let built = 0;
  for (const preset of PRESETS) {
    const request = { start: city.name, end: { kind: "anywhere" }, minutes: preset.minutes, companions: ["me"], interests: [...preset.interests], when: "now", language: "en" };
    try {
      const walk = await planWalk(request, p, llm);
      const id = await saveWalk(walk, request, null, { cityId: city.id, preset: preset.key });
      if (id) await db.delete(walks).where(and(eq(walks.cityId, city.id), eq(walks.preset, preset.key), ne(walks.id, id)));
      built++;
    } catch (e) {
      console.error(`preset ${preset.key} for ${city.id} failed`, e);
    }
  }
  return built;
}

export async function listPresets(cityId: string) {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({ id: walks.id, preset: walks.preset, title: walks.title, walk: walks.walk, createdAt: walks.createdAt }).from(walks).where(eq(walks.cityId, cityId));
  return rows.map((r) => {
    const w = r.walk as { summary: string; totalMinutes: number; distanceM: number; stops: unknown[] };
    const meta = PRESETS.find((p) => p.key === r.preset);
    return { id: r.id, preset: r.preset, label: meta?.label ?? r.preset, title: r.title, summary: w.summary, totalMinutes: w.totalMinutes, distanceM: w.distanceM, stops: w.stops.length, builtAt: r.createdAt.toISOString() };
  });
}
