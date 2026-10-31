import { z } from "zod";

/** What the client may send to /api/events: a named event with a small bag of fields. */
export const ClientEvent = z.object({
  type: z.string().regex(/^[a-z][a-z0-9_.]{1,59}$/),
  walkId: z.string().regex(/^[a-z0-9]{6,16}$/).optional(),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional(),
  fields: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
}).refine((e) => JSON.stringify(e.fields).length <= 2000, { message: "fields too large" });
export type ClientEvent = z.infer<typeof ClientEvent>;

export const Feedback = z.object({
  message: z.string().trim().min(1).max(2000),
  screen: z.string().max(80).optional(),
  walkId: z.string().regex(/^[a-z0-9]{6,16}$/).optional(),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional(),
  contact: z.string().trim().max(120).optional(),
  context: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).default({}),
});
