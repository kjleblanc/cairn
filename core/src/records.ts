import type { WorkerClaims } from "./claims.js";
import {
  taskRequestSha256,
  taskRequestView,
  type TaskIntent,
  type TaskRequestRow,
  type TaskRequestView,
} from "./intent.js";
import {
  evidencePlanSha256,
  taskSpecSha256,
  type EvidencePlanV1,
  type TaskSpecV1,
} from "./quality.js";
import type { AdapterTaskContract } from "./routing.js";
import {
  isCriticCompletionAuthority,
  type CriticCompletionAuthorityV1,
} from "./critic.js";
// Type-only, and it must stay that way: serial.ts already imports this module
// as a value, so a runtime import back would create a cycle.
import type { SerialStopReason } from "./serial.js";

export const TASK_SPEC_RUN_RECORD_VERSION = "cairn-task-spec-run-record/v1" as const;
export const ADAPTER_COMMAND_ATTESTATION_VERSION = "cairn-adapter-command-attestation/v1" as const;
export const ENVELOPE_RESULT_VERSION = "cairn-envelope-result/v1" as const;

export type TaskSpecCriterionClaimV1 = Readonly<{ id: `c${number}`; result: string }>;
export type TaskSpecPreferenceClaimV1 = Readonly<{ id: `p${number}`; result: string }>;

/** The worker's Task-Spec-bound account. It is still only a claim: carrying
 * the right hash and ids never turns any sentence here into criterion evidence
 * or an envelope fact. */
export type TaskSpecWorkerClaimsRecordV1 = Readonly<{
  version: "cairn-task-spec-worker-claims/v1";
  taskSpecSha256: string;
  disposition: "DONE" | "STOPPED";
  summary: string;
  changes: readonly string[];
  criteria: readonly TaskSpecCriterionClaimV1[];
  preferences: readonly TaskSpecPreferenceClaimV1[];
  howToTry: string;
  limitations: string;
  milestone: "YES" | "NO" | "UNCLEAR";
}>;

/** A Main-derived link between one frozen cN procedure and one exact process
 * event. It proves only command identity and exit. It is deliberately not a
 * CriterionResultV1 and carries no met/not-met status, source, verdict, critic
 * field, resolution, or disposition. */
export type AdapterCommandAttestationV1 = Readonly<{
  version: typeof ADAPTER_COMMAND_ATTESTATION_VERSION;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  criterionId: `c${number}`;
  sequence: number;
  commandSha256: string;
  exitCode: number;
}>;

/** The envelope's own terminal fact. Keeping it nested and separately
 * versioned prevents a worker claim or adapter event from masquerading as
 * Cairn's Git/record disposition. */
export type EnvelopeResultV1 = Readonly<{
  version: typeof ENVELOPE_RESULT_VERSION;
  taskNumber: number;
  requestSha256: string;
  taskSpecSha256: string;
  disposition: "DONE" | "STOPPED";
  stopReason: string | null;
}>;

export type TaskSpecRunRecordV1 = Readonly<{
  version: typeof TASK_SPEC_RUN_RECORD_VERSION;
  requestSha256: string;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  criteria: readonly Readonly<{ id: `c${number}`; promise: string }>[];
  preferences: readonly Readonly<{
    id: `p${number}`;
    dimension: string;
    desiredDirection: string;
  }>[];
  workerClaims: TaskSpecWorkerClaimsRecordV1 | null;
  adapterAttestations: readonly AdapterCommandAttestationV1[];
  envelopeResult: EnvelopeResultV1;
}>;

export type TaskSpecRunRecordClassification =
  | Readonly<{ kind: "legacy"; taskSpecBound: false; criticReady: false }>
  | Readonly<{ kind: "task-spec-bound"; taskSpecBound: true; criticReady: false; record: TaskSpecRunRecordV1 }>
  | Readonly<{ kind: "invalid"; taskSpecBound: false; criticReady: false }>;

type CompletionRecordAuthorityInput = Readonly<{
  authority: CriticCompletionAuthorityV1;
  projectHash: string;
  runId: string;
  candidateSha256: string;
}>;

