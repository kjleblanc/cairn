import { randomUUID } from "node:crypto";
import { types as nodeTypes } from "node:util";

import {
  codexRepairDisclosureCoversPreview,
  codexRepairRouteReceiptSha256,
  q9SyntheticRepairDisclosureCoversPreview,
  q9SyntheticRepairDisclosureSha256,
  serialRepairPreviewAuthorityRows,
  serialRepairPreviewSha256,
  type CodexRepairDisclosureV1,
  type Q9SyntheticRepairDisclosureV1,
  type SerialRepairPreviewV1,
} from "@cairn/core";

import { canonicalProjectKey } from "./conductor/turnauth.js";
import { parseRepairCallDecisionRequest, parseRepairCallDisclosure } from "../shared/repair-call-parse.js";
import {
  REPAIR_CALL_ACTIONS,
  REPAIR_CALL_ATTEMPT,
  REPAIR_CALL_ATTEMPT_CAP,
  REPAIR_CALL_DECISION_VERSION,
  REPAIR_CALL_DISCLOSURE_VERSION,
  REPAIR_CALL_PURPOSE_TEXT,
  canonicalRepairCallDisclosure,
  type RepairCallDecisionV1,
  type RepairCallDisclosureV1,
} from "../shared/repair-call.js";

export const REPAIR_CALL_AUTHORIZATION_VERSION = "cairn-repair-call-authorization/v1" as const;

/** The wrapper is plain Main data, but both values inside it must retain their
 * private Core brands and exact identity binding. No caller supplies hashes,
 * limits, route facts, or blocker rows to this surface. */
export type RepairCallAuthorizationInputV1 = Readonly<{
  dir: string;
  preview: SerialRepairPreviewV1;
  route: CodexRepairDisclosureV1 | Q9SyntheticRepairDisclosureV1;
}>;

/** Opaque Main-only authority. Its visible field is not enough to forge its
 * WeakMap brand, and no binding is exported or sent through IPC. */
export type RepairCallAuthorizationV1 = Readonly<{
  version: typeof REPAIR_CALL_AUTHORIZATION_VERSION;
}>;

type AuthorizationBinding = Readonly<{
  projectKey: string;
  preview: SerialRepairPreviewV1;
  route: CodexRepairDisclosureV1 | Q9SyntheticRepairDisclosureV1;
  routeKind: "codex" | "synthetic-q9";
  fields: Omit<RepairCallDisclosureV1, "approvalId">;
}>;

type PendingApproval = Readonly<{
  projectKey: string;
  approvalId: string;
  authorization: RepairCallAuthorizationV1;
  canonical: string;
  disclosure: RepairCallDisclosureV1;
}>;

export type RepairCallGrantV1 = Readonly<{
  approvalId: string;
  candidateSha256: string;
  repairPreviewSha256: string;
  routeReceiptSha256: string;
}>;

export const REPAIR_CALL_DECISION_REFUSALS = Object.freeze([
  "REPAIR_CALL_DECISION_MALFORMED",
  "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL",
  "REPAIR_CALL_DECISION_ECHO_MISMATCH",
] as const);

export type RepairCallDecisionRefusal = typeof REPAIR_CALL_DECISION_REFUSALS[number];
export type RepairCallDecisionOutcome =
  | Readonly<{ ok: true; decision: RepairCallDecisionV1; grant: RepairCallGrantV1 | null }>
  | Readonly<{ ok: false; code: RepairCallDecisionRefusal }>;

export const REPAIR_CALL_DECISION_PREFLIGHT_VERSION = "cairn-repair-call-decision-preflight/v1" as const;

/** Opaque Main-only proof of one valid press while its exact card remains
 * current. Q9 journals the decision before committing this proof. */
export type RepairCallDecisionPreflightV1 = Readonly<{
  version: typeof REPAIR_CALL_DECISION_PREFLIGHT_VERSION;
}>;

export type RepairCallDecisionPreflightOutcome =
  | Readonly<{
      ok: true;
      decision: RepairCallDecisionV1;
      preflight: RepairCallDecisionPreflightV1;
    }>
  | Readonly<{ ok: false; code: RepairCallDecisionRefusal }>;

type RepairCallDecisionPreflightBinding = Readonly<{
  held: PendingApproval;
  decision: RepairCallDecisionV1;
}>;

