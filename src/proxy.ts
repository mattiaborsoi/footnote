import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminEnabled } from "./lib/admin/gate";
import { hashSecret, sameHash } from "./lib/auth/codes";
import { maintenance, maintenancePage } from "./lib/maintenance";

/** Two gates before any page renders: the owner's dashboard (404 where it does not exist, the login where it does), and maintenance mode
 * (every page answers 503 with a calm note so search engines wait; health and the owner's paths keep working). */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!adminEnabled()) return NextResponse.rewrite(new URL("/not-found", req.url), { status: 404 });
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    const signedIn = !!cookie && sameHash(cookie, hashSecret(process.env.ADMIN_TOKEN ?? ""));
    if (pathname === "/admin/login") return signedIn ? NextResponse.redirect(new URL("/admin", req.url)) : NextResponse.next();
    if (!signedIn) return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }
  if (pathname === "/api/health" || pathname.startsWith("/api/admin") || pathname.startsWith("/api/billing/webhook")) return NextResponse.next();
  const m = maintenance();
  if (!m.on) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "maintenance", message: m.message }, { status: 503, headers: { "Retry-After": "600" } });
  return new NextResponse(maintenancePage(m.message), { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "600", "Cache-Control": "no-store" } });
}

export const config = { matcher: ["/((?!_next/|icon|favicon|apple-icon|maplibre-gl-|robots\\.txt).*)"] };
