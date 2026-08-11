import { createHash, randomUUID } from "node:crypto";

import {
  TASK_CALL_BUDGET_V1,
  canonicalCriticPacket,
  criticCallAuthorizationCoversRequest,
  criticCallAuthorizationSha256,
  criticCallRequestBody,
  type CriticCallAuthorizationV1,
} from "@cairn/core";

import { canonicalProjectKey } from "./conductor/turnauth.js";
import { parseCriticCallDecisionRequest, parseCriticCallDisclosure } from "../shared/critic-call-parse.js";
import {
  CRITIC_CALL_ACTIONS_BY_MODE,
  CRITIC_CALL_CREDENTIAL_TEXT_BY_KIND,
  CRITIC_CALL_DECISION_VERSION,
  CRITIC_CALL_DISCLOSURE_VERSION,
  CRITIC_CALL_FILE_CAP,
  CRITIC_CALL_NOT_SENT_BY_KIND,
  CRITIC_CALL_PER_FILE_CHARACTER_CAP,
  CRITIC_CALL_PURPOSE_BY_KIND,
  CRITIC_CALL_REQUEST_CHARACTER_CAP,
  CRITIC_CALL_TOTAL_CHARACTER_CAP,
  canonicalCriticCallDisclosure,
  type CriticCallDecisionRequest,
  type CriticCallDecisionV1,
  type CriticCallCalibrationViewV1,
  type CriticCallDisclosureV1,
  type CriticCallModeV1,
  type CriticCallPlanMetadataV1,
} from "../shared/critic-call.js";

/**
 * The owner-facing side of one approved critic call.
 *
 * Main composes the card from a branded `CriticCallAuthorizationV1` and from
 * nothing else, so the card cannot describe a call that was never approved and
 * cannot understate one that was. The renderer receives output only: it presses
 * one closed action on one opaque id and echoes the card it was shown, and Main
 * re-derives that card before it decides. If what would be sent has changed
 * since the owner looked, the decision refuses.
 *
 * Nothing here sends anything. An approval yields a Main-only grant; Q8's
 * synthetic calibration orchestrator is its first consumer.
 */

/** One pending approval per project. The product runtime is serial, so a
 * second card for the same project means the first is stale by construction. */
type PendingApproval = Readonly<{
  approvalId: string;
  authorization: CriticCallAuthorizationV1;
  mode: CriticCallModeV1;
  canonical: string;
  disclosure: CriticCallDisclosureV1;
}>;

const pending = new Map<string, PendingApproval>();

/** The one thing an approval produces. It never crosses IPC. */
export type CriticCallGrantV1 = Readonly<{
  approvalId: string;
  routeRequestFingerprintSha256: string;
}>;

const grantAuthorizations = new WeakMap<object, CriticCallAuthorizationV1>();
/** One card, and therefore one grant, per approved call. */
const grantedAuthorizations = new WeakSet<object>();
/** A pending card pins its request, and therefore every selected file's
 * content, for as long as it is held. One project cannot exceed one card, but
 * a profile with many projects still needs a ceiling. */
const PENDING_APPROVAL_LIMIT = 64;

export type CriticCallDecisionOutcome =
  | Readonly<{ ok: true; decision: CriticCallDecisionV1; grant: CriticCallGrantV1 | null }>
  | Readonly<{ ok: false; code: CriticCallDecisionRefusal }>;

/**
 * Every refusal leaves the approval exactly where it was.
 *
 * A refusal means Cairn could not act on this press — not that the owner's
 * pending call is void. Consuming on refusal would hand a buggy or hostile
 * renderer the power to destroy an approval the owner is still looking at,
 * simply by sending one altered field. Only a decision that succeeds spends
 * it; only `clearCriticCallApproval` drops it unspent.
 */
export const CRITIC_CALL_DECISION_REFUSALS = Object.freeze([
  "CRITIC_CALL_DECISION_MALFORMED",
  "CRITIC_CALL_DECISION_UNKNOWN_APPROVAL",
  "CRITIC_CALL_DECISION_ECHO_MISMATCH",
  "CRITIC_CALL_DECISION_ACTION_NOT_OFFERED",
] as const);

export type CriticCallDecisionRefusal = typeof CRITIC_CALL_DECISION_REFUSALS[number];

/** Count what the packet carries besides file contents. Reads only lengths;
 * no promise text, reference title, or evidence label reaches the card. */