const taskSpecRunRecordBrand = new WeakSet<object>();
const SHA256 = /^[0-9a-f]{64}$/;
const CRITERION_ID = /^c(?:[1-9]|1[0-2])$/;
const PREFERENCE_ID = /^p(?:[1-9]|1[0-2])$/;

function safeRecordText(value: unknown, cap = 2_000): value is string {
  return typeof value === "string" && value.length <= cap && !/[\u0000\u202a-\u202e\u2066-\u2069]/u.test(value);
}

function nonBlankRecordText(value: unknown, cap = 2_000): value is string {
  return safeRecordText(value, cap) && value.trim().length > 0;
}

function uniqueIds<T extends { id: string }>(values: readonly T[], pattern: RegExp): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    if (!pattern.test(value.id) || seen.has(value.id)) return false;
    seen.add(value.id);
  }
  return true;
}

function exactDataRecord(value: unknown, expectedKeys: readonly string[]): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) return false;
  const actual = [...(keys as string[])].sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return expectedKeys.every((key) => {
    const descriptor = descriptors[key];
    return Boolean(descriptor && !descriptor.get && !descriptor.set && "value" in descriptor && descriptor.enumerable);
  });
}

function denseDataArray(value: unknown, cap: number): readonly unknown[] | null {
  if (!Array.isArray(value) || value.length > cap) return null;
  const keys = Reflect.ownKeys(value);
  const expected = ["length", ...Array.from({ length: value.length }, (_, index) => String(index))];
  if (keys.length !== expected.length || expected.some((key) => !keys.includes(key))) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return null;
  }
  return value;
}

function exactTaskSpecRunRecordInput(value: unknown): value is TaskSpecRunRecordV1 {
  if (!exactDataRecord(value, [
    "adapterAttestations", "criteria", "envelopeResult", "evidencePlanSha256",
    "preferences", "requestSha256", "taskSpecSha256", "version", "workerClaims",
  ])) return false;
  const record = value as TaskSpecRunRecordV1;
  const criteria = denseDataArray(record.criteria, 12);
  const preferences = denseDataArray(record.preferences, 12);
  const attestations = denseDataArray(record.adapterAttestations, 12);
  if (!criteria || !preferences || !attestations
    || criteria.some((entry) => !exactDataRecord(entry, ["id", "promise"]))
    || preferences.some((entry) => !exactDataRecord(entry, ["desiredDirection", "dimension", "id"]))
    || attestations.some((entry) => !exactDataRecord(entry, [
      "commandSha256", "criterionId", "evidencePlanSha256", "exitCode", "sequence", "taskSpecSha256", "version",
    ]))
    || !exactDataRecord(record.envelopeResult, [
      "disposition", "requestSha256", "stopReason", "taskNumber", "taskSpecSha256", "version",
    ])) return false;
  if (record.workerClaims === null) return true;
  if (!exactDataRecord(record.workerClaims, [
    "changes", "criteria", "disposition", "howToTry", "limitations", "milestone",
    "preferences", "summary", "taskSpecSha256", "version",
  ])) return false;
  const changes = denseDataArray(record.workerClaims.changes, 50);
  const claimCriteria = denseDataArray(record.workerClaims.criteria, 12);
  const claimPreferences = denseDataArray(record.workerClaims.preferences, 12);
  return Boolean(changes && claimCriteria && claimPreferences
    && claimCriteria.every((entry) => exactDataRecord(entry, ["id", "result"]))
    && claimPreferences.every((entry) => exactDataRecord(entry, ["id", "result"])));
}

/** Main's one Q4 record mint. It detaches and deeply freezes the exact
 * Task-Spec/claim/attestation/envelope split. Plain structural copies are not
 * branded and classify as invalid rather than critic-ready. */
