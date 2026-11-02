import { describe, expect, it } from "vitest";
import { checkCurated, curate, describeCandidates, dropUnsupported, resolveCurated } from "@/lib/pipeline/curate";
import { Intent } from "@/lib/pipeline/intent";
import type { Candidate } from "@/lib/providers/types";
import { CITY } from "../fixtures/city";

const cands: Candidate[] = [
  { id: "osm:node/1", name: "Abbey", category: "architecture", facts: ["Listed: Grade I", "Built: 1499"], tags: {}, ...CITY.abbey },
  { id: "osm:node/2", name: "Gardens", category: "park", facts: ["Opening hours: 10:00-18:00"], tags: {}, ...CITY.parade },
  { id: "osm:node/3", name: "Nameless corner", category: "place", facts: [], tags: {}, ...CITY.circus },
];
const intent = Intent.parse({ start: "Abbey", interests: ["architecture"], minutes: 60 });
const stop = (n: number, factsUsed: number[]) => ({ n, hook: "A hook line here", story: "A story with enough words in it.", why: "Because you like it.", factsUsed });
const good = { title: "A short walk", summary: "Two real stops with facts. Nothing invented.", stops: [stop(0, [0, 1]), stop(1, [0])] };

describe("checkCurated", () => {
  it("rejects unknown ids, duplicates and fact numbers that do not exist", () => {
    const check = checkCurated(cands);
    expect(check({ ...good, stops: [stop(9, [0]), stop(1, [0])] })).toMatch(/unknown place/);
    expect(check({ ...good, stops: [stop(0, [0]), stop(0, [0])] })).toMatch(/twice/);
    expect(check({ ...good, stops: [stop(0, [7]), stop(1, [0])] })).toMatch(/fact number/);
    expect(check({ ...good, stops: [stop(0, []), stop(1, [0])] })).toMatch(/no fact numbers/);
    expect(check(good)).toBeNull();
  });
});

it("dropUnsupported removes stops that cite no facts", () => {
  expect(dropUnsupported(resolveCurated({ ...good, stops: [...good.stops, stop(2, [])] }, cands)).stops.map((s) => s.id)).toEqual(["osm:node/1", "osm:node/2"]);
});

it("describeCandidates numbers places and facts", () => {
  expect(describeCandidates(cands)).toContain("#0 Abbey · architecture · [0] Listed: Grade I [1] Built: 1499");
  expect(describeCandidates([{ ...cands[0], facts: ['Recommended on "A long blog title": worth the climb'] }])).toContain("[0] Recommended: worth the climb");
  expect(describeCandidates(cands)).toContain("no facts");
});

it("curate retries an invented id or an unsupported stop once", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    const bad = JSON.stringify({ ...good, stops: [stop(42, [0]), stop(1, [0])] });
    return { content: calls === 1 ? bad : JSON.stringify(good) };
  };
  const { curated } = await curate(intent, cands, transport, "m");
  expect(calls).toBe(2);
  expect(curated.stops.map((s) => s.id)).toEqual(["osm:node/1", "osm:node/2"]);
  calls = 0;
  const unsupported = async () => { calls++; return { content: calls === 1 ? JSON.stringify({ ...good, stops: [...good.stops, stop(2, [])] }) : JSON.stringify(good) }; };
  expect((await curate(intent, cands, unsupported, "m")).curated.stops).toHaveLength(2);
  expect(calls).toBe(2);
});
