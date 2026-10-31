import { expect, test } from "@playwright/test";

test("an unknown walk shows the not-found page", async ({ page, isMobile }) => {
  test.skip(isMobile, "same on both layouts");
  // The page streams inside a Suspense boundary, so the status is sent before the lookup; the content is what matters.
  await page.goto("/w/zzzzzzzzzz");
  await expect(page.getByText(/404|could not be found/i).first()).toBeVisible();
});

test("the events endpoint rejects bad beacons and accepts good ones", async ({ request, isMobile }) => {
  test.skip(isMobile, "no browser involved");
  expect((await request.post("/api/events", { data: { type: "Bad Name!" } })).status()).toBe(400);
  expect((await request.post("/api/events", { data: { type: "ui.tap", sessionId: "abcdefgh1234", fields: { control: "test" } } })).status()).toBe(204);
});
