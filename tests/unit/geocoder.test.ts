import { describe, expect, it } from "vitest";
import { chain } from "@/lib/providers/geocoder";
import { toResult } from "@/lib/providers/photon";
import { areaKind, type Geocoder, type GeocodeResult } from "@/lib/providers/types";
import { CITY } from "../fixtures/city";

const hit = (label: string): GeocodeResult => ({ ...CITY.abbey, label });
const stub = (geocode: () => Promise<GeocodeResult | null>): Geocoder => ({ geocode, geocodeWithin: geocode });

describe("chain", () => {
  it("returns the first answer and stops", async () => {
    let second = 0;
    const g = chain(stub(async () => hit("exact")), stub(async () => { second++; return hit("fuzzy"); }));
    expect((await g.geocode("abbey"))?.label).toBe("exact");
    expect(second).toBe(0);
  });
  it("falls through a miss to the typo-tolerant one", async () => {
    const g = chain(stub(async () => null), stub(async () => hit("fuzzy")));
    expect((await g.geocode("shagri la hotel"))?.label).toBe("fuzzy");
  });
  it("skips a failing service when a later one answers, and reports the error only when none does", async () => {
    const g = chain(stub(async () => { throw new Error("503"); }), stub(async () => hit("fuzzy")));
    expect((await g.geocode("x"))?.label).toBe("fuzzy");
    const dead = chain(stub(async () => { throw new Error("503"); }), stub(async () => null));
    await expect(dead.geocode("x")).rejects.toThrow("503");
    const none = chain(stub(async () => null), stub(async () => null));
    expect(await none.geocode("x")).toBeNull();
  });
});

describe("photon results", () => {
  it("labels a place by name, city and country and reads the area kind", () => {
    const r = toResult({ geometry: { coordinates: [CITY.abbey.lon, CITY.abbey.lat] }, properties: { name: "Bath Abbey", osm_key: "amenity", osm_value: "place_of_worship", osm_type: "W", osm_id: 5, city: "Bath", country: "United Kingdom" } });
    expect(r).toMatchObject({ label: "Bath Abbey, Bath, United Kingdom", osmId: "osm:way/5", city: "Bath", kind: "place" });
    const city = toResult({ geometry: { coordinates: [CITY.abbey.lon, CITY.abbey.lat] }, properties: { name: "Bath", osm_key: "place", osm_value: "city", country: "United Kingdom" } });
    expect(city).toMatchObject({ label: "Bath, United Kingdom", city: "Bath", kind: "area" });
  });
  it("areaKind knows towns from spots", () => {
    expect(areaKind("city")).toBe(true);
    expect(areaKind("suburb")).toBe(true);
    expect(areaKind("hotel")).toBe(false);
    expect(areaKind(undefined)).toBe(false);
  });
});
