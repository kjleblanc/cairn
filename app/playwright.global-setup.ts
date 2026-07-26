import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Playwright drives the BUILT app in `app/.vite`, never `app/src`. Nothing in
 * this config builds it, so a bare `npx playwright test` happily tests whatever
 * was last built — which mid-Phase 3 produced one plausible-looking failure for
 * an entirely wrong reason, against source that had already been fixed.
 *
 * That bundle is built from TWO sources, not one. `vite.main.config.ts`
 * externalises only Electron and Node's built-ins, so `@cairn/core` is compiled
 * INTO `.vite/build/main.js` — from `core/dist`, which is itself compiled from
 * `core/src`. Checking `app/src` alone therefore left the guard holed exactly
 * where Phase 3's envelope safety code lives: edit `core/src` without
 * rebuilding core, or rebuild core without rebuilding the app, and a bundle
 * carrying neither change sailed through.
 *
 * So the whole chain is checked, one link at a time, deepest first — the first
 * thing the owner is told is the first thing they have to build. Each link
 * names the command that fixes it. None of them build anything: a setup that
 * silently rebuilt would hide the same mistake behind a longer wait, and the
 * suite has exactly one entry point that builds first (`npm run test:smoke`).
 */
const APP = __dirname;
const CORE = join(APP, "..", "core");

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(path) : statSync(path).mtimeMs);
  }
  return newest;
}

/** Fail-closed on both counts: a missing output is as stale as an old one, and
 * a build that is merely the same age as its source counts as fresh only when
 * it is not older. */
function freshOrThrow(output: string, source: string, message: string): void {
  if (!existsSync(output) || newestMtime(output) < newestMtime(source)) throw new Error(message);
}

export default function globalSetup(): void {
  freshOrThrow(join(CORE, "dist"), join(CORE, "src"),
    "core/dist is missing or older than core/src, and the app bundle compiles core in — run `npm run build` in core (the repo-root `npm test` does it too), then `npm run test:smoke`; this setup never builds for you.");
  freshOrThrow(join(APP, ".vite"), join(CORE, "dist"),
    "The bundle in app/.vite is missing or older than core/dist, which it compiles in — run `npm run test:smoke`, which builds first; this setup never builds for you.");
  freshOrThrow(join(APP, ".vite"), join(APP, "src"),
    "The bundle in app/.vite is missing or older than app/src — run `npm run test:smoke`, which builds first; this setup never builds for you.");
}
