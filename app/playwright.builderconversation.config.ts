import { defineConfig } from "@playwright/test";

/** Dedicated output ownership keeps this closed desktop proof from clearing
 * Task 229's retained lab screenshot or the default suite's results. */
export default defineConfig({
  testDir: "tests",
  testMatch: "builder-proposal-conversation.spec.ts",
  outputDir: "test-results/task232-builder-conversation",
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  globalSetup: "./playwright.global-setup.ts",
});
