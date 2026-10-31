import type { LatLng } from "../geo";
import { cached, throttled, USER_AGENT } from "./cache";
import type { BBox, Geocoder, GeocodeResult } from "./types";

const BASE = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";

/** Public Nominatim: at most one request per second, identified by User-Agent. Dev only; swap before going public. */
type Row = { lat: string; lon: string; display_name: string; boundingbox?: [string, string, string, string]; osm_type?: string; osm_id?: number };

function toResult(r: Row | undefined): GeocodeResult | null {
  if (!r) return null;
  const b = r.boundingbox;
  return {
    lat: Number(r.lat), lon: Number(r.lon), label: r.display_name,
    bbox: b ? { south: Number(b[0]), north: Number(b[1]), west: Number(b[2]), east: Number(b[3]) } : undefined,
    osmId: r.osm_type && r.osm_id ? `osm:${r.osm_type}/${r.osm_id}` : undefined,
  };
}

async function search(params: URLSearchParams): Promise<GeocodeResult | null> {
  const url = `${BASE}/search?${params}`;
  return cached(`geo:${url}`, 24 * 3600_000, () =>
    throttled("nominatim", 1100, async () => {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`geocoder ${res.status}`);
      return toResult(((await res.json()) as Row[])[0]);
    }),
  );
}

export const nominatim: Geocoder = {
  async geocode(query: string, near?: LatLng): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1" });
    if (near) {
      const d = 0.2;
      params.set("viewbox", `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`);
    }
    return search(params);
  },
  async geocodeWithin(query: string, bbox: BBox): Promise<GeocodeResult | null> {
    return search(new URLSearchParams({ q: query, format: "jsonv2", limit: "1", bounded: "1", viewbox: `${bbox.west},${bbox.north},${bbox.east},${bbox.south}` }));
  },
};
