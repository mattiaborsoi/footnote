import { existsSync, readFileSync } from "node:fs";

export const MAINTENANCE_FILE = process.env.MAINTENANCE_FILE ?? "data/maintenance.json";

/** The switch is a file next to the data, flipped over SSH by scripts/maintenance.sh: nothing public can turn it. */
export function maintenance(): { on: true; message: string; since: string } | { on: false } {
  try {
    if (!existsSync(MAINTENANCE_FILE)) return { on: false };
    const j = JSON.parse(readFileSync(MAINTENANCE_FILE, "utf8")) as { message?: string; since?: string };
    return { on: true, message: typeof j.message === "string" && j.message.trim() ? j.message.trim().slice(0, 300) : "We are doing some work on Footnote. Back soon.", since: j.since ?? "" };
  } catch {
    return { on: true, message: "We are doing some work on Footnote. Back soon.", since: "" };
  }
}

/** The page people see meanwhile: self-contained, no scripts, the mark and one sentence. */
export function maintenancePage(message: string): string {
  const safe = message.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Footnote</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#141413;font:17px/1.5 Inter,system-ui,sans-serif}main{max-width:420px;padding:32px 24px;display:flex;flex-direction:column;gap:16px}h1{margin:0;font:600 30px/1.1 Georgia,serif;letter-spacing:-.02em}p{margin:0;color:#5f5e5a}@media(prefers-color-scheme:dark){body{background:#141413;color:#f2f0ea}p{color:#a8a59d}}</style></head>
<body><main><svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#1e3a8a"/><path d="M10 54 C 18 40, 22 44, 28 36 S 40 22, 42 26" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="22" r="13" fill="#fff"/><text x="44" y="28.5" text-anchor="middle" font-family="Georgia,serif" font-size="19" font-weight="600" fill="#1e3a8a">1</text></svg>
<h1>Footnote is resting</h1><p>${safe}</p></main></body></html>`;
}
