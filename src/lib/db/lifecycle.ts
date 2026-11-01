import { lt, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb } from "./index";
import { events, feedback, loginCodes, sessions, stripeEvents, walks } from "./schema";

export async function migrateDb(): Promise<void> {
  const db = getDb();
  if (db) await migrate(db, { migrationsFolder: "drizzle" });
}

/** Retention: events after 90 days, the free-text line of a request after 90 days, feedback after a year; spent codes, expired sessions and old webhook ids go too. */
export async function prune(now = new Date()): Promise<void> {
  const db = getDb();
  if (!db) return;
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
  await db.delete(events).where(lt(events.ts, days(90)));
  await db.update(walks).set({ request: sql`${walks.request} - 'notes'` }).where(lt(walks.createdAt, days(90)));
  await db.delete(feedback).where(lt(feedback.ts, days(365)));
  await db.delete(loginCodes).where(lt(loginCodes.expiresAt, days(1)));
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(stripeEvents).where(lt(stripeEvents.ts, days(90)));
}

export function startPruning(): void {
  prune().catch((e) => console.error("prune failed", e));
  setInterval(() => prune().catch((e) => console.error("prune failed", e)), 24 * 3600_000).unref();
}
