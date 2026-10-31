import { and, between } from "drizzle-orm";
import { getDb } from "../db";
import { spots } from "../db/schema";
import type { BBox, Candidate } from "../providers/types";
import { decodeEntities } from "../providers/readpage";

type Source = { title: string; url: string };

export function spotToCandidate(s: { id: number; name: string; category: string; lat: number; lon: number; osmId: string | null; reason: string; sources: unknown; mentions: number }): Candidate {
  const sources = ((Array.isArray(s.sources) ? s.sources : []) as Source[]).map((x) => ({ ...x, title: decodeEntities(x.title) }));
  const credit = sources[0] ? `Recommended on "${sources[0].title}"` : "Recommended online";
  return {
    id: s.osmId ?? `scout:${s.id}`,
    name: s.name, category: s.category, lat: s.lat, lon: s.lon, tags: {},
    facts: [`${credit}: ${s.reason}`],
    boost: 2 + Math.min(s.mentions, 3),
    sources,
  };
}

/** Fold scouted spots into the map candidates: same place, one record with both kinds of facts. */
export function mergeScouted(found: Candidate[], scouted: Candidate[]): Candidate[] {
  const byId = new Map(found.map((c) => [c.id, c]));
  const out = [...found];
  for (const s of scouted) {
    const existing = byId.get(s.id);
    if (existing) {
      existing.facts = [...existing.facts, ...s.facts];
      existing.boost = (existing.boost ?? 0) + (s.boost ?? 0);
      existing.sources = [...(existing.sources ?? []), ...(s.sources ?? [])];
    } else {
      out.push(s);
    }
  }
  return out;
}

export async function loadSpotsInBbox(bbox: BBox): Promise<Candidate[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select().from(spots).where(and(between(spots.lat, bbox.south, bbox.north), between(spots.lon, bbox.west, bbox.east))).limit(200);
  return rows.map(spotToCandidate);
}
