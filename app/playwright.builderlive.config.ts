import { defineConfig } from "@playwright/test";

/** One visible, owner-driven connection followed by one guarded paid call and
 * one off-screen cold restore. No other Playwright file may join this run. */
export default defineConfig({
  testDir: "tests",
  testMatch: "builder-live-conversation.spec.ts",
  outputDir: "test-results/task233-builder-live",
  timeout: 12 * 60_000,
  expect: { timeout: 30_000 },
  workers: 1,
  fullyParallel: false,
  globalSetup: "./playwright.global-setup.ts",
});
