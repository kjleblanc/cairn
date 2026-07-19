import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  appendLogRow, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths, sha256File,
  scaffoldProject, type LogRow, type ProjectFacts,
} from "./files.js";
import {
  assertApprovalValid, checkDirectionGate, recordApproval,
  type ApprovalRecord, type DirectionGateResult,
} from "./gates.js";
import type { Engine, RunEvents } from "./agents.js";
import { builderPrompt, definerPrompt, directionPrompt, refinePrompt, reviewerPrompt } from "./prompts.js";
import { dispositionOf, finalVerdictOf } from "./parse.js";
import {
  assertCoordinatorApprovable,
  beginCoordinatedBuild,
  blockEngineFailure,
  builderWritablePaths,
  coordinatorSummary,
  finishCoordinatedBuild,
  hasCoordinator,
  parallelDraftEnabled,
  parseTaskMetadata,
  queueTaskDecision,
  readCoordinatorState,
  recordCoordinatorApproval,
  refuseTaskClassification,
  registerTaskMetadata,
  reserveTaskWorktree,
  type CoordinatorSummary,
  type CoordinatorTaskView,
} from "./coordinator.js";

/**
 * The gated loop as resumable steps. Every skin (CLI, desktop) sequences these;
 * no skin re-implements a rule. Each step re-reads its state from the project
 * files, so a task can be resumed by a different skin than the one that started it.
 */

export type Disposition = "DONE" | "STOPPED" | "UNKNOWN";

export interface DefineResult { taskNumber: number; briefPath: string; briefText: string; costUsd?: number; coordinatorTask?: CoordinatorTaskView }
export interface RefineResult { briefPath: string; briefText: string; briefChanged: boolean; reply: string; costUsd?: number }
export interface BuildResult { reportPath: string; reportText: string; disposition: Disposition; costUsd?: number }
export interface ReviewResult { text: string; finalVerdict: string; costUsd?: number }
export interface CloseInput {
  decision: "accept" | "revise" | "rollback" | "defer" | "escalate";
  summary: string;
  moved: "YES" | "NO" | "UNCLEAR";
}
export interface UnfinishedTask {
  taskNumber: number;
  hasBrief: boolean;
  hasApproval: boolean;
  hasReport: boolean;
  disposition: Disposition;
  briefText: string;
  reportText: string;
  branch?: string;
  worktree?: string;
  waitingReason?: string;
  blocker?: string;
}
export interface ProjectStatus {
  facts: ProjectFacts;
  log: LogRow[];
  stones: number;
  gate: DirectionGateResult;
  unfinished: UnfinishedTask | null;
  unfinishedTasks?: UnfinishedTask[];
  parallel?: CoordinatorSummary;
}

function coordinatedTaskRoot(root: string, taskNumber: number): string {
  if (!parallelDraftEnabled() || !hasCoordinator(root)) return root;
  const task = readCoordinatorState(root).tasks.find((item) => item.taskNumber === taskNumber);
  if (!task) throw new Error(`Task ${pad(taskNumber)} is not owned by this coordinator.`);
  return task.worktree;
}

function assertCoordinatorActionAllowed(root: string, taskNumber: number, action: string): void {
  if (!parallelDraftEnabled() || !hasCoordinator(root)) return;
  const task = readCoordinatorState(root).tasks.find((item) => item.taskNumber === taskNumber);
  if (!task) throw new Error(`Task ${pad(taskNumber)} is not owned by this coordinator.`);
  if (task.phase === "refused") {
    throw new Error(`${task.blocker ?? "PARALLEL_CLASSIFICATION_REFUSED"}: Refused parallel work cannot be ${action}.`);
  }
}

function assertGoverned(root: string): ProjectFacts {
  if (!isCairnProject(root)) {
    throw new Error("No Cairn contract here. Run init in an empty folder, or use Project Conversion for existing work.");
  }
  const facts = parseFacts(root);
  if (facts.status && facts.status !== "ACTIVE") {
    throw new Error(`The contract status is "${facts.status}" — it doesn't govern this project yet. Finish the conversion first.`);
  }
  return facts;
}

