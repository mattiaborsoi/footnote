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

export function rank(cands: Candidate[], start: LatLng, end: LatLng | null, corridorM: number, keep = 50): Scored[] {
  return dedupe(cands.map((c) => ({ ...c, score: score(c, start, end, corridorM) }))).slice(0, keep);
}

/** Without a model: the best few, spread across categories, in walking order. */
export function pickAndOrder(ranked: Scored[], start: LatLng, end: LatLng | null, max: number): Scored[] {
  const picked: Scored[] = [];
  const perCategory = new Map<string, number>();
  for (const c of ranked) {
    const n = perCategory.get(c.category) ?? 0;
    if (n >= Math.ceil(max / 2)) continue;
    picked.push(c);
    perCategory.set(c.category, n + 1);
    if (picked.length === max) break;
  }
  return orderAlong(picked, start, end);
}

export function orderAlong<T extends LatLng>(stops: T[], start: LatLng, end: LatLng | null): T[] {
  if (end) return [...stops].sort((a, b) => alongAxis(start, end, a) - alongAxis(start, end, b));
  const c = { lat: avg(stops.map((s) => s.lat), start.lat), lon: avg(stops.map((s) => s.lon), start.lon) };
  const a0 = angleAround(c, start);
  const turn = (p: LatLng) => (angleAround(c, p) - a0 + 2 * Math.PI) % (2 * Math.PI);
  return [...stops].sort((a, b) => turn(a) - turn(b));
}

const avg = (xs: number[], fallback: number) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : fallback);
