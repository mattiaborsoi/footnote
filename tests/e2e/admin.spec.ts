import { expect, test } from "@playwright/test";

test("the dashboard does not exist on an instance without ADMIN_UI", async ({ page }) => {
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
  const login = await page.goto("/admin/login");
  expect(login?.status()).toBe(404);
});
