import { distanceM, searchBBox, type LatLng } from "../geo";
import { logEvent } from "../log";
import type { Transport } from "../llm/client";
import { rank } from "./candidates";
import { curate } from "./curate";
import { fitToBudget, MAX_LEG_MINUTES, stepsFor } from "./fit";
import { googleMapsUrl, gpx } from "./export";
import { PACE_MPS, SELECTORS } from "./intent";
import { interpret } from "./interpret";
import { arrivalTimes, isLateHour, localAsUtc, openAt, openState, TIMED_CATEGORIES } from "./hours";
import { weatherFor } from "../providers/openmeteo";
import { loadSpotsInBbox, mergeScouted } from "../scout/spots";
import { cachedPlacesFor, matchesInterest, registerCity } from "../scout/places";
import { nearestStations } from "../providers/overpass";
import type { Providers, Walk } from "./walk";

/** A fact worth reading aloud while waiting: a real sentence, not a tag value. */
export function readsAsSentence(f: string): boolean {
  if (!/^(Recommended on|Description|Inscription)/.test(f)) return false;
  const body = f.replace(/^[^:]+: /, "");
  return body.split(/\s+/).length >= 6 && /[a-z]{3,}/i.test(body) && !/\d{1,2}:\d{2}/.test(body);
}

/** A whole city as the start: the walk begins where its places cluster, not at the administrative centre. The densest point is the candidate with most others within 600 m. */
export function densestPoint<T extends LatLng>(cands: T[]): T | null {
  let best: T | null = null, bestN = -1;
  for (const c of cands) {
    let n = 0;
    for (const o of cands) if (distanceM(c, o) < 600) n++;
    if (n > bestN) { best = c; bestN = n; }
  }
  return best;
}

/** Minutes on foot from the start as the crow flies with a street factor; a hint for the curator, not a routed figure. */
export const minutesFrom = (from: LatLng, to: LatLng, pace: keyof typeof PACE_MPS) => Math.round((distanceM(from, to) * 1.3) / PACE_MPS[pace] / 60);

export type Stage = "understood" | "searching" | "probing" | "choosing" | "routing";
export type StageEvent = { stage: Stage; ms: number; detail: Record<string, unknown> };
export type Llm = { transport: Transport; models: { interpret: string; curate: string } };

