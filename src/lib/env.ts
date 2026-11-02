/** The instance's public address, without a trailing slash. */
export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Cookies are secure in production, and anywhere the public address is https. */
export const secureCookies = () => process.env.NODE_ENV === "production" || appUrl().startsWith("https");

/** A number from the environment, or the fallback when unset or out of range. */
export function envNumber(name: string, fallback: number, min = 0): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= min ? n : fallback;
}
