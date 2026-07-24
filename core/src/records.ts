import type { WorkerClaims } from "./claims.js";
import type { AdapterTaskContract } from "./routing.js";

export interface ComposedRecordInput {
  taskNumber: number;
  route: AdapterTaskContract["route"];
  disposition: "DONE" | "STOPPED";
  stopReason: string | null; // SerialStopReason when STOPPED
  claims: WorkerClaims | null;
  filesChanged: readonly string[]; // from git, NEVER from claims; on stops: the retained changed paths
  protectedIntact: boolean; // the REAL protected-work verification result
  commit: { status: "created" | "skipped"; reason: string } | null; // null on stops
  evidenceSummary: string | null; // the bounded numeric line, or null
  processFailure: { code: string; debugPath: string | null } | null;
  paidCallStarted: boolean;
}

const ROW_CAP = 160;

/**
 * The one privacy sentence every Cairn-authored report carries, worded to
 * match Task 044's reworked claims-verification sentence in serial.ts: only
 * the worker's final message and bounded numeric evidence are retained —
 * never raw item text, reasoning, commands, paths, stdout, stderr, thread
 * IDs, account details, authentication data, or credentials.
 */
const PRIVACY_PARAGRAPH =
  "Cairn retained only the worker's final message (for claims verification) and bounded numeric evidence; " +
  "no other item text, reasoning, commands, paths, stdout, stderr, thread IDs, account details, authentication data, or credentials.";

function pad(taskNumber: number): string {
  return String(taskNumber).padStart(3, "0");
}

function truncateRow(text: string): string {
  return text.length <= ROW_CAP ? text : `${text.slice(0, ROW_CAP - 1)}…`;
}

/**
 * Files changed comes from Git, never from the worker's claims. Each path is
 * its own indented sub-bullet under the parent line so an arbitrarily long
 * change set never collapses onto one unreadable line; an empty list is
 * reported plainly as "none" rather than an empty dangling list.
 */
function filesChangedLine(filesChanged: readonly string[]): string {
  if (filesChanged.length === 0) return "- Files changed (from Git, not from claims): none";
  const entries = filesChanged.map((path) => `  - \`${path}\``).join("\n");
  return `- Files changed (from Git, not from claims):\n${entries}`;
}

/**
 * Every line here states the REAL verified result. `protectedIntact` and
 * `filesChanged` come from Git, never from the worker's claims — a
 * PROTECTED_WORK_CHANGED input can never render "byte-identical" because the
 * boolean it branches on is the actual verification outcome, not a fixed
 * phrase keyed on the stop reason.
 */
function verifiedByCairnLines(input: ComposedRecordInput): string {
  const lines: string[] = [
    `- Route: ${input.route.adapterLabel} — ${input.route.provider} / ${input.route.model}`,
    `- Protected starting work: ${
      input.protectedIntact
        ? "byte-identical"
        : "CHANGED — the run stopped for this reason and the evidence was retained"
    }`,
    filesChangedLine(input.filesChanged),
    `- Commit: ${
      input.commit ? input.commit.reason : "none — stopped evidence is retained for inspection, never committed by Cairn"
    }`,
  ];
  if (input.evidenceSummary) lines.push(`- ${input.evidenceSummary}`);
  if (input.processFailure) {
    const debugPath = input.processFailure.debugPath ?? "unavailable (the local debug directory could not be created)";
    lines.push(
      `- Process failure: \`${input.processFailure.code}\`. Raw run evidence stays on the owner's own disk at: ${debugPath}. It is never committed to the repository.`,
    );
  }
  return lines.join("\n");
}

/** The paid-call sentence appears only on STOPPED: a verified DONE needs no "stopped it" language. */
function stoppedParagraph(input: ComposedRecordInput): string | null {
  if (input.disposition !== "STOPPED") return null;
  const paidClause = input.paidCallStarted
    ? " The worker process had already started; any cost for that call is already spent."
    : "";
  return `The run stopped with the fixed code \`${input.stopReason}\`. The workspace may contain retained worker-authored evidence and must be inspected before another task.${paidClause}`;
}

function bulletsOrNone(items: readonly string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None reported.";
}

function checkBullets(checks: WorkerClaims["checks"]): string {
  return checks.length > 0
    ? checks.map((check) => `- ${check.name} — ${check.result}`).join("\n")
    : "- None reported.";
}

/**
 * Everything here is the worker's own account, clearly labeled as claims —
 * never verified by Cairn. When no claims survived parsing, that fact is
 * stated plainly instead of rendering an empty or misleading account.
 */
function workersAccountBlock(claims: WorkerClaims | null): string {
  if (!claims) return "The worker returned no readable claims block.";
  return [
    claims.summary,
    `What changed:\n${bulletsOrNone(claims.changes)}`,
    `Checks the worker says it ran:\n${checkBullets(claims.checks)}`,
    `How to try it: ${claims.howToTry}`,
    `Limitations: ${claims.limitations}`,
  ].join("\n\n");
}

/**
 * Composes the worker report with a hard separation between what Cairn
 * itself verified (Git-derived facts and the real protected-work result) and
 * what the worker merely claims. The disposition line is kept bare and alone
 * on its line so core/src/steps.ts:36's end-anchored regex
 * (`/^Disposition:\s*\*\*(DONE|STOPPED)\*\*\s*$/gim`) keeps matching exactly
 * once.
 */
export function composeWorkerReport(input: ComposedRecordInput): string {
  const sections: string[] = [
    `# Task ${pad(input.taskNumber)} — ${input.route.adapterLabel} worker report`,
    "## Verified by Cairn",
    verifiedByCairnLines(input),
  ];
  const stopped = stoppedParagraph(input);
  if (stopped) sections.push(stopped);
  sections.push(PRIVACY_PARAGRAPH);
  sections.push("## The worker's account (claims, not verified by Cairn)");
  sections.push(workersAccountBlock(input.claims));
  sections.push(`Milestone movement: **${input.claims?.milestone ?? "NO"}**`);
  sections.push(`Disposition: **${input.disposition}**`);
  return `${sections.join("\n\n")}\n`;
}

/** One bounded LOG.md cell, honest about the claim/verified split, capped to 160 chars. */
export function composeWorkerRowSummary(input: ComposedRecordInput): string {
  if (input.disposition === "DONE") {
    const summary = input.claims?.summary ?? "The worker reported completion.";
    return truncateRow(`${summary} (worker claim; files verified against Git by Cairn)`);
  }
  return truncateRow(`${input.route.adapterLabel} stopped safely (${input.stopReason}); requested change was not verified.`);
}
