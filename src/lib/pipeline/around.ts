import { distanceM, searchBBox, type LatLng } from "../geo";
import type { PlacesProvider } from "../providers/types";
import { cachedPlacesFor } from "../scout/places";
import { loadSpotsInBbox, mergeScouted } from "../scout/spots";
import { localAsUtc, openAt, TIMED_CATEGORIES } from "./hours";
import { Interest, PACE_MPS, SELECTORS } from "./intent";

export type Option = { id: string; name: string; category: string; lat: number; lon: number; minutes: number; hook: string; hoursNote: string; open: "open" | "closed" | "unknown"; sources: { title: string; url: string }[] };

const REACH_M = 800;

/** Five things worth seeing within about ten minutes on foot, open now, no model involved. */
export async function aroundMe(at: LatLng, interests: Interest[], language: string, places: PlacesProvider, when = "now"): Promise<Option[]> {
  const bbox = searchBBox(at, null, REACH_M);
  const selectors = [...new Set(interests.flatMap((i) => SELECTORS[i]))];
  const cached = await cachedPlacesFor(bbox, at, interests, language).catch(() => null);
  const [mapped, scouted] = await Promise.all([cached ?? places.search(bbox, selectors, language), loadSpotsInBbox(bbox).catch(() => [])]);
  const now = localAsUtc(when);
  return mergeScouted(mapped, scouted)
    .map((c) => {
      const d = distanceM(at, c);
      const h = openAt(c.tags.opening_hours, new Date(now.getTime() + (d / PACE_MPS.normal) * 1000));
      const detail = Math.min(c.facts.length, 6) + (c.tags.wikipedia ? 2 : 0) + (c.boost ?? 0);
      return { c, d, h, score: detail - d / 200 };
    })
    .filter(({ c, d, h }) => d <= REACH_M && !(h.state === "closed" && TIMED_CATEGORIES.has(c.category)) && (c.facts.length > 0 || c.tags.wikipedia))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .sort((a, b) => a.d - b.d)
    .map(({ c, d, h }) => ({
      id: c.id, name: c.name, category: c.category, lat: c.lat, lon: c.lon,
      minutes: Math.max(1, Math.round(d / PACE_MPS.normal / 60)),
      hook: (c.facts.find((f) => f.startsWith("Recommended")) ?? c.facts.find((f) => !f.startsWith("Local name") && !f.startsWith("Wiki") && !f.startsWith("Hours")) ?? "").replace(/^Recommended on "[^"]*": /, "").slice(0, 140),
      hoursNote: h.note, open: h.state, sources: c.sources ?? [],
    }));
}
