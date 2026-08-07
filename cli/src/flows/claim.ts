import pc from "picocolors";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Task-number claiming and renumbering (Task 162).
 *
 * The contract says a task number is taken if its brief file exists,
 * "committed or not". Humans kept missing the "or not" part in sibling lane
 * worktrees — an uncommitted brief inside `.lanes/<letter>` is invisible to
 * git from another lane. This module checks all three sources in one shot:
 * the caller's own tasks dir, every `.lanes/*` tasks dir, and every local
 * branch's tree. Claiming then commits the brief alone, atomically, so the
 * check-and-commit window shrinks to one command.
 */

const TASKS_REL = path.join("docs", "ai-work", "tasks");
const LOG_REL = path.join("docs", "ai-work", "LOG.md");

export interface TakenNumbers {
  /** task number -> the places it was seen (own tree, lane dirs, branches) */
  taken: Map<number, string[]>;
  /** human-readable notes about sources that could not be read */
  notes: string[];
}

function taskNumbersInDir(absDir: string): number[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(absDir);
  } catch {
    return [];
  }
  const numbers: number[] = [];
  for (const entry of entries) {
    const match = /^(\d{3,})-/.exec(entry);
    if (match) numbers.push(Number.parseInt(match[1], 10));
  }
  return numbers;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function gitBuffer(root: string, args: string[]): Buffer {
  return execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
}

function addSightings(taken: Map<number, string[]>, numbers: number[], source: string): void {
  for (const n of numbers) {
    const places = taken.get(n) ?? [];
    if (!places.includes(source)) places.push(source);
    taken.set(n, places);
  }
}

