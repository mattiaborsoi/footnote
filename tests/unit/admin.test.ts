import { describe, expect, it } from "vitest";
import { estimateCost } from "@/lib/admin/cost";

describe("estimateCost", () => {
  it("prices tokens per million", () => { expect(estimateCost(2_000_000, 500_000, 5, 25)).toBeCloseTo(22.5); });
  it("is zero without prices", () => { expect(estimateCost(1_000_000, 1_000_000, 0, 0)).toBe(0); });
});
