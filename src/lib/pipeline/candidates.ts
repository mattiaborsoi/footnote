import { alongAxis, angleAround, detourM, distanceM, type LatLng } from "../geo";
import type { Candidate } from "../providers/types";

export type Scored = Candidate & { score: number };

/** Detail (how much there is to say) minus detour cost (how far off the way it is). */
export function score(c: Candidate, start: LatLng, end: LatLng | null, corridorM: number): number {
  const detail = Math.min(c.facts.length, 6) + (c.tags.wikipedia ? 2 : 0) + (c.tags.wikidata ? 1 : 0) + (c.boost ?? 0);
  const off = end ? detourM(start, end, c) : Math.max(0, distanceM(start, c) - corridorM / 2);
  return detail - (off / corridorM) * 4;
}

/** Same name within 60 m is the same place; keep the richer record. */
export function dedupe(list: Scored[]): Scored[] {
  const out: Scored[] = [];
  for (const c of list.sort((a, b) => b.score - a.score)) {
    const dup = out.find((o) => o.name.toLowerCase() === c.name.toLowerCase() && distanceM(o, c) < 60);
    if (!dup) out.push(c);
  }
  return out;
}

/**
 * The best `keep` candidates by score. Places that answer the walker's own interests (`anchor`) hold at least a
 * third of the pool: a game shop with one fact must not be crowded out by well-documented sights of other kinds,
 * or the curator never sees what was asked for.
 */
export function rank(cands: Candidate[], start: LatLng, end: LatLng | null, corridorM: number, keep = 50, anchor?: (c: Candidate) => boolean): Scored[] {
  const all = dedupe(cands.map((c) => ({ ...c, score: score(c, start, end, corridorM) })));
  if (!anchor) return all.slice(0, keep);
  const anchors = all.filter(anchor);
  const quota = Math.min(anchors.length, Math.ceil(keep / 3));
  const top = all.slice(0, keep);
  const missing = anchors.filter((a) => !top.includes(a)).slice(0, Math.max(0, quota - top.filter(anchor).length));
  if (!missing.length) return top;
  const others = top.filter((c) => !anchor(c));
  const dropped = new Set(others.slice(others.length - missing.length));
  return [...top.filter((c) => !dropped.has(c)), ...missing].sort((a, b) => b.score - a.score);
}

/** Without a model: the best few, spread across categories, in walking order. */
export function orderAlong<T extends LatLng>(stops: T[], start: LatLng, end: LatLng | null): T[] {
  if (end) return [...stops].sort((a, b) => alongAxis(start, end, a) - alongAxis(start, end, b));
  const c = { lat: avg(stops.map((s) => s.lat), start.lat), lon: avg(stops.map((s) => s.lon), start.lon) };
  const a0 = angleAround(c, start);
  const turn = (p: LatLng) => (angleAround(c, p) - a0 + 2 * Math.PI) % (2 * Math.PI);
  return [...stops].sort((a, b) => turn(a) - turn(b));
}

const avg = (xs: number[], fallback: number) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : fallback);
