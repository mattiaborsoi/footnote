import { bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** A walk is a page: the request that made it and the result, under a short id in its link. */
export const walks = pgTable("walks", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sessionId: text("session_id"),
  language: text("language").notNull(),
  title: text("title").notNull(),
  request: jsonb("request").notNull(),
  walk: jsonb("walk").notNull(),
});

/** Product events: what people asked, how long each stage took, what they tapped, what failed. No cookies; ids come from the client. */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    type: text("type").notNull(),
    walkId: text("walk_id"),
    sessionId: text("session_id"),
    fields: jsonb("fields").notNull().default({}),
  },
  (t) => [index("events_ts_idx").on(t.ts), index("events_type_idx").on(t.type)],
);

/** The feedback button: a message with its context, never sent to GitHub. */
export const feedback = pgTable("feedback", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
  walkId: text("walk_id"),
  sessionId: text("session_id"),
  screen: text("screen"),
  message: text("message").notNull(),
  contact: text("contact"),
  context: jsonb("context").notNull().default({}),
});