/** Scan every source the contract's claim rule names, in one shot. */
export function scanTakenNumbers(root: string): TakenNumbers {
  const taken = new Map<number, string[]>();
  const notes: string[] = [];

  // 1. The caller's own working tree (committed or not).
  addSightings(taken, taskNumbersInDir(path.join(root, TASKS_REL)), "this worktree");

  // 2. Every sibling lane worktree's tasks dir — the historically missed source.
  const lanesDir = path.join(root, ".lanes");
  let laneNames: string[] = [];
  try {
    laneNames = fs
      .readdirSync(lanesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    laneNames = [];
  }
  for (const lane of laneNames) {
    const numbers = taskNumbersInDir(path.join(lanesDir, lane, TASKS_REL));
    addSightings(taken, numbers, `.lanes/${lane}`);
  }

  // 3. Every local branch's committed tree (covers lanes whose worktrees are absent).
  try {
    const branches = git(root, ["for-each-ref", "--format=%(refname:short)", "refs/heads/"])
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (const branch of branches) {
      const listing = git(root, ["ls-tree", "-r", "--name-only", branch, "--", "docs/ai-work/tasks/"]);
      const numbers = listing
        .split("\n")
        .map((line) => /^docs\/ai-work\/tasks\/(\d{3,})-/.exec(line.trim()))
        .filter((match): match is RegExpExecArray => match !== null)
        .map((match) => Number.parseInt(match[1], 10));
      addSightings(taken, numbers, `branch ${branch}`);
    }
  } catch {
    notes.push("git branch history could not be read here; only working trees were scanned");
  }

  return { taken, notes };
}

/** The contract's lowest free number. */
export function lowestFree(taken: Iterable<number>): number {
  const set = new Set(taken);
  let n = 1;
  while (set.has(n)) n += 1;
  return n;
}

export function padNumber(n: number): string {
  return String(n).padStart(3, "0");
}

/** Lane letter from the worktree location: `.lanes/b` -> "B", anything else -> "A". */
export function detectLane(root: string): { letter: string; label: string } {
  const parent = path.basename(path.dirname(root));
  const self = path.basename(root);
  if (parent === ".lanes" && /^[a-z]$/i.test(self)) {
    const letter = self.toUpperCase();
    return { letter, label: `${letter} (\`.lanes/${self}\`)` };
  }
  return { letter: "A", label: "A (main checkout)" };
}

export function briefSkeleton(n: number, title: string, laneLabel: string, baseCommit: string): string {
  const nnn = padNumber(n);
  return `# Task ${nnn} brief — ${title}

**Lane:** ${laneLabel}
**Base commit:** ${baseCommit}

## Requested visible outcome

TODO: one paragraph — what the owner will see when this is done, in plain
language, with the owner's own words where possible.

## Boundary of intent — what must not change

- TODO: behavior, dependencies, stored data, and security posture that this
  task must leave exactly as they are.

## Plan (AI decision)

- TODO

## Checks that will show the outcome holds

Each check carries a stable id so the report can answer it by name. Add or
remove numbered items as the task needs; keep the ids in order.

1. **\`c1\`** — TODO: exact command, named so a later conversation can re-run
   it, and what its output must show.
2. **\`c2\`** — TODO.

## DONE and STOPPED

- **DONE**: TODO — the outcome holds and its checks completed.
- **STOPPED**: TODO — it does not; the report names the safe state left behind.
`;
}

export interface ClaimResult {
  n: number;
  nnn: string;
  briefRelPath: string;
  commitMessage: string;
  sightingsSummary: string;
}

/**
 * Claim the lowest free task number: write the brief skeleton and commit it
 * alone, by exact path. Refuses — naming why — when the commit could not be
 * isolated, because the contract says to skip the commit in that case rather
 * than sweep up unrelated staged work.
 */
export function claimTask(root: string, title: string): ClaimResult {
  const tasksDir = path.join(root, TASKS_REL);
  if (!fs.existsSync(tasksDir)) {
    throw new Error(`No task records here (${TASKS_REL} is missing). Is this a Cairn project?`);
  }
  if (!title.trim()) {
    throw new Error("A claim needs a title: cairn claim \"the visible outcome, briefly\"");
  }

  const staged = git(root, ["diff", "--cached", "--name-only"]).trim();
  if (staged) {
    throw new Error(
      `The index already holds staged work (${staged.split("\n").length} path(s)). ` +
        "The claim commit must be exactly one file; commit or unstage that work first.",
    );
  }

  const { taken, notes } = scanTakenNumbers(root);
  const n = lowestFree(taken.keys());
  const nnn = padNumber(n);
  const lane = detectLane(root);
  const baseCommit = git(root, ["rev-parse", "--short", "HEAD"]).trim();

  const briefRel = path.join(TASKS_REL, `${nnn}-brief.md`);
  const briefAbs = path.join(root, briefRel);
  if (fs.existsSync(briefAbs)) {
    throw new Error(`${briefRel} appeared while claiming — another actor won the number. Re-run to claim afresh.`);
  }
  fs.writeFileSync(briefAbs, briefSkeleton(n, title.trim(), lane.label, baseCommit), "utf8");

  const commitMessage = `Task ${nnn} brief: ${title.trim()} (claims task number ${nnn})`;
  try {
    git(root, ["add", "--", briefRel.split(path.sep).join("/")]);
    git(root, ["commit", "-m", commitMessage, "--", briefRel.split(path.sep).join("/")]);
  } catch (error) {
    throw new Error(
      `The brief was written but the claim commit failed (${error instanceof Error ? error.message : String(error)}). ` +
        `${briefRel} is on disk uncommitted; the number is still yours under the committed-or-not rule.`,
    );
  }

  const seen = [...taken.keys()];
  const sightingsSummary =
    (seen.length ? `saw ${seen.length} taken number(s), highest ${Math.max(...seen)}` : "no taken numbers yet") +
    (notes.length ? `; note: ${notes.join("; ")}` : "");
  return { n, nnn, briefRelPath: briefRel, commitMessage, sightingsSummary };
}

export interface RenumberResult {
  from: number;
  to: number;
  movedFiles: string[];
  editedFiles: string[];
  warnings: string[];
}

/**
 * The collision ritual, mechanically: move the later lane's task files to a
 * free number and fix the references. Does not commit — the lane stages by
 * exact path after inspecting, and any restore of the OTHER lane's brief is
 * verified separately with verifyByteExact.
 */
export function renumberTask(root: string, from: number, to: number): RenumberResult {
  if (from === to) throw new Error("from and to are the same number.");
  const fromNnn = padNumber(from);
  const toNnn = padNumber(to);

  const { taken } = scanTakenNumbers(root);
  if (taken.has(to)) {
    throw new Error(`${toNnn} is already taken (${taken.get(to)!.join(", ")}). Choose a free number.`);
  }

  const tasksDir = path.join(root, TASKS_REL);
  const kinds = ["brief", "report"] as const;
  const present = kinds.filter((kind) => fs.existsSync(path.join(tasksDir, `${fromNnn}-${kind}.md`)));
  if (present.length === 0) {
    throw new Error(`No ${fromNnn}-brief.md or ${fromNnn}-report.md in this worktree's ${TASKS_REL}.`);
  }

  const movedFiles: string[] = [];
  const editedFiles: string[] = [];
  const warnings: string[] = [];

  for (const kind of present) {
    const oldRel = `${TASKS_REL}/${fromNnn}-${kind}.md`.split(path.sep).join("/");
    const newRel = `${TASKS_REL}/${toNnn}-${kind}.md`.split(path.sep).join("/");
    try {
      git(root, ["mv", oldRel, newRel]);
    } catch {
      fs.renameSync(path.join(root, oldRel), path.join(root, newRel));
      warnings.push(`${newRel} was moved on disk only (not tracked by git here); stage it by exact path.`);
    }
    movedFiles.push(newRel);

    // Fix the title line inside the moved file ("# Task NNN brief" -> "# Task MMM brief").
    const newAbs = path.join(root, newRel);
    const text = fs.readFileSync(newAbs, "utf8");
    const titled = text.replace(new RegExp(`(#\\s*Task\\s*)${fromNnn}\\b`), `$1${toNnn}`);
    if (titled !== text) {
      fs.writeFileSync(newAbs, titled, "utf8");
      editedFiles.push(newRel);
    }
  }

  // Fix this task's own LOG.md row, if one exists; every other row is history.
  const logAbs = path.join(root, LOG_REL);
  if (fs.existsSync(logAbs)) {
    const logText = fs.readFileSync(logAbs, "utf8");
    const rowPattern = new RegExp(`^(\\|\\s*)${fromNnn}(\\s*\\|)`, "m");
    if (rowPattern.test(logText)) {
      fs.writeFileSync(logAbs, logText.replace(rowPattern, `$1${toNnn}$2`), "utf8");
      editedFiles.push(LOG_REL.split(path.sep).join("/"));
    }
  }

  return { from, to, movedFiles, editedFiles, warnings };
}

/**
 * Byte-exact verification that a working-tree file matches a committed
 * version — the "restored byte-exact" check the collision ritual names.
 */
export function verifyByteExact(root: string, commit: string, relPath: string): boolean {
  const committed = gitBuffer(root, ["show", `${commit}:${relPath.split(path.sep).join("/")}`]);
  let onDisk: Buffer;
  try {
    onDisk = fs.readFileSync(path.join(root, relPath));
  } catch {
    return false;
  }
  return committed.equals(onDisk);
}

function printSightings(root: string): void {
  const { taken, notes } = scanTakenNumbers(root);
  const highest = taken.size ? Math.max(...taken.keys()) : 0;
  console.log(pc.dim(`Scanned this worktree, every .lanes/* tasks dir, and every local branch: ${taken.size} number(s) taken, highest ${padNumber(highest)}.`));
  for (const note of notes) console.log(pc.yellow(`Note: ${note}.`));
}

export function claimFlow(root: string, args: string[]): void {
  const title = args.filter((arg) => !arg.startsWith("-")).join(" ").trim();
  try {
    const result = claimTask(root, title);
    console.log(`${pc.green("●")} Claimed ${pc.bold(`task ${result.nnn}`)} — ${result.sightingsSummary}.`);
    console.log(`  Brief: ${result.briefRelPath.split(path.sep).join("/")}`);
    console.log(pc.dim(`  Committed alone: ${result.commitMessage}`));
    console.log(pc.dim("  Fill in the TODO sections, then work the task as usual."));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}

export function renumberFlow(root: string, args: string[]): void {
  const numbers = args.filter((arg) => /^\d+$/.test(arg)).map((arg) => Number.parseInt(arg, 10));
  if (numbers.length !== 2) {
    console.error(pc.red("Usage: cairn renumber <from> <to>   (both task numbers, e.g. cairn renumber 154 156)"));
    process.exitCode = 1;
    return;
  }
  try {
    const result = renumberTask(root, numbers[0], numbers[1]);
    console.log(`${pc.green("●")} Renumbered ${padNumber(result.from)} -> ${padNumber(result.to)}.`);
    for (const file of result.movedFiles) console.log(`  moved: ${file}`);
    for (const file of result.editedFiles) console.log(`  edited: ${file}`);
    for (const warning of result.warnings) console.log(pc.yellow(`  ${warning}`));
    console.log(pc.dim("  Nothing committed — inspect, restore the other lane's brief from its commit, verify with git diff, then stage by exact path."));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}

export function claimStatusFlow(root: string): void {
  printSightings(root);
}
