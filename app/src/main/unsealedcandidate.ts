import { randomUUID } from "node:crypto";

import { SERIAL_UNSEALED_CANDIDATE_VERSION, type SerialUnsealedCandidateV1 } from "@cairn/core";

import { canonicalProjectKey } from "./conductor/turnauth.js";
import {
  UNSEALED_CANDIDATE_CHOICES,
  UNSEALED_CANDIDATE_VERSION,
  parseUnsealedCandidateDecisionRequest,
  type UnsealedCandidateChoice,
  type UnsealedCandidateDecisionV1,
  type UnsealedCandidateProjectionV1,
} from "../shared/unsealed-candidate.js";

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
  settle: (choice: UnsealedCandidateChoice) => void;
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
  /** Resolves once, with the choice that settled this pause. */
  settled: Promise<UnsealedCandidateChoice>;
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
  return record as SerialUnsealedCandidateV1;
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
    choices: UNSEALED_CANDIDATE_CHOICES,
  });

  let settle: (choice: UnsealedCandidateChoice) => void = () => {};
  const settled = new Promise<UnsealedCandidateChoice>((resolve) => { settle = resolve; });
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

function retire(held: Pending, choice: UnsealedCandidateChoice): void {
  held.done = true;
  pendingByProject.delete(held.projectKey);
  pendingByCheckpoint.delete(held.projection.checkpointId);
  held.settle(choice);
}

/**
 * Answer the one live pause. Every refusal leaves that pause exactly as it was,
 * so a malformed or stale press can never strand a waiting run.
 */
export function decideUnsealedCandidate(value: unknown): UnsealedCandidateDecisionOutcome {
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
  retire(held, request.choice);
  return Object.freeze({
    ok: true,
    decision: Object.freeze({
      version: UNSEALED_CANDIDATE_VERSION,
      checkpointId: request.checkpointId,
      choice: request.choice,
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
  retire(held, "stop");
  return true;
}

export function pendingUnsealedCandidateCount(): number {
  return pendingByProject.size;
}

export function _resetUnsealedCandidatesForTests(): void {
  for (const held of [...pendingByProject.values()]) retire(held, "stop");
  pendingByProject.clear();
  pendingByCheckpoint.clear();
}
