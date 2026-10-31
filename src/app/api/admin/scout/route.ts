import { configFromEnv, httpTransport } from "@/lib/llm/client";
import { nominatim } from "@/lib/providers/nominatim";
import { readPage } from "@/lib/providers/readpage";
import { searxng } from "@/lib/providers/search";
import { scoutCity } from "@/lib/scout";

/** Owner-only trigger for now: POST {"city": "..."} with the admin token. A scheduler replaces it later. */
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) return Response.json({ error: "not allowed" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { city?: string; pagesPerTheme?: number };
  if (!body.city) return Response.json({ error: "city is required" }, { status: 400 });
  try {
    const cfg = configFromEnv();
    const result = await scoutCity(body.city, { search: searxng, readPage, geocoder: nominatim, transport: httpTransport(cfg), model: cfg.models.interpret }, { pagesPerTheme: body.pagesPerTheme });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
