import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type Db, getDb } from "../db";
import * as schema from "../db/schema";

let mirror: Db | null | undefined;

/** What the dashboard reads: the mirror pulled from production when ADMIN_DATABASE_URL is set, else this instance's own database. */
export function adminDb(): Db | null {
  if (mirror === undefined) {
    const url = process.env.ADMIN_DATABASE_URL;
    mirror = url ? drizzle(postgres(url, { max: 3 }), { schema }) : null;
  }
  return mirror ?? getDb();
}

export const readsMirror = (): boolean => !!process.env.ADMIN_DATABASE_URL;
