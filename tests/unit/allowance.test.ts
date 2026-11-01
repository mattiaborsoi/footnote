import { beforeAll, describe, expect, it, vi } from "vitest";
import { decide, hasActivePlan } from "@/lib/account/allowance";
import type { User } from "@/lib/auth";

// The rules under test are the repo defaults, whatever the host's environment says (the test machine lifts its own limit).
beforeAll(() => { vi.stubEnv("TRIAL_WALKS", "1"); vi.stubEnv("PLAN_WEEK_WALKS", "8"); vi.stubEnv("PLAN_MONTH_WALKS", "25"); });
const now = new Date("2026-03-14T12:00:00Z");
const user = (over: Partial<User> = {}): User => ({ id: "u1", email: "someone@example.com", emailKey: "someone@example.com", createdAt: now, lastSeenAt: now, language: "en", stripeCustomerId: null, plan: "none", planStatus: "none", planStartsAt: null, planEndsAt: null, subscriptionId: null, ...over });
const week = user({ plan: "week", planStatus: "active", planStartsAt: new Date("2026-03-12T00:00:00Z"), planEndsAt: new Date("2026-03-19T00:00:00Z") });

describe("decide", () => {
  it("gives a stranger one free walk, then asks them to sign in", () => {
    expect(decide(null, 0, now)).toMatchObject({ allowed: true, limit: 1, next: null });
    expect(decide(null, 1, now)).toMatchObject({ allowed: false, next: "signin" });
  });
  it("gives a signed-in person without a pass the same trial, then the passes", () => {
    expect(decide(user(), 1, now)).toMatchObject({ allowed: false, plan: "none", next: "plans" });
  });
  it("counts a pass's walks within its period", () => {
    expect(decide(week, 3, now)).toMatchObject({ allowed: true, plan: "week", limit: 8 });
    expect(decide(week, 8, now)).toMatchObject({ allowed: false, next: "plans" });
    expect(decide(week, 8, now).message).toMatch(/week pass/);
  });
  it("treats an expired pass as no pass", () => {
    expect(hasActivePlan(week, new Date("2026-03-20T00:00:00Z"))).toBe(false);
    expect(decide(week, 0, new Date("2026-03-20T00:00:00Z"))).toMatchObject({ plan: "none", limit: 1 });
  });
  it("keeps access while a cancelled month runs out, and while a payment is past due", () => {
    const cancelled = user({ plan: "month", planStatus: "cancelled", planStartsAt: new Date("2026-03-01T00:00:00Z"), planEndsAt: new Date("2026-04-01T00:00:00Z") });
    expect(hasActivePlan(cancelled, now)).toBe(false);
    const pastDue = user({ ...cancelled, planStatus: "past_due" });
    expect(decide(pastDue, 2, now)).toMatchObject({ allowed: true, plan: "month", limit: 25 });
  });
});
