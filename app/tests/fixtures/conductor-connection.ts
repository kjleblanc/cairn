import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * The provider connection lives in the app's real per-user settings folder
 * (Electron resolves it through the OS; it can't be redirected from a test —
 * the same constraint projects.spec.ts documents for the projects registry),
 * so a spec that touches it has to snapshot the file and put it back
 * byte-for-byte.
 *
 * Ported VERBATIM from `conductor.spec.ts`'s own local helper (Phase 3 Task 9);
 * the only edit is the `export` keyword.
 */
export function conductorFile(): string {
  if (process.platform === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Cairn", "conductor.json");
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Cairn", "conductor.json");
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "Cairn", "conductor.json");
}

/**
 * The snapshot lives in module state, which makes this pair safe for exactly
 * one detach at a time — and `playwright.config.ts` pins `workers: 1`, so specs
 * run one after another and never overlap. That line of config is load-bearing
 * for this file: raise it, and two specs in separate worker PROCESSES each hold
 * their own `saved`, so one restore can put the real key back part-way through
 * another spec's dispatching tests, and one can write back `null` over a
 * connection it never saw. Either silently reopens the real-money hole this
 * fixture exists to close.
 *
 * The re-entrancy throw below catches the same mistake within one process
 * (a spec that detaches twice, or forgets to restore). A cross-process version
 * would need a lock file beside `conductor.json` rather than module state; it
 * is not built because nothing today runs the suite in parallel, and the
 * config, not this file, is where that decision is made.
 */
let saved: Buffer | null = null;
let detached = false;

/**
 * Snapshots the stored connection and removes it, so the spec that follows
 * runs against no provider at all.
 *
 * Task 9 made this mandatory for EVERY spec that dispatches a run carrying a
 * conversation id, not just the ones that talk to Cairn: a settled run posts a
 * result card, and the envelope then asks the conductor to comment on it —
 * one paid call against whatever connection is stored. On a developer's own
 * machine that is a real key and a real provider account.
 */
export function detachStoredConnection(): void {
  if (detached) {
    // Fail loudly rather than overwrite the snapshot: a second detach would
    // record "there was nothing here" and the restore that follows would then
    // DELETE the owner's real connection instead of putting it back.
    throw new Error("CONDUCTOR_CONNECTION_ALREADY_DETACHED: restore the stored connection before detaching it again.");
  }
  const file = conductorFile();
  saved = existsSync(file) ? readFileSync(file) : null;
  detached = true;
  rmSync(file, { force: true });
}

/** Puts back exactly what was there, including nothing at all. */
export function restoreStoredConnection(): void {
  if (!detached) return;
  const file = conductorFile();
  if (saved !== null) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, saved);
  } else {
    rmSync(file, { force: true });
  }
  saved = null;
  detached = false;
}
