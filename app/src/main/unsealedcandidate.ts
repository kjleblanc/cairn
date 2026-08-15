import { randomUUID } from "node:crypto";

import {
  SERIAL_UNSEALED_CANDIDATE_VERSION,
  type SerialTaskPromiseAnswerV1,
  type SerialUnsealedCandidateV1,
} from "@cairn/core";

import { canonicalProjectKey } from "./conductor/turnauth.js";
import {
  UNSEALED_CANDIDATE_CHOICES,
  UNSEALED_CANDIDATE_REPAIR_CHOICE,
  UNSEALED_CANDIDATE_VERSION,
  parseUnsealedCandidateDecisionRequest,
  type UnsealedCandidateChoice,
  type UnsealedCandidateDecisionV1,
  type UnsealedCandidateOwnerAnswer,
  type UnsealedCandidatePromiseView,
  type UnsealedCandidateProjectionV1,
  type UnsealedCandidateRepairAskedV1,
} from "../shared/unsealed-candidate.js";

/**
 * What settles the pause. `continue` carries the owner's own row judgments,
 * because the card is where those rows are answered; `stop` carries nothing,
 * since nothing needs judging to keep the work and finish honestly.
 */
export type UnsealedCandidateSettlementV1 =
  | Readonly<{ choice: "stop" }>
  | Readonly<{
      choice: "continue";
      ownerAnswers: Readonly<Record<string, UnsealedCandidateOwnerAnswer>>;
    }>
  // Task 244: the owner confirmed one allegation and approved one correction.
  // It carries no judgments, because a repair spends them.
  | Readonly<{ choice: "repair"; repair: UnsealedCandidateRepairAskedV1 }>;

/**
 * Main's half of the pre-terminal pause.
 *
 * Core stops inside the still-open run and asks one question; this module holds
 * that question for exactly one project, hands the renderer a display-only
 * projection, and settles the run with the first valid answer.
 *
 * Deliberately small. There is no grant, receipt, spend, or custody here
 * because answering grants nothing: "continue" lets the open runner reach the
 * close it was already going to reach, and "stop" takes the honest STOPPED door
 * Core already owns. The only real requirement is that a stale or forged press
 * can never answer a live pause, which one one-use id and an exact project key
 * satisfy. This module touches no process, network, filesystem, or Electron
 * surface.
 */

const FORBIDDEN_PATH_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
const PENDING_LIMIT = 64;

type Pending = {
  projectKey: string;
  projection: UnsealedCandidateProjectionV1;
  settle: (settlement: UnsealedCandidateSettlementV1) => void;
  done: boolean;
};

const pendingByProject = new Map<string, Pending>();
const pendingByCheckpoint = new Map<string, Pending>();

export const UNSEALED_CANDIDATE_DECISION_REFUSALS = Object.freeze([
  "UNSEALED_CANDIDATE_MALFORMED_DECISION",
  "UNSEALED_CANDIDATE_UNKNOWN_CHECKPOINT",
] as const);

export type UnsealedCandidateDecisionRefusal = typeof UNSEALED_CANDIDATE_DECISION_REFUSALS[number];

export type UnsealedCandidateDecisionOutcome =
  | Readonly<{ ok: true; decision: UnsealedCandidateDecisionV1 }>
  | Readonly<{ ok: false; code: UnsealedCandidateDecisionRefusal }>;

export type UnsealedCandidateCheckpointV1 = Readonly<{
  projection: UnsealedCandidateProjectionV1;
  /** Resolves once, with the settlement that answered this pause. */
  settled: Promise<UnsealedCandidateSettlementV1>;
}>;

function projectKey(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_000
    || FORBIDDEN_PATH_CONTROLS.test(value)) return null;
  try { return canonicalProjectKey(value); } catch { return null; }
}

function stringList(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) return null;
  return Object.freeze([...value as string[]]);
}

/**
 * Core mints the candidate in this same process, so this is a shape guard
 * rather than a trust boundary — but the projection it produces DOES cross into
 * the renderer, and Cairn should never put a value on the owner's screen that
 * it cannot vouch for. Exact version, sane task number, real path list.
 */
