import { describe, expect, it, vi } from "vitest";
import { CITY } from "../fixtures/city";

vi.mock("@/lib/providers/overpass", () => ({
  nearestStations: vi.fn(async (points: { lat: number }[]) => points.map((p) => (p.lat > 51.4 ? { ...p, name: "North station" } : { ...p, name: "Spa station" }))),
}));

const { densestPoint, minutesFrom, transitHints } = await import("@/lib/pipeline/plan");

describe("densestPoint", () => {
  it("picks the place with most neighbours within 600 m", () => {
    const cluster = [CITY.abbey, CITY.parade, { lat: CITY.abbey.lat + 0.001, lon: CITY.abbey.lon }];
    const lonely = { lat: CITY.abbey.lat + 0.05, lon: CITY.abbey.lon };
    expect(densestPoint([lonely, ...cluster])).not.toBe(lonely);
    expect(densestPoint([])).toBeNull();
  });
});

it("minutesFrom is a street-factored straight line at the walker's pace", () => {
  expect(minutesFrom(CITY.abbey, CITY.abbey, "normal")).toBe(0);
  expect(minutesFrom(CITY.abbey, CITY.royalCrescent, "relaxed")).toBeGreaterThan(minutesFrom(CITY.abbey, CITY.royalCrescent, "brisk"));
});

describe("transitHints", () => {
  const north = { lat: 51.45, lon: CITY.abbey.lon };
  it("names the stations at both ends of a long leg only", async () => {
    const hints = await transitHints(CITY.abbey, [CITY.circus, north], null, [8, 55, 50], "en");
    expect(hints[0]).toBeUndefined();
    expect(hints[1]).toBe("A long stretch on foot. Or ride from Spa station to North station.");
  });
  it("says so without a ride when both ends share a station", async () => {
    const hints = await transitHints(CITY.abbey, [CITY.circus], null, [45, 8], "en");
    expect(hints[0]).toBe("A long stretch on foot.");
  });
  it("asks nothing when no leg is long", async () => {
    expect(await transitHints(CITY.abbey, [CITY.circus], null, [8, 8], "en")).toEqual([]);
  });
});
