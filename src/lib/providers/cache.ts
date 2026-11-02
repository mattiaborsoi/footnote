/** Small in-memory TTL cache and a per-provider throttle. Enough for one instance; swap for Redis later. */
const store = new Map<string, { until: number; value: unknown }>();
const MAX_ENTRIES = 2000;

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.until > Date.now()) return hit.value as T;
  const value = await load();
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of store) if (v.until <= now) store.delete(k);
    while (store.size >= MAX_ENTRIES) { const oldest = store.keys().next().value; if (oldest === undefined) break; store.delete(oldest); }
  }
  store.set(key, { until: Date.now() + ttlMs, value });
  return value;
}

const lastCall = new Map<string, Promise<void>>();
const waiting = new Map<string, number>();
const MAX_WAITING = 25;

/** Serialises calls per `name` and keeps at least `minGapMs` between them. A queue deeper than MAX_WAITING is refused rather than grown: one flood must not stall every real request. */
export function throttled<T>(name: string, minGapMs: number, fn: () => Promise<T>): Promise<T> {
  const depth = waiting.get(name) ?? 0;
  if (depth >= MAX_WAITING) return Promise.reject(new Error(`${name} is busy; try again in a moment`));
  waiting.set(name, depth + 1);
  const prev = lastCall.get(name) ?? Promise.resolve();
  const run = prev.then(async () => {
    const started = Date.now();
    try {
      return await fn();
    } finally {
      waiting.set(name, (waiting.get(name) ?? 1) - 1);
      const wait = minGapMs - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  });
  lastCall.set(name, run.then(() => undefined, () => undefined));
  return run;
}

/** Sent to every public service; Nominatim asks for a way to reach the operator. */
export const USER_AGENT = `Footnote/0.1 (walk planner; ${process.env.APP_URL ?? "development"})`;
