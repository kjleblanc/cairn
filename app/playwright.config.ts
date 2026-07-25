import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  // LOAD-BEARING, not a performance setting. `tests/fixtures/conductor-connection.ts`
  // snapshots the owner's real `conductor.json`, deletes it, and puts it back
  // from MODULE STATE. That is safe for exactly one detach at a time, which is
  // true only while specs run one after another in one process. Raise this and
  // two specs in separate worker processes each hold their own snapshot: one
  // restore can put a real provider key back part-way through another spec's
  // dispatching tests, and one can write back "there was nothing here" over a
  // connection it never saw. Read that file's own comment before changing this.
  workers: 1,
  // Refuses to run against a bundle older than `app/src`. It never builds —
  // `npm run test:smoke` is the entry point that does.
  globalSetup: "./playwright.global-setup.ts",
});
