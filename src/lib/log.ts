import { getDb } from "./db";
import { events } from "./db/schema";

const DROP = new Set(["notes", "apiKey", "authorization", "email", "contact"]);

/** Product events: a JSON line on stdout and a row in the events table when there is a database. Never the free text. */
export function logEvent(type: string, fields: Record<string, unknown> = {}, ctx: { walkId?: string | null; sessionId?: string | null } = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) if (!DROP.has(k)) safe[k] = v;
  console.log(JSON.stringify({ ts: new Date().toISOString(), type, walkId: ctx.walkId ?? undefined, ...safe }));
  const db = getDb();
  if (db) void db.insert(events).values({ type, walkId: ctx.walkId ?? null, sessionId: ctx.sessionId ?? null, fields: safe }).catch((e) => console.error("event not stored", e));
}
