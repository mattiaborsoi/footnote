import { and, count, eq, gt } from "drizzle-orm";
import type { User } from "../auth";
import { getDb } from "../db";
import { walks } from "../db/schema";

export type Plan = "none" | "week" | "month";
export type Allowance = { allowed: boolean; used: number; limit: number; plan: Plan; endsAt: string | null; next: "signin" | "plans" | null; message: string };

const num = (name: string, fallback: number) => { const n = Number(process.env[name]); return Number.isFinite(n) && n > 0 ? n : fallback; };
/** Free walks before a pass; and each pass's "up to N walks", sized from measured cost and changed without a deploy. */
export const trialWalks = () => num("TRIAL_WALKS", 1);
/** What one walk costs to make, as shown to people: computing and services at our volume, kept honest by hand from measured cost. */
export const walkCostLabel = () => process.env.WALK_COST_LABEL ?? "about 40p";
export const planWalks = (plan: Plan) => (plan === "week" ? num("PLAN_WEEK_WALKS", 8) : plan === "month" ? num("PLAN_MONTH_WALKS", 25) : trialWalks());

export function hasActivePlan(user: User | null, now = new Date()): user is User & { planEndsAt: Date } {
  return !!user && user.plan !== "none" && (user.planStatus === "active" || user.planStatus === "past_due") && !!user.planEndsAt && user.planEndsAt > now;
}

/** The rule, with nothing fetched: a plan's period allowance, or the trial. */
export function decide(user: User | null, used: number, now = new Date()): Allowance {
  if (hasActivePlan(user, now)) {
    const plan = user.plan as Plan;
    const limit = planWalks(plan);
    const ok = used < limit;
    return { allowed: ok, used, limit, plan, endsAt: user.planEndsAt.toISOString(), next: ok ? null : "plans", message: ok ? "" : `You have used the ${limit} walks of this ${plan === "week" ? "week pass" : "month"}.` };
  }
  const limit = trialWalks();
  const ok = used < limit;
  return {
    allowed: ok, used, limit, plan: "none", endsAt: null, next: ok ? null : user ? "plans" : "signin",
    message: ok ? "" : user ? "Your free walk is used. A pass unlocks more." : "Your free walk is used. Sign in to keep it, and pick a pass for more.",
  };
}

/** Walks that count: a signed-in person's since their period began (or ever, on the trial); a browser's in the last 30 days otherwise. */
export async function usedWalks(user: User | null, sessionId: string | null, now = new Date()): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  if (user) {
    const since = hasActivePlan(user, now) && user.planStartsAt ? user.planStartsAt : new Date(0);
    const [r] = await db.select({ n: count() }).from(walks).where(and(eq(walks.userId, user.id), gt(walks.createdAt, since)));
    return r?.n ?? 0;
  }
  if (!sessionId) return 0;
  const [r] = await db.select({ n: count() }).from(walks).where(and(eq(walks.sessionId, sessionId), gt(walks.createdAt, new Date(now.getTime() - 30 * 86_400_000))));
  return r?.n ?? 0;
}

export async function allowanceFor(user: User | null, sessionId: string | null): Promise<Allowance> {
  return decide(user, await usedWalks(user, sessionId));
}
