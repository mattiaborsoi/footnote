import { distanceM, searchBBox } from "../geo";
import { logEvent } from "../log";
import type { Transport } from "../llm/client";
import { rank } from "./candidates";
import { curate } from "./curate";
import { fitToBudget, stepsFor } from "./fit";
import { googleMapsUrl, gpx } from "./export";
import { PACE_MPS, SELECTORS } from "./intent";
import { interpret } from "./interpret";
import { arrivalTimes, localAsUtc, openAt, openState, TIMED_CATEGORIES } from "./hours";
import { weatherFor } from "../providers/openmeteo";
import { loadSpotsInBbox, mergeScouted } from "../scout/spots";
import type { Providers, Walk } from "./walk";

export type Stage = "understood" | "searching" | "choosing" | "routing";
export type StageEvent = { stage: Stage; ms: number; detail: Record<string, unknown> };
export type Llm = { transport: Transport; models: { interpret: string; curate: string } };

/** The full pipeline with the model in the loop, reporting each stage as it finishes. */
export async function planWalk(raw: unknown, p: Providers, llm: Llm, emit: (e: StageEvent) => void = () => {}): Promise<Walk> {
  const t = () => performance.now();
  let t0 = t();
  const intent = await interpret(raw, llm.transport, llm.models.interpret);
  emit({ stage: "understood", ms: Math.round(t() - t0), detail: { minutes: intent.minutes, pace: intent.pace, interests: intent.interests, companions: intent.companions, language: intent.language } });

  t0 = t();
  const start = await p.geocoder.geocode(intent.start);
  if (!start) throw new Error(`Could not find "${intent.start}"`);
  const end = intent.end ? await p.geocoder.geocode(intent.end, start) : null;
  if (intent.end && !end) throw new Error(`Could not find "${intent.end}"`);
  const budgetM = intent.minutes * 60 * PACE_MPS[intent.pace];
  const direct = end ? distanceM(start, end) : 0;
  const corridorM = Math.max(300, (budgetM - direct) / 2);
  const bbox = searchBBox(start, end, end ? corridorM / 2 : budgetM / 4);
  const selectors = [...new Set(intent.interests.flatMap((i) => SELECTORS[i]))];
  const startAt = localAsUtc(intent.when);
  const endAt = new Date(startAt.getTime() + intent.minutes * 60_000);
  const [mapped, scouted, weather] = await Promise.all([p.places.search(bbox, selectors), loadSpotsInBbox(bbox).catch(() => []), weatherFor(start, startAt, endAt).catch(() => null)]);
  const found = mergeScouted(mapped, scouted);
  // Hours: a timed place closed for the whole window is out; what stays carries its hours as a fact the model can cite.
  const withHours = found.flatMap((c) => {
    const h = openState(c.tags.opening_hours, startAt, endAt);
    if (h.state === "closed" && TIMED_CATEGORIES.has(c.category)) return [];
    const fact = h.state === "open" ? `Hours during the walk: ${h.note}` : h.state === "closed" ? `Hours: ${h.note}` : null;
    return [fact ? { ...c, facts: [...c.facts, fact] } : c];
  });
  const ranked = rank(withHours, start, end, corridorM, 40);
  emit({ stage: "searching", ms: Math.round(t() - t0), detail: { found: found.length, scouted: scouted.length, closed: found.length - withHours.length, kept: ranked.length, weather: weather?.summary ?? null, candidates: ranked.map((c) => ({ id: c.id, lat: c.lat, lon: c.lon })) } });

  t0 = t();
  const { curated, usage } = await curate({ ...intent, vibe: [intent.vibe, weather?.nudge ? `Weather: ${weather.summary}. ${weather.nudge}` : weather ? `Weather: ${weather.summary}.` : ""].filter(Boolean).join(" ") }, ranked, llm.transport, llm.models.curate);
  const byId = new Map(ranked.map((c) => [c.id, c]));
  const chosen = curated.stops.map((s) => ({ ...byId.get(s.id)!, hook: s.hook, story: s.story, why: s.why }));
  emit({ stage: "choosing", ms: Math.round(t() - t0), detail: { stops: chosen.map((c) => c.id), usage } });

  t0 = t();
  const fitted = await fitToBudget(p.router, start, end, chosen, intent.minutes, intent.pace);
  const arrivals = arrivalTimes(startAt, fitted.route, fitted.stops.length, intent.pace);
  const stops = fitted.stops.map((s, i) => {
    const h = openAt(s.tags.opening_hours, arrivals[i]);
    return { id: s.id, name: s.name, category: s.category, lat: s.lat, lon: s.lon, facts: s.facts, hook: s.hook, story: s.story, why: s.why, arrival: arrivals[i].toISOString().slice(11, 16), open: h.state, hoursNote: h.note, sources: s.sources ?? [] };
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
    googleMapsUrl: googleMapsUrl(start, stops, end),
    gpx: gpx(curated.title, stops, fitted.route.geometry),
    candidatesConsidered: ranked.length,
    language: intent.language,
    startsAt: startAt.toISOString().slice(0, 16),
    weather,
  };
}
