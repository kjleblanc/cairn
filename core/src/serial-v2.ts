import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  appendLogRow,
  isCairnProject,
  nextTaskNumber,
  pad,
  parseFacts,
  parseLog,
  paths,
  type LogRow,
} from "./files.js";
import { checkDirectionGate } from "./gates.js";

export const SERIAL_V2_DRAFT_ENV = "CAIRN_SERIAL_V2_DRAFT";

export interface SerialV2MockResult {
  taskNumber: number;
  briefPath: string;
  builtPath: string;
  reportPath: string;
  logPath: string;
  checks: string[];
  disposition: "DONE";
}

export function serialV2DraftEnabled(): boolean {
  return process.env[SERIAL_V2_DRAFT_ENV] === "1";
}

function assertSyntheticRoot(root: string): string {
  const tempRoot = resolve(tmpdir());
  const projectRoot = resolve(root);
  const fromTemp = relative(tempRoot, projectRoot);
  if (!fromTemp || fromTemp.startsWith("..") || isAbsolute(fromTemp)) {
    throw new Error("SERIAL_V2_SYNTHETIC_ONLY: The mock Draft accepts only a project beneath the operating-system temporary directory.");
  }
  return projectRoot;
}

function assertMockV2Project(root: string): void {
  if (!isCairnProject(root)) {
    throw new Error("SERIAL_V2_PROJECT_REQUIRED: The synthetic folder must contain a Cairn project contract.");
  }
  const facts = parseFacts(root);
  if (facts.status !== "ACTIVE") {
    throw new Error(`SERIAL_V2_INACTIVE: The synthetic contract status is "${facts.status}".`);
  }
  if (!/^2(?:\.|$)/.test(facts.contractVersion)) {
    throw new Error(`SERIAL_V2_CONTRACT_REQUIRED: Contract v2.x is required; found "${facts.contractVersion || "unknown"}".`);
  }
  const gate = checkDirectionGate(parseLog(root));
  if (gate.tripped) {
    throw new Error(`SERIAL_V2_DIRECTION_GATE: ${gate.reason}`);
  }
}

/**
 * A deliberately tiny Contract v2 lifecycle proof. It is internal, disabled by
 * default, mock-only, temporary-directory-only, and never touches Git or the
 * legacy approval/review/coordinator steps.
 */
export function runSerialV2MockStandardTask(root: string): SerialV2MockResult {
  if (!serialV2DraftEnabled()) {
    throw new Error(`SERIAL_V2_DISABLED: ${SERIAL_V2_DRAFT_ENV}=1 is required.`);
  }
  if (process.env.CAIRN_MOCK !== "1") {
    throw new Error("SERIAL_V2_MOCK_ONLY: CAIRN_MOCK=1 is required.");
  }
  if (process.env.CAIRN_PARALLEL_DRAFT === "1") {
    throw new Error("SERIAL_V2_SERIAL_ONLY: The parallel Draft flag must remain off.");
  }

  const projectRoot = assertSyntheticRoot(root);
  assertMockV2Project(projectRoot);

  const taskNumber = nextTaskNumber(projectRoot);
  const taskId = pad(taskNumber);
  const briefPath = paths.brief(projectRoot, taskNumber);
  const builtPath = join(projectRoot, `serial-v2-${taskId}.txt`);
  const reportPath = paths.report(projectRoot, taskNumber);
  mkdirSync(paths.tasks(projectRoot), { recursive: true });

  const brief = [
    `# Task ${taskId} — synthetic serial v2 brief`,
    "",
    "Lane: **Standard**",
    "",
    "Visible outcome: a local mock result file proves the serial Contract v2 lifecycle.",
    `Allowed: serial-v2-${taskId}.txt, this brief, this task's report, and the synthetic work log.`,
    "Forbidden: approvals, reviews, coordinator state, Git branches, worktrees, network calls, credentials, and external effects.",
    "First visible checkpoint: the result file contains the fixed mock message.",
    "Checks: the result file exists and its bytes match the fixed expected content.",
    "DONE when: the checked result, report, and Applied/completed log row agree.",
    "STOPPED if: any finite check fails.",
    "",
  ].join("\n");
  writeFileSync(briefPath, brief, { encoding: "utf8", flag: "wx" });

  const expected = "hello from the serial v2 mock path\n";
  writeFileSync(builtPath, expected, { encoding: "utf8", flag: "wx" });

  const checks: string[] = [];
  if (!existsSync(builtPath)) throw new Error("SERIAL_V2_CHECK_FAILED: The visible result file is missing.");
  checks.push("PASS: visible result file exists");
  if (readFileSync(builtPath, "utf8") !== expected) {
    throw new Error("SERIAL_V2_CHECK_FAILED: The visible result file has unexpected content.");
  }
  checks.push("PASS: visible result bytes match the fixed mock expectation");

  const report = [
    `# Task ${taskId} — synthetic serial v2 report`,
    "",
    "Result: the fixed mock build completed and its visible output passed both checks.",
    `Files changed: serial-v2-${taskId}.txt, ${taskId}-brief.md, ${taskId}-report.md, and the synthetic LOG.md.`,
    `Checks: ${checks.join("; ")}.`,
    `How to try it: open serial-v2-${taskId}.txt and read the one-line mock result.`,
    "Limitations: default-off, mock-only, synthetic temporary projects, and one fixed Standard outcome.",
    "Milestone movement: YES",
    "",
    "Disposition: DONE",
    "",
  ].join("\n");
  writeFileSync(reportPath, report, { encoding: "utf8", flag: "wx" });

  const row: LogRow = {
    task: taskId,
    date: new Date().toISOString().slice(0, 10),
    lane: "Standard",
    mode: "Applied",
    outcome: "DONE",
    decision: "completed",
    summary: "The serial v2 mock path completed one synthetic Standard task end to end",
    moved: "YES",
  };
  appendLogRow(projectRoot, row);
  const saved = parseLog(projectRoot).at(-1);
  if (!saved || saved.task !== taskId || saved.mode !== "Applied" || saved.outcome !== "DONE" || saved.decision !== "completed") {
    throw new Error("SERIAL_V2_LOG_FAILED: The completed synthetic task did not round-trip through the work log.");
  }
  checks.push("PASS: Applied/completed/DONE log row round-trips");

  return {
    taskNumber,
    briefPath,
    builtPath,
    reportPath,
    logPath: paths.log(projectRoot),
    checks,
    disposition: "DONE",
  };
}