function planMetadataOf(packet: unknown): CriticCallPlanMetadataV1 | null {
  if (typeof packet !== "object" || packet === null) return null;
  const value = packet as {
    taskSpec?: { criteria?: unknown; preferences?: unknown; references?: unknown };
    checkEvidence?: unknown;
    priorConfirmedFindings?: unknown;
    comparisonTrials?: unknown;
  };
  const counts = [
    value.taskSpec?.criteria, value.taskSpec?.preferences, value.taskSpec?.references,
    value.checkEvidence, value.priorConfirmedFindings, value.comparisonTrials,
  ].map((rows) => Array.isArray(rows) ? rows.length : null);
  if (counts.some((count) => count === null)) return null;
  return Object.freeze({
    checks: counts[0] as number,
    preferences: counts[1] as number,
    references: counts[2] as number,
    evidenceItems: counts[3] as number,
    priorFindings: counts[4] as number,
    comparisonTrials: counts[5] as number,
  });
}

function selectionView(authorization: CriticCallAuthorizationV1) {
  return authorization.selection.map((row) => Object.freeze({
    path: row.projectRelativePath,
    sha256: row.sha256,
    characters: row.characters,
  }));
}

/**
 * Compose the card for one approved call.
 *
 * Returns null for anything that is not a branded authorization, and for
 * `off` — a mode that offers no call control composes no card, so there is
 * nothing for an owner to press and nothing for a renderer to replay.
 */
function openCriticCallApprovalKind(input: {
  readonly dir: string;
  /** The branded `CriticRequestV1` this call would send. The card must state
   * the whole payload, and only the request knows what is in it. */
  readonly request: unknown;
  readonly authorization: unknown;
  readonly mode: "required" | "optional" | "off";
}, callKind: "provider" | "synthetic-calibration", calibration: CriticCallCalibrationViewV1 | null): CriticCallDisclosureV1 | null {
  // Drop any earlier card for this project FIRST, so the invariant holds on
  // every path out of here: after an attempt to open, no stale card survives.
  // Refusing below and leaving the previous one pending would let a caller
  // that believes it has no card still have an approvable one.
  const key = canonicalProjectKey(input.dir);
  pending.delete(key);
  if (input.mode === "off") return null;
  // Branded AND not already spent. The brand deliberately survives
  // consumption so custody can still be recorded after a send, so the brand
  // alone would let an already-billed call ask the owner to approve it again.
  // Composing its body is the test for "not yet sent"; the bytes are dropped.
  if (criticCallAuthorizationSha256(input.authorization) === null
    || criticCallRequestBody(input.authorization) === null) return null;
  const authorization = input.authorization as CriticCallAuthorizationV1;
  // One authorization, one card. Two cards over the same approved call would
  // mint two grants, and this module's single-use promise would be false even
  // though Core's own spend would still stop the second send.
  if (grantedAuthorizations.has(authorization)) return null;
  // The card must describe the request this approval would actually send, so
  // the request has to be the one the approval was minted from.
  if (!criticCallAuthorizationCoversRequest(authorization, input.request)) return null;
  const packet = (input.request as { packet: unknown }).packet;
  const canonicalPacket = canonicalCriticPacket(packet);
  const metadata = planMetadataOf(packet);
  if (canonicalPacket === null || metadata === null
    || canonicalPacket.length > CRITIC_CALL_REQUEST_CHARACTER_CAP) return null;
  if (pending.size >= PENDING_APPROVAL_LIMIT) return null;
  const selection = selectionView(authorization);
  let selectedCharacters = 0;
  for (const row of selection) selectedCharacters += row.characters;
  // Depth only. Core enforces these caps when it mints the authorization, and
  // this function accepts nothing else, so no input reachable through the
  // public API can fail here. It is kept so a future composer that builds a
  // card from something looser cannot widen what the owner is shown.
  if (selection.length > CRITIC_CALL_FILE_CAP || selectedCharacters > CRITIC_CALL_TOTAL_CHARACTER_CAP
    || selection.some((row) => row.characters > CRITIC_CALL_PER_FILE_CHARACTER_CAP)) return null;

  const disclosure: CriticCallDisclosureV1 = Object.freeze({
    version: CRITIC_CALL_DISCLOSURE_VERSION,
    approvalId: randomUUID(),
    callKind,
    mode: input.mode,
    attempt: authorization.callAttempt,
    attemptCap: callKind === "synthetic-calibration" ? 1 : TASK_CALL_BUDGET_V1.maxCriticAttempts,
    provider: authorization.provider,
    baseUrl: authorization.baseUrl,
    configuredModel: authorization.model,
    resolvedModel: authorization.resolvedModel,
    resolvedModelRevision: authorization.resolvedModelRevision,
    connectionConsentVersion: authorization.connectionConsentVersion,
    routeRequestFingerprintSha256: authorization.routeRequestFingerprintSha256,
    purpose: CRITIC_CALL_PURPOSE_BY_KIND[callKind],
    notSent: CRITIC_CALL_NOT_SENT_BY_KIND[callKind],
    credentialText: CRITIC_CALL_CREDENTIAL_TEXT_BY_KIND[callKind],
    selection: Object.freeze(selection),
    selectedFiles: selection.length,
    selectedCharacters,
    planMetadata: metadata,
    calibration,
    totalRequestCharacters: canonicalPacket.length,
    fileCap: CRITIC_CALL_FILE_CAP,
    perFileCharacterCap: CRITIC_CALL_PER_FILE_CHARACTER_CAP,
    totalCharacterCap: CRITIC_CALL_TOTAL_CHARACTER_CAP,
    timeoutMs: authorization.timeoutMs,
    maxOutputCharacters: authorization.maxOutputCharacters,
    billingBasis: authorization.billingBasis,
    actions: CRITIC_CALL_ACTIONS_BY_MODE[input.mode],
  });

  // Every card Cairn issues must be one the owner can actually decide. The
  // echo travels back through the shared parser, whose rules are stricter than
  // Core's in places, so a card that would not survive that round trip is
  // refused here rather than shown as an approval nobody could press.
  if (parseCriticCallDisclosure(disclosure) === null) return null;

  pending.set(key, Object.freeze({
    approvalId: disclosure.approvalId,
    authorization,
    mode: input.mode,
    canonical: canonicalCriticCallDisclosure(disclosure),
    disclosure,
  }));
  return disclosure;
}