const authorizationBindings = new WeakMap<object, AuthorizationBinding>();
const authorizedPreviewHashes = new Set<string>();
const authorizedRouteReceipts = new Set<string>();
const openedAuthorizations = new WeakSet<object>();
const grantAuthorizations = new WeakMap<object, RepairCallAuthorizationV1>();
const decisionPreflights = new WeakMap<object, RepairCallDecisionPreflightBinding>();
const pendingByProject = new Map<string, PendingApproval>();
const pendingByApproval = new Map<string, PendingApproval>();
const issuedApprovalIds = new Set<string>();
const PENDING_APPROVAL_LIMIT = 64;
const FORBIDDEN_PATH_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

function inspectRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function projectKey(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_000 || FORBIDDEN_PATH_CONTROLS.test(value)) return null;
  try { return canonicalProjectKey(value); } catch { return null; }
}

/** Select one branded route family without trusting its public `version` or
 * any caller-supplied label. The two Core WeakSet brands are intentionally
 * disjoint: a route accepted by both (or neither) fails closed. */
function repairRouteBinding(
  route: object,
  preview: object,
): Readonly<{
  kind: "codex" | "synthetic-q9";
  route: CodexRepairDisclosureV1 | Q9SyntheticRepairDisclosureV1;
  receiptSha256: string;
}> | null {
  const codexReceipt = codexRepairRouteReceiptSha256(route);
  const syntheticReceipt = q9SyntheticRepairDisclosureSha256(route);
  const codex = codexReceipt !== null && codexRepairDisclosureCoversPreview(route, preview);
  const synthetic = syntheticReceipt !== null && q9SyntheticRepairDisclosureCoversPreview(route, preview);
  if (codex === synthetic) return null;
  return codex
    ? Object.freeze({ kind: "codex" as const, route: route as CodexRepairDisclosureV1, receiptSha256: codexReceipt! })
    : Object.freeze({ kind: "synthetic-q9" as const, route: route as Q9SyntheticRepairDisclosureV1, receiptSha256: syntheticReceipt! });
}

/**
 * Mint the only input `openRepairCallApproval` accepts.
 *
 * Runtime parsing is deliberately as strict as IPC even though the first
 * consumer is Main. All disclosure facts are then derived from two branded,
 * identity-bound Core objects. A plain clone or caller-selected hash refuses.
 */
export function mintRepairCallAuthorization(value: unknown): RepairCallAuthorizationV1 | null {
  const record = inspectRecord(value, ["dir", "preview", "route"]);
  if (record === null) return null;
  const key = projectKey(record.dir);
  if (key === null || typeof record.preview !== "object" || record.preview === null
    || typeof record.route !== "object" || record.route === null) return null;
  const previewSha256 = serialRepairPreviewSha256(record.preview);
  const authorityRows = serialRepairPreviewAuthorityRows(record.preview);
  const selectedRoute = repairRouteBinding(record.route, record.preview);
  if (previewSha256 === null || authorityRows === null || selectedRoute === null) return null;
  const routeReceiptSha256 = selectedRoute.receiptSha256;
  const preview = record.preview as SerialRepairPreviewV1;
  const route = selectedRoute.route;
  if (authorizedPreviewHashes.has(previewSha256) || authorizedRouteReceipts.has(routeReceiptSha256)
    || projectKey(route.project) !== key || route.runId !== preview.runId || route.generation !== preview.generation
    || route.taskNumber !== preview.taskNumber || route.taskSpecSha256 !== preview.taskSpecSha256
    || route.evidencePlanSha256 !== preview.evidencePlanSha256 || route.candidateSha256 !== preview.candidateSha256
    || route.repairAuthoritySha256 !== preview.repairAuthoritySha256
    || route.repairPreviewSha256 !== previewSha256
    || route.repairInstructionSha256 !== preview.instruction.repairInstructionSha256) return null;
  const normalized = parseRepairCallDisclosure(Object.freeze({
    version: REPAIR_CALL_DISCLOSURE_VERSION,
    approvalId: "00000000-0000-4000-8000-000000000000",
    provider: route.provider,
    model: route.model,
    purpose: REPAIR_CALL_PURPOSE_TEXT,
    dataScope: route.data,
    quota: route.quota,
    taskNumber: preview.taskNumber,
    round: preview.round,
    attempt: REPAIR_CALL_ATTEMPT,
    attemptCap: REPAIR_CALL_ATTEMPT_CAP,
    taskSpecSha256: preview.taskSpecSha256,
    evidencePlanSha256: preview.evidencePlanSha256,
    candidateSha256: preview.candidateSha256,
    repairInstructionSha256: preview.instruction.repairInstructionSha256,
    repairPreviewSha256: previewSha256,
    blockerAuthoritySha256: preview.repairAuthoritySha256,
    routeReceiptSha256,
    routeRequestFingerprintSha256: route.routeRequestFingerprintSha256,
    blockers: authorityRows,
    timeoutMs: route.timeoutMs,
    maxCapturedOutputBytes: route.maxCapturedOutputBytes,
    billingBasis: route.billingBasis,
    actions: REPAIR_CALL_ACTIONS,
  }));
  if (normalized === null) return null;
  const { approvalId: _approvalId, ...fields } = normalized;
  void _approvalId;
  const authorization: RepairCallAuthorizationV1 = Object.freeze({ version: REPAIR_CALL_AUTHORIZATION_VERSION });
  authorizationBindings.set(authorization, Object.freeze({
    projectKey: key,
    preview,
    route,
    routeKind: selectedRoute.kind,
    fields: Object.freeze(fields),
  }));
  authorizedPreviewHashes.add(previewSha256);
  authorizedRouteReceipts.add(routeReceiptSha256);
  return authorization;
}

