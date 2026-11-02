import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "./db";
import { walks } from "./db/schema";
import { newId } from "./ids";
import type { Walk } from "./pipeline/walk";

export type StoredWalk = Walk & { id: string; createdAt: string; ownerId?: string | null };

const toStored = (row: { id: string; createdAt: Date; walk: unknown; userId: string | null }): StoredWalk => ({ ...(row.walk as Walk), id: row.id, createdAt: row.createdAt.toISOString(), ownerId: row.userId });

export async function saveWalk(walk: Walk, request: unknown, sessionId: string | null, meta: { cityId?: string; preset?: string; fingerprint?: string; userId?: string } = {}): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const id = newId();
  await db.insert(walks).values({ id, sessionId, language: walk.language, title: walk.title, request: request as object, walk: walk as object, cityId: meta.cityId ?? null, preset: meta.preset ?? null, fingerprint: meta.fingerprint ?? null, userId: meta.userId ?? null });
  return id;
}

export async function loadWalk(id: string): Promise<StoredWalk | null> {
  const db = getDb();
  if (!db) return null;
  const row = await db.query.walks.findFirst({ where: eq(walks.id, id) });
  return row ? toStored(row) : null;
}

/** A walk built for the same request recently, if any. */
export async function findRecent(fingerprint: string, maxAgeHours = 24): Promise<StoredWalk | null> {
  const db = getDb();
  if (!db) return null;
  const row = await db.query.walks.findFirst({ where: and(eq(walks.fingerprint, fingerprint), gt(walks.createdAt, new Date(Date.now() - maxAgeHours * 3_600_000))), orderBy: desc(walks.createdAt) });
  return row ? toStored(row) : null;
}

/** The walks a person kept, newest first. */
export async function walksOf(userId: string, limit = 30): Promise<{ id: string; title: string; createdAt: string; totalMinutes: number }[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db.query.walks.findMany({ where: eq(walks.userId, userId), orderBy: desc(walks.createdAt), limit, columns: { id: true, title: true, createdAt: true, walk: true } });
  return rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.createdAt.toISOString(), totalMinutes: (r.walk as Walk).totalMinutes }));
}

export async function loadRequest(id: string): Promise<unknown | null> {
  const db = getDb();
  if (!db) return null;
  const row = await db.query.walks.findFirst({ where: eq(walks.id, id), columns: { request: true } });
  return row?.request ?? null;
}
