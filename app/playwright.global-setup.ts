import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Playwright drives the BUILT app in `app/.vite`, never `app/src`. Nothing in
 * this config builds it, so a bare `npx playwright test` happily tests whatever
 * was last built — which mid-Phase 3 produced one plausible-looking failure for
 * an entirely wrong reason, against source that had already been fixed.
 *
 * This refuses to start when the bundle is older than the source. It
 * deliberately does NOT build: a setup that silently rebuilt would hide the
 * same mistake behind a longer wait, and the suite has exactly one entry point
 * that builds first (`npm run test:smoke`).
 */
const APP = __dirname;

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(path) : statSync(path).mtimeMs);
  }
  return newest;
}

export default function globalSetup(): void {
  const built = join(APP, ".vite");
  if (!existsSync(built) || newestMtime(built) < newestMtime(join(APP, "src"))) {
    throw new Error("The bundle in app/.vite is missing or older than app/src — run `npm run test:smoke`, which builds first; this setup never builds for you.");
  }
}
