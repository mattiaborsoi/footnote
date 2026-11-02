import type { LatLng } from "../geo";
import { cached, throttled, USER_AGENT } from "./cache";
import type { BBox, Geocoder, GeocodeResult } from "./types";
import { areaKind } from "./types";

/** Photon (komoot): a typo-tolerant geocoder on OpenStreetMap data, the fallback when the exact one finds nothing. */
const BASE = process.env.PHOTON_URL ?? "https://photon.komoot.io";

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; osm_key?: string; osm_value?: string; osm_type?: string; osm_id?: number; city?: string; country?: string; extent?: [number, number, number, number]; type?: string };
};

export function toResult(f: Feature | undefined): GeocodeResult | null {
  if (!f?.properties.name) return null;
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const e = p.extent;
  const isArea = p.osm_key === "place" && areaKind(p.osm_value) || p.osm_key === "boundary";
  const typeLetter = p.osm_type ? ({ N: "node", W: "way", R: "relation" } as Record<string, string>)[p.osm_type] : undefined;
  return {
    lat, lon,
    label: [...new Set([p.name, p.city, p.country].filter(Boolean))].join(", "),
    bbox: e ? { west: e[0], north: e[1], east: e[2], south: e[3] } : undefined,
    osmId: typeLetter && p.osm_id ? `osm:${typeLetter}/${p.osm_id}` : undefined,
    city: p.city ?? (isArea ? p.name : undefined),
    kind: isArea ? "area" : "place",
  };
}

async function search(params: URLSearchParams): Promise<GeocodeResult | null> {
  const url = `${BASE}/api/?${params}`;
  return cached(`photon:${url}`, 24 * 3600_000, () =>
    throttled("photon", 600, async () => {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`geocoder ${res.status}`);
      return toResult(((await res.json()) as { features: Feature[] }).features[0]);
    }),
  );
}

export const photon: Geocoder = {
  async geocode(query: string, near?: LatLng): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({ q: query, limit: "1", lang: "en" });
    if (near) { params.set("lat", String(near.lat)); params.set("lon", String(near.lon)); }
    return search(params);
  },
  async geocodeWithin(query: string, bbox: BBox): Promise<GeocodeResult | null> {
    return search(new URLSearchParams({ q: query, limit: "1", lang: "en", bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}` }));
  },
};
