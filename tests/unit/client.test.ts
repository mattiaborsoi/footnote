import { describe, expect, it } from "vitest";
import { parseChunk } from "@/lib/client/sse";
import { whenString } from "@/lib/client/events";
import { summarySentence, toRequest, initialForm } from "@/components/request/RequestForm";

describe("sse", () => {
  it("parses an event with JSON data", () => {
    const seen: [string, unknown][] = [];
    parseChunk('event: stage\ndata: {"stage":"searching","ms":12}', (e, d) => seen.push([e, d]));
    expect(seen).toEqual([["stage", { stage: "searching", ms: 12 }]]);
  });
  it("ignores chunks without data", () => {
    const seen: unknown[] = [];
    parseChunk(": keep-alive", (e, d) => seen.push([e, d]));
    expect(seen).toHaveLength(0);
  });
});

it("whenString is now without a date, else local time with the offset", () => {
  expect(whenString("", "")).toBe("now");
  expect(whenString("2026-11-08", "17:30")).toMatch(/^2026-11-08T17:30:00[+-]\d{2}:\d{2}$/);
  expect(whenString("2026-11-08", "")).toMatch(/^2026-11-08T10:00:00/);
});

describe("form", () => {
  it("maps tiles to interests and companions to pace", () => {
    const r = toRequest({ ...initialForm, start: "Abbey", interests: ["craft", "cafes"], companions: ["me", "kids"], endKind: "transport" });
    expect(r.interests).toEqual(["art", "craft", "cafes"]);
    expect(r.end).toEqual({ kind: "transport" });
    expect("pace" in r).toBe(false);
    expect(toRequest({ ...initialForm, start: "x", pace: "brisk" }).pace).toBe("brisk");
  });
  it("writes the summary sentence", () => {
    expect(summarySentence({ ...initialForm, start: "the abbey", minutes: 90, interests: ["nature", "cafes"], companions: ["me", "kids"] })).toBe("A 1½ hour walk from the abbey, ending anywhere, today, with kids, around nature, cafés.");
  });
});
