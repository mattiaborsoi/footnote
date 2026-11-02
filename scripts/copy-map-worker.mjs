// MapLibre's worker and its shared chunk must be served as plain files; Turbopack cannot bundle a worker from a dependency.
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(`node_modules/maplibre-gl/dist/${f}`, `public/${f}`);
