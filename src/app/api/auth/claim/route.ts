import { and, eq, inArray, isNull } from "drizzle-orm";
import { currentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { walks } from "@/lib/db/schema";
import { ID_PATTERN } from "@/lib/ids";
import { logEvent } from "@/lib/log";

/** POST { walkIds, sessionId }: walks this browser built before signing in become the person's. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { walkIds?: unknown; sessionId?: unknown } | null;
  const ids = Array.isArray(body?.walkIds) ? body.walkIds.filter((x): x is string => typeof x === "string" && ID_PATTERN.test(x)).slice(0, 50) : [];
  const sessionId = typeof body?.sessionId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(body.sessionId) ? body.sessionId : null;
  const db = getDb();
  if (!db || !ids.length || !sessionId) return Response.json({ claimed: 0 });
  const rows = await db.update(walks).set({ userId: user.id }).where(and(inArray(walks.id, ids), isNull(walks.userId), eq(walks.sessionId, sessionId))).returning({ id: walks.id });
  if (rows.length) logEvent("walk.claimed", { count: rows.length });
  return Response.json({ claimed: rows.length });
}
