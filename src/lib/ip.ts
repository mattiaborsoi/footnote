import { hashSecret } from "./auth/codes";

/** The caller's address behind the proxy, hashed: only ever a rate-limit key, never stored. */
export function clientIpKey(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  return hashSecret(ip).slice(0, 16);
}
