import { z } from "zod";

export const Interest = z.enum(["architecture", "plaques", "cafes", "parks", "art", "views", "museums", "shops", "photo"]);
export type Interest = z.infer<typeof Interest>;

export const Intent = z.object({
  start: z.string().min(1),
  end: z.string().nullable().default(null),
  minutes: z.number().int().min(15).max(480).default(90),
  pace: z.enum(["relaxed", "normal", "brisk"]).default("normal"),
  interests: z.array(Interest).min(1),
  avoid: z.array(z.string()).default([]),
  vibe: z.string().default(""),
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
};

/** Walking speed in metres per second, used to size the search area and the time budget. */
export const PACE_MPS = { relaxed: 1.1, normal: 1.35, brisk: 1.6 } as const;

export const DWELL_MIN_PER_STOP = 6;
