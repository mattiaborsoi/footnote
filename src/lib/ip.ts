import { hashSecret } from "./auth/codes";

/** The caller's address, hashed: only ever a rate-limit key, never stored. Behind Cloudflare the real address is in CF-Connecting-IP
 * (the origin's firewall only admits Cloudflare, so the header cannot be forged); elsewhere the first X-Forwarded-For entry. */
export function clientIpKey(req: Request): string {
  const ip = req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  return hashSecret(ip).slice(0, 16);
}
