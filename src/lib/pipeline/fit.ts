import type { LatLng } from "../geo";
import type { Route, Router } from "../providers/types";
import { DWELL_MIN_PER_STOP, PACE_MPS } from "./intent";

export type Fitted<T> = { stops: T[]; route: Route; totalMinutes: number; walkingMinutes: number };

/** Routing-service minutes, adjusted for pace (the foot profile assumes a normal pace). */
export function walkingMinutes(route: Route, pace: keyof typeof PACE_MPS): number {
  return (route.durationS / 60) * (PACE_MPS.normal / PACE_MPS[pace]);
}

/**
 * Route start → stops → end; while over budget and more than one stop remains, drop the
 * lowest-score stop and route again. Deterministic, no model involved.
 */
export async function fitToBudget<T extends LatLng & { score: number }>(
  router: Router, start: LatLng, end: LatLng | null, stops: T[], minutes: number, pace: keyof typeof PACE_MPS,
): Promise<Fitted<T>> {
  let current = [...stops];
  for (;;) {
    const route = await router.walk([start, ...current, end ?? start]);
    const walking = walkingMinutes(route, pace);
    const total = walking + current.length * DWELL_MIN_PER_STOP;
    if (total <= minutes || current.length <= 1) return { stops: current, route, totalMinutes: Math.round(total), walkingMinutes: Math.round(walking) };
    const weakest = current.reduce((w, s) => (s.score < w.score ? s : w));
    current = current.filter((s) => s !== weakest);
  }
}

export const stepsFor = (distanceM: number) => Math.round(distanceM / 0.75);
