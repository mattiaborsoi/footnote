import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { adminMarks, cities, events, feedback, users, walks } from "../db/schema";
import { adminDb } from "./db";

const since = (days: number) => new Date(Date.now() - days * 86_400_000);

/** How many of each event in the window. */
export async function eventCounts(days: number): Promise<Record<string, number>> {
  const db = adminDb();
  if (!db) return {};
  const rows = await db.select({ type: events.type, n: count() }).from(events).where(gt(events.ts, since(days))).groupBy(events.type);
  return Object.fromEntries(rows.map((r) => [r.type, r.n]));
}

/** Model tokens over built walks, for the cost estimate. */
export async function tokenTotals(days: number): Promise<{ walks: number; prompt: number; completion: number }> {
  const db = adminDb();
  if (!db) return { walks: 0, prompt: 0, completion: 0 };
  const [r] = await db.select({
    walks: count(),
    prompt: sql<number>`coalesce(sum((${events.fields}->'usage'->>'promptTokens')::bigint), 0)`,
    completion: sql<number>`coalesce(sum((${events.fields}->'usage'->>'completionTokens')::bigint), 0)`,
  }).from(events).where(and(eq(events.type, "walk.built"), gt(events.ts, since(days))));
  return { walks: r?.walks ?? 0, prompt: Number(r?.prompt ?? 0), completion: Number(r?.completion ?? 0) };
}

/** How long people waited: the served walk's total time, median and slow tail. */
export async function waitTimes(days: number): Promise<{ n: number; p50: number; p95: number }> {
  const db = adminDb();
  if (!db) return { n: 0, p50: 0, p95: 0 };
  const [r] = await db.select({
    n: count(),
    p50: sql<number>`coalesce(percentile_cont(0.5) within group (order by (${events.fields}->>'ms')::int), 0)`,
    p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by (${events.fields}->>'ms')::int), 0)`,
  }).from(events).where(and(eq(events.type, "walk.served"), gt(events.ts, since(days))));
  return { n: r?.n ?? 0, p50: Number(r?.p50 ?? 0), p95: Number(r?.p95 ?? 0) };
}

/** Per day: walks built, cache hits, errors, limited attempts, sign-ups. */
export async function daily(days: number): Promise<{ day: string; built: number; cached: number; errors: number; limited: number; signups: number }[]> {
  const db = adminDb();
  if (!db) return [];
  const rows = await db.execute<{ day: string; built: string; cached: string; errors: string; limited: string; signups: string }>(sql`
    select to_char(date_trunc('day', ts), 'YYYY-MM-DD') as day,
      count(*) filter (where type = 'walk.built') as built,
      count(*) filter (where type = 'walk.cache_hit') as cached,
      count(*) filter (where type = 'walk.error') as errors,
      count(*) filter (where type = 'walk.limited') as limited,
      count(*) filter (where type = 'auth.signed_up') as signups
    from events where ts > ${since(days).toISOString()}::timestamptz group by 1 order by 1`);
  return Array.from(rows).map((r) => ({ day: r.day, built: Number(r.built), cached: Number(r.cached), errors: Number(r.errors), limited: Number(r.limited), signups: Number(r.signups) }));
}

export type FeedbackRow = typeof feedback.$inferSelect & { done: boolean };

/** Every report, open ones first, with the owner's done mark from the local database. */
export async function feedbackList(limit = 200): Promise<FeedbackRow[]> {
  const db = adminDb();
  if (!db) return [];
  const [rows, marks] = await Promise.all([
    db.select().from(feedback).orderBy(desc(feedback.ts)).limit(limit),
    marksOf("feedback.done"),
  ]);
  return rows.map((r) => ({ ...r, done: marks.has(String(r.id)) })).sort((a, b) => Number(a.done) - Number(b.done));
}

export async function marksOf(kind: string): Promise<Map<string, Date>> {
  const db = getDb();
  if (!db) return new Map();
  const rows = await db.select().from(adminMarks).where(eq(adminMarks.kind, kind));
  return new Map(rows.map((r) => [r.key, r.ts]));
}

export async function setMark(kind: string, key: string, on: boolean): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (on) await db.insert(adminMarks).values({ kind, key }).onConflictDoUpdate({ target: [adminMarks.kind, adminMarks.key], set: { ts: new Date() } });
  else await db.delete(adminMarks).where(and(eq(adminMarks.kind, kind), eq(adminMarks.key, key)));
}

export type PersonRow = typeof users.$inferSelect & { walks: number };

export async function people(limit = 200): Promise<PersonRow[]> {
  const db = adminDb();
  if (!db) return [];
  const rows = await db.select({ user: users, walks: sql<number>`(select count(*) from walks w where w.user_id = users.id)` }).from(users).orderBy(desc(users.lastSeenAt)).limit(limit);
  return rows.map((r) => ({ ...r.user, walks: Number(r.walks) }));
}

export type WalkRow = { id: string; createdAt: Date; title: string; language: string; cityId: string | null; preset: string | null; owner: string | null; minutes: number; stops: number; start: string; interests: string };

export async function recentWalks(limit = 100): Promise<WalkRow[]> {
  const db = adminDb();
  if (!db) return [];
  const rows = await db.select({
    id: walks.id, createdAt: walks.createdAt, title: walks.title, language: walks.language, cityId: walks.cityId, preset: walks.preset, owner: users.email,
    minutes: sql<number>`coalesce((${walks.walk}->>'totalMinutes')::int, 0)`,
    stops: sql<number>`coalesce(jsonb_array_length(${walks.walk}->'stops'), 0)`,
    start: sql<string>`split_part(coalesce(${walks.walk}->'start'->>'label', ${walks.request}->>'start', ''), ',', 1) || case when position(',' in coalesce(${walks.walk}->'start'->>'label', '')) > 0 then ',' || split_part(${walks.walk}->'start'->>'label', ',', 2) else '' end`,
    interests: sql<string>`coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(${walks.request}->'interests') x), '')`,
  }).from(walks).leftJoin(users, eq(users.id, walks.userId)).orderBy(desc(walks.createdAt)).limit(limit);
  return rows.map((r) => ({ ...r, minutes: Number(r.minutes), stops: Number(r.stops) }));
}

export async function recentEvents(type: string | null, limit = 200) {
  const db = adminDb();
  if (!db) return [];
  const where = type ? eq(events.type, type) : undefined;
  return db.select().from(events).where(where).orderBy(desc(events.ts)).limit(limit);
}

export type CityRow = typeof cities.$inferSelect & { spots: number; places: number };

export async function cityList(): Promise<CityRow[]> {
  const db = adminDb();
  if (!db) return [];
  const rows = await db.select({
    city: cities,
    spots: sql<number>`(select count(*) from spots s where s.city_id = cities.id)`,
    places: sql<number>`(select count(*) from places p where p.city_id = cities.id)`,
  }).from(cities).orderBy(desc(cities.placesAt));
  return rows.map((r) => ({ ...r.city, spots: Number(r.spots), places: Number(r.places) }));
}
