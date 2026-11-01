import { expect, test } from "@playwright/test";
import { mockTiles } from "./fixtures";

test.beforeEach(async ({ page }) => { await mockTiles(page); });

test("the request cannot be built without a start and an interest", async ({ page, isMobile }) => {
  let sent = 0;
  await page.route("**/api/walk", (route) => { sent += 1; return route.abort(); });
  await page.goto("/");
  await expect(page.getByText(/walk from/).first()).toBeVisible();
  const submit = page.getByRole("button", { name: isMobile ? /^next:/i : /build my walk/i });
  await expect(submit).toBeEnabled(); // the button explains instead of greying out
  await submit.click();
  await expect(page.getByRole("textbox", { name: /start/i })).toBeFocused(); // the start is required
  await page.getByRole("textbox", { name: /start/i }).fill("Abbey");
  if (!isMobile) {
    await page.getByRole("button", { name: "History" }).click(); // deselect the default interest
    await submit.click();
    await expect(page.getByText(/pick at least one thing you love/i)).toBeVisible();
    expect(sent).toBe(0);
  }
});

test("the summary sentence rewrites itself as you choose", async ({ page, isMobile }) => {
  test.skip(isMobile, "the phone shows one question at a time");
  await page.goto("/");
  await page.getByRole("textbox", { name: /start/i }).fill("the abbey");
  await page.getByRole("button", { name: "With kids" }).click();
  await page.getByRole("button", { name: "2 h", exact: true }).click();
  await expect(page.getByText(/A 2 hours walk from the abbey, ending anywhere, today, with kids/)).toBeVisible();
});

test("on a phone the six questions come one per screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "desktop shows all questions at once");
  await page.goto("/");
  await expect(page.getByText("1 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How long?" })).toHaveCount(0);
  await page.getByRole("textbox", { name: /start/i }).fill("Abbey");
  await page.getByRole("button", { name: /next: how long/i }).click();
  await expect(page.getByText("2 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How long?" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("1 of 6")).toBeVisible();
});

test("around me is one tap away", async ({ page, isMobile }) => {
  test.skip(isMobile, "the link sits in the desktop header");
  await page.goto("/");
  await page.getByRole("link", { name: /around me/i }).click();
  await expect(page).toHaveURL(/\/around$/);
});
