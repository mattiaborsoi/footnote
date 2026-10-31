import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToText, pageTitle } from "@/lib/providers/readpage";
import { aggregate, normaliseName } from "@/lib/scout";
import { mergeScouted, spotToCandidate } from "@/lib/scout/spots";
import type { Candidate } from "@/lib/providers/types";
import { CITY } from "../fixtures/city";

describe("normaliseName", () => {
  it("drops articles, case and punctuation", () => {
    expect(normaliseName("The Circus")).toBe("circus");
    expect(normaliseName("Colonna & Small's")).toBe("colonna small s");
  });
});

it("aggregate merges the same place across pages and counts mentions", () => {
  const a = aggregate([
    { name: "The Circus", category: "architecture", reason: "r1", source: { title: "A", url: "u1" } },
    { name: "Circus", category: "architecture", reason: "r2", source: { title: "B", url: "u2" } },
    { name: "Circus", category: "architecture", reason: "r3", source: { title: "B", url: "u2" } },
    { name: "Pump Room", category: "cafe", reason: "r4", source: { title: "A", url: "u1" } },
  ]);
  expect(a[0]).toMatchObject({ name: "The Circus", mentions: 3, reason: "r1" });
  expect(a[0].sources.map((s) => s.url)).toEqual(["u1", "u2"]);
  expect(a[1].name).toBe("Pump Room");
});

it("decodeEntities handles named and numeric entities", () => {
  expect(decodeEntities("A Photographer&#039;s Guide &amp; more&hellip;")).toBe("A Photographer's Guide & more…");
});

it("htmlToText keeps words and drops chrome", () => {
  const html = "<html><head><title> Best cafés </title><style>p{}</style></head><body><nav>menu</nav><p>Hello &amp; welcome</p><script>x()</script><li>One</li></body></html>";
  expect(pageTitle(html)).toBe("Best cafés");
  expect(htmlToText(html)).toBe("Hello & welcome\nOne");
});

describe("spots into candidates", () => {
  const spot = { id: 7, name: "Colonna", category: "cafe", lat: CITY.circus.lat, lon: CITY.circus.lon, osmId: "osm:node/1", reason: "best filter coffee", sources: [{ title: "A coffee blog", url: "u" }], mentions: 2 };
  it("credits the source as a fact and boosts the score", () => {
    const c = spotToCandidate(spot);
    expect(c.id).toBe("osm:node/1");
    expect(c.facts[0]).toBe('Recommended on "A coffee blog": best filter coffee');
    expect(c.boost).toBe(4);
  });
  it("merges into the matching map candidate and adds the rest", () => {
    const found: Candidate[] = [{ id: "osm:node/1", name: "Colonna & Small's", category: "cafe", facts: ["Cuisine: coffee_shop"], tags: {}, ...CITY.circus }];
    const out = mergeScouted(found, [spotToCandidate(spot), spotToCandidate({ ...spot, id: 8, osmId: null, name: "Elsewhere" })]);
    expect(out).toHaveLength(2);
    expect(out[0].facts).toHaveLength(2);
    expect(out[0].boost).toBe(4);
    expect(out[1].id).toBe("scout:8");
  });
});