/** Normal provider calls can never choose synthetic/no-key wording. */
export function openCriticCallApproval(input: {
  readonly dir: string;
  readonly request: unknown;
  readonly authorization: unknown;
  readonly mode: "required" | "optional" | "off";
}): CriticCallDisclosureV1 | null {
  return openCriticCallApprovalKind(input, "provider", null);
}

/**
 * The only synthetic disclosure composer. Its label is derived from an exact
 * inert `.invalid` route and an exact request-bound calibration view; callers
 * cannot put fake/no-key wording over a live provider authorization.
 */
export function openSyntheticCriticCallApproval(input: {
  readonly dir: string;
  readonly request: unknown;
  readonly authorization: unknown;
  readonly calibration: CriticCallCalibrationViewV1;
}): CriticCallDisclosureV1 | null {
  const authorization = input.authorization as Partial<CriticCallAuthorizationV1> | null;
  const body = criticCallRequestBody(input.authorization);
  const packetRows = (input.request as { packet?: { selectedTrackedText?: unknown } } | null)?.packet?.selectedTrackedText;
  const exactRoute = authorization !== null
    && authorization.provider === "cairn-synthetic-fake"
    && authorization.baseUrl === "https://critic-calibration.invalid/v1"
    && authorization.model === "cairn/synthetic-critic-v1"
    && authorization.resolvedModel === "cairn/synthetic-critic-v1"
    && authorization.resolvedModelRevision === "synthetic-fixture-v1"
    && authorization.connectionConsentVersion === "synthetic-calibration-no-project-data-v1"
    && authorization.transportRevision === "openai-compatible-critic/v1"
    && authorization.serializer === "cairn-critic-body/v1"
    && authorization.toolPolicy === "none"
    && authorization.serverSideTools === "none"
    && authorization.candidateRound === 0
    && authorization.callAttempt === 1
    && authorization.timeoutMs === 600_000
    && authorization.maxOutputCharacters === 262_144
    && authorization.purpose === "critic-assessment"
    && authorization.billingBasis === "Injected synthetic fake only; no provider, network, credential, billing, or quota is used.";
  const exactView = body !== null && exactRoute && input.calibration.fixtureCount === 12
    && input.calibration.fixtureIndex >= 1 && input.calibration.fixtureIndex <= input.calibration.fixtureCount
    && input.calibration.packetSha256 === authorization.packetSha256
    && input.calibration.requestSha256 === authorization.requestSha256
    && input.calibration.requestBodySha256 === createHash("sha256").update(body).digest("hex")
    && Array.isArray(packetRows) && packetRows.length === input.calibration.text.length
    && packetRows.every((value, index) => {
      const row = value as { projectRelativePath?: unknown; sha256?: unknown; content?: unknown };
      const shown = input.calibration.text[index];
      return shown !== undefined && row.projectRelativePath === shown.path && row.sha256 === shown.sha256
        && row.content === shown.content;
    });
  if (!exactView) {
    clearCriticCallApproval(input.dir);
    return null;
  }
  return openCriticCallApprovalKind({ ...input, mode: "required" }, "synthetic-calibration", input.calibration);
}

