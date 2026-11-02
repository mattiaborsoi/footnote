import { z } from "zod";
import { ID_PATTERN, SESSION_PATTERN } from "./ids";

/** What the client may send to /api/events: a named event with a small bag of fields. */
export const ClientEvent = z.object({
  type: z.string().regex(/^[a-z][a-z0-9_.]{1,59}$/),
  walkId: z.string().regex(ID_PATTERN).optional(),
  sessionId: z.string().regex(SESSION_PATTERN).optional(),
  fields: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
}).refine((e) => JSON.stringify(e.fields).length <= 2000, { message: "fields too large" });
export type ClientEvent = z.infer<typeof ClientEvent>;

export const Feedback = z.object({
  message: z.string().trim().min(1).max(2000),
  screen: z.string().max(80).optional(),
  walkId: z.string().regex(ID_PATTERN).optional(),
  sessionId: z.string().regex(SESSION_PATTERN).optional(),
  contact: z.string().trim().max(120).optional(),
  context: z.record(z.string().max(40), z.union([z.string().max(500), z.number(), z.boolean()])).default({}).refine((c) => Object.keys(c).length <= 12, { message: "too much context" }),
});
