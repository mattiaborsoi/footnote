import { describe, expect, it } from "vitest";
import { fingerprint } from "@/lib/pipeline/fingerprint";

const base = { start: "Bath Abbey", end: { kind: "anywhere" }, minutes: 60, companions: ["me"], interests: ["history", "cafes"], when: "now", notes: "", language: "en" };

describe("fingerprint", () => {
  it("ignores case, spacing and the order of lists", () => {
    const a = fingerprint(base);
    expect(fingerprint({ ...base, start: "  bath   abbey ", interests: ["cafes", "history"] })).toBe(a);
  });
  it("changes with anything that changes the walk", () => {
    const a = fingerprint(base);
    expect(fingerprint({ ...base, minutes: 90 })).not.toBe(a);
    expect(fingerprint({ ...base, companions: ["me", "kids"] })).not.toBe(a);
    expect(fingerprint({ ...base, notes: "avoid hills" })).not.toBe(a);
    expect(fingerprint({ ...base, language: "it" })).not.toBe(a);
  });
  it("buckets 'now' by the hour and a date by its hour", () => {
    expect(fingerprint(base, new Date("2026-11-08T10:05:00Z"))).toBe(fingerprint(base, new Date("2026-11-08T10:55:00Z")));
    expect(fingerprint(base, new Date("2026-11-08T10:05:00Z"))).not.toBe(fingerprint(base, new Date("2026-11-08T11:05:00Z")));
    expect(fingerprint({ ...base, when: "2026-11-08T14:00:00+00:00" })).toBe(fingerprint({ ...base, when: "2026-11-08T14:40:00+00:00" }));
  });
});