/** Open one exact card. A concurrent or malformed open changes no existing
 * approval; replacement requires its owner to clear the exact old card first. */
export function openRepairCallApproval(value: unknown): RepairCallDisclosureV1 | null {
  const input = inspectRecord(value, ["dir", "authorization"]);
  if (input === null || typeof input.authorization !== "object" || input.authorization === null) return null;
  const key = projectKey(input.dir);
  const binding = authorizationBindings.get(input.authorization);
  if (key === null || binding === undefined || binding.projectKey !== key || openedAuthorizations.has(input.authorization)
    || pendingByProject.has(key) || pendingByProject.size >= PENDING_APPROVAL_LIMIT) return null;

  let approvalId: string | null = null;
  for (let attempt = 0; attempt < 4 && approvalId === null; attempt += 1) {
    const candidate = randomUUID();
    if (!issuedApprovalIds.has(candidate)) approvalId = candidate;
  }
  if (approvalId === null) return null;
  const disclosure = parseRepairCallDisclosure(Object.freeze({ ...binding.fields, approvalId }));
  if (disclosure === null) return null;
  const held: PendingApproval = Object.freeze({
    projectKey: key,
    approvalId,
    authorization: input.authorization as RepairCallAuthorizationV1,
    canonical: canonicalRepairCallDisclosure(disclosure),
    disclosure,
  });
  pendingByProject.set(key, held);
  pendingByApproval.set(approvalId, held);
  issuedApprovalIds.add(approvalId);
  openedAuthorizations.add(input.authorization);
  return disclosure;
}

/** Output only. */
export function currentRepairCallApproval(dir: string): RepairCallDisclosureV1 | null {
  const key = projectKey(dir);
  return key === null ? null : pendingByProject.get(key)?.disclosure ?? null;
}

/** Identity proof for the subsystem that opened a card. Canonical bytes prove
 * an echoed clone is equal; this hook proves the caller still owns the exact
 * live Main object before it decides or clears anything. */
export function isCurrentRepairCallApproval(dir: string, disclosure: RepairCallDisclosureV1): boolean {
  const key = projectKey(dir);
  return key !== null && pendingByProject.get(key)?.disclosure === disclosure;
}

/** Read-only proof that an opaque Main authorization covers every byte of an
 * output preview. The future orchestrator can check this before opening and,
 * after taking a grant, compare the returned authorization by identity too. */
export function repairCallAuthorizationCoversPreview(
  authorization: unknown,
  preview: unknown,
  route: unknown,
): authorization is RepairCallAuthorizationV1 {
  if (authorization === null || typeof authorization !== "object") return false;
  const binding = authorizationBindings.get(authorization);
  if (binding === undefined || binding.preview !== preview || binding.route !== route
    || serialRepairPreviewSha256(preview) === null || typeof preview !== "object" || preview === null
    || typeof route !== "object" || route === null) return false;
  const selectedRoute = repairRouteBinding(route, preview);
  return selectedRoute !== null && selectedRoute.kind === binding.routeKind
    && selectedRoute.route === binding.route;
}

/** Canonical equality companion to the identity hook above. */
export function repairCallAuthorizationCoversDisclosure(
  authorization: unknown,
  disclosure: unknown,
): authorization is RepairCallAuthorizationV1 {
  if (authorization === null || typeof authorization !== "object") return false;
  const binding = authorizationBindings.get(authorization);
  const parsed = parseRepairCallDisclosure(disclosure);
  if (binding === undefined || parsed === null) return false;
  const expected = parseRepairCallDisclosure(Object.freeze({ ...binding.fields, approvalId: parsed.approvalId }));
  return expected !== null
    && canonicalRepairCallDisclosure(expected) === canonicalRepairCallDisclosure(parsed);
}

