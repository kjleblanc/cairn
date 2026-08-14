import type { SerialRunResult, TaskRequestView } from "@cairn/core";
import { isEvidenceRunId, TASK_SPEC_RESULT_PROJECTION_VERSION } from "../../shared/ipc.js";
import type { ConductorEnvelopeTurn, ConductorTurn, ResultCard, TaskSpecResultProjectionV1, TaskReviewProjectionV1 } from "../../shared/ipc.js";
import { parseTaskReviewProjection } from "../../shared/task-review.js";
import { appendEnvelopeTurnOnce, appendTurn } from "./store.js";
import { cardDigest } from "./cardauth.js";

/**
 * The envelope's own voice in the conversation.
 *
 * Every terminal run posts one card, and the card is composed here — in the
 * main process, from `result.composed`, the same structured record input Cairn
 * rendered its report from. Nothing is read back from a written file, nothing
 * is asked of the conversation model, and no wording travels: the renderer is
 * handed fields and renders them itself, so the card and the report on disk
 * cannot disagree about what happened.
 *
 * The conductor never writes one of these. It only comments on them later,
 * after the fact, reading them as system context.
 */

/**
 * A Cairn stop/refusal code, as every fixed code in this codebase is written:
 * SCREAMING_SNAKE with at least one underscore. The shape is checked because
 * the alternative — taking whatever precedes the first colon — dresses a raw
 * runtime prefix (`ENOENT`, a Windows drive letter) as a Cairn code the owner
 * could go looking for. No fixed code, no claimed code.
 */
const FIXED_CODE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;
const CODE_CAP = 64;
const SOURCE_LABELS: Readonly<Record<TaskRequestView["outcome"]["source"], string>> = Object.freeze({
  "owner-stated": "You said so",
  "owner-unsure": "You weren’t sure",
  "cairn-chosen": "Cairn chose",
});

function requireEvidenceRunId(evidenceRunId: string | null): void {
  if (evidenceRunId !== null && !isEvidenceRunId(evidenceRunId)) {
    throw new Error("INVALID_EVIDENCE_RUN_ID: Cairn refused a malformed local evidence identity.");
  }
}

/** Detach the durable projection from Core/main's retained object. The card is
 * persisted and handed across IPC, so it owns every row and array it carries. */
function copyAcceptedRequest(request: TaskRequestView): TaskRequestView {
  const copyRow = (row: TaskRequestView["outcome"]): TaskRequestView["outcome"] => ({
    source: row.source,
    text: row.text,
    ownerText: row.ownerText,
  });
  return {
    outcome: copyRow(request.outcome),
    requirements: request.requirements.map(copyRow),
  };
}

type ClosedSerialResult = Exclude<SerialRunResult, { status: "connection-required" }>;
type TaskSpecRunRecord = NonNullable<ClosedSerialResult["composed"]["taskSpecRunRecord"]>;

/** Detach the Q4 record into the only Task-Spec data shape allowed to cross
 * persistence/IPC. No Core brand is projected, and no event/claim can add a
 * CriterionResult, critic finding, verdict, source, or envelope authority. */
function copyTaskSpecResult(record: TaskSpecRunRecord): TaskSpecResultProjectionV1 {
  const workerClaims = record.workerClaims === null ? null : {
    version: record.workerClaims.version,
    taskSpecSha256: record.workerClaims.taskSpecSha256,
    disposition: record.workerClaims.disposition,
    summary: record.workerClaims.summary,
    changes: [...record.workerClaims.changes],
    criteria: record.workerClaims.criteria.map((claim) => ({ id: claim.id, result: claim.result })),
    preferences: record.workerClaims.preferences.map((claim) => ({ id: claim.id, result: claim.result })),
    howToTry: record.workerClaims.howToTry,
    limitations: record.workerClaims.limitations,
    milestone: record.workerClaims.milestone,
  };
  return {
    version: TASK_SPEC_RESULT_PROJECTION_VERSION,
    requestSha256: record.requestSha256,
    taskSpecSha256: record.taskSpecSha256,
    evidencePlanSha256: record.evidencePlanSha256,
    requiredPromises: record.criteria.map((criterion) => ({
      id: criterion.id,
      promise: criterion.promise,
      adapterAttested: record.adapterAttestations.some((attestation) => attestation.criterionId === criterion.id),
    })),
    advisoryPreferences: record.preferences.map((preference) => ({
      id: preference.id,
      dimension: preference.dimension,
      desiredDirection: preference.desiredDirection,
    })),
    adapterAttestations: record.adapterAttestations.map((attestation) => ({
      version: attestation.version,
      taskSpecSha256: attestation.taskSpecSha256,
      evidencePlanSha256: attestation.evidencePlanSha256,
      criterionId: attestation.criterionId,
      sequence: attestation.sequence,
      commandSha256: attestation.commandSha256,
      exitCode: attestation.exitCode,
    })),
    workerClaims,
    envelopeResult: {
      version: record.envelopeResult.version,
      taskNumber: record.envelopeResult.taskNumber,
      requestSha256: record.envelopeResult.requestSha256,
      taskSpecSha256: record.envelopeResult.taskSpecSha256,
      disposition: record.envelopeResult.disposition,
      stopReason: record.envelopeResult.stopReason,
    },
    criticReady: false,
  };
}

