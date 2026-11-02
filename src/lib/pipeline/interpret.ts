import { z } from "zod";
import { askJson, type Transport } from "../llm/client";
import { Intent, Interest, type Intent as IntentT } from "./intent";

export const Companion = z.enum(["me", "kids", "older", "limited_mobility", "pram"]);

/** The six questions, as the form sends them. */
export const RequestForm = z.object({
  start: z.string().min(1),
  end: z.object({ kind: z.enum(["same", "place", "transport", "anywhere"]), place: z.string().optional() }).default({ kind: "anywhere" }),
  minutes: z.number().int().min(15).max(480).default(90),
  companions: z.array(Companion).default(["me"]),
  interests: z.array(Interest).min(1),
  when: z.string().default("now"),
  notes: z.string().max(500).default(""),
  language: z.string().min(2).max(35).default("en"),
  pace: z.enum(["relaxed", "normal", "brisk"]).optional(),
});
export type RequestForm = z.infer<typeof RequestForm>;

const Extracted = z.object({
  avoid: z.array(z.string().max(80)).default([]),
  mustInclude: z.array(z.string().max(80)).default([]),
  endNear: z.string().max(80).nullable().default(null),
  interests: z.array(Interest).default([]),
});

export function paceFor(companions: RequestForm["companions"]): IntentT["pace"] {
  return companions.some((c) => c !== "me") ? "relaxed" : "normal";
}

/** Deterministic mapping of the form; the model is consulted only when the free-text line is filled. */
export async function interpret(raw: unknown, transport: Transport | null, model: string): Promise<IntentT> {
  const form = RequestForm.parse(raw);
  const base = {
    start: form.start,
    end: form.end.kind === "place" ? form.end.place ?? null : form.end.kind === "same" ? form.start : null,
    minutes: form.minutes,
    pace: form.pace ?? paceFor(form.companions),
    interests: [...form.interests],
    avoid: [] as string[],
    mustInclude: [] as string[],
    companions: form.companions,
    when: form.when,
    language: form.language,
    vibe: "",
  };
  if (!form.notes.trim() || !transport) return Intent.parse(base);
  const { data } = await askJson(transport, Extracted, {
    model,
    system: `You turn one free-text line from a walker into constraints for a walk planner. Extract only what is stated. "avoid": things to steer clear of (busy roads, hills, a place already seen). "mustInclude": places or kinds of place they want in. "endNear": a place or transport they want to finish near, else null. "interests": any of ${Interest.options.join(", ")} that the line clearly adds. Keep each item under 80 characters, in ${form.language}.`,
    user: form.notes,
    maxTokens: 400,
  });
  return Intent.parse({
    ...base,
    avoid: data.avoid,
    mustInclude: data.mustInclude,
    end: base.end ?? (data.endNear ? data.endNear : null),
    interests: [...new Set([...base.interests, ...data.interests])],
    vibe: form.notes.slice(0, 200),
  });
}
