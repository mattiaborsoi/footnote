import { describe, expect, it } from "vitest";
import { pickDue } from "@/lib/scout/scheduler";
import { PLACES_VERSION } from "@/lib/pipeline/intent";
import { SCOUT_VERSION } from "@/lib/scout/index";
import { CITY } from "../fixtures/city";

const now = new Date("2026-11-02T12:00:00Z");
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
const city = (id: string, extra: Partial<Parameters<typeof pickDue>[0][number]> = {}) => ({
  id, name: id, lat: CITY.abbey.lat, lon: CITY.abbey.lon, south: 0, west: 0, north: 1, east: 1, sources: 0, status: "ready",
  scoutedAt: days(1), placesAt: days(1), placesVersion: PLACES_VERSION, scoutVersion: SCOUT_VERSION, ...extra,
});

describe("pickDue", () => {
  it("age makes a city due, oldest first", () => {
    const due = pickDue([city("a", { placesAt: days(8) }), city("b", { placesAt: days(9), scoutedAt: days(31) })], now);
    expect(due.places?.id).toBe("b");
    expect(due.scout?.id).toBe("b");
  });
  it("a cache filled with an older selector or theme set is due whatever its date", () => {
    const due = pickDue([city("a", { placesVersion: PLACES_VERSION - 1 }), city("b", { scoutVersion: SCOUT_VERSION - 1 })], now);
    expect(due.places?.id).toBe("a");
    expect(due.scout?.id).toBe("b");
  });
});