export function composeTaskSpecRunRecord(
  taskSpec: unknown,
  evidencePlan: unknown,
  rawInput: unknown,
  completionAuthority?: unknown,
): TaskSpecRunRecordV1 | null {
  try {
    if (!exactTaskSpecRunRecordInput(rawInput)) return null;
    const input = rawInput;
    const specSha = taskSpecSha256(taskSpec);
    const planSha = evidencePlanSha256(evidencePlan);
    if (!specSha || !planSha) return null;
    const spec = taskSpec as TaskSpecV1;
    const plan = evidencePlan as EvidencePlanV1;
    if (input.taskSpecSha256 !== specSha || input.evidencePlanSha256 !== planSha
      || input.requestSha256 !== taskRequestSha256(spec.intent)
      || plan.taskSpecSha256 !== specSha
      || input.criteria.length !== spec.quality.acceptanceChecks.length
      || input.criteria.some((criterion, index) => criterion.id !== spec.quality.acceptanceChecks[index]?.id
        || criterion.promise !== spec.quality.acceptanceChecks[index]?.promise)
      || input.preferences.length !== spec.quality.qualityPreferences.length
      || input.preferences.some((preference, index) => preference.id !== spec.quality.qualityPreferences[index]?.id
        || preference.dimension !== spec.quality.qualityPreferences[index]?.dimension
        || preference.desiredDirection !== spec.quality.qualityPreferences[index]?.desiredDirection)) return null;
    if (input.version !== TASK_SPEC_RUN_RECORD_VERSION || !SHA256.test(input.requestSha256)
      || !SHA256.test(input.taskSpecSha256) || !SHA256.test(input.evidencePlanSha256)
      || !Array.isArray(input.criteria) || input.criteria.length === 0 || input.criteria.length > 12
      || !Array.isArray(input.preferences) || input.preferences.length > 12
      || !uniqueIds(input.criteria, CRITERION_ID) || !uniqueIds(input.preferences, PREFERENCE_ID)) return null;
    if (input.criteria.some((criterion) => !safeRecordText(criterion.promise, 1_000))
      || input.preferences.some((preference) => !safeRecordText(preference.dimension, 1_000)
        || !safeRecordText(preference.desiredDirection, 1_000))) return null;

    const criterionIds = input.criteria.map((criterion) => criterion.id);
    const preferenceIds = input.preferences.map((preference) => preference.id);
    const claims = input.workerClaims;
    if (claims !== null) {
      if (claims.version !== "cairn-task-spec-worker-claims/v1" || claims.taskSpecSha256 !== input.taskSpecSha256
        || (claims.disposition !== "DONE" && claims.disposition !== "STOPPED")
        || (claims.milestone !== "YES" && claims.milestone !== "NO" && claims.milestone !== "UNCLEAR")
        || !nonBlankRecordText(claims.summary, 300) || !nonBlankRecordText(claims.howToTry)
        || !safeRecordText(claims.limitations) || !Array.isArray(claims.changes) || claims.changes.length > 50
        || claims.changes.some((change) => !safeRecordText(change, 500))
        || !Array.isArray(claims.criteria) || !Array.isArray(claims.preferences)
        || claims.criteria.length !== criterionIds.length || claims.preferences.length !== preferenceIds.length
        || claims.criteria.some((claim, index) => claim.id !== criterionIds[index] || !safeRecordText(claim.result, 500))
        || claims.preferences.some((claim, index) => claim.id !== preferenceIds[index] || !safeRecordText(claim.result, 500))) return null;
    }

    if (!Array.isArray(input.adapterAttestations) || input.adapterAttestations.length > 12) return null;
    const seenCriteria = new Set<string>();
    const seenSequences = new Set<number>();
    const seenCommandHashes = new Set<string>();
    const attestations: AdapterCommandAttestationV1[] = [];
    for (const attestation of input.adapterAttestations) {
      const procedure = plan.procedures.find((entry) => entry.criterionId === attestation.criterionId);
      const commandProcedures = plan.procedures.filter((entry) =>
        entry.kind === "adapter-command-attestation"
        && entry.command?.sha256 === attestation.commandSha256);
      if (attestation.version !== ADAPTER_COMMAND_ATTESTATION_VERSION
        || attestation.taskSpecSha256 !== input.taskSpecSha256
        || attestation.evidencePlanSha256 !== input.evidencePlanSha256
        || !criterionIds.includes(attestation.criterionId)
        || !Number.isSafeInteger(attestation.sequence) || attestation.sequence < 0 || attestation.sequence >= 64
        || seenSequences.has(attestation.sequence) || seenCriteria.has(attestation.criterionId)
        || !SHA256.test(attestation.commandSha256)
        || seenCommandHashes.has(attestation.commandSha256)
        || procedure?.kind !== "adapter-command-attestation"
        || procedure.command?.sha256 !== attestation.commandSha256
        || commandProcedures.length !== 1
        || commandProcedures[0]?.criterionId !== attestation.criterionId
        || !Number.isSafeInteger(attestation.exitCode) || Object.is(attestation.exitCode, -0)
        || attestation.exitCode < -1 || attestation.exitCode > 255) return null;
      seenSequences.add(attestation.sequence);
      seenCriteria.add(attestation.criterionId);
      seenCommandHashes.add(attestation.commandSha256);
      attestations.push(Object.freeze({ ...attestation }));
    }

    const envelope = input.envelopeResult;
    if (envelope.version !== ENVELOPE_RESULT_VERSION || !Number.isSafeInteger(envelope.taskNumber)
      || envelope.taskNumber < 1 || envelope.requestSha256 !== input.requestSha256
      || envelope.taskSpecSha256 !== input.taskSpecSha256
      || (envelope.disposition !== "DONE" && envelope.disposition !== "STOPPED")
      || (envelope.disposition === "DONE" ? envelope.stopReason !== null : !nonBlankRecordText(envelope.stopReason, 128))) return null;
    if (envelope.disposition === "DONE") {
      // This record format carries only adapter-command custody. It must not
      // brand DONE for a plan whose required evidence is absent from the
      // record, nor for a command that exited outside its frozen expectation.
      const orderedSequences = attestations.map((attestation) => attestation.sequence).sort((left, right) => left - right);
      const completionInput = exactDataRecord(completionAuthority, [
        "authority", "projectHash", "runId", "candidateSha256",
      ]) ? completionAuthority as CompletionRecordAuthorityInput : null;
      const completed = completionInput !== null && isCriticCompletionAuthority(completionInput.authority)
        ? completionInput.authority
        : null;
      const completedAllCriteria = completed !== null
        && completionInput !== null
        && completed.projectHash === completionInput.projectHash
        && completed.runId === completionInput.runId
        && completed.candidateSha256 === completionInput.candidateSha256
        && completed.taskSpecSha256 === specSha
        && completed.evidencePlanSha256 === planSha
        && completed.criteria.length === spec.quality.acceptanceChecks.length
        && completed.criteria.every((row, index) => row.criterionId === spec.quality.acceptanceChecks[index]?.id
          && row.judge === spec.quality.acceptanceChecks[index]?.judge);
      const commandProcedures = plan.procedures.filter((procedure) =>
        procedure.kind === "adapter-command-attestation" && procedure.command !== null);
      if (!claims || claims.disposition !== "DONE"
        || (!completedAllCriteria && (spec.quality.critic.mode === "required"
          || plan.procedures.some((procedure) =>
            procedure.kind !== "adapter-command-attestation" || !procedure.command)))
        || attestations.length !== commandProcedures.length
        || orderedSequences.some((sequence, index) => sequence !== index)) return null;
      for (const procedure of commandProcedures) {
        const attestation = attestations.find((entry) => entry.criterionId === procedure.criterionId);
        if (!attestation || !procedure.command
          || attestation.commandSha256 !== procedure.command.sha256
          || !procedure.command.expectedExitCodes.includes(attestation.exitCode)) return null;
      }
    }

    const copiedClaims = claims === null ? null : Object.freeze({
      ...claims,
      changes: Object.freeze([...claims.changes]),
      criteria: Object.freeze(claims.criteria.map((claim) => Object.freeze({ ...claim }))),
      preferences: Object.freeze(claims.preferences.map((claim) => Object.freeze({ ...claim }))),
    });
    const record = Object.freeze({
      version: TASK_SPEC_RUN_RECORD_VERSION,
      requestSha256: input.requestSha256,
      taskSpecSha256: input.taskSpecSha256,
      evidencePlanSha256: input.evidencePlanSha256,
      criteria: Object.freeze(input.criteria.map((criterion) => Object.freeze({ ...criterion }))),
      preferences: Object.freeze(input.preferences.map((preference) => Object.freeze({ ...preference }))),
      workerClaims: copiedClaims,
      adapterAttestations: Object.freeze(attestations),
      envelopeResult: Object.freeze({ ...envelope }),
    }) as TaskSpecRunRecordV1;
    taskSpecRunRecordBrand.add(record);
    return record;
  } catch {
    return null;
  }
}

