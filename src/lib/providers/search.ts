import { cached, throttled, USER_AGENT } from "./cache";

export type SearchHit = { title: string; url: string; snippet: string };
export interface SearchProvider {
  search(query: string, limit?: number): Promise<SearchHit[]>;
}

const BASE = process.env.SEARXNG_URL ?? "";

/** SearXNG, self-hosted, JSON format enabled. Locally on the test host; on the droplet its own container. */
export const searxng: SearchProvider = {
  async search(query, limit = 5) {
    if (!BASE) throw new Error("SEARXNG_URL is not set");
    const url = `${BASE.replace(/\/$/, "")}/search?${new URLSearchParams({ q: query, format: "json", language: "en", safesearch: "1" })}`;
    return cached(`srx:${url}`, 6 * 3600_000, () =>
      throttled("searxng", 1500, async () => {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) throw new Error(`search ${res.status}`);
        const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
        return (data.results ?? [])
          .filter((r) => r.url && r.title)
          .slice(0, limit)
          .map((r) => ({ title: r.title!, url: r.url!, snippet: r.content ?? "" }));
      }),
    );
  },
};
