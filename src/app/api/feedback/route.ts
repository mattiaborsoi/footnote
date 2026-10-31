import { ZodError } from "zod";
import { getDb } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { Feedback } from "@/lib/events";
import { logEvent } from "@/lib/log";

/** The feedback button. Stored with its context; an email notification follows once the mail provider exists. */
export async function POST(req: Request) {
  try {
    const f = Feedback.parse(await req.json());
    const db = getDb();
    if (db) await db.insert(feedback).values({ walkId: f.walkId ?? null, sessionId: f.sessionId ?? null, screen: f.screen ?? null, message: f.message, contact: f.contact ?? null, context: f.context });
    logEvent("feedback.received", { screen: f.screen ?? "", length: f.message.length }, { walkId: f.walkId, sessionId: f.sessionId });
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof ZodError ? "invalid feedback" : "bad request" }, { status: 400 });
  }
}
