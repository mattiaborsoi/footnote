import { describe, expect, it } from "vitest";
import { postQuery } from "@/lib/providers/overpass";

const reply = (status: number, elements?: unknown[]) => async () => new Response(JSON.stringify(elements ? { elements } : { remark: "runtime error" }), { status });

describe("postQuery", () => {
  it("moves to the next endpoint on a server error and skips the bad one next time", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request) => {
      calls.push(String(url));
      return String(url).includes("a.example") ? reply(502)() : reply(200, [{ type: "node", id: 1 }])();
    }) as unknown as typeof fetch;
    const endpoints = ["https://a.example/api", "https://b.example/api"];
    expect(await postQuery("q", 10, endpoints, fetchImpl)).toHaveLength(1);
    expect(calls).toEqual(["https://a.example/api", "https://b.example/api"]);
    await postQuery("q", 10, endpoints, fetchImpl);
    expect(calls[2]).toBe("https://b.example/api");
  });
  it("throws the last error when every endpoint fails, and treats a remark without elements as a failure", async () => {
    const fetchImpl = (async () => reply(504)()) as unknown as typeof fetch;
    await expect(postQuery("q", 10, ["https://a.example/api"], fetchImpl)).rejects.toThrow("places 504");
    const remark = (async () => reply(200)()) as unknown as typeof fetch;
    await expect(postQuery("q", 10, ["https://c.example/api"], remark)).rejects.toThrow("runtime error");
  });
});
