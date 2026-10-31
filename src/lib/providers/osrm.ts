import type { LatLng } from "../geo";
import { cached, throttled, USER_AGENT } from "./cache";
import type { Route, Router } from "./types";

/** Public foot-profile OSRM (FOSSGIS). Dev only; a keyed routing API replaces it before going public. */
const BASE = process.env.OSRM_URL ?? "https://routing.openstreetmap.de/routed-foot";

export const osrm: Router = {
  async walk(points: LatLng[]): Promise<Route> {
    const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
    const url = `${BASE}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`;
    return cached(`route:${url}`, 3600_000, () =>
      throttled("osrm", 300, async () => {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) throw new Error(`routing ${res.status}`);
        const data = (await res.json()) as {
          code: string;
          routes: { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { distance: number; duration: number }[] }[];
        };
        const r = data.routes?.[0];
        if (data.code !== "Ok" || !r) throw new Error(`routing: ${data.code}`);
        return {
          distanceM: r.distance,
          durationS: r.duration,
          geometry: r.geometry.coordinates.map(([lon, lat]) => ({ lat, lon })),
          legs: r.legs.map((l) => ({ distanceM: l.distance, durationS: l.duration })),
        };
      }),
    );
  },
};
