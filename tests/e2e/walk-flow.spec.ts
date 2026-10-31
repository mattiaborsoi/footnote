import { expect, test } from "@playwright/test";
import { mockTiles, mockWalkStream } from "./fixtures";

test("a request streams through the four stages and opens the walk", async ({ page, isMobile }) => {
  await mockTiles(page);
  await mockWalkStream(page);
  await page.goto("/");
  await page.getByRole("textbox", { name: /start/i }).fill("Abbey");
  if (isMobile) {
    for (const step of ["how long", "who", "what you love", "when", "anything else"]) await page.getByRole("button", { name: new RegExp(`next: ${step}`, "i") }).click();
  }
  await page.getByRole("button", { name: /build my walk/i }).click();
  await expect(page.getByRole("status")).toContainText(/Understood/);
  // The walk page itself needs the database; here the arrival at its address is the proof.
  await expect(page).toHaveURL(/\/w\/abcdef2345$/, { timeout: 15_000 });
});

test("a failure is explained and the form comes back", async ({ page, isMobile }) => {
  test.skip(isMobile, "same logic on both layouts");
  await mockTiles(page);
  await page.route("**/api/walk", (route) => route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: 'event: error\ndata: {"message":"The model is busy right now. Try again in a minute."}\n\n' }));
  await page.goto("/");
  await page.getByRole("textbox", { name: /start/i }).fill("Abbey");
  await page.getByRole("button", { name: /build my walk/i }).click();
  await expect(page.getByText(/model is busy/)).toBeVisible();
  await page.getByRole("button", { name: /try again/i }).click();
  await expect(page.getByRole("button", { name: /build my walk/i })).toBeEnabled();
});
