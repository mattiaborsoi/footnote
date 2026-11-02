import { describe, expect, it } from "vitest";
import { fitToBudget, MAX_WALKING_SHARE, stepsFor } from "@/lib/pipeline/fit";
import { distanceM } from "@/lib/geo";
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
  it("drops the stop that costs most for the least interest until it fits", async () => {
    const r = await fitToBudget(fake, CITY.abbey, null, stops, 55, "normal");
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

describe("fitToBudget keeps the walk honest", () => {
  /** A router whose legs are proportional to the straight line, so far-flung stops cost real minutes. */
  const real: Router = {
    async walk(points) {
      const legs = points.slice(1).map((p, i) => { const m = distanceM(points[i], p) * 1.3; return { distanceM: m, durationS: m / 1.35 }; });
      return { distanceM: legs.reduce((a, l) => a + l.distanceM, 0), durationS: legs.reduce((a, l) => a + l.durationS, 0), geometry: points, legs };
    },
  };
  const far = { lat: CITY.abbey.lat + 0.04, lon: CITY.abbey.lon, score: 8, category: "museum" }; // ~4.4 km north
  it("caps walking at 60% of the budget even when the total fits", async () => {
    const r = await fitToBudget(real, CITY.abbey, null, [{ ...CITY.circus, score: 5, category: "architecture" }, far], 240, "normal");
    expect(r.stops.map((s) => s.score)).toEqual([5]);
    expect(r.walkingMinutes).toBeLessThanOrEqual(240 * MAX_WALKING_SHARE);
  });
  it("drops the weaker end of a leg over 30 minutes", async () => {
    const near = { ...CITY.circus, score: 9, category: "architecture" };
    const r = await fitToBudget(real, CITY.abbey, null, [near, { ...far, score: 3 }], 480, "normal");
    expect(r.stops).toEqual([near]);
  });
  it("counts time at stops by category", async () => {
    const r = await fitToBudget(fake, CITY.abbey, null, [{ ...CITY.circus, score: 5, category: "museum" }, { ...CITY.parade, score: 4, category: "view" }], 480, "normal");
    expect(r.totalMinutes).toBe(30 + 30 + 8);
  });
  it("never drops the best stop while others remain", async () => {
    const stops = [{ ...CITY.circus, score: 2, category: "museum" }, { ...CITY.royalCrescent, score: 9, category: "museum" }, { ...CITY.parade, score: 1, category: "museum" }];
    const r = await fitToBudget(fake, CITY.abbey, null, stops, 60, "normal");
    expect(r.stops.map((s) => s.score)).toEqual([9]);
  });
});
