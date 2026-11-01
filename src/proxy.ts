import { NextResponse, type NextRequest } from "next/server";
import { maintenance, maintenancePage } from "./lib/maintenance";

/** Maintenance mode: every page answers 503 with a calm note, so search engines wait; health and the owner's paths keep working. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/api/health" || pathname.startsWith("/admin") || pathname.startsWith("/api/admin") || pathname.startsWith("/api/billing/webhook")) return NextResponse.next();
  const m = maintenance();
  if (!m.on) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "maintenance", message: m.message }, { status: 503, headers: { "Retry-After": "600" } });
  return new NextResponse(maintenancePage(m.message), { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "600", "Cache-Control": "no-store" } });
}

export const config = { matcher: ["/((?!_next/|icon|favicon|apple-icon|maplibre-gl-|robots\\.txt).*)"] };
