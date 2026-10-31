import { describe, expect, it } from "vitest";
import { dedupe, orderAlong, pickAndOrder, rank, score } from "@/lib/pipeline/candidates";
import type { Candidate } from "@/lib/providers/types";
import { CITY } from "../fixtures/city";

const cand = (id: string, name: string, at: { lat: number; lon: number }, facts: string[] = [], category = "architecture", tags = {}): Candidate =>
  ({ id, name, category, facts, tags, ...at });

describe("score", () => {
  it("rewards detail and punishes detour", () => {
    const rich = cand("a", "Rich", CITY.circus, ["Built: 1768", "Architect: Wood"], "architecture", { wikipedia: "en:The Circus" });
    const poor = cand("b", "Poor", CITY.circus);
    expect(score(rich, CITY.abbey, CITY.royalCrescent, 1000)).toBeGreaterThan(score(poor, CITY.abbey, CITY.royalCrescent, 1000));
    const far = cand("c", "Far", { lat: CITY.circus.lat + 0.02, lon: CITY.circus.lon }, ["Built: 1768", "Architect: Wood"]);
    expect(score(far, CITY.abbey, CITY.royalCrescent, 1000)).toBeLessThan(score(rich, CITY.abbey, CITY.royalCrescent, 1000));
  });
});

describe("dedupe", () => {
  it("merges the same name within 60 m and keeps the higher score", () => {
    const out = dedupe([
      { ...cand("a", "Pump Room", CITY.abbey), score: 1 },
      { ...cand("b", "pump room", { lat: CITY.abbey.lat + 0.0002, lon: CITY.abbey.lon }), score: 3 },
      { ...cand("c", "Pump Room", CITY.royalCrescent), score: 2 },
    ]);
    expect(out.map((o) => o.id)).toEqual(["b", "c"]);
  });
});

describe("rank and pickAndOrder", () => {
  it("orders point-to-point stops along the way and limits per category", () => {
    const cands = [
      cand("1", "Near end", CITY.royalCrescent, ["x"]),
      cand("2", "Near start", CITY.abbey, ["x"]),
      cand("3", "Middle", CITY.circus, ["x"]),
      cand("4", "Cafe", CITY.circus, ["x"], "cafe"),
      cand("5", "Another", CITY.circus, ["x", "y"]),
    ];
    const picked = pickAndOrder(rank(cands, CITY.abbey, CITY.royalCrescent, 1500), CITY.abbey, CITY.royalCrescent, 4);
    expect(picked.filter((p) => p.category === "architecture").length).toBeLessThanOrEqual(2);
    const ids = picked.map((p) => p.id);
    expect(ids.indexOf("2") === -1 || ids.indexOf("1") === -1 || ids.indexOf("2") < ids.indexOf("1")).toBe(true);
  });
  it("orders loop stops around the start", () => {
    const stops = [CITY.royalCrescent, CITY.parade, CITY.circus].map((p, i) => ({ ...p, id: String(i) }));
    const out = orderAlong(stops, CITY.abbey, null);
    expect(out).toHaveLength(3);
    expect(new Set(out.map((s) => s.id)).size).toBe(3);
  });
});
