import { test as base } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Every spec in this suite runs against a THROWAWAY app profile, never the
 * owner's real one. The redirection itself is the app's own test seam
 * (`main.ts`: `CAIRN_TEST_USER_DATA`, gated on `CAIRN_E2E=1` so no ordinary
 * launch can be redirected by a stray variable); this fixture is what makes
 * the suite actually use it, everywhere, with nothing for the operator to
 * set.
 *
 * Why this exists: the suite once ran against the real profile, and every
 * scaffolded test project accumulated in the real remembered-projects list.
 * Past a threshold the boot-time scan of that list outruns the renderer's
 * poll and the whole app wedges — the "click-hang" that made the suite
 * un-runnable (Task 103's diagnosis). Tests must never be able to do that
 * to the owner's machine again.
 *
 * Worker scope, one fresh profile per spec file: a file's `beforeAll`
 * hooks (the conductor-connection snapshot, projects.spec's seed/restore)
 * run after this fixture is set up, so every one of them sees the isolated
 * path; relaunches within a single test (the reload/reattach specs) share
 * the file's profile exactly as they must. All spec launches spread
 * `process.env`, so pointing the environment here covers every launch site
 * without editing one. Teardown restores the previous environment and
 * removes the temp dir. Safe under `workers: 1` (the config's load-bearing
 * setting): the environment is process-wide, and only one spec file runs at
 * a time.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Playwright's fixture-generic idiom
export const test = base.extend<{}, { isolatedProfile: void }>({
  isolatedProfile: [
    async ({}, use) => {
      const dir = mkdtempSync(join(tmpdir(), "cairn-e2e-profile-"));
      const previousE2e = process.env.CAIRN_E2E;
      const previousUserData = process.env.CAIRN_TEST_USER_DATA;
      process.env.CAIRN_E2E = "1";
      process.env.CAIRN_TEST_USER_DATA = dir;
      await use();
      if (previousE2e === undefined) delete process.env.CAIRN_E2E;
      else process.env.CAIRN_E2E = previousE2e;
      if (previousUserData === undefined) delete process.env.CAIRN_TEST_USER_DATA;
      else process.env.CAIRN_TEST_USER_DATA = previousUserData;
      rmSync(dir, { recursive: true, force: true });
    },
    { scope: "worker", auto: true },
  ],
});
