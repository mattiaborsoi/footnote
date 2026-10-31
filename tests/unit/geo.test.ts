import { expect, it } from "vitest";
import { alongAxis, detourM, distanceM, searchBBox } from "@/lib/geo";
import { CITY } from "../fixtures/city";

it("distance from the Abbey to the Royal Crescent is roughly 850 m", () => {
  const d = distanceM(CITY.abbey, CITY.royalCrescent);
  expect(d).toBeGreaterThan(750);
  expect(d).toBeLessThan(950);
});
it("a point on the way has no detour; one off the way does", () => {
  expect(detourM(CITY.abbey, CITY.royalCrescent, CITY.circus)).toBeLessThan(150);
  expect(detourM(CITY.abbey, CITY.royalCrescent, CITY.parade)).toBeGreaterThan(150);
});
it("alongAxis is 0 at the start and 1 at the end", () => {
  expect(alongAxis(CITY.abbey, CITY.royalCrescent, CITY.abbey)).toBeCloseTo(0);
  expect(alongAxis(CITY.abbey, CITY.royalCrescent, CITY.royalCrescent)).toBeCloseTo(1);
});
it("searchBBox pads the corridor", () => {
  const b = searchBBox(CITY.abbey, CITY.royalCrescent, 500);
  expect(b.south).toBeLessThan(CITY.abbey.lat);
  expect(b.north).toBeGreaterThan(CITY.royalCrescent.lat);
});
