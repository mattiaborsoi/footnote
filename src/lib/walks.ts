import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { walks } from "./db/schema";
import { newId } from "./ids";
import type { Walk } from "./pipeline/walk";

export type StoredWalk = Walk & { id: string; createdAt: string };

export async function saveWalk(walk: Walk, request: unknown, sessionId: string | null): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const id = newId();
  await db.insert(walks).values({ id, sessionId, language: walk.language, title: walk.title, request: request as object, walk: walk as object });
  return id;
}

export async function loadWalk(id: string): Promise<StoredWalk | null> {
  const db = getDb();
  if (!db) return null;
  const row = await db.query.walks.findFirst({ where: eq(walks.id, id) });
  return row ? { ...(row.walk as Walk), id: row.id, createdAt: row.createdAt.toISOString() } : null;
}
