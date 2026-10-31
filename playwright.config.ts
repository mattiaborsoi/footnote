import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the screens. With BASE_URL set they run against a running instance (the test
 * environment); otherwise Playwright starts the dev server itself with no database and no model,
 * and the tests mock the API routes they need.
 */
const base = process.env.BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: base ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: base ? undefined : {
    command: "pnpm dev --port 3000",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { SCHEDULER: "off", DATABASE_URL: "", LLM_BASE_URL: "http://127.0.0.1:9/v1", LLM_API_KEY: "test", DEV_ORIGINS: "localhost,127.0.0.1" },
  },
});
