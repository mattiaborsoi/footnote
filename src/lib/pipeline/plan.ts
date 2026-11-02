import { distanceM, searchBBox } from "../geo";
import { logEvent } from "../log";
import type { Transport } from "../llm/client";
import { rank } from "./candidates";
import { curate } from "./curate";
import { fitToBudget, stepsFor } from "./fit";
import { googleMapsUrl, gpx } from "./export";
import { PACE_MPS, SELECTORS } from "./intent";
import { interpret } from "./interpret";
import { arrivalTimes, isLateHour, localAsUtc, openAt, openState, TIMED_CATEGORIES } from "./hours";
import { weatherFor } from "../providers/openmeteo";
import { loadSpotsInBbox, mergeScouted } from "../scout/spots";
import { cachedPlacesFor, registerCity } from "../scout/places";
import type { Providers, Walk } from "./walk";

/** A fact worth reading aloud while waiting: a real sentence, not a tag value. */
export function readsAsSentence(f: string): boolean {
  if (!/^(Recommended on|Description|Inscription)/.test(f)) return false;
  const body = f.replace(/^[^:]+: /, "");
  return body.split(/\s+/).length >= 6 && /[a-z]{3,}/i.test(body) && !/\d{1,2}:\d{2}/.test(body);
}

export type Stage = "understood" | "searching" | "probing" | "choosing" | "routing";
export type StageEvent = { stage: Stage; ms: number; detail: Record<string, unknown> };
export type Llm = { transport: Transport; models: { interpret: string; curate: string } };

/** The full pipeline with the model in the loop, reporting each stage as it finishes. */
export async function planWalk(raw: unknown, p: Providers, llm: Llm, emit: (e: StageEvent) => void = () => {}): Promise<Walk> {
  const t = () => performance.now();
  let t0 = t();
  const intent = await interpret(raw, llm.transport, llm.models.interpret);
  const coords = intent.start.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  const start = coords ? { lat: Number(coords[1]), lon: Number(coords[2]), label: "Your location" } : await p.geocoder.geocode(intent.start);
  if (!start) throw new Error(`Could not find "${intent.start}"`);
  const end = intent.end ? await p.geocoder.geocode(intent.end, start) : null;
  if (intent.end && !end) throw new Error(`Could not find "${intent.end}"`);
  emit({ stage: "understood", ms: Math.round(t() - t0), detail: { minutes: intent.minutes, pace: intent.pace, interests: intent.interests, companions: intent.companions, language: intent.language, start: { lat: start.lat, lon: start.lon, label: start.label }, end: end ? { lat: end.lat, lon: end.lon } : null } });

  t0 = t();
  const budgetM = intent.minutes * 60 * PACE_MPS[intent.pace];
  const direct = end ? distanceM(start, end) : 0;
  const corridorM = Math.max(300, (budgetM - direct) / 2);
  const bbox = searchBBox(start, end, end ? corridorM / 2 : budgetM / 4);
  const selectors = [...new Set(intent.interests.flatMap((i) => SELECTORS[i]))];
  const startAt = localAsUtc(intent.when);
  const endAt = new Date(startAt.getTime() + intent.minutes * 60_000);
  const cachedPlaces = await cachedPlacesFor(bbox, start, intent.interests, intent.language).catch(() => null);
  const [mapped, scouted, weather] = await Promise.all([
    cachedPlaces ?? p.places.search(bbox, selectors, intent.language),
    loadSpotsInBbox(bbox).catch(() => []),
    weatherFor(start, startAt, endAt).catch(() => null),
  ]);
  if (!cachedPlaces && start.city) void registerCity(start.city, p.geocoder).catch(() => null);
  const found = mergeScouted(mapped, scouted);
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
  const ranked = rank(withHours, start, end, corridorM, Math.min(60, 18 + targetStops * 3));
  emit({ stage: "searching", ms: Math.round(t() - t0), detail: { found: found.length, cached: !!cachedPlaces, scouted: scouted.length, start: { lat: start.lat, lon: start.lon }, end: end ? { lat: end.lat, lon: end.lon } : null, bbox, sample: ranked.flatMap((c) => c.facts.filter(readsAsSentence).slice(0, 1).map((f) => `${c.name}: ${f.replace(/^(Recommended on "[^"]*"|Description|Inscription): /, "")}`)).slice(0, 6), closed: found.length - withHours.length, kept: ranked.length, weather: weather?.summary ?? null, candidates: ranked.map((c) => ({ id: c.id, lat: c.lat, lon: c.lon })) } });

  t0 = t();
  // While the model chooses, route from the start to the best candidates: the browser animates these along the streets.
  const probing = (async () => {
    const targets = ranked.slice(0, 12);
    const routes = await Promise.all(targets.map((c) => p.router.walk([start, c]).then((rt) => rt.geometry).catch(() => null)));
    const paths = routes.filter((g): g is NonNullable<typeof g> => !!g && g.length > 1);
    emit({ stage: "probing", ms: Math.round(t() - t0), detail: { paths, targets: targets.filter((_, i) => routes[i]).map((c) => c.id) } });
  })().catch(() => undefined);
  const { curated, usage } = await curate({ ...intent, targetStops, vibe: [intent.vibe, weather?.nudge ? `Weather: ${weather.summary}. ${weather.nudge}` : weather ? `Weather: ${weather.summary}.` : ""].filter(Boolean).join(" ") }, ranked, llm.transport, llm.models.curate);
  const byId = new Map(ranked.map((c) => [c.id, c]));
  const chosen = curated.stops.map((s) => ({ ...byId.get(s.id)!, hook: s.hook, story: s.story, why: s.why }));
  await probing;
  emit({ stage: "choosing", ms: Math.round(t() - t0), detail: { stops: chosen.map((c) => c.id), usage } });

  t0 = t();
  const fitted = await fitToBudget(p.router, start, end, chosen, intent.minutes, intent.pace);
  const arrivals = arrivalTimes(startAt, fitted.route, fitted.stops.length, intent.pace);
  const stops = fitted.stops.map((s, i) => {
    const h = openAt(s.tags.opening_hours, arrivals[i]);
    const hour = arrivals[i].getUTCHours();
    const late = isLateHour(hour);
    const note = h.state === "unknown" ? (TIMED_CATEGORIES.has(s.category) && late ? "hours unknown, may be closed at this time" : TIMED_CATEGORIES.has(s.category) ? "hours unknown" : "") : h.note;
    const legMinutes = Math.max(1, Math.round(((fitted.route.legs[i]?.durationS ?? 0) * (PACE_MPS.normal / PACE_MPS[intent.pace])) / 60));
    return { id: s.id, name: s.name, category: s.category, lat: s.lat, lon: s.lon, facts: s.facts, hook: s.hook, story: s.story, why: s.why, arrival: arrivals[i].toISOString().slice(11, 16), open: h.state, hoursNote: note, legMinutes, sources: s.sources ?? [] };
  });
  emit({ stage: "routing", ms: Math.round(t() - t0), detail: { totalMinutes: fitted.totalMinutes, dropped: chosen.length - stops.length } });
  logEvent("walk.built", { minutes: intent.minutes, interests: intent.interests, companions: intent.companions, language: intent.language, candidates: ranked.length, stops: stops.length, totalMinutes: fitted.totalMinutes, usage });

  return {
    title: curated.title,
    summary: curated.summary,
    start, end, stops,
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
