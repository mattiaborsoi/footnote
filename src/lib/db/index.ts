import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;
let db: Db | null | undefined;

/** The database, or null when DATABASE_URL is unset (the app still plans walks; nothing is stored). */
export function getDb(): Db | null {
  if (db !== undefined) return db;
  const url = process.env.DATABASE_URL;
  if (!url) return (db = null);
  db = drizzle(postgres(url, { max: 5 }), { schema });
  return db;
}
