import { z } from "zod";
import { askJson, type Transport } from "../llm/client";
import type { Candidate } from "../providers/types";
import type { Intent } from "./intent";

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
  stops: z.array(CuratedStop).min(2).max(8),
});
export type Curated = z.infer<typeof Curated>;

export function describeCandidates(cands: Candidate[]): string {
  return cands
    .map((c, i) => `#${i} id=${c.id} · ${c.name} · ${c.category}${c.facts.length ? " · facts: " + c.facts.map((f, j) => `[${j}] ${f}`).join(" ") : " · no facts"}`)
    .join("\n");
}

/** Structural check fed back to the model on failure: ids must exist, be unique, and cite real facts. */
export function checkCurated(cands: Candidate[]): (c: Curated) => string | null {
  const byId = new Map(cands.map((c) => [c.id, c]));
  return (c) => {
    const seen = new Set<string>();
    for (const s of c.stops) {
      const cand = byId.get(s.id);
      if (!cand) return `unknown id ${s.id}: use only ids from the candidate list`;
      if (seen.has(s.id)) return `id ${s.id} appears twice`;
      seen.add(s.id);
      if (s.factsUsed.some((n) => n >= cand.facts.length)) return `factsUsed for ${s.id} cites a fact number that does not exist`;
    }
    return null;
  };
}

/** No facts, no stop: a stop that cites nothing is dropped after validation. */
export function dropUnsupported(c: Curated): Curated {
  return { ...c, stops: c.stops.filter((s) => s.factsUsed.length > 0) };
}

export async function curate(intent: Intent, cands: Candidate[], transport: Transport, model: string, maxStops = 6): Promise<{ curated: Curated; usage: { promptTokens: number; completionTokens: number } }> {
  const companions = intent.companions.filter((c) => c !== "me");
  const { data, usage } = await askJson(
    transport,
    Curated,
    {
      model,
      maxTokens: 3000,
      system: `You are Footnote's curator. You receive a walker's intent and a numbered list of real places, each with numbered facts. Choose between 3 and ${maxStops} stops that fit the intent and order them as a sensible walk from the start${intent.end ? " to the end" : " and back"}. For each stop write: "hook", one intriguing sentence of at most 90 characters, written as a lead not a label; "story", two or three short sentences; "why", one sentence tying it to the walker's interests${companions.length ? " or companions" : ""}. Use only the facts given and list the fact numbers you used in "factsUsed". A place with no facts, or whose facts you do not use, must not be chosen. Never invent names, dates, people or places. Prefer fewer good stops over padding. Also write a "title" (under 60 characters, no colon) and a two-sentence "summary". Write every text in the language "${intent.language}". JSON shape: {"title": "", "summary": "", "stops": [{"id": "", "hook": "", "story": "", "why": "", "factsUsed": [0]}]}`,
      user: `Intent: ${intent.minutes} minutes, ${intent.pace} pace, from "${intent.start}"${intent.end ? ` to "${intent.end}"` : ", a loop"}; interests: ${intent.interests.join(", ")}${companions.length ? `; walking with: ${companions.join(", ")}` : ""}${intent.avoid.length ? `; avoid: ${intent.avoid.join(", ")}` : ""}${intent.mustInclude.length ? `; must include: ${intent.mustInclude.join(", ")}` : ""}${intent.vibe ? `; in their words: "${intent.vibe}"` : ""}.\n\nCandidates:\n${describeCandidates(cands)}`,
    },
    checkCurated(cands),
  );
  return { curated: dropUnsupported(data), usage };
}
