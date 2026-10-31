import { distanceM, searchBBox, type LatLng } from "../geo";
import type { Geocoder, PlacesProvider, Router } from "../providers/types";
import { pickAndOrder, rank } from "./candidates";
import { fitToBudget, stepsFor } from "./fit";
import { googleMapsUrl, gpx } from "./export";
import { Intent, PACE_MPS, SELECTORS } from "./intent";

export type Walk = {
  title: string;
  summary: string;
  start: LatLng & { label: string };
  end: (LatLng & { label: string }) | null;
  stops: { id: string; name: string; category: string; lat: number; lon: number; facts: string[]; hook: string; story: string; why: string }[];
  totalMinutes: number;
  walkingMinutes: number;
  distanceM: number;
  steps: number;
  route: LatLng[];
  googleMapsUrl: string;
  gpx: string;
  candidatesConsidered: number;
  language: string;
};

export type Providers = { geocoder: Geocoder; places: PlacesProvider; router: Router };

/** The whole pipeline without a model: interpret is hard-coded, curation is score-based. */
export async function buildWalk(raw: unknown, p: Providers, maxStops = 6): Promise<Walk> {
  const intent = Intent.parse(raw);
  const start = await p.geocoder.geocode(intent.start);
  if (!start) throw new Error(`Could not find "${intent.start}"`);
  const end = intent.end ? await p.geocoder.geocode(intent.end, start) : null;
  if (intent.end && !end) throw new Error(`Could not find "${intent.end}"`);

  const budgetM = intent.minutes * 60 * PACE_MPS[intent.pace];
  const direct = end ? distanceM(start, end) : 0;
  const corridorM = Math.max(300, (budgetM - direct) / 2);
  const bbox = searchBBox(start, end, end ? corridorM / 2 : budgetM / 4);
  const selectors = [...new Set(intent.interests.flatMap((i) => SELECTORS[i]))];
  const found = await p.places.search(bbox, selectors);
  const ranked = rank(found, start, end, corridorM);
  const picked = pickAndOrder(ranked, start, end, maxStops);
  const fitted = await fitToBudget(p.router, start, end, picked, intent.minutes, intent.pace);

  const title = `A ${intent.minutes}-minute ${intent.interests.join(" and ")} walk`;
  const stops = fitted.stops.map((s) => ({
    id: s.id, name: s.name, category: s.category, lat: s.lat, lon: s.lon, facts: s.facts,
    hook: s.facts[0] ?? "",
    story: s.facts.length ? s.facts.join(". ") + "." : "",
    why: `Matches your interest in ${s.category}.`,
  }));
  return {
    title,
    summary: `${stops.length} real stops from open map data between ${start.label.split(",")[0]} and ${(end ?? start).label.split(",")[0]}.`,
    start, end, stops,
    totalMinutes: fitted.totalMinutes, walkingMinutes: fitted.walkingMinutes,
    distanceM: Math.round(fitted.route.distanceM), steps: stepsFor(fitted.route.distanceM),
    route: fitted.route.geometry,
    googleMapsUrl: googleMapsUrl(start, stops, end),
    gpx: gpx(title, stops, fitted.route.geometry),
    candidatesConsidered: ranked.length,
    language: intent.language,
  };
}