/** Every refusal preserves whichever genuine approval is current. Only a
 * successful approve/stop press consumes its exact held card. */
export function preflightRepairCallDecision(value: unknown): RepairCallDecisionPreflightOutcome {
  const request = parseRepairCallDecisionRequest(value);
  if (request === null) return Object.freeze({ ok: false, code: "REPAIR_CALL_DECISION_MALFORMED" } as const);
  const held = pendingByApproval.get(request.approvalId);
  const requestProjectKey = projectKey(request.dir);
  if (held === undefined || requestProjectKey === null || requestProjectKey !== held.projectKey
    || pendingByProject.get(held.projectKey) !== held) {
    return Object.freeze({ ok: false, code: "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL" } as const);
  }
  if (canonicalRepairCallDisclosure(request.disclosure) !== held.canonical) {
    return Object.freeze({ ok: false, code: "REPAIR_CALL_DECISION_ECHO_MISMATCH" } as const);
  }

  const decision: RepairCallDecisionV1 = Object.freeze({
    version: REPAIR_CALL_DECISION_VERSION,
    approvalId: held.approvalId,
    outcome: request.action === "approve" ? "approved" : "task-stopped",
  });
  const preflight: RepairCallDecisionPreflightV1 = Object.freeze({
    version: REPAIR_CALL_DECISION_PREFLIGHT_VERSION,
  });
  decisionPreflights.set(preflight, Object.freeze({ held, decision }));
  return Object.freeze({ ok: true, decision, preflight } as const);
}

/** Consume only the exact card captured by a successful preflight. */
export function commitRepairCallDecision(preflight: unknown): RepairCallDecisionOutcome {
  if (preflight === null || typeof preflight !== "object") {
    return Object.freeze({ ok: false, code: "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL" } as const);
  }
  const binding = decisionPreflights.get(preflight);
  if (binding === undefined) {
    return Object.freeze({ ok: false, code: "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL" } as const);
  }
  decisionPreflights.delete(preflight);
  const { held, decision } = binding;
  if (pendingByApproval.get(held.approvalId) !== held || pendingByProject.get(held.projectKey) !== held) {
    return Object.freeze({ ok: false, code: "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL" } as const);
  }
  pendingByApproval.delete(held.approvalId);
  pendingByProject.delete(held.projectKey);
  if (decision.outcome === "task-stopped") return Object.freeze({ ok: true, decision, grant: null } as const);
  const grant: RepairCallGrantV1 = Object.freeze({
    approvalId: held.approvalId,
    candidateSha256: held.disclosure.candidateSha256,
    repairPreviewSha256: held.disclosure.repairPreviewSha256,
    routeReceiptSha256: held.disclosure.routeReceiptSha256,
  });
  grantAuthorizations.set(grant, held.authorization);
  return Object.freeze({ ok: true, decision, grant } as const);
}

/** Compatibility path for callers that do not own durable Q9 workflow
 * custody. Q9 calls preflight, journals, then commits explicitly. */
export function decideRepairCall(value: unknown): RepairCallDecisionOutcome {
  const preflight = preflightRepairCallDecision(value);
  return preflight.ok ? commitRepairCallDecision(preflight.preflight) : preflight;
}

/** Recover the opaque authorization exactly once. This opens no process or
 * network channel; the future orchestrator must reserve durable spend first. */
export function takeRepairCallAuthorization(value: unknown): RepairCallAuthorizationV1 | null {
  if (value === null || typeof value !== "object") return null;
  const authorization = grantAuthorizations.get(value);
  if (authorization === undefined) return null;
  grantAuthorizations.delete(value);
  return authorization;
}

/** Retire only the card object this subsystem actually opened. A clone, stale
 * card, or concurrent replacement can never clear the genuine current card. */
export function clearRepairCallApprovalIfCurrent(dir: string, disclosure: RepairCallDisclosureV1): boolean {
  const key = projectKey(dir);
  if (key === null || !isCurrentRepairCallApproval(dir, disclosure)) return false;
  const held = pendingByProject.get(key);
  if (held === undefined) return false;
  pendingByProject.delete(key);
  pendingByApproval.delete(held.approvalId);
  return true;
}

export function pendingRepairCallApprovalCount(): number {
  return pendingByProject.size;
}
