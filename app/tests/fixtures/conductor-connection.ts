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
