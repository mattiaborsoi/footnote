"use client";
import { LngLatBounds, Map as MlMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type PositionAnchor } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { colorFor } from "@/lib/client/colors";

export type MapStop = { id: string; name: string; category: string; lat: number; lon: number; closed?: boolean; minutesFromPrevious?: number };
export type MapProps = {
  start?: { lat: number; lon: number } | null;
  end?: { lat: number; lon: number } | null;
  route?: { lat: number; lon: number }[];
  stops?: MapStop[];
  candidates?: { id: string; lat: number; lon: number }[];
  searchBox?: { south: number; west: number; north: number; east: number } | null;
  /** Straight dashed lines from one point to others: options, not a route. */
  spokes?: [{ lat: number; lon: number }, { lat: number; lon: number }][];
  activeId?: string | null;
  onStopClick?: (id: string) => void;
  className?: string;
  /** "print": a thin route, small discs, no controls, no pills, canvas kept for printing. */
  variant?: "full" | "print";
  /** While the walk is being chosen: routes from the start to the best candidates, each drawn along the streets and faded, staggered, on a loop. */
  snakes?: { lat: number; lon: number }[][];
};

const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/positron";
// The bundler cannot serve MapLibre's inline worker; its worker and shared modules are copied to /public at dev and build time.
if (typeof window !== "undefined") setWorkerUrl("/maplibre-gl-worker.mjs");

