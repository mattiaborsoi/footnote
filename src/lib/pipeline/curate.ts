import { z } from "zod";
import { askJson, type Transport } from "../llm/client";
import type { Candidate } from "../providers/types";
import type { Intent } from "./intent";

/** What the model returns per stop: the candidate's line number, never its long id. */
export const ModelStop = z.object({
  n: z.number().int().nonnegative(),
  hook: z.string().min(5).max(120),
  story: z.string().min(10).max(800),
  why: z.string().min(5).max(240),
  factsUsed: z.array(z.number().int().nonnegative()).default([]),
});
export const ModelCurated = z.object({
  title: z.string().min(3).max(90),
  summary: z.string().min(10).max(320),
  stops: z.array(ModelStop).min(2).max(12),
});
export type ModelCurated = z.infer<typeof ModelCurated>;

export const CuratedStop = z.object({
  id: z.string(),
  hook: z.string().min(5).max(120),
  story: z.string().min(10).max(800),
  why: z.string().min(5).max(240),
  factsUsed: z.array(z.number().int().nonnegative()).default([]),
});
export const Curated = z.object({
  title: z.string().min(3).max(90),
  summary: z.string().min(10).max(320),
  stops: z.array(CuratedStop).min(2).max(12),
});
export type Curated = z.infer<typeof Curated>;

/** One line per place: its number, name, category and numbered facts. Ids stay on our side; a scouted fact keeps its reason, not its source title (the credit is attached locally). */
export function describeCandidates(cands: Candidate[]): string {
  return cands
    .map((c, i) => `#${i} ${c.name} · ${c.category}${c.facts.length ? " · " + c.facts.map((f, j) => `[${j}] ${f.replace(/^Recommended on "[^"]*": /, "Recommended: ")}`).join(" ") : " · no facts"}`)
    .join("\n");
}

/** Structural check fed back to the model on failure: numbers must exist, be unique, and cite real facts. */
export function checkCurated(cands: Candidate[]): (c: ModelCurated) => string | null {
  return (c) => {
    const seen = new Set<number>();
    for (const s of c.stops) {
      const cand = cands[s.n];
      if (!cand) return `unknown place #${s.n}: use only numbers from the candidate list`;
      if (seen.has(s.n)) return `place #${s.n} appears twice`;
      seen.add(s.n);
      if (s.factsUsed.some((k) => k >= cand.facts.length)) return `factsUsed for #${s.n} cites a fact number that does not exist`;
    }
    return null;
  };
}

/** Numbers back to ids. */
export function resolveCurated(c: ModelCurated, cands: Candidate[]): Curated {
  return { title: c.title, summary: c.summary, stops: c.stops.map(({ n, ...rest }) => ({ id: cands[n].id, ...rest })) };
}

/** No facts, no stop: a stop that cites nothing is dropped after validation. */
export function dropUnsupported(c: Curated): Curated {
  return { ...c, stops: c.stops.filter((s) => s.factsUsed.length > 0) };
}

export async function curate(intent: Intent, cands: Candidate[], transport: Transport, model: string, maxStops = 6): Promise<{ curated: Curated; usage: { promptTokens: number; completionTokens: number } }> {
  const companions = intent.companions.filter((c) => c !== "me");
  const target = intent.targetStops ?? maxStops;
  const minStops = Math.max(3, target - 2);
  const { data, usage } = await askJson(
    transport,
    ModelCurated,
    {
      model,
      maxTokens: 3000,
      system: `You are Footnote's curator. You receive a walker's intent and a numbered list of real places (#n), each with numbered facts. Choose between ${minStops} and ${Math.max(target, minStops)} stops that fit the intent; a ${intent.minutes}-minute walk wants about ${target} stops, so do not leave the walker trudging between few stops and order them as a sensible walk from the start${intent.end ? " to the end" : " and back"}. For each stop write: "hook", one intriguing sentence of at most 90 characters, written as a lead not a label; "story", two or three short sentences; "why", one sentence tying it to the walker's interests${companions.length ? " or companions" : ""}. Use only the facts given and list the fact numbers you used in "factsUsed". A place with no facts, or whose facts you do not use, must not be chosen. Never invent names, dates, people or places. Use the stop name as given (it is already in the walker's language where the data has one). Also write a "title" (under 60 characters, no colon) and a two-sentence "summary". Write every text in the language "${intent.language}". JSON shape: {"title": "", "summary": "", "stops": [{"n": 0, "hook": "", "story": "", "why": "", "factsUsed": [0]}]} where n is the place number.`,
      user: `Intent: ${intent.minutes} minutes, ${intent.pace} pace, from "${intent.start}"${intent.end ? ` to "${intent.end}"` : ", a loop"}; interests: ${intent.interests.join(", ")}${companions.length ? `; walking with: ${companions.join(", ")}` : ""}${intent.avoid.length ? `; avoid: ${intent.avoid.join(", ")}` : ""}${intent.mustInclude.length ? `; must include: ${intent.mustInclude.join(", ")}` : ""}${intent.vibe ? `; in their words: "${intent.vibe}"` : ""}.\n\nCandidates:\n${describeCandidates(cands)}`,
    },
    checkCurated(cands),
  );
  return { curated: dropUnsupported(resolveCurated(data, cands)), usage };
}