function copyTaskReview(review: TaskReviewProjectionV1): TaskReviewProjectionV1 {
  const parsed = parseTaskReviewProjection(structuredClone(review));
  if (parsed === null) throw new Error("INVALID_TASK_REVIEW: Cairn refused an invalid pre-seal review projection.");
  return parsed;
}

/** The one card shape, with every "nothing to report" field already empty, so
 * each arm below states only what it actually knows. */
function blankCard(disposition: ResultCard["disposition"]): ResultCard {
  return {
    kind: "result",
    disposition,
    taskNumber: null,
    stopReason: null,
    errorCode: null,
    filesChanged: [],
    protectedIntact: null,
    commit: null,
    evidenceSummary: null,
    recordRecovery: null,
    processFailure: null,
    claims: null,
    route: null,
    acceptedRequest: null,
    evidenceRunId: null,
  };
}

/**
 * Builds the card for a run that reached a terminal state.
 *
 * The done and stopped arms read `result.composed` and nothing else. Two
 * deliberate choices live there:
 *
 * - `commit` is `composed.commit.reason`, not `result.commit.hash`. On a
 *   clean-start DONE the two differ: composed carries the pre-commit sentence
 *   the report was rendered with, while `result.commit` carries the hash the
 *   commit produced afterwards. The card exists to agree with the record on
 *   disk, so it takes the record's own value. That sentence never overstates a
 *   commit at any of the three DONE sites — not because a DONE always commits
 *   (the dirty-start worker DONE and the offline demo both return `skipped`),
 *   but because the card prints the reason VERBATIM, and every reason core
 *   composes already says which of the two happened.
 * - `claims` is the WORKER's summary and milestone, carried so the renderer can
 *   show them as claims. They are never merged into a verified field.
 * - `recordRecovery` and `processFailure` are Cairn's own disclosures, not the
 *   worker's. The first says a worker tampered with Cairn's own owned records;
 *   dropping either would make the card a quieter account than the report.
 *
 * The connection-required arm carries no `composed` at all — no task number, no
 * files, no protected-work finding, because none were ever computed. It maps to
 * a STOPPED card with the fixed code CONNECTION_REQUIRED, and core's own
 * readiness sentence rides `evidenceSummary`, the card's one free line, so the
 * render can say why without inventing a route that was never resolved.
 */