/** The map from the brief: one ink route with a white casing, numbered white discs with interest halos, time pills per leg, a square start and a diamond end. */
export default function WalkMap({ start, end, route = [], stops = [], candidates = [], searchBox, spokes = [], activeId, onStopClick, className, variant = "full", snakes = [] }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const loaded = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const print = variant === "print";
    const m = new MlMap({ container: el.current, style: STYLE, center: [0, 30], zoom: 1.4, attributionControl: { compact: true }, interactive: !print, canvasContextAttributes: { preserveDrawingBuffer: print } });
    if (!print) m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    loaded.current = new Promise<void>((resolve) => m.once("load", () => {
      m.addSource("search", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "search-fill", type: "fill", source: "search", paint: { "fill-color": "#1e3a8a", "fill-opacity": 0.06 } });
      m.addLayer({ id: "search-line", type: "line", source: "search", paint: { "line-color": "#1e3a8a", "line-opacity": 0.35, "line-width": 2, "line-dasharray": [3, 3] } });
      m.addSource("candidates", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "candidates", type: "circle", source: "candidates", paint: { "circle-radius": 4, "circle-color": "#1e3a8a", "circle-opacity": 0.45 } });
      m.addSource("snakes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "snakes", type: "line", source: "snakes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "c"], "line-opacity": ["get", "o"], "line-width": 4 } });
      m.addSource("spokes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "spokes", type: "line", source: "spokes", layout: { "line-cap": "round" }, paint: { "line-color": "#1e3a8a", "line-opacity": 0.55, "line-width": 3, "line-dasharray": [2, 2] } });
      m.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ffffff", "line-width": print ? 5 : 9 } });
      m.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#1e3a8a", "line-width": print ? 2.5 : 5 } });
      resolve();
    }));
    map.current = m;
    return () => { m.remove(); map.current = null; loaded.current = null; };
  }, [variant]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      const src = (id: string) => m.getSource(id) as GeoJSONSource | undefined;
      src("route")?.setData({ type: "FeatureCollection", features: route.length ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.map((p) => [p.lon, p.lat]) } }] : [] });
      src("spokes")?.setData({ type: "FeatureCollection", features: spokes.map(([a, b]) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] } })) });
      src("candidates")?.setData({ type: "FeatureCollection", features: candidates.map((c) => ({ type: "Feature", properties: { id: c.id }, geometry: { type: "Point", coordinates: [c.lon, c.lat] } })) });
      src("search")?.setData({ type: "FeatureCollection", features: searchBox ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[searchBox.west, searchBox.south], [searchBox.east, searchBox.south], [searchBox.east, searchBox.north], [searchBox.west, searchBox.north], [searchBox.west, searchBox.south]]] } }] : [] });

      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
      const add = (node: HTMLElement, lat: number, lon: number, anchor: PositionAnchor = "center") => {
        const mk = new Marker({ element: node, anchor }).setLngLat([lon, lat]).addTo(m);
        markers.current.push(mk);
      };
      if (start) { const s = document.createElement("div"); s.className = "fn-start"; s.setAttribute("aria-label", "Start"); add(s, start.lat, start.lon); }
      if (end) { const e = document.createElement("div"); e.className = "fn-end"; e.setAttribute("aria-label", "End"); add(e, end.lat, end.lon); }
      stops.forEach((s, i) => {
        const d = document.createElement("button");
        d.type = "button";
        d.className = variant === "print" ? "fn-stop fn-stop-sm" : "fn-stop";
        d.textContent = String(i + 1);
        d.style.setProperty("--halo", colorFor(s.category));
        d.dataset.closed = String(!!s.closed);
        d.dataset.active = String(s.id === activeId);
        d.setAttribute("aria-label", `Stop ${i + 1}: ${s.name}${s.closed ? ", closed when you arrive" : ""}`);
        d.addEventListener("click", () => onStopClick?.(s.id));
        add(d, s.lat, s.lon);
        const prev = i === 0 ? start : stops[i - 1];
        if (prev && s.minutesFromPrevious && variant !== "print") {
          const pill = document.createElement("div");
          pill.className = "fn-pill";
          pill.textContent = `${s.minutesFromPrevious} min`;
          add(pill, (prev.lat + s.lat) / 2, (prev.lon + s.lon) / 2);
        }
      });

      const pts = [...(start ? [start] : []), ...(end ? [end] : []), ...stops, ...route, ...candidates];
      if (pts.length > 1) {
        const b = new LngLatBounds();
        pts.forEach((p) => b.extend([p.lon, p.lat]));
        m.fitBounds(b, { padding: variant === "print" ? 36 : { top: 60, bottom: 220, left: 40, right: 40 }, maxZoom: 16, duration: variant === "print" ? 0 : 600 });
      } else if (pts.length === 1) m.easeTo({ center: [pts[0].lon, pts[0].lat], zoom: 14 });
    };
    let cancelled = false;
    void loaded.current?.then(() => { if (!cancelled && map.current) apply(); });
    return () => { cancelled = true; };
  }, [start, end, route, stops, candidates, searchBox, spokes, activeId, onStopClick, variant]);

  // MapLibre's own stylesheet sets position on its container and outranks utilities, so the positioning lives on a wrapper.
  // The search animation: each probed route grows from the start along the streets over two seconds, holds, fades,
  // staggered by a third of a second, and the set repeats while the stops are being chosen. Reduced motion shows them still.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    let frame = 0;
    let cancelled = false;
    const colours = ["#1e3a8a", "#b5720a", "#4f8a5b", "#7c4d9b", "#0e7490", "#9d174d"];
    void loaded.current.then(() => {
      if (cancelled) return;
      const src = m.getSource("snakes") as GeoJSONSource | undefined;
      if (!src) return;
      if (!snakes.length) { src.setData({ type: "FeatureCollection", features: [] }); return; }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const feature = (path: { lat: number; lon: number }[], i: number, o: number) => ({ type: "Feature" as const, properties: { c: colours[i % colours.length], o }, geometry: { type: "LineString" as const, coordinates: path.map((p) => [p.lon, p.lat]) } });
      if (reduced) { src.setData({ type: "FeatureCollection", features: snakes.map((p, i) => feature(p, i, 0.5)) }); return; }
      const grow = 2200, hold = 600, fade = 700, stagger = 350;
      const period = grow + hold + fade + stagger * snakes.length + 400;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = (now - t0) % period;
        const features = snakes.flatMap((path, i) => {
          const local = t - i * stagger;
          if (local < 0 || local > grow + hold + fade) return [];
          const n = Math.max(2, Math.ceil(Math.min(1, local / grow) * path.length));
          const o = local < grow + hold ? 0.85 : 0.85 * (1 - (local - grow - hold) / fade);
          return [feature(path.slice(0, n), i, o)];
        });
        src.setData({ type: "FeatureCollection", features });
        if (!cancelled) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [snakes]);

  return (
    <div className={className ?? "h-full w-full"} role="region" aria-label="Map">
      <div ref={el} className="h-full w-full" />
    </div>
  );
}
