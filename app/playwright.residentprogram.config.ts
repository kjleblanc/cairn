import { defineConfig } from "@playwright/test";

/**
 * Task 255's dedicated board qualification.
 *
 * `workers: 1` is load-bearing, not a performance choice: the whole Playwright
 * estate here shares one profile and one conductor connection. The port is
 * strict and distinct from Task 229's 7398, so a collision fails loudly instead
 * of quietly qualifying somebody else's server, and `reuseExistingServer: false`
 * means this run always measures a server it started and will stop.
 *
 * The board renders fixed synthetic data only. Nothing it loads reaches a
 * project, a provider, a credential, or the network beyond this local server.
 */
export default defineConfig({
  testDir: "tests-qualification",
  testMatch: "resident-program-board.browser.spec.ts",
  /**
   * Task-scoped, and load-bearing. Playwright CLEANS its output directory at
   * the start of every run, and the default is `test-results` — which is where
   * Task 229's report cites its retained screenshot. Left at the default, this
   * config silently deletes another task's evidence every time it runs. It did,
   * once, before this line existed.
   */
  outputDir: "test-results/task255-runner",
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:7399",
    channel: "msedge",
    viewport: { width: 1320, height: 980 },
  },
  webServer: {
    command: "npm.cmd run lab -- --host 127.0.0.1 --port 7399 --strictPort",
    url: "http://127.0.0.1:7399/lab/resident-program.html",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
