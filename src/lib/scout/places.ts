import { and, between, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { cities, places } from "../db/schema";
import { distanceM, type LatLng } from "../geo";
import { Interest, PLACES_VERSION, SELECTORS } from "../pipeline/intent";
import { logEvent } from "../log";
import type { BBox, Candidate, Geocoder, PlacesProvider } from "../providers/types";
import { normaliseName } from "./index";
import { displayName } from "../names";

/** Which cached categories answer an interest; the live selectors do the same by tag. */
export const INTEREST_CATEGORIES: Record<Interest, string[]> = {
  architecture: ["architecture", "memorial"], plaques: ["memorial"], cafes: ["cafe"], parks: ["park"], art: ["art", "museum"],
  views: ["view"], museums: ["museum"], shops: ["shop"], photo: ["view", "place", "architecture"], history: ["architecture", "memorial", "museum"],
  modern: ["architecture"], nature: ["park"], technology: ["museum", "tech"], gaming: ["games"], craft: ["shop", "art"], film: ["place", "architecture"],
};

/** Where a category is broader than the interest (every museum answers "museums", only some answer "technology"), the tags decide. */
export const INTEREST_FILTER: Partial<Record<Interest, (c: { category: string; tags: Record<string, string> }) => boolean>> = {
  technology: (c) => c.category !== "museum" || /technology|science|computer|industr|transport|railway|space/i.test(c.tags.museum ?? ""),
};

export const matchesInterest = (interest: Interest, c: { category: string; tags: Record<string, string> }) => INTEREST_CATEGORIES[interest].includes(c.category) && (INTEREST_FILTER[interest]?.(c) ?? true);

export const PLACES_FRESH_DAYS = 7;
export const SCOUT_FRESH_DAYS = 30;

/** A city's core: its box, but never more than `maxKm` from the centre, so one fetch stays within the places server's limits. */
export function clampBbox(bbox: BBox, centre: LatLng, maxKm = 6): BBox {
  const dLat = maxKm / 111.32;
  const dLon = maxKm / (111.32 * Math.cos((centre.lat * Math.PI) / 180));
  return {
    south: Math.max(bbox.south, centre.lat - dLat), north: Math.min(bbox.north, centre.lat + dLat),
    west: Math.max(bbox.west, centre.lon - dLon), east: Math.min(bbox.east, centre.lon + dLon),
  };
}

export const contains = (b: BBox, p: LatLng) => p.lat >= b.south && p.lat <= b.north && p.lon >= b.west && p.lon <= b.east;
export const isFresh = (at: Date | null | undefined, days: number, now = new Date()) => !!at && now.getTime() - at.getTime() < days * 86_400_000;

/** Fetch every selector for the city core, one interest at a time, and replace the city's cached places. */
export async function cachePlaces(city: { id: string; lat: number; lon: number; south: number; west: number; north: number; east: number }, provider: PlacesProvider): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const box = clampBbox(city, city);
  const byId = new Map<string, Candidate>();
  // A dense city can time out one interest's fetch; that is retried once with a longer limit, and a second failure
  // aborts the refresh so the previous cache stays whole (a cache with holes would be served as the truth for a week).
  for (const interest of Interest.options) {
    const found = await provider.search(box, SELECTORS[interest], "en", { timeoutS: 60 }).catch(async (err: unknown) => {
      logEvent("cache.retry", { city: city.id, interest, error: String(err).slice(0, 120) });
      await new Promise((r) => setTimeout(r, 15_000));
      return provider.search(box, SELECTORS[interest], "en", { timeoutS: 120 });
    });
    for (const c of found) byId.set(c.id, c);
  }
  const rows = [...byId.values()].map((c) => ({ id: c.id, cityId: city.id, name: c.name, category: c.category, lat: c.lat, lon: c.lon, tags: c.tags, facts: c.facts }));
  await db.transaction(async (tx) => {
    await tx.delete(places).where(eq(places.cityId, city.id));
    for (let i = 0; i < rows.length; i += 500) await tx.insert(places).values(rows.slice(i, i + 500));
    await tx.update(cities).set({ placesAt: new Date(), placesVersion: PLACES_VERSION, status: "ready" }).where(eq(cities.id, city.id));
  });
  logEvent("cache.places", { city: city.id, places: rows.length });
  return rows.length;
}

/** Cached candidates for a walk, or null when no fresh city covers the start: the caller then goes live and registers the city. With `stale`, any cache covering the start will do: the fallback when the live search fails. */
export async function cachedPlacesFor(bbox: BBox, start: LatLng, interests: Interest[], language = "en", opts: { stale?: boolean } = {}): Promise<Candidate[] | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(cities).where(and(isNotNull(cities.placesAt), sql`${cities.south} <= ${start.lat} and ${cities.north} >= ${start.lat} and ${cities.west} <= ${start.lon} and ${cities.east} >= ${start.lon}`));
  // A cache filled with an older selector set has no row for the newer categories, so it does not count as covering the start.
  const usable = (c: (typeof rows)[number]) => opts.stale || (isFresh(c.placesAt, PLACES_FRESH_DAYS) && c.placesVersion === PLACES_VERSION);
  const city = rows.find((c) => usable(c) && contains(clampBbox(c, c), start));
  if (!city) return null;
  const core = clampBbox(city, city);
  const outside = [bbox.south < core.south - 0.002, bbox.north > core.north + 0.002, bbox.west < core.west - 0.002, bbox.east > core.east + 0.002].some(Boolean);
  if (outside && distanceM(start, city) > 4000) return null;
  const found = await db.select().from(places).where(and(eq(places.cityId, city.id), between(places.lat, bbox.south, bbox.north), between(places.lon, bbox.west, bbox.east)));
  return found.filter((p) => interests.some((i) => matchesInterest(i, { category: p.category, tags: p.tags as Record<string, string> }))).map((p) => {
    const tags = p.tags as Record<string, string>;
    const { name, localName } = displayName(tags, language);
    const facts = (p.facts as string[]).filter((f) => !f.startsWith("Local name: "));
    return { id: p.id, name: name || p.name, category: p.category, lat: p.lat, lon: p.lon, tags, facts: localName ? [`Local name: ${localName}`, ...facts] : facts };
  });
}

/** Make sure the start's city has a row, so the scheduler caches and scouts it. */
export async function registerCity(cityName: string, geocoder: Geocoder): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const id = normaliseName(cityName).replace(/\s+/g, "-");
  if (!id) return null;
  const existing = await db.query.cities.findFirst({ where: eq(cities.id, id), columns: { id: true } });
  if (existing) return id;
  const place = await geocoder.geocode(cityName).catch(() => null);
  if (!place?.bbox) return null;
  // The same city under another name (local script from one geocoder, English from another): one row, not two caches.
  const known = await db.select({ id: cities.id }).from(cities).where(sql`${cities.south} <= ${place.lat} and ${cities.north} >= ${place.lat} and ${cities.west} <= ${place.lon} and ${cities.east} >= ${place.lon}`);
  const same = known.find((c) => c.id !== id);
  if (same) return same.id;
  await db.insert(cities).values({ id, name: cityName, lat: place.lat, lon: place.lon, ...place.bbox, status: "pending" }).onConflictDoNothing();
  logEvent("city.registered", { city: id });
  return id;
}
