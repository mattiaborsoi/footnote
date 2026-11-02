import { asc, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { cities } from "../db/schema";
import { logEvent } from "../log";
import { configFromEnv, httpTransport } from "../llm/client";
import { geocoder } from "../providers/geocoder";
import { nominatim } from "../providers/nominatim";
import { overpass } from "../providers/overpass";
import { osrm } from "../providers/osrm";
import { readPage } from "../providers/readpage";
import { searxng } from "../providers/search";
import { scoutCity } from "./index";
import { cachePlaces, PLACES_FRESH_DAYS, SCOUT_FRESH_DAYS } from "./places";
import { buildPresets } from "./presets";

type CityRow = typeof cities.$inferSelect;

/** Which city is due: places first (cheap, no model), then one scout (web search and the cheap model). Pure, for tests. */
export function pickDue(rows: CityRow[], now = new Date()): { places: CityRow | null; scout: CityRow | null } {
  const stale = (at: Date | null, days: number) => !at || now.getTime() - at.getTime() >= days * 86_400_000;
  const byOldest = (a: Date | null, b: Date | null) => (a?.getTime() ?? 0) - (b?.getTime() ?? 0);
  const places = rows.filter((c) => stale(c.placesAt, PLACES_FRESH_DAYS)).sort((a, b) => byOldest(a.placesAt, b.placesAt))[0] ?? null;
  const scout = rows.filter((c) => stale(c.scoutedAt, SCOUT_FRESH_DAYS)).sort((a, b) => byOldest(a.scoutedAt, b.scoutedAt))[0] ?? null;
  return { places, scout };
}

let running: Promise<void> | null = null;

/** One tick: at most one city's places plus presets, and at most one city's scout, so public services see a gentle load. Never two at once. */
export function tick(): Promise<void> {
  if (running) return running;
  running = runTick().finally(() => { running = null; });
  return running;
}

async function runTick(): Promise<void> {
  const db = getDb();
  if (!db) return;
  const due = pickDue(await db.select().from(cities).where(or(isNull(cities.placesAt), isNull(cities.scoutedAt), lt(cities.placesAt, sql`now() - interval '${sql.raw(String(PLACES_FRESH_DAYS))} days'`), lt(cities.scoutedAt, sql`now() - interval '${sql.raw(String(SCOUT_FRESH_DAYS))} days'`))).orderBy(asc(cities.placesAt)));
  const cfg = configFromEnv();
  const llm = { transport: httpTransport(cfg), models: cfg.models };
  if (due.places) {
    const n = await cachePlaces(due.places, overpass).catch((e) => { console.error("cache failed", e); return 0; });
    const presets = n ? await buildPresets(due.places, { geocoder, places: overpass, router: osrm }, llm).catch(() => 0) : 0;
    logEvent("scheduler.places", { city: due.places.id, places: n, presets });
  }
  if (due.scout) {
    const r = await scoutCity(due.scout.name, { search: searxng, readPage, geocoder: nominatim, transport: llm.transport, model: cfg.models.interpret }).catch((e) => { console.error("scout failed", e); return null; });
    logEvent("scheduler.scout", { city: due.scout.id, matched: r?.matched ?? null });
  }
}

declare global {
  var footnoteScheduler: ReturnType<typeof setInterval> | undefined;
}

/** Every six hours, first run a minute after start. SCHEDULER=off disables it (tests, one-off containers). */
export function startScheduler(): void {
  if (process.env.SCHEDULER === "off" || globalThis.footnoteScheduler) return;
  const run = () => tick().catch((e) => console.error("scheduler tick failed", e));
  setTimeout(run, 60_000).unref();
  globalThis.footnoteScheduler = setInterval(run, 6 * 3600_000);
  globalThis.footnoteScheduler.unref();
}
