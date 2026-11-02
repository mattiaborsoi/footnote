import { z } from "zod";
import { eq } from "drizzle-orm";
import { askJson, type Transport } from "../llm/client";
import { getDb } from "../db";
import { cities, spots } from "../db/schema";
import { logEvent } from "../log";
import type { Geocoder } from "../providers/types";
import type { SearchProvider } from "../providers/search";

export const CATEGORIES = ["cafe", "shop", "museum", "art", "view", "park", "architecture", "memorial", "place"] as const;

/** What we search for in every city. Themes, not interests: one page often covers several. */
export const THEMES = [
  "hidden gems and unusual places to see in {city}",
  "best independent cafes and coffee shops in {city}",
  "best viewpoints and photo spots in {city}",
  "modern architecture and striking buildings in {city}",
  "street art and murals in {city}",
  "film and TV locations in {city}",
  "best small museums and galleries in {city}",
  "independent shops and markets in {city}",
  "parks, gardens and green walks in {city}",
];

const Extracted = z.object({
  spots: z.array(z.object({
    name: z.string().min(2).max(80),
    category: z.enum(CATEGORIES),
    reason: z.string().min(5).max(160).transform((r) => r.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim()),
  })).max(12),
});

export type RawSpot = { name: string; category: string; reason: string; source: { title: string; url: string } };
export type Aggregated = { key: string; name: string; category: string; reason: string; sources: { title: string; url: string }[]; mentions: number };

/** Lower case, no punctuation or leading article, so "The Circus" and "Circus" are one spot. */
export function normaliseName(name: string): string {
  return name.toLowerCase().replace(/^(the|le|la|il|el|der|die|das)\s+/i, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function aggregate(raw: RawSpot[]): Aggregated[] {
  const map = new Map<string, Aggregated>();
  for (const r of raw) {
    const key = normaliseName(r.name);
    if (!key) continue;
    const a = map.get(key);
    if (!a) map.set(key, { key, name: r.name, category: r.category, reason: r.reason, sources: [r.source], mentions: 1 });
    else {
      a.mentions++;
      if (!a.sources.some((s) => s.url === r.source.url)) a.sources.push(r.source);
    }
  }
  return [...map.values()].sort((a, b) => b.mentions - a.mentions);
}

export async function extractSpots(city: string, page: { title: string; url: string; text: string }, transport: Transport, model: string): Promise<RawSpot[]> {
  const { data } = await askJson(transport, Extracted, {
    model,
    maxTokens: 1500,
    system: `You read one web page about ${city} and list the real, named places a visitor could walk to: cafés, shops, buildings, parks, viewpoints, artworks, museums, memorials. For each give "name" exactly as written, "category" from ${CATEGORIES.join(", ")}, and "reason" in one sentence under 150 characters in your own words (no quotation of the page). Skip chains, hotels, restaurants-only lists, tours, and anything outside ${city}. At most 12. If the page has none, return {"spots": []}. JSON shape: {"spots": [{"name": "", "category": "", "reason": ""}]}`,
    user: `Page: ${page.title}\nURL: ${page.url}\n\n${page.text}`,
  }).catch(() => ({ data: { spots: [] } }));
  return data.spots.map((s) => ({ ...s, source: { title: page.title || page.url, url: page.url } }));
}

export type ScoutDeps = { search: SearchProvider; readPage: (url: string) => Promise<{ title: string; text: string } | null>; geocoder: Geocoder; transport: Transport; model: string };
export type ScoutResult = { city: string; pages: number; found: number; matched: number; ms: number };

/** Scout one city: search the themes, read the pages, extract spots, match them to the map, store them. */
export async function scoutCity(cityName: string, d: ScoutDeps, opts: { pagesPerTheme?: number; themes?: string[] } = {}): Promise<ScoutResult> {
  const db = getDb();
  if (!db) throw new Error("no database");
  const t0 = performance.now();
  const place = await d.geocoder.geocode(cityName);
  if (!place?.bbox) throw new Error(`Could not find the city "${cityName}"`);
  const id = normaliseName(place.label.split(",")[0]).replace(/\s+/g, "-");
  const bbox = place.bbox;

  const raw: RawSpot[] = [];
  const seen = new Set<string>();
  let pages = 0;
  for (const theme of opts.themes ?? THEMES) {
    const hits = await d.search.search(theme.replace("{city}", cityName), opts.pagesPerTheme ?? 3).catch(() => []);
    for (const hit of hits) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      const page = await d.readPage(hit.url);
      if (!page || page.text.length < 400) continue;
      pages++;
      raw.push(...(await extractSpots(cityName, { ...page, url: hit.url }, d.transport, d.model)));
    }
  }

  const rows: (typeof spots.$inferInsert)[] = [];
  for (const a of aggregate(raw)) {
    const hit = (await d.geocoder.geocodeWithin(a.name, bbox).catch(() => null)) ?? (await d.geocoder.geocodeWithin(`${a.name}, ${cityName}`, bbox).catch(() => null));
    if (!hit) continue;
    rows.push({ cityId: id, name: a.name, category: a.category, lat: hit.lat, lon: hit.lon, osmId: hit.osmId ?? null, reason: a.reason, sources: a.sources.slice(0, 3), mentions: a.mentions });
  }

  await db.transaction(async (tx) => {
    await tx.insert(cities).values({ id, name: place.label.split(",")[0], lat: place.lat, lon: place.lon, ...bbox, scoutedAt: new Date(), sources: seen.size })
      .onConflictDoUpdate({ target: cities.id, set: { scoutedAt: new Date(), sources: seen.size } });
    await tx.delete(spots).where(eq(spots.cityId, id));
    if (rows.length) await tx.insert(spots).values(rows);
  });
  const result = { city: id, pages, found: raw.length, matched: rows.length, ms: Math.round(performance.now() - t0) };
  logEvent("scout.done", result);
  return result;
}
