import { cached, throttled, USER_AGENT } from "./cache";
import type { Candidate, PlacesProvider } from "./types";
import { displayName } from "../names";

const BASE = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/** Facts are the OSM tags worth telling a story with, rendered as short plain lines. */
export function factsFromTags(t: Record<string, string>): string[] {
  const f: string[] = [];
  const add = (label: string, key: string) => t[key] && f.push(`${label}: ${t[key]}`);
  add("Type", "historic"); add("Heritage", "heritage"); add("Listed", "listed_status");
  add("Architecture", "building:architecture"); add("Architect", "architect"); add("Built", "start_date");
  add("Inscription", "inscription"); add("Description", "description"); add("Artist", "artist_name");
  add("Cuisine", "cuisine"); add("Opening hours", "opening_hours"); add("Website", "website");
  if (t.wikipedia) f.push(`Wikipedia: ${t.wikipedia}`);
  if (t.wikidata) f.push(`Wikidata: ${t.wikidata}`);
  return f;
}

export const overpass: PlacesProvider = {
  async search(bbox, selectors, language = "en"): Promise<Candidate[]> {
    const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
    const body = `[out:json][timeout:25];(${selectors.map((s) => `nwr${s}["name"](${b});`).join("")});out center tags;`;
    return cached(`ovp:${body}`, 3600_000, () =>
      throttled("overpass", 1000, async () => {
        const res = await fetch(BASE, { method: "POST", headers: { "User-Agent": USER_AGENT }, body: `data=${encodeURIComponent(body)}` });
        if (!res.ok) throw new Error(`places ${res.status}`);
        const data = (await res.json()) as { elements: Element[] };
        return data.elements.flatMap((e) => {
          const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon, tags = e.tags ?? {};
          if (lat === undefined || lon === undefined || !tags.name) return [];
          const { name, localName } = displayName(tags, language);
          return [{ id: `osm:${e.type}/${e.id}`, name, category: categoryOf(tags), lat, lon, tags, facts: [...(localName ? [`Local name: ${localName}`] : []), ...factsFromTags(tags)] }];
        });
      }),
    );
  },
};

export function categoryOf(t: Record<string, string>): string {
  if (t.tourism === "viewpoint") return "view";
  if (t.tourism === "museum" || t.tourism === "gallery") return "museum";
  if (t.tourism === "artwork") return "art";
  if (t.historic === "memorial" || t.memorial) return "memorial";
  if (t.historic || t.heritage) return "architecture";
  if (t.amenity === "cafe") return "cafe";
  if (t.leisure === "park" || t.leisure === "garden") return "park";
  if (t.shop) return "shop";
  return "place";
}
