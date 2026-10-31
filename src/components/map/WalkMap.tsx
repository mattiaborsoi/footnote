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
      m.addLayer({ id: "snakes-glow", type: "line", source: "snakes", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "c"], "line-opacity": ["*", ["get", "o"], 0.35], "line-width": 11, "line-blur": 6 } });
      m.addLayer({ id: "snakes-core", type: "line", source: "snakes", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "c"], "line-opacity": ["get", "o"], "line-width": 4 } });
      m.addLayer({ id: "snakes-head", type: "circle", source: "snakes", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": ["get", "c"], "circle-radius": 6, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2, "circle-opacity": ["get", "o"], "circle-stroke-opacity": ["get", "o"] } });
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
      if (snakes.length && !route.length) return; // the trails own the camera while they play
      if (pts.length > 1) {
        const b = new LngLatBounds();
        pts.forEach((p) => b.extend([p.lon, p.lat]));
        m.fitBounds(b, { padding: variant === "print" ? 36 : { top: 60, bottom: 220, left: 40, right: 40 }, maxZoom: 16, duration: variant === "print" ? 0 : 600 });
      } else if (pts.length === 1) m.easeTo({ center: [pts[0].lon, pts[0].lat], zoom: 14 });
    };
    let cancelled = false;
    void loaded.current?.then(() => { if (!cancelled && map.current) apply(); });
    return () => { cancelled = true; };
  }, [start, end, route, stops, candidates, searchBox, spokes, activeId, onStopClick, variant, snakes.length]);

  // MapLibre's own stylesheet sets position on its container and outranks utilities, so the positioning lives on a wrapper.
  // The search animation, in the manner of a trips layer: a bright head runs along each probed street route with a
  // fading tail and a soft glow, four routes at a time to different candidates, each batch in fresh colours, until the
  // stops are chosen. Reduced motion shows one still batch.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    let frame = 0;
    let cancelled = false;
    const palettes = [["#ff4d6d", "#ffb703", "#06d6a0", "#8338ec"], ["#00b4d8", "#fb5607", "#c77dff", "#2ec4b6"], ["#ff006e", "#ffd60a", "#3a86ff", "#80ed99"]];
    void loaded.current.then(() => {
      if (cancelled) return;
      const src = m.getSource("snakes") as GeoJSONSource | undefined;
      if (!src) return;
      if (!snakes.length) { src.setData({ type: "FeatureCollection", features: [] }); return; }
      // cumulative lengths per path, so the head moves at a steady pace whatever the point spacing
      const paths = snakes.map((p) => {
        const cum = [0];
        for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot((p[i].lon - p[i - 1].lon) * Math.cos((p[i].lat * Math.PI) / 180), p[i].lat - p[i - 1].lat));
        return { p, cum, total: cum[cum.length - 1] || 1 };
      });
      const at = (path: typeof paths[number], f: number) => {
        const d = f * path.total;
        let i = 1;
        while (i < path.cum.length && path.cum[i] < d) i++;
        if (i >= path.p.length) return path.p[path.p.length - 1];
        const a = path.p[i - 1], b = path.p[i], seg = path.cum[i] - path.cum[i - 1] || 1, k = (d - path.cum[i - 1]) / seg;
        return { lat: a.lat + (b.lat - a.lat) * k, lon: a.lon + (b.lon - a.lon) * k };
      };
      const slice = (path: typeof paths[number], from: number, to: number) => {
        const pts = [at(path, from)];
        for (let i = 0; i < path.p.length; i++) { const f = path.cum[i] / path.total; if (f > from && f < to) pts.push(path.p[i]); }
        pts.push(at(path, to));
        return pts;
      };
      // bring the camera to the probed routes: they are what is being shown now
      const bounds = new LngLatBounds();
      paths.forEach((path) => path.p.forEach((q) => bounds.extend([q.lon, q.lat])));
      m.fitBounds(bounds, { padding: 70, maxZoom: 16, duration: 900 });
      const perBatch = 4, run = 2600, fade = 500, stagger = 300, gap = 400;
      const batchLen = run + fade + stagger * (perBatch - 1) + gap;
      const batches = Math.max(1, Math.ceil(paths.length / perBatch));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const line = (pts: { lat: number; lon: number }[], c: string, o: number) => ({ type: "Feature" as const, properties: { c, o }, geometry: { type: "LineString" as const, coordinates: pts.map((q) => [q.lon, q.lat]) } });
      if (reduced) { src.setData({ type: "FeatureCollection", features: paths.slice(0, perBatch).map((path, i) => line(path.p, palettes[0][i % 4], 0.6)) }); return; }
      const t0 = performance.now();
      const tick = (now: number) => {
        const elapsed = now - t0;
        const b = Math.floor(elapsed / batchLen) % batches;
        const t = elapsed % batchLen;
        const palette = palettes[b % palettes.length];
        const features: (ReturnType<typeof line> | { type: "Feature"; properties: { c: string; o: number }; geometry: { type: "Point"; coordinates: number[] } })[] = [];
        for (let j = 0; j < perBatch; j++) {
          const path = paths[(b * perBatch + j) % paths.length];
          if (!path) continue;
          const local = t - j * stagger;
          if (local < 0 || local > run + fade) continue;
          const head = Math.min(1, local / run);
          const o = local <= run ? 1 : 1 - (local - run) / fade;
          const tail = Math.max(0, head - 0.35);
          const c = palette[j % palette.length];
          // the tail in four steps of opacity, brightest at the head
          for (let k = 0; k < 4; k++) {
            const a = tail + ((head - tail) * k) / 4, bnd = tail + ((head - tail) * (k + 1)) / 4;
            if (bnd > a) features.push(line(slice(path, a, bnd), c, o * (0.15 + 0.28 * k)));
          }
          const h = at(path, head);
          features.push({ type: "Feature", properties: { c, o }, geometry: { type: "Point", coordinates: [h.lon, h.lat] } });
        }
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
