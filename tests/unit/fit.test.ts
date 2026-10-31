import { describe, expect, it } from "vitest";
import { fitToBudget, stepsFor } from "@/lib/pipeline/fit";
import type { Route, Router } from "@/lib/providers/types";
import { CITY } from "../fixtures/city";

/** A fake router: 10 minutes and 800 m per leg, whatever the points. */
const fake: Router = {
  async walk(points) {
    const legs = points.slice(1).map(() => ({ distanceM: 800, durationS: 600 }));
    const r: Route = { distanceM: 800 * legs.length, durationS: 600 * legs.length, geometry: points, legs };
    return r;
  },
};

describe("fitToBudget", () => {
  const stops = [
    { ...CITY.circus, score: 5 },
    { ...CITY.royalCrescent, score: 9 },
    { ...CITY.parade, score: 1 },
  ];
  it("keeps every stop when the budget allows", async () => {
    const r = await fitToBudget(fake, CITY.abbey, null, stops, 120, "normal");
    expect(r.stops).toHaveLength(3);
    expect(r.totalMinutes).toBe(40 + 18);
  });
  it("drops the lowest-score stops until it fits", async () => {
    const r = await fitToBudget(fake, CITY.abbey, null, stops, 45, "normal");
    expect(r.stops.map((s) => s.score)).toEqual([5, 9]);
    const tight = await fitToBudget(fake, CITY.abbey, null, stops, 35, "normal");
    expect(tight.stops.map((s) => s.score)).toEqual([9]);
  });
  it("never drops the last stop", async () => {
    const r = await fitToBudget(fake, CITY.abbey, null, stops, 5, "normal");
    expect(r.stops).toHaveLength(1);
  });
  it("a relaxed pace takes longer than a brisk one", async () => {
    const slow = await fitToBudget(fake, CITY.abbey, null, stops, 999, "relaxed");
    const fast = await fitToBudget(fake, CITY.abbey, null, stops, 999, "brisk");
    expect(slow.walkingMinutes).toBeGreaterThan(fast.walkingMinutes);
  });
});

it("stepsFor assumes a 75 cm stride", () => expect(stepsFor(750)).toBe(1000));
