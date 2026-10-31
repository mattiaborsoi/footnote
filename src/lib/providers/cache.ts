/** Small in-memory TTL cache and a per-provider throttle. Enough for one instance; swap for Redis later. */
const store = new Map<string, { until: number; value: unknown }>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.until > Date.now()) return hit.value as T;
  const value = await load();
  store.set(key, { until: Date.now() + ttlMs, value });
  return value;
}

const lastCall = new Map<string, Promise<void>>();

/** Serialises calls per `name` and keeps at least `minGapMs` between them. */
export function throttled<T>(name: string, minGapMs: number, fn: () => Promise<T>): Promise<T> {
  const prev = lastCall.get(name) ?? Promise.resolve();
  const run = prev.then(async () => {
    const started = Date.now();
    try {
      return await fn();
    } finally {
      const wait = minGapMs - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  });
  lastCall.set(name, run.then(() => undefined, () => undefined));
  return run;
}

export const USER_AGENT = "Footnote/0.1 (walk planner, development)";
