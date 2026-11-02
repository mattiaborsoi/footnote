import { beforeAll, describe, expect, it, vi } from "vitest";
import { decide, hasActivePlan, walkWeight } from "@/lib/account/allowance";
import type { User } from "@/lib/auth";

// The rules under test are the repo defaults, whatever the host's environment says (the test machine lifts its own limit).
beforeAll(() => { vi.stubEnv("TRIAL_WALKS", "2"); vi.stubEnv("PLAN_WEEK_WALKS", "70"); vi.stubEnv("WEEK_PASS_DAILY_FAIR_USE", "10"); vi.stubEnv("PLAN_MONTH_WALKS", "25"); });
const now = new Date("2026-03-14T12:00:00Z");
const user = (over: Partial<User> = {}): User => ({ id: "u1", email: "someone@example.com", emailKey: "someone@example.com", createdAt: now, lastSeenAt: now, language: "en", stripeCustomerId: null, plan: "none", planStatus: "none", planStartsAt: null, planEndsAt: null, subscriptionId: null, ...over });
const week = user({ plan: "week", planStatus: "active", planStartsAt: new Date("2026-03-12T00:00:00Z"), planEndsAt: new Date("2026-03-19T00:00:00Z") });

describe("decide", () => {
  it("gives a stranger two free walks, then asks them to sign in", () => {
    expect(decide(null, 0, now)).toMatchObject({ allowed: true, limit: 2, next: null });
    expect(decide(null, 1, now)).toMatchObject({ allowed: true });
    expect(decide(null, 2, now)).toMatchObject({ allowed: false, next: "signin" });
  });
  it("gives a signed-in person without a pass the same trial, then the passes", () => {
    expect(decide(user(), 2, now)).toMatchObject({ allowed: false, plan: "none", next: "plans" });
  });
  it("gives the week pass as many walks as a week holds, ten a day", () => {
    expect(decide(week, 3, now, 3)).toMatchObject({ allowed: true, plan: "week", limit: 70 });
    expect(decide(week, 12, now, 10)).toMatchObject({ allowed: false, next: null });
    expect(decide(week, 12, now, 10).message).toMatch(/fair use/);
    expect(decide(week, 70, now, 2)).toMatchObject({ allowed: false, next: "plans" });
  });
  it("counts a walk over two hours as two", () => {
    expect(walkWeight(90)).toBe(1);
    expect(walkWeight(120)).toBe(1);
    expect(walkWeight(121)).toBe(2);
  });
  it("treats an expired pass as no pass", () => {
    expect(hasActivePlan(week, new Date("2026-03-20T00:00:00Z"))).toBe(false);
    expect(decide(week, 0, new Date("2026-03-20T00:00:00Z"))).toMatchObject({ plan: "none", limit: 2 });
  });
  it("keeps access while a cancelled month runs out, and while a payment is past due", () => {
    const cancelled = user({ plan: "month", planStatus: "cancelled", planStartsAt: new Date("2026-03-01T00:00:00Z"), planEndsAt: new Date("2026-04-01T00:00:00Z") });
    expect(hasActivePlan(cancelled, now)).toBe(false);
    const pastDue = user({ ...cancelled, planStatus: "past_due" });
    expect(decide(pastDue, 2, now)).toMatchObject({ allowed: true, plan: "month", limit: 25 });
  });
});
