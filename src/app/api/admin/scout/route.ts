import { configFromEnv, httpTransport } from "@/lib/llm/client";
import { nominatim } from "@/lib/providers/nominatim";
import { readPage } from "@/lib/providers/readpage";
import { searxng } from "@/lib/providers/search";
import { scoutCity } from "@/lib/scout";
import { isAdmin } from "@/lib/admin/gate";
import { tick } from "@/lib/scout/scheduler";

/** Owner-only trigger: POST {"city": "..."} with the admin token, or from the dashboard with its cookie. {"tick": true} runs one scheduler round. */
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || (req.headers.get("authorization") !== `Bearer ${token}` && !(await isAdmin()))) return Response.json({ error: "not allowed" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { city?: string; pagesPerTheme?: number; tick?: boolean };
  if (body.tick) {
    await tick();
    return Response.json({ ok: true });
  }
  if (!body.city) return Response.json({ error: "city is required" }, { status: 400 });
  try {
    const cfg = configFromEnv();
    const result = await scoutCity(body.city, { search: searxng, readPage, geocoder: nominatim, transport: httpTransport(cfg), model: cfg.models.interpret }, { pagesPerTheme: body.pagesPerTheme });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