/** Output-only, for assembling a snapshot. Never authority. */
export function currentCriticCallApproval(dir: string): CriticCallDisclosureV1 | null {
  return pending.get(canonicalProjectKey(dir))?.disclosure ?? null;
}

/**
 * Decide one pending call, once.
 *
 * The approval is consumed by any decision, approve or decline, so a card can
 * never be pressed twice. Before deciding, Main re-derives the card from the
 * authorization it still holds and compares canonical bytes with both the
 * pending card and the renderer's echo — a card that has changed since the
 * owner read it approves nothing.
 */
export function decideCriticCall(rawRequest: unknown): CriticCallDecisionOutcome {
  const request = parseCriticCallDecisionRequest(rawRequest);
  if (request === null) return Object.freeze({ ok: false, code: "CRITIC_CALL_DECISION_MALFORMED" } as const);
  const key = canonicalProjectKey(request.dir);
  const held = pending.get(key);
  if (held === undefined || held.approvalId !== request.approvalId) {
    return Object.freeze({ ok: false, code: "CRITIC_CALL_DECISION_UNKNOWN_APPROVAL" } as const);
  }
  // The mode the approval was OPENED under decides which presses exist, not
  // the mode the echoed card claims.
  if (!CRITIC_CALL_ACTIONS_BY_MODE[held.mode].includes(request.action)) {
    return Object.freeze({ ok: false, code: "CRITIC_CALL_DECISION_ACTION_NOT_OFFERED" } as const);
  }
  // The renderer must have been showing this exact card. There is nothing to
  // "re-derive": the card is composed from a frozen approved call and a frozen
  // request, so it cannot drift while it waits — a comparison against the
  // stored bytes would only ever compare a value with itself. What can differ
  // is what the renderer displayed, and that is what this checks.
  if (canonicalCriticCallDisclosure(request.disclosure) !== held.canonical) {
    return Object.freeze({ ok: false, code: "CRITIC_CALL_DECISION_ECHO_MISMATCH" } as const);
  }

  // Past here the decision succeeds, so this is the one place an approval is
  // spent. Nothing below can throw before the outcome is returned.
  pending.delete(key);
  const outcome = request.action === "approve"
    ? "approved"
    : request.action === "continue-without-critic" ? "continued-without-critic" : "task-stopped";
  const decision: CriticCallDecisionV1 = Object.freeze({
    version: CRITIC_CALL_DECISION_VERSION,
    approvalId: held.approvalId,
    outcome,
  });
  if (outcome !== "approved") return Object.freeze({ ok: true, decision, grant: null } as const);
  const grant: CriticCallGrantV1 = Object.freeze({
    approvalId: held.approvalId,
    routeRequestFingerprintSha256: held.authorization.routeRequestFingerprintSha256,
  });
  grantAuthorizations.set(grant, held.authorization);
  grantedAuthorizations.add(held.authorization);
  return Object.freeze({ ok: true, decision, grant } as const);
}

/**
 * Take the approved call out of a grant. Single use, so a grant cannot become
 * two sends. Q8's calibration orchestrator is the only current caller.
 */
export function takeCriticCallAuthorization(grant: unknown): CriticCallAuthorizationV1 | null {
  if (typeof grant !== "object" || grant === null) return null;
  const authorization = grantAuthorizations.get(grant);
  if (authorization === undefined) return null;
  grantAuthorizations.delete(grant);
  return authorization;
}

/** Drop a project's pending card without deciding it — used when the run it
 * belongs to ends or is replaced. */
export function clearCriticCallApproval(dir: string): void {
  pending.delete(canonicalProjectKey(dir));
}

/** Retire only the exact card an owning subsystem opened. A calibration card
 * and a task/provider card share the project slot, so one owner must never
 * erase a genuine replacement card opened by the other. */
export function clearCriticCallApprovalIfCurrent(dir: string, disclosure: CriticCallDisclosureV1): boolean {
  const key = canonicalProjectKey(dir);
  if (pending.get(key)?.disclosure !== disclosure) return false;
  pending.delete(key);
  return true;
}

/** The same, for callers that already hold the canonical project key and must
 * not fail because the directory no longer resolves. */
export function clearCriticCallApprovalByKey(key: string): void {
  pending.delete(key);
}

/** Retire only a task/provider card for an already-canonical project key.
 * Synthetic calibration owns its approval independently of task preview
 * generations, so route invalidation must never erase that card. */
export function clearProviderCriticCallApprovalByKey(key: string): void {
  if (pending.get(key)?.disclosure.callKind === "provider") pending.delete(key);
}

/** A read-only diagnostic. No collection is exposed. */
export function pendingCriticCallApprovalCount(): number {
  return pending.size;
}