export function composeResultCard(
  result: SerialRunResult,
  evidenceRunId: string | null = null,
  taskReview?: TaskReviewProjectionV1,
): ResultCard {
  requireEvidenceRunId(evidenceRunId);
  if (result.status === "connection-required") {
    const card = blankCard("STOPPED");
    card.stopReason = "CONNECTION_REQUIRED";
    card.evidenceSummary = result.route.reason;
    if (taskReview !== undefined) {
      const review = copyTaskReview(taskReview);
      card.taskReview = review;
      card.acceptedRequest = copyAcceptedRequest(review.plan.request);
    }
    return card;
  }
  const composed = result.composed;
  const card = blankCard(composed.disposition);
  card.acceptedRequest = copyAcceptedRequest(composed.acceptedRequest);
  card.evidenceRunId = evidenceRunId;
  card.taskNumber = composed.taskNumber;
  card.stopReason = composed.stopReason;
  card.filesChanged = [...composed.filesChanged];
  card.protectedIntact = composed.protectedIntact;
  card.commit = composed.commit ? composed.commit.reason : null;
  card.evidenceSummary = composed.evidenceSummary;
  card.recordRecovery = composed.recordRecovery ?? null;
  // Task 238: the same rows the candidate showed, so the result cannot
  // quietly disagree with what the owner was asked to judge.
  // Only when there is something to say. A run that carried no promises leaves
  // this key ABSENT, so a legacy card and a promise-free card stay byte-identical
  // to what every existing reader and saved conversation already holds.
  const answered = composed.promiseAnswers ?? [];
  if (answered.length > 0) card.promises = answered.map((row) => ({
    id: row.id,
    text: row.text,
    source: row.source,
    answeredBy: row.verification.kind === "cairn-check" ? "cairn" as const : "owner" as const,
    cairn: row.cairn === null ? null : {
      label: row.cairn.label, command: row.cairn.command,
      status: row.cairn.status, durationMs: row.cairn.durationMs,
    },
    worker: row.worker,
    owner: row.owner,
  }));
  card.processFailure = composed.processFailure
    ? { code: composed.processFailure.code, debugPath: composed.processFailure.debugPath }
    : null;
  card.claims = composed.claims ? {
    summary: composed.claims.summary,
    changes: [...composed.claims.changes],
    checks: composed.claims.checks.map((check) => ({ ...check })),
    howToTry: composed.claims.howToTry,
    limitations: composed.claims.limitations,
    milestone: composed.claims.milestone,
  } : null;
  card.route = {
    adapterLabel: composed.route.adapterLabel,
    provider: composed.route.provider,
    model: composed.route.model,
  };
  if (composed.taskSpecRunRecord) {
    card.taskSpecResult = copyTaskSpecResult(composed.taskSpecRunRecord);
  }
  if (taskReview !== undefined) card.taskReview = copyTaskReview(taskReview);
  return card;
}

/**
 * Builds the card for a run that THREW — no records, no verified facts, and
 * nothing the envelope may claim about the workspace.
 *
 * Only the fixed code, the output-only accepted-request view (or explicit
 * null), and an optional opaque local evidence link travel. The rest of the
 * message is deliberately dropped: a thrown error's text can carry paths and
 * provider output, and this card is written to disk inside the project.
 */
export function composeErrorCard(
  message: string,
  acceptedRequest: TaskRequestView | null,
  evidenceRunId: string | null = null,
  taskReview?: TaskReviewProjectionV1,
): ResultCard {
  requireEvidenceRunId(evidenceRunId);
  const card = blankCard("ERROR");
  card.acceptedRequest = acceptedRequest === null ? null : copyAcceptedRequest(acceptedRequest);
  card.evidenceRunId = evidenceRunId;
  if (taskReview !== undefined) card.taskReview = copyTaskReview(taskReview);
  const head = message.split(":", 1)[0]?.trim() ?? "";
  card.errorCode = head.length <= CODE_CAP && FIXED_CODE.test(head) ? head : null;
  return card;
}

/**
 * The card as the conductor reads it, for prompt assembly.
 *
 * The report's own separation is carried through under two labels: what
 * Cairn's runtime verified and — separately — the worker's unverified account.
 * A present accepted request adds a third source-marked context block that is
 * neither a result fact nor a worker claim. This is why claims and request are
 * lifted OUT of the verified object rather than left inside one JSON blob: a
 * model reading a single object headed "verified by Cairn's runtime" would be
 * reading other speakers' words under Cairn's guarantee. Task 9's commentary
 * is built on this seam, so the separation is structural, not wording alone.
 *
 * The no-claims sentence is `records.ts`'s own, so the conductor sees the same
 * words a reader of the report sees.
 */
