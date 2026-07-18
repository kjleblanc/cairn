import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  appendLogRow, isCairnProject, nextTaskNumber, pad, parseFacts, parseLog, paths,
  scaffoldProject, type LogRow, type ProjectFacts,
} from "./files.js";
import {
  assertApprovalValid, checkDirectionGate, recordApproval,
  type ApprovalRecord, type DirectionGateResult,
} from "./gates.js";
import type { Engine, RunEvents } from "./agents.js";
import { builderPrompt, definerPrompt, directionPrompt, refinePrompt, reviewerPrompt } from "./prompts.js";
import { dispositionOf, finalVerdictOf } from "./parse.js";

/**
 * The gated loop as resumable steps. Every skin (CLI, desktop) sequences these;
 * no skin re-implements a rule. Each step re-reads its state from the project
 * files, so a task can be resumed by a different skin than the one that started it.
 */

export type Disposition = "DONE" | "STOPPED" | "UNKNOWN";

export interface DefineResult { taskNumber: number; briefPath: string; briefText: string; costUsd?: number }
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
}
export interface ProjectStatus {
  facts: ProjectFacts;
  log: LogRow[];
  stones: number;
  gate: DirectionGateResult;
  unfinished: UnfinishedTask | null;
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
  const taskNumber = nextTaskNumber(root);
  // The prompt mentions the ask tool only when the skin wired an answer channel.
  const p = definerPrompt(root, taskNumber, outcome, { canAsk: Boolean(events.onAsk) });
  const res = await engine.run({ role: "definer", root, taskNumber, system: p.system, user: p.user }, events);
  const briefPath = paths.brief(root, taskNumber);
  if (!existsSync(briefPath)) {
    throw new Error("The definer produced no brief file. Nothing was approved and nothing will be built.");
  }
  return { taskNumber, briefPath, briefText: readFileSync(briefPath, "utf8"), costUsd: res.costUsd };
}

/** The one human gate. Persisted so approve and build survive a restart — and so build can re-check the hash. */
export function approveBrief(root: string, taskNumber: number): ApprovalRecord {
  assertGoverned(root);
  const record = recordApproval(taskNumber, paths.brief(root, taskNumber));
  writeFileSync(paths.approval(root, taskNumber), JSON.stringify(record, null, 2) + "\n");
  return record;
}

export function loadApproval(root: string, taskNumber: number): ApprovalRecord | null {
  const p = paths.approval(root, taskNumber);
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
  const briefPath = paths.brief(root, taskNumber);
  if (!existsSync(briefPath)) {
    throw new Error(`No brief to refine for task ${pad(taskNumber)}. Define the task first.`);
  }
  if (loadApproval(root, taskNumber)) {
    throw new Error(`Task ${pad(taskNumber)} is already approved — the brief is locked. A change now is a new task with a new brief.`);
  }
  const before = readFileSync(briefPath, "utf8");
  const p = refinePrompt(root, taskNumber, message);
  const res = await engine.run(
    { role: "definer", root, taskNumber, system: p.system, user: p.user, intent: "refine", ownerMessage: message },
    events,
  );
  const after = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "";
  return { briefPath, briefText: after, briefChanged: after !== before, reply: res.text, costUsd: res.costUsd };
}

export async function buildTask(root: string, taskNumber: number, engine: Engine, events: RunEvents = {}): Promise<BuildResult> {
  assertGoverned(root);
  const approval = loadApproval(root, taskNumber);
  if (!approval) {
    throw new Error(`No approval on file for task ${pad(taskNumber)}. Approve the brief first — nothing is built without you.`);
  }
  assertApprovalValid(approval);
  const p = builderPrompt(root, taskNumber);
  const res = await engine.run({ role: "builder", root, taskNumber, system: p.system, user: p.user }, events);
  const reportPath = paths.report(root, taskNumber);
  const reportText = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  return { reportPath, reportText, disposition: dispositionOf(reportText || res.text), costUsd: res.costUsd };
}

export async function reviewTask(root: string, taskNumber: number, engine: Engine, events: RunEvents = {}): Promise<ReviewResult> {
  assertGoverned(root);
  const p = reviewerPrompt(root, taskNumber);
  const res = await engine.run({ role: "reviewer", root, taskNumber, system: p.system, user: p.user }, events);
  return { text: res.text, finalVerdict: finalVerdictOf(res.text), costUsd: res.costUsd };
}

export function closeTask(root: string, taskNumber: number, input: CloseInput): LogRow {
  assertGoverned(root);
  const briefPath = paths.brief(root, taskNumber);
  const brief = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "";
  const reportPath = paths.report(root, taskNumber);
  const report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  const disposition = dispositionOf(report);
  const row: LogRow = {
    task: pad(taskNumber),
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: /Mode:\s*Final/i.test(brief) ? "Final" : "Draft",
    outcome: disposition === "UNKNOWN" ? "STOPPED" : disposition,
    decision: input.decision,
    summary: input.summary,
    moved: input.moved,
  };
  appendLogRow(root, row);
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
  return { facts, log, stones, gate, unfinished };
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
