import { configFromEnv, httpTransport } from "@/lib/llm/client";
import { nominatim } from "@/lib/providers/nominatim";
import { readPage } from "@/lib/providers/readpage";
import { searxng } from "@/lib/providers/search";
import { scoutCity } from "@/lib/scout";
import { timingSafeEqual } from "node:crypto";
import { adminEnabled, isAdmin } from "@/lib/admin/gate";
import { clientIpKey } from "@/lib/ip";
import { allow } from "@/lib/ratelimit";
import { tick } from "@/lib/scout/scheduler";

/** Owner-only trigger, only where the dashboard exists (never in production, where the scheduler does this work): POST {"city": "..."} with the admin token, or from the dashboard with its cookie. {"tick": true} runs one scheduler round. */
export async function POST(req: Request) {
  if (!adminEnabled()) return Response.json({ error: "not found" }, { status: 404 });
  if (!allow(`scout:${clientIpKey(req)}`, 10, 3_600_000)) return Response.json({ error: "too many" }, { status: 429 });
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer /, ""));
  const real = Buffer.from(process.env.ADMIN_TOKEN ?? "");
  const bearerOk = real.length > 0 && given.length === real.length && timingSafeEqual(given, real);
  if (!bearerOk && !(await isAdmin())) return Response.json({ error: "not allowed" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { city?: string; pagesPerTheme?: number; tick?: boolean };
  if (body.tick) {
    await tick();
    return Response.json({ ok: true });
  }
  if (!body.city) return Response.json({ error: "city is required" }, { status: 400 });
  try {
    const cfg = configFromEnv();
    const result = await scoutCity(body.city, { search: searxng, readPage, geocoder: nominatim, transport: httpTransport(cfg), model: cfg.models.interpret }, { pagesPerTheme: Math.min(5, Math.max(1, Number(body.pagesPerTheme) || 3)) });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
