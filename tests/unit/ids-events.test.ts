import { describe, expect, it } from "vitest";
import { ClientEvent, Feedback } from "@/lib/events";
import { ID_PATTERN, newId } from "@/lib/ids";

describe("ids", () => {
  it("are 10 characters from the safe alphabet and distinct", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(ID_PATTERN);
    expect([...ids].join("")).not.toMatch(/[lo01]/);
  });
});

describe("client events", () => {
  it("accepts a small named event", () => {
    expect(ClientEvent.parse({ type: "ui.tap", sessionId: "abcdefgh12", fields: { control: "export", wait_s: 31 } }).type).toBe("ui.tap");
  });
  it("rejects bad names, nested fields and oversized bags", () => {
    expect(() => ClientEvent.parse({ type: "Tap!" })).toThrow();
    expect(() => ClientEvent.parse({ type: "ui.tap", fields: { nested: { a: 1 } } })).toThrow();
    expect(() => ClientEvent.parse({ type: "ui.tap", fields: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, "x".repeat(100)])) })).toThrow();
  });
});

it("feedback needs a message and trims it", () => {
  expect(Feedback.parse({ message: "  the map was blank  " }).message).toBe("the map was blank");
  expect(() => Feedback.parse({ message: " " })).toThrow();
});
