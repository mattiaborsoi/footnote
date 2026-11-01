import { bigserial, doublePrecision, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/** A walk is a page: the request that made it and the result, under a short id in its link. */
export const walks = pgTable("walks", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sessionId: text("session_id"),
  language: text("language").notNull(),
  title: text("title").notNull(),
  request: jsonb("request").notNull(),
  walk: jsonb("walk").notNull(),
  cityId: text("city_id"),
  preset: text("preset"),
  fingerprint: text("fingerprint"),
  userId: text("user_id"),
}, (t) => [index("walks_fingerprint_idx").on(t.fingerprint, t.createdAt), index("walks_user_idx").on(t.userId, t.createdAt)]);

/** A person: one row per normalised email, the plan they are on and the Stripe customer behind it. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  emailKey: text("email_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  language: text("language").notNull().default("en"),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").notNull().default("none"), // none | week | month
  planStatus: text("plan_status").notNull().default("none"), // none | active | past_due | cancelled
  planStartsAt: timestamp("plan_starts_at", { withTimezone: true }),
  planEndsAt: timestamp("plan_ends_at", { withTimezone: true }),
  subscriptionId: text("subscription_id"),
});

/** A signed-in browser: the hash of the cookie's token. */
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

/** One sign-in attempt: a short code typed on the device and a link opened from the email, both hashed, both short-lived. */
export const loginCodes = pgTable("login_codes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  emailKey: text("email_key").notNull(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  linkHash: text("link_hash").notNull(),
  next: text("next"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, (t) => [index("login_codes_email_idx").on(t.emailKey, t.createdAt)]);

/** The owner's marks on records (feedback done, when the mirror was pulled): kept in the local database, so they survive a fresh pull. */
export const adminMarks = pgTable("admin_marks", {
  kind: text("kind").notNull(),
  key: text("key").notNull(),
  ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.kind, t.key] })]);

/** Stripe events already applied, so a redelivered webhook changes nothing twice. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
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

/** A scouted city: its map box and when the scout last ran. */
export const cities = pgTable("cities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  south: doublePrecision("south").notNull(),
  west: doublePrecision("west").notNull(),
  north: doublePrecision("north").notNull(),
  east: doublePrecision("east").notNull(),
  scoutedAt: timestamp("scouted_at", { withTimezone: true }),
  sources: integer("sources").notNull().default(0),
  placesAt: timestamp("places_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
});

/** The city's map places, fetched once for the whole core and refreshed weekly, so a walk never waits on the public places server. */
export const places = pgTable(
  "places",
  {
    id: text("id").notNull(),
    cityId: text("city_id").notNull().references(() => cities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    tags: jsonb("tags").notNull().default({}),
    facts: jsonb("facts").notNull().default([]),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.cityId, t.id] }), index("places_lat_lon_idx").on(t.lat, t.lon)],
);

/** A recommended spot found on the web and matched to a real map place: facts and a link, never the author's text. */
export const spots = pgTable(
  "spots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cityId: text("city_id").notNull().references(() => cities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    osmId: text("osm_id"),
    reason: text("reason").notNull(),
    sources: jsonb("sources").notNull().default([]),
    mentions: integer("mentions").notNull().default(1),
    scoutedAt: timestamp("scouted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("spots_city_idx").on(t.cityId), index("spots_lat_lon_idx").on(t.lat, t.lon)],
);
