import type { LatLng } from "../geo";
import { nominatim } from "./nominatim";
import { photon } from "./photon";
import type { BBox, Geocoder, GeocodeResult } from "./types";

/** First geocoder with an answer wins; a failing service is skipped, not fatal, as long as a later one answers. */
export function chain(...geocoders: Geocoder[]): Geocoder {
  const first = async (run: (g: Geocoder) => Promise<GeocodeResult | null>) => {
    let lastError: unknown = null;
    for (const g of geocoders) {
      try {
        const hit = await run(g);
        if (hit) return hit;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) throw lastError;
    return null;
  };
  return {
    geocode: (query: string, near?: LatLng) => first((g) => g.geocode(query, near)),
    geocodeWithin: (query: string, bbox: BBox) => first((g) => g.geocodeWithin(query, bbox)),
  };
}

/** Exact first (Nominatim), then typo-tolerant (Photon): "shagri la hotel" still finds the Shangri-La. */
export const geocoder = chain(nominatim, photon);
