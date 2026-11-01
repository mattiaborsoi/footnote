import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";
import { hashSecret, newToken } from "./codes";
import type { User } from "./index";

export const COOKIE = "fn_session";
const TTL_MS = 90 * 86_400_000;

/** A new session for a user; returns the raw token that goes into the cookie. */
export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("no database");
  const token = newToken();
  await db.insert(sessions).values({ tokenHash: hashSecret(token), userId, expiresAt: new Date(Date.now() + TTL_MS) });
  return token;
}

/** The one cookie this site sets: essential, HttpOnly, 90 days. Null clears it. */
export async function setSessionCookie(token: string | null): Promise<void> {
  const jar = await cookies();
  if (!token) { jar.delete(COOKIE); return; }
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: (process.env.APP_URL ?? "").startsWith("https"), path: "/", maxAge: TTL_MS / 1000 });
}

/** Who is signed in, from the cookie, or null. */
export async function currentUser(): Promise<User | null> {
  await connection(); // request time: the cookie and the clock are per request, never prerendered
  const db = getDb();
  if (!db) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db.select({ user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(eq(sessions.tokenHash, hashSecret(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return rows[0]?.user ?? null;
}

export async function signOut(): Promise<void> {
  const db = getDb();
  const token = (await cookies()).get(COOKIE)?.value;
  if (db && token) await db.delete(sessions).where(eq(sessions.tokenHash, hashSecret(token)));
  await setSessionCookie(null);
}
