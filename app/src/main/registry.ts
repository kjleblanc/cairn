import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type ProjectEntry = { dir: string; lastOpened: string };

/** The list is capped so its own boot-time rescan can never outrun the
 * renderer that polls it. `project:list` scans every remembered project
 * synchronously (~25 ms each, measured in Task 103): an unbounded list
 * once reached 151 entries — a 3.7 s scan against a 2 s poll — and starved
 * both event loops until the app wedged on its own registry. At 25 entries
 * the scan is ~0.6 s, comfortably inside the poll, and 25 recents is more
 * than a beginner ever scrolls through. The cap lives on the READ path (a
 * legacy oversized file is cheap again immediately) and on the WRITE path
 * (the file itself shrinks on the next open). Only the remembered entries
 * are dropped — never a project folder. */
export const RECENT_PROJECTS_LIMIT = 25;

function file(): string {
  return path.join(app.getPath("userData"), "projects.json");
}

function save(recent: ProjectEntry[]): void {
  writeFileSync(file(), JSON.stringify({ recent }, null, 2));
}

/** Every remembered project, most recent first, each with its own last-opened time. */
export function recentEntries(): ProjectEntry[] {
  try {
    if (!existsSync(file())) return [];
    const data = JSON.parse(readFileSync(file(), "utf8")) as { recent?: unknown };
    if (!Array.isArray(data.recent)) return [];
    return data.recent
      .filter((e): e is { dir: string; lastOpened?: unknown } => typeof (e as { dir?: unknown } | null)?.dir === "string")
      .map((e) => ({ dir: e.dir, lastOpened: typeof e.lastOpened === "string" ? e.lastOpened : "" }))
      .slice(0, RECENT_PROJECTS_LIMIT);
  } catch {
    return [];
  }
}

/** Move one project to the front with a fresh time; the others keep their own times. */
export function touchProject(dir: string): void {
  const rest = recentEntries().filter((e) => e.dir !== dir);
  save([{ dir, lastOpened: new Date().toISOString() }, ...rest].slice(0, RECENT_PROJECTS_LIMIT));
}

/** Drop one entry from the app's own remembered list. Never touches the project folder itself. */
export function forgetProject(dir: string): void {
  save(recentEntries().filter((e) => e.dir !== dir));
}
