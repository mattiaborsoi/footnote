import { and, eq, gt, sql } from "drizzle-orm";
import type { User } from "../auth";
import { getDb } from "../db";
import { walks } from "../db/schema";
import { envNumber } from "../env";

const num = (name: string, fallback: number) => envNumber(name, fallback, 1);

export type Plan = "none" | "week" | "month";
export type Allowance = { allowed: boolean; used: number; limit: number; plan: Plan; endsAt: string | null; next: "signin" | "plans" | null; message: string };

/** Free walks before a pass: two, one to try at home and one for the trip. Changed without a deploy. */
export const trialWalks = () => num("TRIAL_WALKS", 2);
/** What one walk costs to make, as shown to people: computing and services at our volume, kept honest by hand from measured cost. */
export const walkCostLabel = () => process.env.WALK_COST_LABEL ?? "about 40p";
/** The week pass holds as many walks as a week holds at fair use (ten a day); the monthly plan is "up to N". */
export const dailyFairUse = () => num("WEEK_PASS_DAILY_FAIR_USE", 10);
export const planWalks = (plan: Plan) => (plan === "week" ? num("PLAN_WEEK_WALKS", 7 * dailyFairUse()) : plan === "month" ? num("PLAN_MONTH_WALKS", 25) : trialWalks());
/** A walk over two hours costs about twice the model work, so it counts as two (see `weighted` below). */
export const LONG_WALK_MINUTES = 120;

export function hasActivePlan(user: User | null, now = new Date()): user is User & { planEndsAt: Date } {
  return !!user && user.plan !== "none" && (user.planStatus === "active" || user.planStatus === "past_due") && !!user.planEndsAt && user.planEndsAt > now;
}

/** The rule, with nothing fetched: a plan's period allowance (and the week pass's daily fair use), or the trial. */
export function decide(user: User | null, used: number, now = new Date(), usedToday = 0): Allowance {
  if (hasActivePlan(user, now)) {
    const plan = user.plan as Plan;
    const limit = planWalks(plan);
    const endsAt = user.planEndsAt.toISOString();
    if (plan === "week" && usedToday >= dailyFairUse()) {
      return { allowed: false, used, limit, plan, endsAt, next: null, message: `${dailyFairUse()} walks is a day's fair use on the week pass. The next ones come tomorrow.` };
    }
    const ok = used < limit;
    return { allowed: ok, used, limit, plan, endsAt, next: ok ? null : "plans", message: ok ? "" : `You have used all ${limit} walks of this ${plan === "week" ? "week pass" : "month"}. A new pass starts you again.` };
  }
  const limit = trialWalks();
  const ok = used < limit;
  const plural = limit === 1 ? "walk" : "walks";
  return {
    allowed: ok, used, limit, plan: "none", endsAt: null, next: ok ? null : user ? "plans" : "signin",
    message: ok ? "" : user ? `Every walk is written for you from scratch, and that costs us money to make. After the free ${plural}, the next ones come with a pass. No adverts, nothing sold on.` : `Sign in to keep ${limit === 1 ? "it" : "them"}. Every walk is written for you from scratch, and that costs us money to make, so the next ones come with a pass. No adverts, nothing sold on.`,
  };
}

const weighted = sql<number>`coalesce(sum(case when coalesce((${walks.walk}->>'totalMinutes')::int, 0) > ${LONG_WALK_MINUTES} then 2 else 1 end), 0)`;

/** Walks that count, long ones twice: a signed-in person's since their period began (or ever, on the trial); a browser's in the last 30 days otherwise. Also today's, for the week pass's fair use. */
export async function usedWalks(user: User | null, sessionId: string | null, now = new Date()): Promise<{ period: number; today: number }> {
  const db = getDb();
  if (!db) return { period: 0, today: 0 };
  const dayStart = new Date(now); dayStart.setUTCHours(0, 0, 0, 0);
  const who = user ? eq(walks.userId, user.id) : sessionId ? eq(walks.sessionId, sessionId) : null;
  if (!who) return { period: 0, today: 0 };
  const since = user ? (hasActivePlan(user, now) && user.planStartsAt ? user.planStartsAt : new Date(0)) : new Date(now.getTime() - 30 * 86_400_000);
  const [p] = await db.select({ n: weighted }).from(walks).where(and(who, gt(walks.createdAt, since)));
  const [t] = await db.select({ n: weighted }).from(walks).where(and(who, gt(walks.createdAt, dayStart)));
  return { period: Number(p?.n ?? 0), today: Number(t?.n ?? 0) };
}

export async function allowanceFor(user: User | null, sessionId: string | null): Promise<Allowance> {
  const u = await usedWalks(user, sessionId);
  return decide(user, u.period, new Date(), u.today);
}
