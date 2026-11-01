import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { loginCodes, users } from "../db/schema";
import { newId } from "../ids";
import { logEvent } from "../log";
import { sendMail } from "../mail";
import { allow } from "../ratelimit";
import { CODE_TTL_MS, formatCode, hashSecret, MAX_ATTEMPTS, newCode, newToken, sameHash } from "./codes";
import { emailKey, isThrowaway, maskEmail } from "./normalise";

export type User = typeof users.$inferSelect;
export type Fail = { ok: false; error: string; status: number };
export type SignedIn = { ok: true; user: User; next: string | null };

/** A path on this site, or nothing: never an address elsewhere. */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.length < 200 && /^\/(?!\/)[\w\-./?=&%]*$/.test(next) ? next : null;
}

/** Step one: an email gets a six-digit code and a link, both good for fifteen minutes. */
export async function startSignIn(raw: string, next: string | null, ip: string): Promise<{ ok: true; masked: string } | Fail> {
  const email = raw.trim().toLowerCase();
  const key = emailKey(email);
  if (!key) return { ok: false, error: "That does not look like an email address.", status: 400 };
  if (isThrowaway(email)) return { ok: false, error: "Please use a lasting address: the walks you keep are tied to it.", status: 400 };
  if (!allow(`code:${key}`, 3, 15 * 60_000) || !allow(`code-ip:${ip}`, 10, 60 * 60_000)) return { ok: false, error: "Too many codes requested. Try again in a few minutes.", status: 429 };
  const db = getDb();
  if (!db) return { ok: false, error: "Sign-in is not available on this instance.", status: 503 };
  const code = newCode();
  const token = newToken();
  await db.insert(loginCodes).values({ emailKey: key, email, codeHash: hashSecret(code), linkHash: hashSecret(token), next: safeNext(next), expiresAt: new Date(Date.now() + CODE_TTL_MS) });
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  await sendMail({
    to: email,
    subject: `Your Footnote code: ${formatCode(code)}`,
    text: `Your sign-in code is ${formatCode(code)}. It works for 15 minutes.\n\nOr open this link on the device you are signing in from:\n${base}/signin/link?t=${token}\n\nIf you did not ask for this, ignore it: nothing happens without the code.`,
  });
  logEvent("auth.start", {});
  return { ok: true, masked: maskEmail(email) };
}

/** Step two, typed: the code against the latest unspent one for that address, five attempts. */
export async function verifyCode(raw: string, code: string): Promise<SignedIn | Fail> {
  const key = emailKey(raw);
  const db = getDb();
  if (!key || !db) return { ok: false, error: "Sign-in is not available.", status: 400 };
  if (!allow(`verify:${key}`, 12, 15 * 60_000)) return { ok: false, error: "Too many attempts. Ask for a new code.", status: 429 };
  const row = await db.query.loginCodes.findFirst({ where: and(eq(loginCodes.emailKey, key), isNull(loginCodes.usedAt), gt(loginCodes.expiresAt, new Date())), orderBy: desc(loginCodes.createdAt) });
  if (!row) return { ok: false, error: "That code has expired. Ask for a new one.", status: 400 };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many attempts. Ask for a new code.", status: 400 };
  if (!sameHash(row.codeHash, hashSecret(code.replace(/\D/g, "")))) {
    await db.update(loginCodes).set({ attempts: row.attempts + 1 }).where(eq(loginCodes.id, row.id));
    return { ok: false, error: "That code is not right.", status: 400 };
  }
  await db.update(loginCodes).set({ usedAt: new Date() }).where(eq(loginCodes.id, row.id));
  return { ok: true, user: await upsertUser(row.email, key), next: row.next };
}

/** Step two, clicked: the link's token, spent on use. */
export async function verifyLink(token: string): Promise<SignedIn | Fail> {
  const db = getDb();
  if (!db || !token) return { ok: false, error: "Sign-in is not available.", status: 400 };
  const row = await db.query.loginCodes.findFirst({ where: and(eq(loginCodes.linkHash, hashSecret(token)), isNull(loginCodes.usedAt), gt(loginCodes.expiresAt, new Date())) });
  if (!row) return { ok: false, error: "That link has expired. Ask for a new code.", status: 400 };
  await db.update(loginCodes).set({ usedAt: new Date() }).where(eq(loginCodes.id, row.id));
  return { ok: true, user: await upsertUser(row.email, row.emailKey), next: row.next };
}

async function upsertUser(email: string, key: string): Promise<User> {
  const db = getDb();
  if (!db) throw new Error("no database");
  const existing = await db.query.users.findFirst({ where: eq(users.emailKey, key) });
  if (existing) {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, existing.id));
    logEvent("auth.signed_in", {});
    return existing;
  }
  const [created] = await db.insert(users).values({ id: newId(12), email, emailKey: key }).returning();
  logEvent("auth.signed_up", {});
  return created;
}
