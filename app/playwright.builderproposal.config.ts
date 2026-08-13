import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests-qualification",
  testMatch: "builder-proposal-review.browser.spec.ts",
  timeout: 30_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:7398",
    channel: "msedge",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "npm.cmd run lab -- --host 127.0.0.1 --port 7398 --strictPort",
    url: "http://127.0.0.1:7398/lab/builderproposal.html",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
