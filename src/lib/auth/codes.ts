import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const CODE_TTL_MS = 15 * 60_000;
export const MAX_ATTEMPTS = 5;

/** Six digits, typed on the device. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** 256 bits, opened from the email or kept in the session cookie. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What is stored: a hash with the instance's secret folded in, so a copy of the table alone signs nobody in. */
export function hashSecret(value: string, pepper = process.env.AUTH_SECRET ?? ""): string {
  return createHash("sha256").update(`${pepper}:${value}`).digest("hex");
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