export async function defineTask(root: string, outcome: string, engine: Engine, events: RunEvents = {}): Promise<DefineResult> {
  assertGoverned(root);
  const gate = checkDirectionGate(parseLog(root));
  if (gate.tripped) throw new Error(`DIRECTION GATE: ${gate.reason} No third narrow patch — run the direction check instead.`);
  const coordinated = parallelDraftEnabled();
  const reserved = coordinated ? reserveTaskWorktree(root) : null;
  const taskNumber = reserved?.taskNumber ?? nextTaskNumber(root);
  const runRoot = reserved?.worktree ?? root;
  // The prompt mentions the ask tool only when the skin wired an answer channel.
  const p = definerPrompt(runRoot, taskNumber, outcome, { canAsk: Boolean(events.onAsk) });
  let res: Awaited<ReturnType<Engine["run"]>>;
  try {
    res = await engine.run({ role: "definer", root: runRoot, taskNumber, system: p.system, user: p.user }, events);
  } catch {
    if (coordinated) {
      blockEngineFailure(root, taskNumber, "defining", "DEFINER_ENGINE_FAILED");
      throw new Error("DEFINER_ENGINE_FAILED: Definition stopped safely. The same task, worktree, and partial brief were retained for retry.");
    }
    throw new Error("DEFINER_ENGINE_FAILED: Definition stopped before a brief was completed.");
  }
  const briefPath = paths.brief(runRoot, taskNumber);
  if (!existsSync(briefPath)) {
    throw new Error("The definer produced no brief file. Nothing was approved and nothing will be built.");
  }
  const briefText = readFileSync(briefPath, "utf8");
  if (coordinated) {
    let metadata: ReturnType<typeof parseTaskMetadata>;
    try {
      metadata = parseTaskMetadata(briefText);
    } catch {
      refuseTaskClassification(root, taskNumber);
      throw new Error("PARALLEL_CLASSIFICATION_REFUSED: The task metadata is malformed or incomplete. The retained task was refused, not queued.");
    }
    registerTaskMetadata(root, taskNumber, metadata);
  }
  const taskView = coordinated
    ? coordinatorSummary(root).tasks.find((task) => task.taskNumber === taskNumber)
    : undefined;
  return { taskNumber, briefPath, briefText, costUsd: res.costUsd, coordinatorTask: taskView };
}

/** The one human gate. Persisted so approve and build survive a restart — and so build can re-check the hash. */
export function approveBrief(root: string, taskNumber: number): ApprovalRecord {
  assertGoverned(root);
  const taskRoot = coordinatedTaskRoot(root, taskNumber);
  if (taskRoot !== root) assertCoordinatorApprovable(root, taskNumber);
  const record = recordApproval(taskNumber, paths.brief(taskRoot, taskNumber));
  writeFileSync(paths.approval(taskRoot, taskNumber), JSON.stringify(record, null, 2) + "\n");
  if (taskRoot !== root) recordCoordinatorApproval(root, taskNumber, sha256File(paths.approval(taskRoot, taskNumber)));
  return record;
}

export function loadApproval(root: string, taskNumber: number): ApprovalRecord | null {
  const p = paths.approval(coordinatedTaskRoot(root, taskNumber), taskNumber);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as ApprovalRecord;
}

/**
 * A follow-up definer-role turn on the not-yet-approved brief: the owner's
 * question gets a plain answer, a change request revises the brief file.
 * Allowed because nothing is locked until approval — and refused the moment an
 * approval is on file, so the hash gate keeps its exact meaning.
 */
