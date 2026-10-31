import { createHash } from "node:crypto";

/**
 * The same request within the same hour is the same walk: normalise the form and hash it, so a repeat
 * search is served from the walks table instead of the model.
 */
export function fingerprint(raw: Record<string, unknown>, now = new Date()): string {
  const str = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().replace(/\s+/g, " ") : "");
  const list = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(str))].sort() : []);
  const end = (raw.end ?? {}) as { kind?: string; place?: string };
  const when = str(raw.when);
  const hour = when && when !== "now" ? when.slice(0, 13) : `now:${Math.floor(now.getTime() / 3_600_000)}`;
  const key = JSON.stringify({
    start: str(raw.start), end: { kind: str(end.kind) || "anywhere", place: str(end.place) },
    minutes: Number(raw.minutes) || 90, companions: list(raw.companions), interests: list(raw.interests),
    pace: str(raw.pace), notes: str(raw.notes), language: str(raw.language) || "en", hour,
  });
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}
