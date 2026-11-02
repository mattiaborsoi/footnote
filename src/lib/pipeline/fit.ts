import { distanceM, type LatLng } from "../geo";
import type { Route, Router } from "../providers/types";
import { dwellMinutes, PACE_MPS } from "./intent";

export type Fitted<T> = { stops: T[]; route: Route; totalMinutes: number; walkingMinutes: number };

/** Routing-service minutes, adjusted for pace (the foot profile assumes a normal pace). */
export function walkingMinutes(route: Route, pace: keyof typeof PACE_MPS): number {
  return (route.durationS / 60) * (PACE_MPS.normal / PACE_MPS[pace]);
}

/** At most this share of the budget on foot: the rest is time at the stops, which is the point of the walk. */
export const MAX_WALKING_SHARE = 0.6;
/** No single stretch between stops longer than this on foot; beyond it the honest plan is a ride. */
export const MAX_LEG_MINUTES = 30;

type Stop = LatLng & { score: number; category?: string };

/** Minutes a stop costs: the detour it adds between its neighbours (routed legs against the straight line) plus the time spent there. */
function costMinutes(stops: Stop[], i: number, legs: number[], start: LatLng, end: LatLng): number {
  const prev = i === 0 ? start : stops[i - 1];
  const next = i === stops.length - 1 ? end : stops[i + 1];
  const direct = (distanceM(prev, next) * 1.3) / PACE_MPS.normal / 60;
  return Math.max(0, legs[i] + legs[i + 1] - direct) + dwellMinutes(stops[i].category);
}

/**
 * Route start → stops → end and trim until the walk is honest: within budget, walking at most
 * MAX_WALKING_SHARE of it, no leg over MAX_LEG_MINUTES. Over budget or too much walking drops the
 * stop that costs the most minutes for the least interest; a long leg drops its weaker end.
 * Deterministic, no model involved; the best-scored stop is never dropped while others remain.
 */
export async function fitToBudget<T extends Stop>(
  router: Router, start: LatLng, end: LatLng | null, stops: T[], minutes: number, pace: keyof typeof PACE_MPS,
): Promise<Fitted<T>> {
  const finish = end ?? start;
  let current = [...stops];
  for (;;) {
    const route = await router.walk([start, ...current, finish]);
    const scale = PACE_MPS.normal / PACE_MPS[pace];
    const legs = route.legs.map((l) => (l.durationS * scale) / 60);
    const walking = walkingMinutes(route, pace);
    const total = walking + current.reduce((m, s) => m + dwellMinutes(s.category), 0);
    const result = { stops: current, route, totalMinutes: Math.round(total), walkingMinutes: Math.round(walking) };
    if (current.length <= 1) return result;
    const longest = legs.reduce((w, l, i) => (l > legs[w] ? i : w), 0);
    const tooFar = total > minutes || walking > minutes * MAX_WALKING_SHARE;
    if (!tooFar && legs[longest] <= MAX_LEG_MINUTES) return result;
    const best = current.reduce((b, s) => (s.score > b.score ? s : b));
    let drop: T;
    if (tooFar) {
      const floor = Math.min(...current.map((s) => s.score));
      const price = (s: T, i: number) => costMinutes(current, i, legs, start, finish) / (s.score - floor + 1);
      drop = current.reduce((d, s, i) => (s !== best && (d === best || price(s, i) > price(d, current.indexOf(d))) ? s : d), best);
    } else {
      // Leg `longest` runs from stop longest-1 (or the start) to stop longest (or the end): drop the weaker real end.
      const ends = [current[longest - 1], current[longest]].filter((s): s is T => !!s);
      drop = ends.length === 2 ? (ends[0].score <= ends[1].score ? ends[0] : ends[1]) : ends[0];
    }
    current = current.filter((s) => s !== drop);
  }
}

export const stepsFor = (distanceM: number) => Math.round(distanceM / 0.75);