export async function refineBrief(root: string, taskNumber: number, message: string, engine: Engine, events: RunEvents = {}): Promise<RefineResult> {
  assertGoverned(root);
  const taskRoot = coordinatedTaskRoot(root, taskNumber);
  assertCoordinatorActionAllowed(root, taskNumber, "refined");
  const briefPath = paths.brief(taskRoot, taskNumber);
  if (!existsSync(briefPath)) {
    throw new Error(`No brief to refine for task ${pad(taskNumber)}. Define the task first.`);
  }
  if (loadApproval(root, taskNumber)) {
    throw new Error(`Task ${pad(taskNumber)} is already approved — the brief is locked. A change now is a new task with a new brief.`);
  }
  const before = readFileSync(briefPath, "utf8");
  const p = refinePrompt(taskRoot, taskNumber, message);
  const res = await engine.run(
    { role: "definer", root: taskRoot, taskNumber, system: p.system, user: p.user, intent: "refine", ownerMessage: message },
    events,
  );
  const after = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "";
  if (taskRoot !== root && after !== before) registerTaskMetadata(root, taskNumber, parseTaskMetadata(after));
  return { briefPath, briefText: after, briefChanged: after !== before, reply: res.text, costUsd: res.costUsd };
}

export async function buildTask(root: string, taskNumber: number, engine: Engine, events: RunEvents = {}): Promise<BuildResult> {
  assertGoverned(root);
  const coordinated = parallelDraftEnabled() && hasCoordinator(root);
  const task = coordinated ? beginCoordinatedBuild(root, taskNumber) : null;
  if (!coordinated) {
    const approval = loadApproval(root, taskNumber);
    if (!approval) {
      throw new Error(`No approval on file for task ${pad(taskNumber)}. Approve the brief first — nothing is built without you.`);
    }
    assertApprovalValid(approval);
  }
  const taskRoot = task?.worktree ?? root;
  const p = builderPrompt(taskRoot, taskNumber);
  let res: Awaited<ReturnType<Engine["run"]>>;
  try {
    res = await engine.run({
      role: "builder",
      root: taskRoot,
      taskNumber,
      system: p.system,
      user: p.user,
      ...(task ? { allowedPaths: builderWritablePaths(task) } : {}),
    }, events);
  } catch {
    if (coordinated) {
      blockEngineFailure(root, taskNumber, "building", "BUILDER_ENGINE_FAILED");
      throw new Error("BUILDER_ENGINE_FAILED: Build stopped safely. The approval, worktree, and partial allowed work were retained for retry.");
    }
    throw new Error("BUILDER_ENGINE_FAILED: Build stopped before a report was completed.");
  }
  const reportPath = paths.report(taskRoot, taskNumber);
  const reportText = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  const disposition = dispositionOf(reportText || res.text);
  if (coordinated) finishCoordinatedBuild(root, taskNumber, disposition);
  return { reportPath, reportText, disposition, costUsd: res.costUsd };
}

export async function reviewTask(root: string, taskNumber: number, engine: Engine, events: RunEvents = {}): Promise<ReviewResult> {
  assertGoverned(root);
  const taskRoot = coordinatedTaskRoot(root, taskNumber);
  assertCoordinatorActionAllowed(root, taskNumber, "reviewed");
  const p = reviewerPrompt(taskRoot, taskNumber);
  const res = await engine.run({ role: "reviewer", root: taskRoot, taskNumber, system: p.system, user: p.user }, events);
  return { text: res.text, finalVerdict: finalVerdictOf(res.text), costUsd: res.costUsd };
}

