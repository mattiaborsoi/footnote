import { describe, expect, it } from "vitest";
import { checkCurated, curate, describeCandidates, dropUnsupported } from "@/lib/pipeline/curate";
import { Intent } from "@/lib/pipeline/intent";
import type { Candidate } from "@/lib/providers/types";
import { CITY } from "../fixtures/city";

const cands: Candidate[] = [
  { id: "osm:node/1", name: "Abbey", category: "architecture", facts: ["Listed: Grade I", "Built: 1499"], tags: {}, ...CITY.abbey },
  { id: "osm:node/2", name: "Gardens", category: "park", facts: ["Opening hours: 10:00-18:00"], tags: {}, ...CITY.parade },
  { id: "osm:node/3", name: "Nameless corner", category: "place", facts: [], tags: {}, ...CITY.circus },
];
const intent = Intent.parse({ start: "Abbey", interests: ["architecture"], minutes: 60 });
const stop = (id: string, factsUsed: number[]) => ({ id, hook: "A hook line here", story: "A story with enough words in it.", why: "Because you like it.", factsUsed });
const good = { title: "A short walk", summary: "Two real stops with facts. Nothing invented.", stops: [stop("osm:node/1", [0, 1]), stop("osm:node/2", [0])] };

describe("checkCurated", () => {
  it("rejects unknown ids, duplicates and fact numbers that do not exist", () => {
    const check = checkCurated(cands);
    expect(check({ ...good, stops: [stop("osm:node/9", [0]), stop("osm:node/2", [0])] })).toMatch(/unknown id/);
    expect(check({ ...good, stops: [stop("osm:node/1", [0]), stop("osm:node/1", [0])] })).toMatch(/twice/);
    expect(check({ ...good, stops: [stop("osm:node/1", [7]), stop("osm:node/2", [0])] })).toMatch(/fact number/);
    expect(check(good)).toBeNull();
  });
});

it("dropUnsupported removes stops that cite no facts", () => {
  expect(dropUnsupported({ ...good, stops: [...good.stops, stop("osm:node/3", [])] }).stops.map((s) => s.id)).toEqual(["osm:node/1", "osm:node/2"]);
});

it("describeCandidates numbers places and facts", () => {
  expect(describeCandidates(cands)).toContain("#0 id=osm:node/1 · Abbey · architecture · facts: [0] Listed: Grade I [1] Built: 1499");
  expect(describeCandidates(cands)).toContain("no facts");
});

it("curate retries an invented id once and keeps only supported stops", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    const bad = JSON.stringify({ ...good, stops: [stop("osm:node/42", [0]), stop("osm:node/2", [0])] });
    const ok = JSON.stringify({ ...good, stops: [...good.stops, stop("osm:node/3", [])] });
    return { content: calls === 1 ? bad : ok };
  };
  const { curated } = await curate(intent, cands, transport, "m");
  expect(calls).toBe(2);
  expect(curated.stops.map((s) => s.id)).toEqual(["osm:node/1", "osm:node/2"]);
});
