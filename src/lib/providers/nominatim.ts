import type { LatLng } from "../geo";
import { cached, throttled, USER_AGENT } from "./cache";
import type { Geocoder, GeocodeResult } from "./types";

const BASE = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";

/** Public Nominatim: at most one request per second, identified by User-Agent. Dev only; swap before going public. */
export const nominatim: Geocoder = {
  async geocode(query: string, near?: LatLng): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1" });
    if (near) {
      const d = 0.2;
      params.set("viewbox", `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`);
    }
    const url = `${BASE}/search?${params}`;
    return cached(`geo:${url}`, 24 * 3600_000, () =>
      throttled("nominatim", 1100, async () => {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) throw new Error(`geocoder ${res.status}`);
        const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
        const r = rows[0];
        return r ? { lat: Number(r.lat), lon: Number(r.lon), label: r.display_name } : null;
      }),
    );
  },
};
