import opening_hours from "opening_hours";
import type { Route } from "../providers/types";
import { DWELL_MIN_PER_STOP, PACE_MPS } from "./intent";

export type OpenState = "open" | "closed" | "unknown";
export type HoursCheck = { state: OpenState; note: string };

const fmt = (d: Date) => d.toISOString().slice(11, 16);

/**
 * Is a place open at some point in [from, to]? Uses the OSM opening_hours tag; anything we cannot
 * parse is "unknown" and never excludes a place. Times are read in UTC, so callers pass dates that
 * already carry the walker's local time as UTC (see localAsUtc).
 */
export function openState(tag: string | undefined, from: Date, to: Date): HoursCheck {
  if (!tag) return { state: "unknown", note: "" };
  try {
    const oh = new opening_hours(tag);
    if (oh.getState(from)) {
      const change = oh.getNextChange(from);
      return { state: "open", note: change && change < to ? `closes ${fmt(change)}` : "open throughout" };
    }
    const opens = oh.getNextChange(from);
    if (opens && opens <= to) return { state: "open", note: `opens ${fmt(opens)}` };
    return { state: "closed", note: opens ? `closed, opens ${opens.toISOString().slice(0, 16).replace("T", " ")}` : "closed" };
  } catch {
    return { state: "unknown", note: "" };
  }
}

/** Open at one instant, for the arrival check. */
export function openAt(tag: string | undefined, at: Date): HoursCheck {
  if (!tag) return { state: "unknown", note: "" };
  try {
    const oh = new opening_hours(tag);
    if (oh.getState(at)) {
      const change = oh.getNextChange(at);
      return { state: "open", note: change ? `open till ${fmt(change)}` : "open" };
    }
    const opens = oh.getNextChange(at);
    return { state: "closed", note: opens ? `closed when you'd arrive at ${fmt(at)}; opens ${fmt(opens)}` : "closed" };
  } catch {
    return { state: "unknown", note: "" };
  }
}

/**
 * Turns "2026-03-14T14:00:00+00:00" (the walker's local time with its offset) into a Date whose UTC
 * fields equal that local time, which is how opening_hours expects to read it. "now" uses the server clock.
 */
export function localAsUtc(when: string): Date {
  if (when === "now") return new Date();
  const m = when.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!m) return new Date();
  return new Date(`${m[1]}T${m[2]}:00Z`);
}

/** Arrival time at each stop: walking legs scaled for pace, plus a dwell at every previous stop. */
export function arrivalTimes(startAt: Date, route: Route, stopCount: number, pace: keyof typeof PACE_MPS): Date[] {
  const scale = PACE_MPS.normal / PACE_MPS[pace];
  let t = startAt.getTime();
  const out: Date[] = [];
  for (let i = 0; i < stopCount; i++) {
    const leg = route.legs[i]?.durationS ?? 0;
    t += leg * scale * 1000;
    out.push(new Date(t));
    t += DWELL_MIN_PER_STOP * 60_000;
  }
  return out;
}

/** Evening or early morning: when a timed place with unknown hours is probably shut. */
export const isLateHour = (hour: number) => hour >= 18 || hour < 8;

export const TIMED_CATEGORIES = new Set(["cafe", "shop", "museum", "art"]);
