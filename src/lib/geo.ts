export type LatLng = { lat: number; lon: number };

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Extra distance walked to visit p on the way from a to b, in metres. */
export function detourM(a: LatLng, b: LatLng, p: LatLng): number {
  return distanceM(a, p) + distanceM(p, b) - distanceM(a, b);
}

/** 0..1 position of p projected on the a→b axis; used to order stops along a walk. */
export function alongAxis(a: LatLng, b: LatLng, p: LatLng): number {
  const kx = Math.cos(rad((a.lat + b.lat) / 2));
  const ax = (b.lon - a.lon) * kx, ay = b.lat - a.lat;
  const px = (p.lon - a.lon) * kx, py = p.lat - a.lat;
  const len2 = ax * ax + ay * ay;
  return len2 === 0 ? 0 : (px * ax + py * ay) / len2;
}

/** Bearing-based order for loop walks: angle of p around centre c, in radians. */
export function angleAround(c: LatLng, p: LatLng): number {
  return Math.atan2(p.lat - c.lat, (p.lon - c.lon) * Math.cos(rad(c.lat)));
}

export type BBox = { south: number; west: number; north: number; east: number };

/** Bounding box of the search area: the start–end corridor (or a circle for loops) padded by `padM`. */
export function searchBBox(start: LatLng, end: LatLng | null, padM: number): BBox {
  const pts = end ? [start, end] : [start];
  const dLat = padM / 111320;
  const dLon = padM / (111320 * Math.cos(rad(start.lat)));
  return {
    south: Math.min(...pts.map((p) => p.lat)) - dLat,
    north: Math.max(...pts.map((p) => p.lat)) + dLat,
    west: Math.min(...pts.map((p) => p.lon)) - dLon,
    east: Math.max(...pts.map((p) => p.lon)) + dLon,
  };
}
