import { describe, expect, it } from "vitest";
import { z } from "zod";
import { askJson, extractJson, LlmError, type Transport } from "@/lib/llm/client";

const Shape = z.object({ n: z.number() });
const replies = (...contents: string[]): Transport => {
  let i = 0;
  return async () => ({ content: contents[Math.min(i++, contents.length - 1)], usage: { promptTokens: 10, completionTokens: 5 } });
};

describe("extractJson", () => {
  it("reads fenced and padded replies", () => {
    expect(extractJson('Sure:\n```json\n{"n": 1}\n```')).toEqual({ n: 1 });
    expect(extractJson('{"n": 2} trailing')).toEqual({ n: 2 });
  });
  it("fails without an object", () => expect(() => extractJson("nothing here")).toThrow());
});

describe("askJson", () => {
  const req = { model: "m", system: "s", user: "u" };
  it("returns validated data and sums usage", async () => {
    const r = await askJson(replies('{"n": 3}'), Shape, req);
    expect(r.data.n).toBe(3);
    expect(r.attempts).toBe(1);
    expect(r.usage.promptTokens).toBe(10);
  });
  it("retries once with the error fed back, then succeeds", async () => {
    let seen: string[] = [];
    const t: Transport = async ({ messages }) => {
      seen = messages.map((m) => m.content);
      return { content: messages.length > 2 ? '{"n": 4}' : '{"n": "x"}' };
    };
    const r = await askJson(t, Shape, req);
    expect(r.data.n).toBe(4);
    expect(r.attempts).toBe(2);
    expect(seen.some((c) => c.includes("invalid"))).toBe(true);
  });
  it("applies the domain check and gives up after two attempts", async () => {
    await expect(askJson(replies('{"n": 9}', '{"n": 9}'), Shape, req, (d) => (d.n > 5 ? "n too big" : null))).rejects.toBeInstanceOf(LlmError);
  });
  it("maps provider statuses to messages a person can act on", () => {
    expect(new LlmError(401, "x").userMessage).toMatch(/key/);
    expect(new LlmError(429, "x").userMessage).toMatch(/busy/);
  });
});