/** Missing is an honestly readable legacy record. A non-null unbranded object
 * is invalid, even if every field resembles the v1 shape. Q4 never calls
 * either form critic-ready because no critic/candidate custody exists yet. */
export function classifyTaskSpecRunRecord(value: unknown): TaskSpecRunRecordClassification {
  if (value === undefined || value === null) {
    return Object.freeze({ kind: "legacy", taskSpecBound: false, criticReady: false });
  }
  if (typeof value !== "object" || !taskSpecRunRecordBrand.has(value)) {
    return Object.freeze({ kind: "invalid", taskSpecBound: false, criticReady: false });
  }
  return Object.freeze({
    kind: "task-spec-bound",
    taskSpecBound: true,
    criticReady: false,
    record: value as TaskSpecRunRecordV1,
  });
}

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
  /** Present only on the staged v4 path. Missing/null is a readable legacy
   * record, never an implied Task Spec or critic-ready state. */
  taskSpecRunRecord?: TaskSpecRunRecordV1 | null;
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

function taskSpecRecordFor(input: ComposedRecordInput): TaskSpecRunRecordV1 | null {
  const classification = classifyTaskSpecRunRecord(input.taskSpecRunRecord);
  if (classification.kind === "invalid") throw new Error("INVALID_TASK_SPEC_RUN_RECORD");
  return classification.kind === "task-spec-bound" ? classification.record : null;
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
  const taskSpecRecord = taskSpecRecordFor(input);
  if (taskSpecRecord) {
    lines.push(`- Task Spec binding: \`${taskSpecRecord.taskSpecSha256}\``);
    lines.push(`- Evidence Plan binding: \`${taskSpecRecord.evidencePlanSha256}\``);
    lines.push(
      `- Envelope result binding: request \`${taskSpecRecord.envelopeResult.requestSha256}\`; ` +
      `Task Spec \`${taskSpecRecord.envelopeResult.taskSpecSha256}\``,
    );
  }
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
  Q9_CRITIC_CALLS_EXHAUSTED: "the required critic did not return a usable result within its allowed calls and one retry",
  Q9_REQUIRED_CHECK_STILL_FAILED: "an original required check still failed after the repair",
  Q9_NATIVE_BOUNDARY_STOPPED: "an independent safety boundary required this task to stop",
  Q9_REQUIRED_EVIDENCE_INCOMPLETE: "the required evidence was not complete enough to verify the result",
  Q9_WORKFLOW_VERIFICATION_FAILED: "Cairn could not safely verify the guarded quality workflow",
  ADAPTER_TIMED_OUT: "the worker ran out of time",
  CANCELLED_BY_OWNER: "you stopped it yourself",
  OWNER_STOPPED_AT_CANDIDATE: "you looked at the worker's changes and kept them without finishing the task",
  TASK_PROMISE_NOT_MET: "at least one thing this task promised was not shown to be done",
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

function taskSpecEvidenceBlock(record: TaskSpecRunRecordV1): string {
  const attestations = new Map(record.adapterAttestations.map((attestation) => [attestation.criterionId, attestation]));
  const criteria = record.criteria.map((criterion) => {
    const attestation = attestations.get(criterion.id);
    const execution = attestation
      ? `adapter event #${attestation.sequence} matched command \`${attestation.commandSha256}\` and exited ${attestation.exitCode}`
      : "no authenticated adapter command event was retained";
    return quarantineBlock(
      `- ${criterion.id} required promise: ${criterion.promise} — ${execution}. ` +
      "This proves command identity and exit only; it is not a worker claim, critic finding, or judgment that the test was sufficient.",
    );
  }).join("\n");
  const preferences = record.preferences.length > 0
    ? record.preferences.map((preference) => quarantineBlock(
      `- ${preference.id} advisory preference (not a DONE gate): ${preference.dimension} — ${preference.desiredDirection}`,
    )).join("\n")
    : "- None.";
  return [
    "### Required promises and adapter execution attestations",
    criteria,
    "### Advisory preferences — not DONE gates",
    preferences,
  ].join("\n\n");
}

function taskSpecWorkersAccountBlock(claims: TaskSpecWorkerClaimsRecordV1 | null): string {
  if (!claims) return "The worker returned no readable Task-Spec-bound claims block.";
  const criteria = claims.criteria.length > 0
    ? claims.criteria.map((claim) => quarantineBlock(`- ${claim.id}: ${claim.result}`)).join("\n")
    : "- None reported.";
  const preferences = claims.preferences.length > 0
    ? claims.preferences.map((claim) => quarantineBlock(`- ${claim.id}: ${claim.result}`)).join("\n")
    : "- None reported.";
  return [
    quarantineBlock(claims.summary),
    `What changed:\n${bulletsOrNone(claims.changes)}`,
    `Required-promise answers the worker claims:\n${criteria}`,
    `Advisory-preference notes the worker claims:\n${preferences}`,
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
  const taskSpecRecord = taskSpecRecordFor(input);
  const sections: string[] = [
    `# Task ${pad(input.taskNumber)} — ${input.route.adapterLabel} worker report`,
    "## Verified by Cairn",
    verifiedByCairnLines(input),
  ];
  const stopped = stoppedParagraph(input);
  if (stopped) sections.push(stopped);
  sections.push(PRIVACY_PARAGRAPH);
  sections.push(renderAcceptedRequestView(input.acceptedRequest, input.requestContext));
  if (taskSpecRecord) {
    sections.push("## Task Spec evidence — separate from claims and envelope facts");
    sections.push(taskSpecEvidenceBlock(taskSpecRecord));
    sections.push("## The worker's Task-Spec-bound account (claims, not verified by Cairn)");
    sections.push(taskSpecWorkersAccountBlock(taskSpecRecord.workerClaims));
    sections.push(`Worker-claimed milestone movement: **${taskSpecRecord.workerClaims?.milestone ?? "NO"}**`);
    sections.push(
      `## Envelope result — Cairn's separate terminal fact\n\n` +
      `Task ${pad(taskSpecRecord.envelopeResult.taskNumber)}: **${taskSpecRecord.envelopeResult.disposition}**` +
      `${taskSpecRecord.envelopeResult.stopReason ? ` (${taskSpecRecord.envelopeResult.stopReason})` : ""}.`,
    );
  } else {
    sections.push("## The worker's account (claims, not verified by Cairn)");
    sections.push(workersAccountBlock(input.claims));
    sections.push(`Milestone movement: **${input.claims?.milestone ?? "NO"}**`);
  }
  sections.push(`Disposition: **${input.disposition}**`);
  return `${sections.join("\n\n")}\n`;
}

/** One bounded LOG.md cell, honest about the claim/verified split, capped to 160 chars. */
export function composeWorkerRowSummary(input: ComposedRecordInput): string {
  if (input.disposition === "DONE") {
    const taskSpecRecord = taskSpecRecordFor(input);
    const summary = taskSpecRecord?.workerClaims?.summary ?? input.claims?.summary ?? "The worker reported completion.";
    return truncateRow(`${summary} (worker claim; files verified against Git by Cairn)`);
  }
  return truncateRow(`${input.route.adapterLabel} stopped safely (${input.stopReason}); requested change was not verified.`);
}