export function closeTask(root: string, taskNumber: number, input: CloseInput): LogRow {
  assertGoverned(root);
  const taskRoot = coordinatedTaskRoot(root, taskNumber);
  assertCoordinatorActionAllowed(root, taskNumber, "decided or integrated");
  const briefPath = paths.brief(taskRoot, taskNumber);
  const brief = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "";
  const reportPath = paths.report(taskRoot, taskNumber);
  const report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  const disposition = dispositionOf(report);
  const row: LogRow = {
    task: pad(taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: /Lane:\s*High-Stakes/i.test(brief) ? "High-Stakes" : /Lane:\s*Tiny/i.test(brief) ? "Tiny" : "Standard",
    mode: /Mode:\s*Final/i.test(brief) ? "Final" : "Draft",
    outcome: disposition === "UNKNOWN" ? "STOPPED" : disposition,
    decision: input.decision,
    summary: input.summary,
    moved: input.moved,
  };
  if (taskRoot === root) {
    appendLogRow(root, row);
  } else {
    queueTaskDecision(root, taskNumber, { ...input, row, decidedAt: new Date().toISOString() });
  }
  return row;
}

export async function runDirectionCheck(root: string, reason: string, engine: Engine, events: RunEvents = {}): Promise<{ text: string }> {
  assertGoverned(root);
  const p = directionPrompt(root, reason);
  const res = await engine.run({ role: "direction", root, system: p.system, user: p.user }, events);
  return { text: res.text };
}

export function projectStatus(root: string): ProjectStatus {
  if (!isCairnProject(root)) throw new Error("No Cairn contract in this folder.");
  const facts = parseFacts(root);
  const log = parseLog(root);
  const stones = log.filter((r) => /DONE/i.test(r.outcome)).length;
  const gate = checkDirectionGate(log);
  const parallel = parallelDraftEnabled() && hasCoordinator(root) ? coordinatorSummary(root) : undefined;
  if (parallel) {
    const unfinishedTasks = parallel.tasks
      .filter((task) => task.phase !== "integrated")
      .map((task): UnfinishedTask => {
        const hasBrief = existsSync(paths.brief(task.worktree, task.taskNumber));
        const hasReport = existsSync(paths.report(task.worktree, task.taskNumber));
        const reportText = hasReport ? readFileSync(paths.report(task.worktree, task.taskNumber), "utf8") : "";
        return {
          taskNumber: task.taskNumber,
          hasBrief,
          hasApproval: existsSync(paths.approval(task.worktree, task.taskNumber)),
          hasReport,
          disposition: hasReport ? dispositionOf(reportText) : "UNKNOWN",
          briefText: hasBrief ? readFileSync(paths.brief(task.worktree, task.taskNumber), "utf8") : "",
          reportText,
          branch: task.branch,
          worktree: task.worktree,
          waitingReason: task.waitingReason,
          blocker: task.blocker,
        };
      });
    return { facts, log, stones, gate, unfinished: unfinishedTasks[0] ?? null, unfinishedTasks, parallel };
  }
  const last = nextTaskNumber(root) - 1;
  let unfinished: UnfinishedTask | null = null;
  if (last >= 1 && !log.some((r) => r.task === pad(last))) {
    const hasBrief = existsSync(paths.brief(root, last));
    const hasReport = existsSync(paths.report(root, last));
    const reportText = hasReport ? readFileSync(paths.report(root, last), "utf8") : "";
    unfinished = {
      taskNumber: last,
      hasBrief,
      hasApproval: loadApproval(root, last) !== null,
      hasReport,
      disposition: hasReport ? dispositionOf(reportText) : "UNKNOWN",
      briefText: hasBrief ? readFileSync(paths.brief(root, last), "utf8") : "",
      reportText,
    };
  }
  return { facts, log, stones, gate, unfinished, unfinishedTasks: unfinished ? [unfinished] : [] };
}

export function initProject(root: string, facts: { name: string; what: string; who: string; milestone: string; timebox: string }): { created: string[]; gitReady: boolean } {
  const created = scaffoldProject(root, facts);
  let gitReady = false;
  try {
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    git(["--version"]);
    try { git(["rev-parse", "--git-dir"]); } catch { git(["init"]); }
    if (!git(["config", "user.name"])) throw new Error("no identity");
    git(["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md", "docs/ai-work/PILOT.md"]);
    git(["commit", "-m", "Cairn setup: contract, project, log, pilot"]);
    gitReady = true;
  } catch {
    // Files exist either way; the caller tells the user how to finish git setup.
  }
  return { created, gitReady };
}
