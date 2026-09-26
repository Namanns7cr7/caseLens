import { defineConfig, devices } from "@playwright/test";

/** Runs the golden-path suite against the deployed Cloud Run service. */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /golden-path\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.LIVE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1512, height: 950 } } },
  ],
});
