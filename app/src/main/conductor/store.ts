import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { ConductorTurn } from "../../shared/ipc.js";

const IGNORE_LINE = "/.cairn/";

export function conversationsDir(root: string): string {
  return join(root, ".cairn", "conversations");
}

/** The project's own `.git-common-dir` (identical across worktrees), or null
 * when `root` is not inside a git repository at all. */
function gitCommonDir(root: string): string | null {
  try {
    const output = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) return null;
    return isAbsolute(output) ? output : join(root, output);
  } catch {
    return null;
  }
}

/** Keeps `.cairn/` out of the project's history without ever touching a
 * tracked file: the exclusion lives in `.git/info/exclude`, which is
 * per-clone, untracked, and shared across worktrees via `--git-common-dir`.
 * A project with no git repository is left untouched entirely — no
 * `.gitignore` is ever created as a fallback. Returns whether the line was
 * newly added (append-once, same as the retired `.gitignore` behavior). */
export function ensureCairnExcluded(root: string): boolean {
  const gitDir = gitCommonDir(root);
  if (!gitDir) return false;
  const excludePath = join(gitDir, "info", "exclude");
  const existing = existsSync(excludePath) ? readFileSync(excludePath, "utf8") : "";
  if (existing.split(/\r?\n/).includes(IGNORE_LINE)) return false;
  mkdirSync(join(gitDir, "info"), { recursive: true });
  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  writeFileSync(excludePath, `${prefix}${IGNORE_LINE}\n`, "utf8");
  return true;
}

export function newConversationId(root: string): string {
  let max = 0;
  try {
    for (const name of readdirSync(conversationsDir(root))) {
      const match = /^(\d{3})\.jsonl$/.exec(name);
      if (match) max = Math.max(max, Number(match[1]));
    }
  } catch {
    // No conversations yet.
  }
  return String(max + 1).padStart(3, "0");
}

export function appendTurn(root: string, id: string, turn: ConductorTurn): void {
  mkdirSync(conversationsDir(root), { recursive: true });
  appendFileSync(join(conversationsDir(root), `${id}.jsonl`), `${JSON.stringify(turn)}\n`, "utf8");
}

export function readTurns(root: string, id: string): ConductorTurn[] {
  const path = join(conversationsDir(root), `${id}.jsonl`);
  if (!existsSync(path)) return [];
  const turns: ConductorTurn[] = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as ConductorTurn;
      if ((value.role === "owner" || value.role === "cairn") && typeof value.text === "string" && typeof value.ts === "string") {
        turns.push(value);
      }
    } catch {
      // A corrupt line is skipped; the rest of the memory survives.
    }
  }
  return turns;
}

export function listConversations(root: string): Array<{ id: string; startedTs: string; preview: string }> {
  let names: string[] = [];
  try {
    names = readdirSync(conversationsDir(root));
  } catch {
    return [];
  }
  return names
    .map((name) => /^(\d{3})\.jsonl$/.exec(name)?.[1])
    .filter((id): id is string => Boolean(id))
    .sort()
    .map((id) => {
      const turns = readTurns(root, id);
      return { id, startedTs: turns[0]?.ts ?? "", preview: turns[0]?.text.slice(0, 80) ?? "" };
    });
}