export function cardBriefing(card: ResultCard): string {
  const { claims, taskSpecResult } = card;
  // This is deliberately a whitelist rather than a rest-spread. The opaque
  // local run link is not provider context, and neither is any present or
  // future album metadata accidentally attached to the in-memory object.
  const verified = {
    kind: card.kind,
    disposition: card.disposition,
    taskNumber: card.taskNumber,
    stopReason: card.stopReason,
    errorCode: card.errorCode,
    filesChanged: card.filesChanged,
    protectedIntact: card.protectedIntact,
    commit: card.commit,
    evidenceSummary: card.evidenceSummary,
    recordRecovery: card.recordRecovery,
    processFailure: card.processFailure,
    route: card.route,
  };
  const blocks = [
    `Envelope result card (verified by Cairn's runtime, not by the conversation model):\n${JSON.stringify(verified)}`,
  ];
  if (taskSpecResult) {
    const taskSpecEvidence = {
      version: taskSpecResult.version,
      requestSha256: taskSpecResult.requestSha256,
      taskSpecSha256: taskSpecResult.taskSpecSha256,
      evidencePlanSha256: taskSpecResult.evidencePlanSha256,
      requiredPromises: taskSpecResult.requiredPromises,
      advisoryPreferences: taskSpecResult.advisoryPreferences,
      adapterAttestations: taskSpecResult.adapterAttestations,
      criticReady: taskSpecResult.criticReady,
    };
    blocks.push(
      `Task Spec evidence (verified bindings and command-hash/exit facts only; pN is advisory and never a DONE gate; no critic authority):\n${JSON.stringify(taskSpecEvidence)}`,
      `The Task-Spec worker's account (claims, not verified by Cairn):\n${
        taskSpecResult.workerClaims
          ? JSON.stringify(taskSpecResult.workerClaims)
          : "The worker returned no readable Task-Spec-bound claims block."
      }`,
      `The Task-Spec envelope result (verified by Cairn's runtime; separate from worker claims and CriterionResult):\n${JSON.stringify(taskSpecResult.envelopeResult)}`,
    );
  } else {
    // Keep the historical two-block briefing byte-for-byte when Q4 is absent.
    blocks.push(`The worker's account (claims, not verified by Cairn):\n${
      claims ? JSON.stringify(claims) : "The worker returned no readable claims block."
    }`);
  }
  if (card.acceptedRequest) {
    // Rebuild rather than spread. The card's request is context for the
    // conductor's comment, not a verified result fact or a worker claim, and
    // only the three visible row fields may cross this provider seam.
    const requestRow = (row: TaskRequestView["outcome"]): {
      label: string;
      interpretation: string;
      ownerQuotation?: string;
    } => ({
      label: SOURCE_LABELS[row.source],
      interpretation: row.text,
      ...(row.ownerText !== null ? { ownerQuotation: row.ownerText } : {}),
    });
    const requestContext = {
      outcome: requestRow(card.acceptedRequest.outcome),
      requirements: card.acceptedRequest.requirements.map(requestRow),
    };
    blocks.push(
      `The accepted request (source-marked; not a result fact):\n${JSON.stringify(requestContext)}`,
    );
  }
  return blocks.join("\n\n");
}

/**
 * Appends the card to the conversation that dispatched the run and returns the
 * turn it wrote. It sends no delta: neither this module nor the service owns a
 * window, so the caller — which does — sends it.
 */
export function postResultCard(dir: string, conversationId: string, card: ResultCard): ConductorEnvelopeTurn {
  const turn: ConductorEnvelopeTurn = { role: "envelope", card, ts: new Date().toISOString() };
  appendTurn(dir, conversationId, turn);
  return turn;
}

/**
 * Restart-safe terminal-card delivery. The caller supplies the timestamp that
 * was durably bound to the terminal receipt; retrying those same bytes returns
 * the same turn and never appends a second physical JSONL line.
 */
export function postResultCardOnce(
  dir: string,
  conversationId: string,
  card: ResultCard,
  turnTimestamp: string,
): Readonly<{
  turn: Extract<ConductorTurn, { role: "envelope" }>;
  status: "appended" | "already-present";
  deliveredSha256: string;
}> {
  const turn = Object.freeze({ role: "envelope" as const, card, ts: turnTimestamp });
  const status = appendEnvelopeTurnOnce(dir, conversationId, turn);
  return Object.freeze({
    turn,
    status,
    deliveredSha256: cardDigest(dir, conversationId, turnTimestamp, card),
  });
}
