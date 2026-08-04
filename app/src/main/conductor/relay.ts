import type { SerialRunResult } from "@cairn/core";
import { isEvidenceRunId } from "../../shared/ipc.js";
import type { ConductorTurn, ResultCard } from "../../shared/ipc.js";
import { appendTurn } from "./store.js";

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

function requireEvidenceRunId(evidenceRunId: string | null): void {
  if (evidenceRunId !== null && !isEvidenceRunId(evidenceRunId)) {
    throw new Error("INVALID_EVIDENCE_RUN_ID: Cairn refused a malformed local evidence identity.");
  }
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
export function composeResultCard(result: SerialRunResult, evidenceRunId: string | null = null): ResultCard {
  requireEvidenceRunId(evidenceRunId);
  if (result.status === "connection-required") {
    const card = blankCard("STOPPED");
    card.stopReason = "CONNECTION_REQUIRED";
    card.evidenceSummary = result.route.reason;
    return card;
  }
  const composed = result.composed;
  const card = blankCard(composed.disposition);
  card.evidenceRunId = evidenceRunId;
  card.taskNumber = composed.taskNumber;
  card.stopReason = composed.stopReason;
  card.filesChanged = [...composed.filesChanged];
  card.protectedIntact = composed.protectedIntact;
  card.commit = composed.commit ? composed.commit.reason : null;
  card.evidenceSummary = composed.evidenceSummary;
  card.recordRecovery = composed.recordRecovery ?? null;
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
  return card;
}

/**
 * Builds the card for a run that THREW — no records, no verified facts, and
 * nothing the envelope may claim about the workspace.
 *
 * Only the fixed code and an optional opaque local evidence link travel. The
 * rest of the message is deliberately dropped: a thrown error's text can
 * carry paths and provider output, and this card is written to disk inside
 * the project.
 */
export function composeErrorCard(message: string, evidenceRunId: string | null = null): ResultCard {
  requireEvidenceRunId(evidenceRunId);
  const card = blankCard("ERROR");
  card.evidenceRunId = evidenceRunId;
  const head = message.split(":", 1)[0]?.trim() ?? "";
  card.errorCode = head.length <= CODE_CAP && FIXED_CODE.test(head) ? head : null;
  return card;
}

/**
 * The card as the conductor reads it, for prompt assembly.
 *
 * The report's own separation is carried through verbatim, in two parts under
 * two labels: what Cairn's runtime verified, and — separately — the worker's
 * unverified account. This is why the claims are lifted OUT of the verified
 * object rather than left inside one JSON blob: a model reading a single object
 * headed "verified by Cairn's runtime" would be reading the worker's own
 * sentence under Cairn's guarantee, which is exactly the confusion the report's
 * two-section split exists to prevent. Task 9's commentary is built on this
 * seam, so the separation is structural, not a matter of wording.
 *
 * The no-claims sentence is `records.ts`'s own, so the conductor sees the same
 * words a reader of the report sees.
 */
export function cardBriefing(card: ResultCard): string {
  const { claims } = card;
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
  return [
    `Envelope result card (verified by Cairn's runtime, not by the conversation model):\n${JSON.stringify(verified)}`,
    `The worker's account (claims, not verified by Cairn):\n${
      claims ? JSON.stringify(claims) : "The worker returned no readable claims block."
    }`,
  ].join("\n\n");
}

/**
 * Appends the card to the conversation that dispatched the run and returns the
 * turn it wrote. It sends no delta: neither this module nor the service owns a
 * window, so the caller — which does — sends it.
 */
export function postResultCard(dir: string, conversationId: string, card: ResultCard): ConductorTurn {
  const turn: ConductorTurn = { role: "envelope", card, ts: new Date().toISOString() };
  appendTurn(dir, conversationId, turn);
  return turn;
}
