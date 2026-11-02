import { describe, expect, it } from "vitest";
import { PLACES_VERSION } from "@/lib/pipeline/intent";
import { SCOUT_VERSION } from "@/lib/scout/index";
import { clampBbox, contains, INTEREST_CATEGORIES, isFresh } from "@/lib/scout/places";
import { pickDue } from "@/lib/scout/scheduler";
import { refreshStops } from "@/lib/pipeline/refresh";
import type { Walk } from "@/lib/pipeline/walk";
import { CITY } from "../fixtures/city";

describe("places cache", () => {
  it("clamps a huge city box to the core around the centre", () => {
    const big = { south: 50, north: 53, west: -4, east: -1 };
    const core = clampBbox(big, CITY.abbey, 6);
    expect(core.north - core.south).toBeCloseTo(12 / 111.32, 3);
    expect(contains(core, CITY.abbey)).toBe(true);
    expect(contains(core, { lat: 52, lon: -2 })).toBe(false);
  });
  it("knows what is fresh", () => {
    const now = new Date("2026-11-08T00:00:00Z");
    expect(isFresh(new Date("2026-11-05T00:00:00Z"), 7, now)).toBe(true);
    expect(isFresh(new Date("2026-10-20T00:00:00Z"), 7, now)).toBe(false);
    expect(isFresh(null, 7, now)).toBe(false);
  });
  it("maps every interest to cached categories", () => {
    for (const cats of Object.values(INTEREST_CATEGORIES)) expect(cats.length).toBeGreaterThan(0);
  });
});

describe("scheduler", () => {
  const row = (id: string, placesAt: string | null, scoutedAt: string | null) => ({ id, name: id, lat: 0, lon: 0, south: 0, west: 0, north: 1, east: 1, placesAt: placesAt ? new Date(placesAt) : null, scoutedAt: scoutedAt ? new Date(scoutedAt) : null, sources: 0, status: "pending", placesVersion: PLACES_VERSION, scoutVersion: SCOUT_VERSION });
  it("picks the never-cached city first, then the stalest", () => {
    const now = new Date("2026-11-08T00:00:00Z");
    const due = pickDue([row("a", "2026-11-07", "2026-11-01"), row("b", null, null), row("c", "2026-10-01", "2026-09-01")], now);
    expect(due.places?.id).toBe("b");
    expect(due.scout?.id).toBe("b");
    expect(pickDue([row("a", "2026-11-07", "2026-11-01"), row("c", "2026-10-01", "2026-09-01")], now)).toMatchObject({ places: { id: "c" }, scout: { id: "c" } });
  });
  it("picks nothing when everything is fresh", () => {
    expect(pickDue([row("a", "2026-11-07", "2026-11-01")], new Date("2026-11-08T00:00:00Z"))).toEqual({ places: null, scout: null });
  });
});

it("refreshStops recomputes arrivals and hours for another time", () => {
  const walk = {
    title: "t", summary: "s", start: { ...CITY.abbey, label: "x" }, end: null, totalMinutes: 40, walkingMinutes: 20, distanceM: 1000, steps: 1000, route: [], legs: [{ durationS: 600 }, { durationS: 600 }],
    stops: [
      { id: "1", name: "A", category: "cafe", ...CITY.circus, facts: ["Opening hours: Mo-Su 10:00-18:00"], hook: "", story: "", why: "" },
      { id: "2", name: "B", category: "park", ...CITY.parade, facts: [], hook: "", story: "", why: "" },
    ],
    googleMapsUrl: "", gpx: "", candidatesConsidered: 0, language: "en",
  } as unknown as Walk;
  const r = refreshStops(walk, "2026-11-08T17:45:00+00:00");
  expect(r.stops[0].arrival).toBe("17:55");
  expect(r.stops[0].open).toBe("open");
  expect(r.stops[0].hoursNote).toBe("open till 18:00");
  expect(r.stops[1].open).toBe("unknown");
  expect(refreshStops(walk, "2026-11-08T18:30:00+00:00").stops[0].open).toBe("closed");
});
