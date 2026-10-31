import type { LatLng } from "../geo";

export type GeocodeResult = LatLng & { label: string; bbox?: BBox; osmId?: string };
export type BBox = { south: number; west: number; north: number; east: number };

export interface Geocoder {
  geocode(query: string, near?: LatLng): Promise<GeocodeResult | null>;
  /** Only results inside the box; used to pin a scouted name to a real place. */
  geocodeWithin(query: string, bbox: BBox): Promise<GeocodeResult | null>;
}

/** A real place from open data. `id` is the provider's stable id (e.g. "osm:node/123"). */
export type Candidate = LatLng & {
  id: string;
  name: string;
  category: string;
  facts: string[];
  tags: Record<string, string>;
  /** Extra score for places the scout found recommended on the web. */
  boost?: number;
  sources?: { title: string; url: string }[];
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
