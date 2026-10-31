import type { Route } from "../providers/types";
import { weatherFor } from "../providers/openmeteo";
import { arrivalTimes, localAsUtc, openAt } from "./hours";
import type { Walk } from "./walk";

type Pace = "relaxed" | "normal" | "brisk";

/** A stored walk re-checked for another day and time: arrivals, open-or-closed notes and weather. No model, no search. */
export function refreshStops(walk: Walk, when: string, pace: Pace = "normal"): Walk {
  const startAt = localAsUtc(when);
  const route: Route = { distanceM: walk.distanceM, durationS: 0, geometry: walk.route, legs: (walk.legs ?? []).map((l) => ({ distanceM: 0, durationS: l.durationS })) };
  const arrivals = arrivalTimes(startAt, route, walk.stops.length, pace);
  return {
    ...walk,
    startsAt: startAt.toISOString().slice(0, 16),
    stops: walk.stops.map((s, i) => {
      const tag = s.facts.find((f) => f.startsWith("Opening hours: "))?.slice("Opening hours: ".length);
      const h = openAt(tag, arrivals[i]);
      return { ...s, arrival: arrivals[i].toISOString().slice(11, 16), open: h.state, hoursNote: h.note };
    }),
  };
}

export async function refreshWalk(walk: Walk, when: string, pace: Pace = "normal"): Promise<Walk> {
  const refreshed = refreshStops(walk, when, pace);
  const startAt = localAsUtc(when);
  const weather = await weatherFor(walk.start, startAt, new Date(startAt.getTime() + walk.totalMinutes * 60_000)).catch(() => null);
  return { ...refreshed, weather };
}
