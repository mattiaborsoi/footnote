import type { Page } from "@playwright/test";
import { CITY } from "../fixtures/city";

/** A finished walk as the API returns it, in the fixture city. */
export const walkJson = {
  id: "abcdef2345", url: "/w/abcdef2345", title: "A test walk through the fixture city", summary: "Two real stops and nothing invented.",
  start: { ...CITY.abbey, label: "Abbey" }, end: null, language: "en", startsAt: "2026-11-08T11:00",
  stops: [
    { id: "osm:node/1", name: "The Circus", category: "architecture", ...CITY.circus, facts: ["Built: 1768"], hook: "Three terraces to the width of Stonehenge.", story: "A story.", why: "History.", arrival: "11:10", open: "unknown", hoursNote: "", sources: [] },
    { id: "osm:node/2", name: "Parade Gardens", category: "park", ...CITY.parade, facts: ["Opening hours: 10:00-18:00"], hook: "A riverside garden.", story: "Another story.", why: "Parks.", arrival: "11:30", open: "open", hoursNote: "open till 18:00", sources: [{ title: "A local blog", url: "https://example.com/blog" }] },
  ],
  totalMinutes: 40, walkingMinutes: 28, distanceM: 2100, steps: 2800, route: [CITY.abbey, CITY.circus, CITY.parade], legs: [{ durationS: 600 }, { durationS: 480 }],
  googleMapsUrl: "https://www.google.com/maps/dir/?api=1&travelmode=walking", gpx: "<gpx/>", candidatesConsidered: 12, weather: { summary: "Fair, 12°C", rainChance: 10, tempC: 12, nudge: null },
};

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** The planner's stream, as the server would send it for the walk above. */
export async function mockWalkStream(page: Page) {
  await page.route("**/api/walk", (route) => route.fulfill({
    status: 200, headers: { "content-type": "text/event-stream" },
    body:
      sse("stage", { stage: "understood", ms: 900, detail: { minutes: 40, pace: "normal", interests: ["history"], companions: ["me"], language: "en", start: { ...CITY.abbey, label: "Abbey, Somewhere" }, end: null } }) +
      sse("stage", { stage: "searching", ms: 1200, detail: { found: 20, cached: true, scouted: 2, kept: 12, start: CITY.abbey, end: null, bbox: { south: 51.37, west: -2.38, north: 51.40, east: -2.34 }, candidates: [{ id: "osm:node/1", ...CITY.circus }, { id: "osm:node/2", ...CITY.parade }], sample: ["The Circus: Built 1768"] } }) +
      sse("stage", { stage: "choosing", ms: 3000, detail: { stops: ["osm:node/1", "osm:node/2"] } }) +
      sse("stage", { stage: "routing", ms: 300, detail: { totalMinutes: 40, dropped: 0 } }) +
      sse("walk", walkJson),
  }));
  // The walk page is server-rendered from the database, which the test server does not have.
  await page.route("**/w/abcdef2345", (route) => route.fulfill({ status: 200, headers: { "content-type": "text/html" }, body: "<!doctype html><title>Your walk</title><h1>mock walk page</h1>" }));
}

export async function mockTiles(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#edebe4" } }] }) }));
}
