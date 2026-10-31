import type { LatLng } from "../geo";

export type GeocodeResult = LatLng & { label: string };

export interface Geocoder {
  geocode(query: string, near?: LatLng): Promise<GeocodeResult | null>;
}

/** A real place from open data. `id` is the provider's stable id (e.g. "osm:node/123"). */
export type Candidate = LatLng & {
  id: string;
  name: string;
  category: string;
  facts: string[];
  tags: Record<string, string>;
};

export interface PlacesProvider {
  search(bbox: { south: number; west: number; north: number; east: number }, selectors: string[]): Promise<Candidate[]>;
}

export type Route = {
  distanceM: number;
  durationS: number;
  geometry: LatLng[];
  legs: { distanceM: number; durationS: number }[];
};

export interface Router {
  walk(points: LatLng[]): Promise<Route>;
}
