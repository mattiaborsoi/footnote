import { z } from "zod";

export const Interest = z.enum(["architecture", "plaques", "cafes", "parks", "art", "views", "museums", "shops", "photo", "history", "modern", "nature", "technology", "gaming", "craft", "film"]);
export type Interest = z.infer<typeof Interest>;

export const Intent = z.object({
  start: z.string().min(1),
  end: z.string().nullable().default(null),
  minutes: z.number().int().min(15).max(480).default(90),
  pace: z.enum(["relaxed", "normal", "brisk"]).default("normal"),
  interests: z.array(Interest).min(1),
  avoid: z.array(z.string()).default([]),
  mustInclude: z.array(z.string()).default([]),
  vibe: z.string().default(""),
  endMode: z.enum(["same", "place", "transport", "anywhere"]).default("anywhere"),
  companions: z.array(z.enum(["me", "kids", "older", "limited_mobility", "pram"])).default(["me"]),
  when: z.string().default("now"),
  language: z.string().default("en"),
  targetStops: z.number().int().min(2).max(12).optional(),
});
export type Intent = z.infer<typeof Intent>;

/** Overpass selectors per interest. Each selector is appended to `nwr` and filtered to named features. */
export const SELECTORS: Record<Interest, string[]> = {
  architecture: [`["historic"]`, `["heritage"]`, `["building:architecture"]`],
  plaques: [`["historic"="memorial"]`, `["memorial"]`],
  cafes: [`["amenity"="cafe"]["brand"!~"."]`],
  parks: [`["leisure"~"^(park|garden)$"]`],
  art: [`["tourism"~"^(artwork|gallery)$"]`],
  views: [`["tourism"="viewpoint"]`],
  museums: [`["tourism"="museum"]`],
  shops: [`["shop"]["brand"!~"."]`],
  photo: [`["tourism"~"^(viewpoint|attraction)$"]`],
  history: [`["historic"]`, `["heritage"]`],
  modern: [`["building:architecture"~"^(modern|contemporary|brutalist|art_deco)$"]`, `["architect"]`],
  nature: [`["leisure"~"^(park|garden|nature_reserve)$"]`, `["natural"~"^(wood|water|beach)$"]`],
  technology: [`["tourism"="museum"]["museum"~"technology|science"]`, `["amenity"="hackerspace"]`],
  gaming: [`["shop"~"^(video_games|games)$"]`, `["leisure"~"^(amusement_arcade|escape_game)$"]`],
  craft: [`["craft"]`, `["shop"~"^(craft|art|pottery)$"]`],
  film: [`["tourism"="attraction"]["description"~"film|movie|filming"]`, `["historic"]["wikipedia"]`],
};

/** Walking speed in metres per second, used to size the search area and the time budget. */
export const PACE_MPS = { relaxed: 1.1, normal: 1.35, brisk: 1.6 } as const;

export const DWELL_MIN_PER_STOP = 6;
