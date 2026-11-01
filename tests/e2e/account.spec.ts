import { expect, test } from "@playwright/test";

test("sign-in asks for the code after the email", async ({ page }) => {
  await page.route("**/api/auth/start", (route) => route.fulfill({ json: { ok: true, masked: "s•••@example.com" } }));
  await page.goto("/signin?next=/plans");
  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByRole("button", { name: /email me a code/i }).click();
  await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  await expect(page.getByText(/s•••@example.com/)).toBeVisible();
  const sign = page.getByRole("button", { name: /^sign in$/i });
  await expect(sign).toBeDisabled();
  await page.getByLabel("Code").fill("123 456");
  await expect(sign).toBeEnabled();
});

test("the passes page says the number of walks and never 'unlimited'", async ({ page }) => {
  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: /week pass/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /monthly/i })).toBeVisible();
  await expect(page.getByText(/up to/i).first()).toBeVisible();
  await expect(page.getByText(/unlimited/i)).toHaveCount(0);
});

test("the account page sends a stranger to sign in", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin\?next=%2Faccount|\/signin\?next=\/account/);
});