function checkedCandidate(value: unknown): SerialUnsealedCandidateV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<SerialUnsealedCandidateV1>;
  if (record.version !== SERIAL_UNSEALED_CANDIDATE_VERSION) return null;
  if (!Number.isSafeInteger(record.taskNumber) || Number(record.taskNumber) < 1) return null;
  if (record.acceptedRequest === null || typeof record.acceptedRequest !== "object") return null;
  if (record.route === null || typeof record.route !== "object"
    || typeof record.route.adapterLabel !== "string") return null;
  if (stringList(record.changedPaths) === null || stringList(record.requestContext) === null) return null;
  if (record.evidenceSummary !== null && typeof record.evidenceSummary !== "string") return null;
  if (record.claims !== null && (typeof record.claims !== "object" || record.claims === undefined)) return null;
  if (!Array.isArray(record.answers)) return null;
  // Task 244: Core always sends both, so a candidate missing either is not one
  // Cairn minted and the pause refuses to open rather than guess at the offer.
  if (typeof record.repairAvailable !== "boolean") return null;
  if (record.repair !== null && repairAsked(record.repair) === null) return null;
  return record as SerialUnsealedCandidateV1;
}

/** Core's repair, flattened for the screen. The version stays in Core, where
 * it is the thing that gets re-checked; the screen shows only the two facts. */
function repairAsked(value: unknown): UnsealedCandidateRepairAskedV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { checkId?: unknown; correction?: unknown };
  if (typeof record.checkId !== "string" || record.checkId.length === 0) return null;
  if (typeof record.correction !== "string" || record.correction.length === 0) return null;
  return Object.freeze({ checkId: record.checkId, correction: record.correction });
}

/**
 * Core's answered rows, flattened for the screen. The three voices stay three
 * fields: nothing here can merge the worker's sentence into Cairn's finding or
 * into the owner's judgment.
 */
function promiseViews(
  answers: readonly SerialTaskPromiseAnswerV1[],
): readonly UnsealedCandidatePromiseView[] {
  return Object.freeze(answers.map((row) => Object.freeze({
    id: row.id,
    text: row.text,
    source: row.source,
    answeredBy: row.verification.kind === "cairn-check" ? "cairn" as const : "owner" as const,
    cairn: row.cairn === null ? null : Object.freeze({
      label: row.cairn.label,
      command: row.cairn.command,
      status: row.cairn.status,
      durationMs: row.cairn.durationMs,
    }),
    worker: row.worker,
    owner: row.owner,
  })));
}

/**
 * Open the one pause this project may hold. A live pause is never replaced: a
 * second open refuses, so a bug cannot leave the first run waiting forever on a
 * question nobody can see any more.
 */
export function openUnsealedCandidateCheckpoint(input: unknown): UnsealedCandidateCheckpointV1 | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const keys = Object.keys(input as Record<string, unknown>).sort();
  if (keys.join("\0") !== "candidate\0dir") return null;
  const { dir, candidate } = input as Record<string, unknown>;
  const key = projectKey(dir);
  const checked = checkedCandidate(candidate);
  if (key === null || checked === null) return null;
  if (pendingByProject.has(key) || pendingByProject.size >= PENDING_LIMIT) return null;

  let checkpointId = randomUUID();
  for (let attempt = 0; attempt < 4 && pendingByCheckpoint.has(checkpointId); attempt += 1) {
    checkpointId = randomUUID();
  }
  if (pendingByCheckpoint.has(checkpointId)) return null;

  const projection: UnsealedCandidateProjectionV1 = Object.freeze({
    version: UNSEALED_CANDIDATE_VERSION,
    checkpointId,
    taskNumber: checked.taskNumber,
    acceptedRequest: checked.acceptedRequest,
    requestContext: checked.requestContext,
    adapterLabel: checked.route.adapterLabel,
    changedPaths: checked.changedPaths,
    claims: checked.claims,
    evidenceSummary: checked.evidenceSummary,
    promises: promiseViews(checked.answers),
    choices: UNSEALED_CANDIDATE_CHOICES,
    repairAvailable: checked.repairAvailable,
    repairAsked: checked.repair === null ? null : repairAsked(checked.repair),
  });

  let settle: (settlement: UnsealedCandidateSettlementV1) => void = () => {};
  const settled = new Promise<UnsealedCandidateSettlementV1>((resolve) => { settle = resolve; });
  const held: Pending = { projectKey: key, projection, settle, done: false };
  pendingByProject.set(key, held);
  pendingByCheckpoint.set(checkpointId, held);
  return Object.freeze({ projection, settled });
}

