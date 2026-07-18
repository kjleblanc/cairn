import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type ProjectEntry = { dir: string; lastOpened: string };

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
      .map((e) => ({ dir: e.dir, lastOpened: typeof e.lastOpened === "string" ? e.lastOpened : "" }));
  } catch {
    return [];
  }
}

/** Move one project to the front with a fresh time; the others keep their own times. */
export function touchProject(dir: string): void {
  const rest = recentEntries().filter((e) => e.dir !== dir);
  save([{ dir, lastOpened: new Date().toISOString() }, ...rest].slice(0, 8));
}

/** Drop one entry from the app's own remembered list. Never touches the project folder itself. */
export function forgetProject(dir: string): void {
  save(recentEntries().filter((e) => e.dir !== dir));
}
