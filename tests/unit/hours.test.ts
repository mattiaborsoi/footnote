import { describe, expect, it } from "vitest";
import { arrivalTimes, localAsUtc, openAt, openState } from "@/lib/pipeline/hours";
import type { Route } from "@/lib/providers/types";

const sat14 = (hhmm: string) => new Date(`2026-03-14T${hhmm}:00Z`);
const sun15 = (hhmm: string) => new Date(`2026-03-15T${hhmm}:00Z`);

describe("openState over a window", () => {
  it("open now and closing inside the window", () => {
    expect(openState("Mo-Su 10:00-18:00", sat14("16:00"), sat14("19:00"))).toEqual({ state: "open", note: "closes 18:00" });
  });
  it("closed now but opening before the window ends", () => {
    expect(openState("Mo-Su 10:00-18:00", sat14("09:00"), sat14("11:00")).state).toBe("open");
  });
  it("closed all window on a Sunday", () => {
    expect(openState("Mo-Sa 09:00-17:00", sun15("10:00"), sun15("12:00")).state).toBe("closed");
  });
  it("unknown without a tag or with one we cannot read", () => {
    expect(openState(undefined, sat14("10:00"), sat14("11:00")).state).toBe("unknown");
    expect(openState("whenever we feel like it", sat14("10:00"), sat14("11:00")).state).toBe("unknown");
  });
});

it("openAt says till when, or when it opens", () => {
  expect(openAt("Mo-Su 10:00-18:00", sat14("14:25"))).toEqual({ state: "open", note: "open till 18:00" });
  expect(openAt("Mo-Su 10:00-18:00", sat14("18:20")).note).toMatch(/closed when you'd arrive at 18:20/);
});

it("localAsUtc keeps the walker's wall-clock time", () => {
  expect(localAsUtc("2026-03-14T14:00:00+01:00").toISOString()).toBe("2026-03-14T14:00:00.000Z");
});

it("arrivalTimes adds legs and dwell, scaled for pace", () => {
  const route: Route = { distanceM: 0, durationS: 0, geometry: [], legs: [{ distanceM: 1, durationS: 600 }, { distanceM: 1, durationS: 600 }, { distanceM: 1, durationS: 600 }] };
  const a = arrivalTimes(sat14("14:00"), route, 2, "normal");
  expect(a.map((d) => d.toISOString().slice(11, 16))).toEqual(["14:10", "14:26"]);
  const slow = arrivalTimes(sat14("14:00"), route, 1, "relaxed");
  expect(slow[0].getTime()).toBeGreaterThan(a[0].getTime());
});

import { readsAsSentence } from "@/lib/pipeline/plan";
it("readsAsSentence keeps prose and drops tag values", () => {
  expect(readsAsSentence('Recommended on "A blog": the roaster that put this city on the coffee map')).toBe(true);
  expect(readsAsSentence("Description: a riverside garden laid out as a private pleasure ground")).toBe(true);
  expect(readsAsSentence("Heritage: 2")).toBe(false);
  expect(readsAsSentence("Opening hours: Apr-Oct Mo-Su 10:00-18:00")).toBe(false);
  expect(readsAsSentence("Description: short")).toBe(false);
});