/** Output only. */
export function currentUnsealedCandidate(dir: string): UnsealedCandidateProjectionV1 | null {
  const key = projectKey(dir);
  return key === null ? null : pendingByProject.get(key)?.projection ?? null;
}

function retire(held: Pending, settlement: UnsealedCandidateSettlementV1): void {
  held.done = true;
  pendingByProject.delete(held.projectKey);
  pendingByCheckpoint.delete(held.projection.checkpointId);
  held.settle(settlement);
}

const STOP_SETTLEMENT: UnsealedCandidateSettlementV1 = Object.freeze({ choice: "stop" } as const);

/**
 * Answer the one live pause. Every refusal leaves that pause exactly as it was,
 * so a malformed or stale press can never strand a waiting run.
 */
export function decideUnsealedCandidate(
  value: unknown,
  /**
   * Task 244: the `not_met` findings Cairn actually received from a critic for
   * this pause. Main is the only place that can know this, and it is the one
   * thing Core cannot re-derive — Core can prove the row is real and still open,
   * but not that the words came from a critic rather than from a renderer. The
   * default is empty, so a caller that supplies nothing can spend no repair.
   */
  allegations: readonly Readonly<{ checkId: string; observation: string }>[] = Object.freeze([]),
): UnsealedCandidateDecisionOutcome {
  const request = parseUnsealedCandidateDecisionRequest(value);
  if (request === null) {
    return Object.freeze({ ok: false, code: "UNSEALED_CANDIDATE_MALFORMED_DECISION" } as const);
  }
  const held = pendingByCheckpoint.get(request.checkpointId);
  const key = projectKey(request.dir);
  if (held === undefined || held.done || key === null || key !== held.projectKey
    || pendingByProject.get(key) !== held) {
    return Object.freeze({ ok: false, code: "UNSEALED_CANDIDATE_UNKNOWN_CHECKPOINT" } as const);
  }
  if (request.choice === UNSEALED_CANDIDATE_REPAIR_CHOICE) {
    const asked = request.repair;
    // A repair this pause never offered, or a correction that is not word for
    // word a sentence a critic sent Cairn about that exact row, is refused and
    // leaves the pause untouched. Nothing here can be widened into a request.
    if (asked === undefined || !held.projection.repairAvailable
      || !allegations.some((claim) =>
        claim.checkId === asked.checkId && claim.observation === asked.correction)) {
      return Object.freeze({ ok: false, code: "UNSEALED_CANDIDATE_MALFORMED_DECISION" } as const);
    }
    retire(held, Object.freeze({ choice: "repair", repair: asked } as const));
    return Object.freeze({
      ok: true,
      decision: Object.freeze({
        version: UNSEALED_CANDIDATE_VERSION,
        checkpointId: request.checkpointId,
        choice: UNSEALED_CANDIDATE_REPAIR_CHOICE,
        ownerAnswers: request.ownerAnswers,
        repair: asked,
      }),
    } as const);
  }
  retire(held, request.choice === "continue"
    ? Object.freeze({ choice: "continue", ownerAnswers: request.ownerAnswers } as const)
    : STOP_SETTLEMENT);
  return Object.freeze({
    ok: true,
    decision: Object.freeze({
      version: UNSEALED_CANDIDATE_VERSION,
      checkpointId: request.checkpointId,
      choice: request.choice,
      ownerAnswers: request.ownerAnswers,
    }),
  } as const);
}

/**
 * Main's own door out, for the cases where Cairn is still alive but nobody can
 * answer: the run was cancelled, or the window that asked is gone. Closing
 * settles the run as `stop`, which writes an honest STOPPED record — never a
 * DONE — and leaves the worker's edits for inspection.
 *
 * It retires only the exact projection the caller opened, so a stale reference
 * can never close a newer pause.
 */
export function closeUnsealedCandidateIfCurrent(
  dir: string,
  projection: UnsealedCandidateProjectionV1,
): boolean {
  const key = projectKey(dir);
  if (key === null) return false;
  const held = pendingByProject.get(key);
  if (held === undefined || held.done || held.projection !== projection) return false;
  retire(held, STOP_SETTLEMENT);
  return true;
}

export function pendingUnsealedCandidateCount(): number {
  return pendingByProject.size;
}

export function _resetUnsealedCandidatesForTests(): void {
  for (const held of [...pendingByProject.values()]) retire(held, STOP_SETTLEMENT);
  pendingByProject.clear();
  pendingByCheckpoint.clear();
}
