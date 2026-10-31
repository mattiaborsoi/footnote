import { and, between, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { cities, places } from "../db/schema";
import { distanceM, type LatLng } from "../geo";
import { Interest, SELECTORS } from "../pipeline/intent";
import { logEvent } from "../log";
import type { BBox, Candidate, Geocoder, PlacesProvider } from "../providers/types";
import { normaliseName } from "./index";
import { displayName } from "../names";

/** Which cached categories answer an interest; the live selectors do the same by tag. */
export const INTEREST_CATEGORIES: Record<Interest, string[]> = {
  architecture: ["architecture", "memorial"], plaques: ["memorial"], cafes: ["cafe"], parks: ["park"], art: ["art", "museum"],
  views: ["view"], museums: ["museum"], shops: ["shop"], photo: ["view", "place", "architecture"], history: ["architecture", "memorial", "museum"],
  modern: ["architecture"], nature: ["park"], technology: ["museum"], gaming: ["shop"], craft: ["shop", "art"], film: ["place", "architecture"],
};

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
  for (const interest of Interest.options) {
    const found = await provider.search(box, SELECTORS[interest]).catch(() => [] as Candidate[]);
    for (const c of found) byId.set(c.id, c);
  }
  const rows = [...byId.values()].map((c) => ({ id: c.id, cityId: city.id, name: c.name, category: c.category, lat: c.lat, lon: c.lon, tags: c.tags, facts: c.facts }));
  await db.transaction(async (tx) => {
    await tx.delete(places).where(eq(places.cityId, city.id));
    for (let i = 0; i < rows.length; i += 500) await tx.insert(places).values(rows.slice(i, i + 500));
    await tx.update(cities).set({ placesAt: new Date(), status: "ready" }).where(eq(cities.id, city.id));
  });
  logEvent("cache.places", { city: city.id, places: rows.length });
  return rows.length;
}

/** Cached candidates for a walk, or null when no fresh city covers the start: the caller then goes live and registers the city. */
export async function cachedPlacesFor(bbox: BBox, start: LatLng, interests: Interest[], language = "en"): Promise<Candidate[] | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(cities).where(and(isNotNull(cities.placesAt), sql`${cities.south} <= ${start.lat} and ${cities.north} >= ${start.lat} and ${cities.west} <= ${start.lon} and ${cities.east} >= ${start.lon}`));
  const city = rows.find((c) => isFresh(c.placesAt, PLACES_FRESH_DAYS) && contains(clampBbox(c, c), start));
  if (!city) return null;
  const core = clampBbox(city, city);
  const outside = [bbox.south < core.south - 0.002, bbox.north > core.north + 0.002, bbox.west < core.west - 0.002, bbox.east > core.east + 0.002].some(Boolean);
  if (outside && distanceM(start, city) > 4000) return null;
  const wanted = new Set(interests.flatMap((i) => INTEREST_CATEGORIES[i]));
  const found = await db.select().from(places).where(and(eq(places.cityId, city.id), between(places.lat, bbox.south, bbox.north), between(places.lon, bbox.west, bbox.east)));
  return found.filter((p) => wanted.has(p.category)).map((p) => {
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
  await db.insert(cities).values({ id, name: cityName, lat: place.lat, lon: place.lon, ...place.bbox, status: "pending" }).onConflictDoNothing();
  logEvent("city.registered", { city: id });
  return id;
}
