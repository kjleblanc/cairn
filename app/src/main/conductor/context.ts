import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseFacts, parseLog, paths } from "@cairn/core";

export interface BriefingCaps {
  maxDepth: number;
  maxTreeEntries: number;
  maxRecordChars: number;
}

export const DEFAULT_CAPS: BriefingCaps = { maxDepth: 3, maxTreeEntries: 400, maxRecordChars: 6000 };

const SKIP_DIRS = new Set(["node_modules", "dist", "dist-unit", "out", ".cairn"]);

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n…(truncated)`;
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "(unavailable)";
  }
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

function gitSummary(root: string): string {
  try {
    const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const dirty = git(root, ["diff", "--name-only"]).length > 0 || git(root, ["ls-files", "--others", "--exclude-standard"]).length > 0;
    const subjects = git(root, ["log", "-5", "--format=%s"]);
    return `Branch: ${branch}\nWorking tree: ${dirty ? "has uncommitted changes" : "clean"}\nRecent commits:\n${subjects}`;
  } catch {
    return "Git information is unavailable for this project.";
  }
}

function fileTree(root: string, caps: BriefingCaps): { entries: string[]; truncated: boolean } {
  const entries: string[] = [];
  let truncated = false;
  const walk = (dir: string, depth: number): void => {
    if (depth > caps.maxDepth || entries.length >= caps.maxTreeEntries) return;
    let names: string[] = [];
    try {
      names = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      if (entries.length >= caps.maxTreeEntries) {
        truncated = true;
        return;
      }
      if (name.startsWith(".") || SKIP_DIRS.has(name)) continue;
      const absolute = join(dir, name);
      let isDirectory = false;
      try {
        isDirectory = statSync(absolute).isDirectory();
      } catch {
        continue;
      }
      entries.push(relative(root, absolute).replace(/\\/g, "/") + (isDirectory ? "/" : ""));
      if (isDirectory) walk(absolute, depth + 1);
    }
  };
  walk(root, 1);
  return { entries, truncated };
}

function recentRecords(root: string, caps: BriefingCaps): string {
  let names: string[] = [];
  try {
    names = readdirSync(paths.tasks(root));
  } catch {
    return "(no task records yet)";
  }
  const numbers = [...new Set(names.map((name) => /^(\d{3})-/.exec(name)?.[1]).filter(Boolean))] as string[];
  const recent = numbers.sort().slice(-3);
  if (recent.length === 0) return "(no task records yet)";
  return recent.map((number) => {
    const brief = clip(safeRead(join(paths.tasks(root), `${number}-brief.md`)), caps.maxRecordChars);
    const report = clip(safeRead(join(paths.tasks(root), `${number}-report.md`)), caps.maxRecordChars);
    return `### Task ${number} brief\n${brief}\n\n### Task ${number} report\n${report}`;
  }).join("\n\n");
}

export function assembleBriefing(root: string, caps: BriefingCaps = DEFAULT_CAPS): string {
  const facts = parseFacts(root);
  const log = parseLog(root);
  const logLines = log.map((row) => `| ${row.task} | ${row.date} | ${row.outcome} | ${row.summary} | moved: ${row.moved} |`).join("\n");
  const tree = fileTree(root, caps);
  return [
    "# Project briefing (assembled by Cairn's code, not by a model)",
    "## Contract facts",
    `Project: ${facts.name}\nBuilding: ${facts.what}\nUsers: ${facts.who}\nCurrent milestone: ${facts.milestone}\nContract status: ${facts.status}`,
    "## PROJECT.md",
    clip(safeRead(paths.project(root)), caps.maxRecordChars),
    "## Work log (task | date | outcome | summary | milestone moved)",
    logLines || "(empty)",
    "## Recent task records (last 3)",
    recentRecords(root, caps),
    "## Git",
    gitSummary(root),
    `## Files (names only${tree.truncated ? ", (truncated)" : ""})`,
    tree.entries.map((entry) => `- ${entry}`).join("\n") || "(none)",
  ].join("\n\n");
}
