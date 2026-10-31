import { describe, expect, it } from "vitest";
import { googleMapsUrl, MAX_WAYPOINTS, gpx } from "@/lib/pipeline/export";
import { CITY } from "../fixtures/city";

describe("googleMapsUrl", () => {
  it("encodes origin, destination and waypoints for walking", () => {
    const url = googleMapsUrl(CITY.abbey, [CITY.circus], CITY.royalCrescent);
    expect(url).toContain("travelmode=walking");
    expect(url).toContain("origin=51.381300%2C-2.359000");
    expect(url).toContain("waypoints=51.386700%2C-2.363000");
    expect(url).toContain("destination=51.387100%2C-2.367800");
  });
  it("caps waypoints at nine and separates them with |", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ lat: 51.38 + i / 1000, lon: -2.36 }));
    const url = googleMapsUrl(CITY.abbey, many, null);
    expect(url.split("waypoints=")[1].split("&")[0].split("|")).toHaveLength(MAX_WAYPOINTS);
  });
  it("loops back to the start when there is no destination", () => {
    const url = googleMapsUrl(CITY.abbey, [], null);
    expect(url).toContain("destination=51.381300%2C-2.359000");
  });
});

describe("gpx", () => {
  it("escapes names and writes waypoints and a track", () => {
    const out = gpx("A & B", [{ ...CITY.circus, name: "The <Circus>" }], [CITY.abbey, CITY.circus]);
    expect(out).toContain("<name>A &amp; B</name>");
    expect(out).toContain("The &lt;Circus&gt;");
    expect(out.match(/<trkpt /g)).toHaveLength(2);
  });
});
