import { ZodError } from "zod";
import { getDb } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { Feedback } from "@/lib/events";
import { logEvent } from "@/lib/log";
import { sendMail } from "@/lib/mail";
import { clientIpKey } from "@/lib/ip";
import { allow } from "@/lib/ratelimit";

/** The feedback button. Stored with its context; the owner is emailed when FEEDBACK_TO is set. */
export async function POST(req: Request) {
  if (!allow(`feedback-ip:${clientIpKey(req)}`, 5, 3_600_000)) return Response.json({ error: "Thank you, that is enough for one hour." }, { status: 429 });
  try {
    const f = Feedback.parse(await req.json());
    const db = getDb();
    if (db) await db.insert(feedback).values({ walkId: f.walkId ?? null, sessionId: f.sessionId ?? null, screen: f.screen ?? null, message: f.message, contact: f.contact ?? null, context: f.context });
    if (process.env.FEEDBACK_TO) void sendMail({ to: process.env.FEEDBACK_TO, subject: `Footnote feedback: ${f.screen ?? "somewhere"}`, text: `${f.message}\n\nscreen: ${f.screen ?? "-"}\nwalk: ${f.walkId ? `${process.env.APP_URL ?? ""}/w/${f.walkId}` : "-"}\nreply to: ${f.contact || "-"}\n${JSON.stringify(f.context)}` }).catch((e) => console.error("feedback mail failed", e));
    logEvent("feedback.received", { screen: f.screen ?? "", length: f.message.length }, { walkId: f.walkId, sessionId: f.sessionId });
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof ZodError ? "invalid feedback" : "bad request" }, { status: 400 });
  }
}
