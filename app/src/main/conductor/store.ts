import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { ConductorTurn, ResultCard } from "../../shared/ipc.js";
import { cardDigest, cardMarkers, recordCardMarker } from "./cardauth.js";

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

/**
 * Appends one turn. An envelope turn is VOUCHED FOR first: its marker is
 * recorded outside the project (see `cardauth.ts`) before the line itself is
 * written, so a card that reaches the file is always one `readTurns` will
 * accept. If the marker cannot be recorded this throws and nothing is written
 * — a card whose authorship Cairn cannot later prove is not a card it posts.
 */
export function appendTurn(root: string, id: string, turn: ConductorTurn): void {
  if (turn.role === "envelope") recordCardMarker(root, id, turn.ts, turn.card);
  mkdirSync(conversationsDir(root), { recursive: true });
  appendFileSync(join(conversationsDir(root), `${id}.jsonl`), `${JSON.stringify(turn)}\n`, "utf8");
}

/**
 * An envelope line is kept only when it really carries a result card: an
 * object whose `kind` is "result", with a known disposition and a real
 * `filesChanged` array. Anything else is DROPPED, never coerced into a card —
 * a half-written or hand-edited line must not become a result the owner reads
 * as Cairn's own verification.
 *
 * Shape is half the question. WHO WROTE IT is the other half, and it is asked
 * separately in `readTurns` — this guard would pass a worker's own perfectly
 * shaped forgery, which is exactly the hole the marker check closes.
 */
function isResultCard(value: unknown): value is ResultCard {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Partial<ResultCard>;
  return card.kind === "result"
    && (card.disposition === "DONE" || card.disposition === "STOPPED" || card.disposition === "ERROR")
    && Array.isArray(card.filesChanged);
}

export function readTurns(root: string, id: string): ConductorTurn[] {
  const path = join(conversationsDir(root), `${id}.jsonl`);
  if (!existsSync(path)) return [];
  const turns: ConductorTurn[] = [];
  // Read once for the whole file: every envelope line is checked against this
  // set, and an empty set (no marker store, no file, an unreadable one) drops
  // every card rather than trusting any.
  const markers = cardMarkers(root);
  // Digests already shown from this file. Authorship stops a card being
  // MANUFACTURED; it cannot stop one being COPIED, because a byte-identical
  // copy of a genuine line is genuine by every test authorship can apply — and
  // a card shown twice misstates how many times Cairn verified something.
  // De-duplicating here has no false positives: runs are serialised per project
  // directory and `ts` is millisecond-resolution ISO, so Cairn can never
  // legitimately write two envelope lines with the same digest in one
  // conversation. Two cards that differ in any field, or in the millisecond
  // they were written, both stand.
  const shown = new Set<string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as ConductorTurn;
      if (typeof value.ts !== "string") continue;
      if ((value.role === "owner" || value.role === "cairn") && typeof value.text === "string") {
        turns.push(value);
      } else if (value.role === "envelope" && isResultCard(value.card)) {
        // Shape AND authorship. What the owner reads as Cairn's own
        // verification has to be something Cairn actually wrote: this line
        // lives inside the project root a worker can write to, and only the
        // marker — which lives outside it — can tell the two apart.
        const digest = cardDigest(root, id, value.ts, value.card);
        if (!markers.has(digest) || shown.has(digest)) continue;
        shown.add(digest);
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
      // The preview names what was SAID. A conversation can now begin with a
      // result card (a run dispatched, then resumed later), which has no text
      // at all — so the preview is the first thing owner or Cairn said, and
      // "Result card" only when neither ever spoke.
      const spoken = turns.find((turn) => turn.role === "owner" || turn.role === "cairn");
      const preview = spoken && spoken.role !== "envelope"
        ? spoken.text.slice(0, 80)
        : turns.length > 0 ? "Result card" : "";
      return { id, startedTs: turns[0]?.ts ?? "", preview };
    });
}
