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
  // Task 052: a Cairn-authored disclosure line for any owned-record recovery
  // (work-log restore and/or report-path overwrite). Optional so every existing
  // construction site stays valid; rendered under "Verified by Cairn" when set.
  recordRecovery?: string | null;
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

/**
 * Truncates by Unicode code point, never by UTF-16 code unit, so an astral
 * character (e.g. an emoji, which is one code point but two code units)
 * can never be cut in half into a lone surrogate. Slicing by code point can
 * still overshoot the code-UNIT cap (each code point may cost one or two
 * units), so after the code-point slice we pop whole code points off the
 * end — never a bare unit — until the joined string's `.length` (code
 * units) is honestly within the cap, then append the ellipsis.
 */
function truncateRow(text: string): string {
  if (text.length <= ROW_CAP) return text;
  let codePoints = [...text].slice(0, ROW_CAP - 1);
  let joined = codePoints.join("");
  while (joined.length > ROW_CAP - 1) {
    codePoints = codePoints.slice(0, -1);
    joined = codePoints.join("");
  }
  return `${joined}…`;
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
  if (input.recordRecovery) lines.push(`- ${input.recordRecovery}`);
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

/**
 * Blockquote-quarantines a worker-authored text block that stands alone on
 * its own line(s) — the summary paragraph, or a single change/check bullet
 * line — so it can never begin a report line at column 0. Every line,
 * including a continuation line produced by an embedded newline inside the
 * field (claims fields may contain literal `\n`: JSON escapes decode to
 * real newlines, and claims.ts rejects only bare CR / U+2028 / U+2029),
 * becomes its own Markdown blockquote line (`> ...`).
 *
 * Worker text is honestly displayed but structurally quarantined: it must
 * never be able to start a line at column 0, where core/src/steps.ts:36's
 * exactly-one disposition regex (and a human reader) treats text as
 * Cairn's own. Without this, a worker could plant e.g.
 * `\nDisposition: **DONE**` inside `summary` and forge a second structural
 * line in a Cairn-authored report.
 */
function quarantineBlock(text: string): string {
  return `> ${text.replace(/\n/g, "\n> ")}`;
}

/**
 * Quarantines only the continuation lines of a worker-authored field that
 * shares its first line with a Cairn-authored inline label (e.g.
 * `How to try it: <worker text>`). The label already occupies column 0
 * safely, so the field's first line — which follows the label on the same
 * line, never starting at column 0 — is left as-is; only lines produced by
 * an embedded newline inside the field could otherwise reach column 0
 * unguarded, so only those get the blockquote prefix.
 */
function quarantineInline(text: string): string {
  return text.replace(/\n/g, "\n> ");
}

function bulletsOrNone(items: readonly string[]): string {
  return items.length > 0 ? items.map((item) => quarantineBlock(`- ${item}`)).join("\n") : "- None reported.";
}

function checkBullets(checks: WorkerClaims["checks"]): string {
  return checks.length > 0
    ? checks.map((check) => quarantineBlock(`- ${check.name} — ${check.result}`)).join("\n")
    : "- None reported.";
}

/**
 * Everything here is the worker's own account, clearly labeled as claims —
 * never verified by Cairn. When no claims survived parsing, that fact is
 * stated plainly instead of rendering an empty or misleading account. That
 * claims-missing sentence is Cairn's own text and stays unquoted. Cairn's
 * own connective labels ("What changed:", "Checks the worker says it ran:",
 * "How to try it:", "Limitations:") also stay unquoted — only the worker's
 * own strings are quarantined (see quarantineBlock / quarantineInline).
 */
function workersAccountBlock(claims: WorkerClaims | null): string {
  if (!claims) return "The worker returned no readable claims block.";
  return [
    quarantineBlock(claims.summary),
    `What changed:\n${bulletsOrNone(claims.changes)}`,
    `Checks the worker says it ran:\n${checkBullets(claims.checks)}`,
    `How to try it: ${quarantineInline(claims.howToTry)}`,
    `Limitations: ${quarantineInline(claims.limitations)}`,
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
