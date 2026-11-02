/** The shape of a finished walk, and the providers that build one. The building lives in plan.ts. */
import type { LatLng } from "../geo";
import type { Geocoder, PlacesProvider, Router } from "../providers/types";
import type { Weather } from "../providers/openmeteo";

export type Walk = {
  title: string;
  summary: string;
  start: LatLng & { label: string };
  /** Why the walk starts where it does when the walker named a whole city rather than a spot. */
  startNote?: string;
  end: (LatLng & { label: string }) | null;
  stops: { id: string; name: string; category: string; lat: number; lon: number; facts: string[]; hook: string; story: string; why: string; arrival?: string; open?: "open" | "closed" | "unknown"; hoursNote?: string; legMinutes?: number; legHint?: string; sources?: { title: string; url: string }[] }[];
  totalMinutes: number;
  walkingMinutes: number;
  distanceM: number;
  steps: number;
  route: LatLng[];
  legs?: { durationS: number }[];
  googleMapsUrl: string;
  gpx: string;
  candidatesConsidered: number;
  language: string;
  startsAt?: string;
  weather?: Weather | null;
};

export type Providers = { geocoder: Geocoder; places: PlacesProvider; router: Router };