/** The full pipeline with the model in the loop, reporting each stage as it finishes. */
export async function planWalk(raw: unknown, p: Providers, llm: Llm, emit: (e: StageEvent) => void = () => {}): Promise<Walk> {
  const t = () => performance.now();
  let t0 = t();
  const intent = await interpret(raw, llm.transport, llm.models.interpret);
  const coords = intent.start.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  const found0 = coords ? { lat: Number(coords[1]), lon: Number(coords[2]), label: "Your location" as string, kind: "place" as const } : await p.geocoder.geocode(intent.start);
  if (!found0) throw new Error(`Could not find "${intent.start}"`);
  let start: typeof found0 = found0;
  const wholeArea = found0.kind === "area";
  const end = intent.end ? await p.geocoder.geocode(intent.end, start) : null;
  if (intent.end && !end) throw new Error(`Could not find "${intent.end}"`);
  emit({ stage: "understood", ms: Math.round(t() - t0), detail: { minutes: intent.minutes, pace: intent.pace, interests: intent.interests, companions: intent.companions, language: intent.language, start: { lat: start.lat, lon: start.lon, label: start.label }, end: end ? { lat: end.lat, lon: end.lon } : null } });

  t0 = t();
  const budgetM = intent.minutes * 60 * PACE_MPS[intent.pace];
  const direct = end ? distanceM(start, end) : 0;
  const corridorM = Math.max(300, (budgetM - direct) / 2);
  // Named a whole city: look wider than the walk itself reaches, then start where the places cluster.
  const bbox = searchBBox(start, end, end ? corridorM / 2 : Math.max(budgetM / 4, wholeArea ? 3000 : 0));
  const selectors = [...new Set(intent.interests.flatMap((i) => SELECTORS[i]))];
  const startAt = localAsUtc(intent.when);
  const endAt = new Date(startAt.getTime() + intent.minutes * 60_000);
  const cachedPlaces = await cachedPlacesFor(bbox, start, intent.interests, intent.language).catch(() => null);
  const [mapped, scouted, weather] = await Promise.all([
    cachedPlaces ?? p.places.search(bbox, selectors, intent.language).catch(async (err: unknown) => {
      // The live map server is down: an older cache of this city beats no walk at all.
      const stale = await cachedPlacesFor(bbox, start, intent.interests, intent.language, { stale: true }).catch(() => null);
      if (!stale) throw err;
      logEvent("places.stale", { error: String(err).slice(0, 80) });
      return stale;
    }),
    loadSpotsInBbox(bbox).catch(() => []),
    weatherFor(start, startAt, endAt).catch(() => null),
  ]);
  if (!cachedPlaces && start.city) void registerCity(start.city, p.geocoder).catch(() => null);
  const found = mergeScouted(mapped, scouted);
  let startNote: string | undefined;
  if (wholeArea && !end) {
    // Where the places for these interests cluster; when there are too few of those to say, where places cluster at all.
    const matching = found.filter((c) => intent.interests.some((i) => matchesInterest(i, c)));
    const core = densestPoint(matching.length >= 3 ? matching : found);
    if (core && distanceM(core, start) > 300) {
      const place = found0.city ?? found0.label.split(",")[0];
      start = { ...found0, lat: core.lat, lon: core.lon, label: `Central ${place}` };
      startNote = `You named ${place} rather than a spot in it, so the walk starts where its places cluster.`;
    }
  }
  // Hours: a timed place closed for the whole window is out; what stays carries its hours as a fact the model can cite.
  const startHour = startAt.getUTCHours();
  const lateStart = isLateHour(startHour);
  const withHours = found.flatMap((c) => {
    const h = openState(c.tags.opening_hours, startAt, endAt);
    if (h.state === "closed" && TIMED_CATEGORIES.has(c.category)) return [];
    const fact = h.state === "open" ? `Hours during the walk: ${h.note}` : h.state === "closed" ? `Hours: ${h.note}`
      : lateStart && TIMED_CATEGORIES.has(c.category) ? `Hours unknown; the walk is at ${startAt.toISOString().slice(11, 16)}, so this is likely closed and only worth it from outside` : null;
    return [fact ? { ...c, facts: [...c.facts, fact] } : c];
  });
  // Longer walks deserve more stops and a wider pool to choose from.
  const targetStops = Math.min(12, Math.max(4, Math.round(intent.minutes / 20)));
  // A pool of about seven places per stop wanted: enough choice, not a long read for the model.
  const ranked = rank(withHours, start, end, corridorM, Math.min(60, 18 + targetStops * 3)).map((c) => ({ ...c, minutesAway: minutesFrom(start, c, intent.pace) }));
  // An interest with under three real matches in the pool: the curator is told, so it chooses fewer stops and says so.
  const thin = intent.interests.filter((i) => ranked.filter((c) => matchesInterest(i, c)).length < 3);
  emit({ stage: "searching", ms: Math.round(t() - t0), detail: { found: found.length, cached: !!cachedPlaces, scouted: scouted.length, start: { lat: start.lat, lon: start.lon }, end: end ? { lat: end.lat, lon: end.lon } : null, bbox, sample: ranked.flatMap((c) => c.facts.filter(readsAsSentence).slice(0, 1).map((f) => `${c.name}: ${f.replace(/^(Recommended on "[^"]*"|Description|Inscription): /, "")}`)).slice(0, 6), closed: found.length - withHours.length, kept: ranked.length, weather: weather?.summary ?? null, candidates: ranked.map((c) => ({ id: c.id, lat: c.lat, lon: c.lon })) } });

  t0 = t();
  // While the model chooses, route from the start to the best candidates: the browser animates these along the streets.
  const probing = (async () => {
    const targets = ranked.slice(0, 12);
    const routes = await Promise.all(targets.map((c) => p.router.walk([start, c]).then((rt) => rt.geometry).catch(() => null)));
    const paths = routes.filter((g): g is NonNullable<typeof g> => !!g && g.length > 1);
    emit({ stage: "probing", ms: Math.round(t() - t0), detail: { paths, targets: targets.filter((_, i) => routes[i]).map((c) => c.id) } });
  })().catch(() => undefined);
  const { curated, usage } = await curate({ ...intent, targetStops, vibe: [intent.vibe, weather?.nudge ? `Weather: ${weather.summary}. ${weather.nudge}` : weather ? `Weather: ${weather.summary}.` : ""].filter(Boolean).join(" ") }, ranked, llm.transport, llm.models.curate, 6, { thin });
  const byId = new Map(ranked.map((c) => [c.id, c]));
  const chosen = curated.stops.map((s) => ({ ...byId.get(s.id)!, hook: s.hook, story: s.story, why: s.why }));
  if (!chosen.length) throw new Error("Nothing here to build a walk from: try another start or other interests");
  await probing;
  emit({ stage: "choosing", ms: Math.round(t() - t0), detail: { stops: chosen.map((c) => c.id), usage } });

  t0 = t();
  const fitted = await fitToBudget(p.router, start, end, chosen, intent.minutes, intent.pace);
  const arrivals = arrivalTimes(startAt, fitted.route, fitted.stops, intent.pace);
  const legHints = await transitHints(start, fitted.stops, end, fitted.route.legs.map((l) => (l.durationS * (PACE_MPS.normal / PACE_MPS[intent.pace])) / 60), intent.language).catch(() => [] as (string | undefined)[]);
  const stops = fitted.stops.map((s, i) => {
    const h = openAt(s.tags.opening_hours, arrivals[i]);
    const hour = arrivals[i].getUTCHours();
    const late = isLateHour(hour);
    const note = h.state === "unknown" ? (TIMED_CATEGORIES.has(s.category) && late ? "hours unknown, may be closed at this time" : TIMED_CATEGORIES.has(s.category) ? "hours unknown" : "") : h.note;
    const legMinutes = Math.max(1, Math.round(((fitted.route.legs[i]?.durationS ?? 0) * (PACE_MPS.normal / PACE_MPS[intent.pace])) / 60));
    return { id: s.id, name: s.name, category: s.category, lat: s.lat, lon: s.lon, facts: s.facts, hook: s.hook, story: s.story, why: s.why, arrival: arrivals[i].toISOString().slice(11, 16), open: h.state, hoursNote: note, legMinutes, legHint: legHints[i], sources: s.sources ?? [] };
  });
  emit({ stage: "routing", ms: Math.round(t() - t0), detail: { totalMinutes: fitted.totalMinutes, dropped: chosen.length - stops.length } });
  logEvent("walk.built", { minutes: intent.minutes, interests: intent.interests, companions: intent.companions, language: intent.language, candidates: ranked.length, stops: stops.length, totalMinutes: fitted.totalMinutes, walkingMinutes: fitted.walkingMinutes, thin, rebased: !!startNote, usage });

  return {
    title: curated.title,
    summary: curated.summary,
    start: { lat: start.lat, lon: start.lon, label: start.label }, startNote, end: end ? { lat: end.lat, lon: end.lon, label: end.label } : null, stops,
    totalMinutes: fitted.totalMinutes, walkingMinutes: fitted.walkingMinutes,
    distanceM: Math.round(fitted.route.distanceM), steps: stepsFor(fitted.route.distanceM),
    route: fitted.route.geometry,
    legs: fitted.route.legs.map((l) => ({ durationS: l.durationS })),
    googleMapsUrl: googleMapsUrl(start, stops, end),
    gpx: gpx(curated.title, stops, fitted.route.geometry),
    candidatesConsidered: ranked.length,
    language: intent.language,
    startsAt: startAt.toISOString().slice(0, 16),
    weather,
  };
}

/** For a leg still over MAX_LEG_MINUTES after fitting, the nearest stations at both ends: "or ride from A to B". One hint per stop, for the leg that reaches it. */
export async function transitHints(start: LatLng, stops: LatLng[], end: LatLng | null, legMinutes: number[], language: string): Promise<(string | undefined)[]> {
  const points = [start, ...stops, end ?? start];
  const long = legMinutes.map((m, i) => (m > MAX_LEG_MINUTES ? i : -1)).filter((i) => i >= 0 && i < stops.length);
  if (!long.length) return [];
  const ends = [...new Set(long.flatMap((i) => [i, i + 1]))];
  const stations = await nearestStations(ends.map((i) => points[i]), language);
  const at = new Map(ends.map((i, k) => [i, stations[k]]));
  const hints: (string | undefined)[] = [];
  for (const i of long) {
    const from = at.get(i), to = at.get(i + 1);
    hints[i] = from && to && from.name !== to.name ? `A long stretch on foot. Or ride from ${from.name} to ${to.name}.` : "A long stretch on foot.";
  }
  return hints;
}
