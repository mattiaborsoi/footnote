import { expect, test } from "@playwright/test";
import { mockTiles } from "./fixtures";
import { CITY } from "../fixtures/city";

test.use({ geolocation: { latitude: CITY.abbey.lat, longitude: CITY.abbey.lon }, permissions: ["geolocation"] });

test("around me shows open options within ten minutes", async ({ page, baseURL }) => {
  test.skip(!/^https:|\/\/(localhost|127\.0\.0\.1)/.test(baseURL ?? ""), "geolocation exists only on secure origins");
  await mockTiles(page);
  await page.route("**/api/around", (route) => route.fulfill({ json: { options: [
    { id: "osm:node/1", name: "The Circus", category: "architecture", ...CITY.circus, minutes: 4, hook: "Three terraces.", hoursNote: "", open: "unknown", sources: [] },
    { id: "osm:node/2", name: "A café", category: "cafe", ...CITY.parade, minutes: 6, hook: "Good filter coffee.", hoursNote: "open till 18:00", open: "open", sources: [] },
  ] } }));
  await page.goto("/around");
  await expect(page.getByRole("heading", { name: /2 within ten minutes/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("open till 18:00")).toBeVisible();
  const go = page.getByRole("link", { name: "Go" }).first();
  await expect(go).toHaveAttribute("href", /travelmode=walking&destination=51\.38/);
  await expect(page.getByRole("link", { name: /make this a walk/i }).first()).toHaveAttribute("href", /\/\?start=51\.38/);
});
