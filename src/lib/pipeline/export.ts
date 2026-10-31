import type { LatLng } from "../geo";

export const MAX_WAYPOINTS = 9;

/** Google Maps directions link, walking, through at most nine waypoints (the service's limit). */
export function googleMapsUrl(start: LatLng, stops: LatLng[], end: LatLng | null): string {
  const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
  const params = new URLSearchParams({ api: "1", travelmode: "walking", origin: fmt(start), destination: fmt(end ?? start) });
  const wps = stops.slice(0, MAX_WAYPOINTS).map(fmt);
  if (wps.length) params.set("waypoints", wps.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString().replace(/%7C/g, "|")}`;
}

export function gpx(name: string, stops: (LatLng & { name: string })[], track: LatLng[]): string {
  const esc = (s: string) => s.replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[ch]!);
  const wpts = stops.map((s) => `  <wpt lat="${s.lat}" lon="${s.lon}"><name>${esc(s.name)}</name></wpt>`).join("\n");
  const pts = track.map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}"/>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Footnote" xmlns="http://www.topografix.com/GPX/1/1">\n${wpts}\n  <trk><name>${esc(name)}</name><trkseg>\n${pts}\n  </trkseg></trk>\n</gpx>\n`;
}
