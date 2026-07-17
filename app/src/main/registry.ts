import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Entry = { dir: string; lastOpened: string };

function file(): string {
  return path.join(app.getPath("userData"), "projects.json");
}

export function recentDirs(): string[] {
  try {
    if (!existsSync(file())) return [];
    const data = JSON.parse(readFileSync(file(), "utf8")) as { recent: Entry[] };
    return data.recent.map((e) => e.dir);
  } catch {
    return [];
  }
}

export function touchProject(dir: string): void {
  const rest = recentDirs().filter((d) => d !== dir);
  const recent: Entry[] = [dir, ...rest].slice(0, 8).map((d) => ({ dir: d, lastOpened: new Date().toISOString() }));
  writeFileSync(file(), JSON.stringify({ recent }, null, 2));
}
