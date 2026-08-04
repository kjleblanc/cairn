import type { WorkerClaims } from "./claims.js";
import { taskRequestView, type TaskIntent, type TaskRequestRow, type TaskRequestView } from "./intent.js";
import type { AdapterTaskContract } from "./routing.js";
// Type-only, and it must stay that way: serial.ts already imports this module
// as a value, so a runtime import back would create a cycle.
import type { SerialStopReason } from "./serial.js";

export interface ComposedRecordInput {
  taskNumber: number;
  route: AdapterTaskContract["route"];
  /** Output-only projection of the request accepted for this run. */
  acceptedRequest: TaskRequestView;
  /** Inert notes kept with that request; never owner-attributed requirements. */
  requestContext: readonly string[];
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

const SOURCE_LABELS: Readonly<Record<TaskRequestRow["source"], string>> = Object.freeze({
  "owner-stated": "You said so",
  "owner-unsure": "You weren’t sure",
  "cairn-chosen": "Cairn chose",
});

/**
 * Prefix every physical data line, including empty and whitespace-only lines,
 * without normalizing line endings or changing any source code unit. Markdown
 * headings, fences, tables, and disposition-looking text therefore remain
 * quoted request data rather than Cairn-authored record structure.
 */
function quoteRequestData(text: string): string {
  return `> ${text.replace(/\r\n|\r|\n/g, (lineBreak) => `${lineBreak}> `)}`;
}

function requestRowText(row: TaskRequestRow, role: string): string {
  const sections = [
    `### ${role}`,
    `**${SOURCE_LABELS[row.source]}**`,
    "Interpretation:",
    quoteRequestData(row.text),
  ];
  if (row.source === "owner-stated") {
    sections.push("Your exact words (authoritative if they conflict with the interpretation):");
    sections.push(quoteRequestData(row.ownerText ?? ""));
  } else if (row.source === "owner-unsure") {
    sections.push("Your exact words (a starting point, not a rule):");
    sections.push(quoteRequestData(row.ownerText ?? ""));
  } else {
    sections.push("No owner quotation — this is Cairn’s choice, not evidence of owner preference.");
  }
  return sections.join("\n\n");
}

/**
 * The one durable source-safe rendering used by briefs and both report
 * families. `acceptedRequest` is deliberately the ID/offset-free projection;
 * context stays separate and receives no owner-source label.
 */
export function renderAcceptedRequestView(
  acceptedRequest: TaskRequestView,
  context: readonly string[],
): string {
  const rows = [
    requestRowText(acceptedRequest.outcome, "Outcome"),
    ...acceptedRequest.requirements.map((row, index) => requestRowText(row, `Requirement ${index + 1}`)),
  ];
  const contextText = context.length > 0
    ? context.map((note) => quoteRequestData(note)).join("\n\n")
    : "None.";
  return [
    "## What you asked for",
    ...rows,
    "## Context kept with the task — not a requirement",
    contextText,
  ].join("\n\n");
}

/** Render only a Core-validated branded intent; casts and hostile clones fail. */
export function renderAcceptedTaskRequest(intent: TaskIntent): string {
  const view = taskRequestView(intent);
  if (!view) throw new Error("INVALID_TASK_INTENT");
  return renderAcceptedRequestView(view, intent.context);
}

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

/**
 * Task 169: a fixed code is a fact the owner cannot read. The shipped card in
 * `app/shots/task-168-stopped-desktop.png` said "STOPPED — CANCELLED_BY_OWNER"
 * to a self-described beginner; the report was no better. Every reason gets one
 * plain clause, and the code still follows it — the code is real and useful to
 * anyone debugging, it just never arrives alone.
 *
 * Mirrored by `KNOWN_CODE_WORDS` in `app/src/shared/stopwords.ts`, which the
 * renderer uses for the card; `core/test/records.test.ts` asserts the two never
 * disagree. `Record<SerialStopReason, string>` is exhaustive by construction,
 * so a new stop reason fails typecheck here rather than reaching an owner as a
 * bare constant.
 */
const STOP_REASON_IN_PLAIN_WORDS: Record<SerialStopReason, string> = {
  ADAPTER_FAILED: "the worker program itself did not run",
  INVALID_ADAPTER_RESULT: "the worker finished, but its answer could not be read",
  PROTECTED_WORK_CHANGED: "work that was meant to stay untouched had changed",
  RECORD_VERIFICATION_FAILED: "Cairn could not confirm its own records were written correctly",
  WORKER_CLAIMS_MISSING: "the worker never said what it had done",
  REAL_MODEL_CALL_NOT_AUTHORIZED: "the run was not approved to make a real, paid call",
  MODEL_REPORTED_STOPPED: "the worker stopped itself and said why",
  MODEL_RESULT_NOT_VERIFIED: "the change could not be confirmed against a saved history",
  ADAPTER_TIMED_OUT: "the worker ran out of time",
  CANCELLED_BY_OWNER: "you stopped it yourself",
};

/**
 * Never echoes an unrecognised code back at the owner. `Object.hasOwn` rather
 * than `in`, so a reason named `constructor` cannot reach the prototype chain.
 */
export function stopReasonInPlainWords(reason: string | null): string {
  if (reason !== null && Object.hasOwn(STOP_REASON_IN_PLAIN_WORDS, reason)) {
    return STOP_REASON_IN_PLAIN_WORDS[reason as SerialStopReason];
  }
  return "it stopped for a reason Cairn has no plain description for";
}

/** The paid-call sentence appears only on STOPPED: a verified DONE needs no "stopped it" language. */
function stoppedParagraph(input: ComposedRecordInput): string | null {
  if (input.disposition !== "STOPPED") return null;
  const paidClause = input.paidCallStarted
    ? " The worker process had already started; any cost for that call is already spent."
    : "";
  return `The run stopped: ${stopReasonInPlainWords(input.stopReason)}. (Code: \`${input.stopReason}\`.) The workspace may contain retained worker-authored evidence and must be inspected before another task.${paidClause}`;
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
  sections.push(renderAcceptedRequestView(input.acceptedRequest, input.requestContext));
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
