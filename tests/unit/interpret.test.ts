import { describe, expect, it } from "vitest";
import { interpret, paceFor, RequestForm } from "@/lib/pipeline/interpret";

describe("interpret", () => {
  it("maps the six questions without the model when the free text is empty", async () => {
    const intent = await interpret({ start: "Abbey", end: { kind: "transport" }, minutes: 60, companions: ["me", "kids"], interests: ["nature", "cafes"], when: "now", language: "it" }, null, "m");
    expect(intent.pace).toBe("relaxed");
    expect(intent.end).toBeNull();
    expect(intent.endMode).toBe("transport");
    expect(intent.language).toBe("it");
    expect(intent.interests).toEqual(["nature", "cafes"]);
  });
  it("uses the model only for the free-text line and merges what it extracts", async () => {
    const transport = async () => ({ content: '{"avoid": ["busy roads"], "mustInclude": ["the weir"], "endNear": "the station", "interests": ["views"]}' });
    const intent = await interpret({ start: "Abbey", interests: ["parks"], notes: "avoid busy roads, see the weir, end near the station" }, transport, "m");
    expect(intent.avoid).toEqual(["busy roads"]);
    expect(intent.mustInclude).toEqual(["the weir"]);
    expect(intent.end).toBe("the station");
    expect(intent.interests).toEqual(["parks", "views"]);
  });
  it("rejects an empty form", () => expect(() => RequestForm.parse({ start: "", interests: [] })).toThrow());
  it("just me walks at a normal pace", () => expect(paceFor(["me"])).toBe("normal"));
});
