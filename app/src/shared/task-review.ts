import type { TaskSpecProposalPreviewV1 } from "./quality-preview.js";
import { types as nodeTypes } from "node:util";

export const TASK_REVIEW_PROJECTION_VERSION = "cairn-task-review/v1" as const;

export type TaskReviewEvidenceViewV1 = Readonly<{ label: string }>;

export type TaskReviewActionViewV1 =
  | Readonly<{ kind: "observe"; actionId: string }>
  | Readonly<{ kind: "resolve"; actionId: string }>
  | Readonly<{ kind: "review-cairn-failure"; actionId: string }>;

export type TaskReviewOwnerCheckV1 =
  | Readonly<{
      kind: "owner-observation";
      status: "not-ready" | "waiting-owner" | "met" | "not-met" | "cant-tell";
      supportingEvidence: readonly TaskReviewEvidenceViewV1[];
      counterEvidence: readonly TaskReviewEvidenceViewV1[];
      action: Extract<TaskReviewActionViewV1, { kind: "observe" }> | null;
    }>
  | Readonly<{
      kind: "critic-allegation";
      status: "alleged-not-met" | "confirmed" | "dismissed" | "cant-tell";
      allegation: string;
      smallestRepair: string | null;
      supportingEvidence: readonly TaskReviewEvidenceViewV1[];
      counterEvidence: readonly TaskReviewEvidenceViewV1[];
      action: Extract<TaskReviewActionViewV1, { kind: "resolve" }> | null;
    }>
  | Readonly<{
      kind: "cairn-failure";
      status: "not-ready" | "awaiting-confirmation" | "confirmed" | "dismissed" | "cant-tell";
      supportingEvidence: readonly TaskReviewEvidenceViewV1[];
      counterEvidence: readonly TaskReviewEvidenceViewV1[];
      action: Extract<TaskReviewActionViewV1, { kind: "review-cairn-failure" }> | null;
    }>;

export type TaskReviewCriterionStateV1 = Readonly<{
  id: `c${number}`;
  state: "pending" | "met" | "not-met" | "cant-tell" | "waiting-owner";
  source: null | "cairn-verifier" | "adapter-execution" | "critic-inspection" | "owner-observation" | "worker-claim";
  supportingEvidence: readonly TaskReviewEvidenceViewV1[];
  counterEvidence: readonly TaskReviewEvidenceViewV1[];
  ownerChecks: readonly TaskReviewOwnerCheckV1[];
}>;

/**
 * Main's output-only, pre-seal review. `plan` is the exact source-marked Q3
 * projection; the additional rows describe evidence and owner-check state but
 * carry no Task Spec, candidate, finding, evidence, render, policy, seal, or
 * verdict authority identifiers.
 */
export type TaskReviewProjectionV1 = Readonly<{
  version: typeof TASK_REVIEW_PROJECTION_VERSION;
  plan: TaskSpecProposalPreviewV1;
  criteria: readonly TaskReviewCriterionStateV1[];
  preSealEvidence: true;
}>;

/** The renderer chooses only an action kind and a closed decision. */
export type TaskReviewActionRequest =
  | Readonly<{
      dir: string;
      actionId: string;
      action: Readonly<{ kind: "observe"; decision: "met" | "not-met" | "cant-tell" }>;
    }>
  | Readonly<{
      dir: string;
      actionId: string;
      action: Readonly<{ kind: "resolve"; decision: "confirmed" | "dismissed" | "cant-tell" }>;
    }>
  | Readonly<{
      dir: string;
      actionId: string;
      action: Readonly<{ kind: "review-cairn-failure"; decision: "confirmed" | "dismissed" | "cant-tell" }>;
    }>;

type InspectedRecord = Readonly<Record<string, unknown>>;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CID = /^c([1-9]|1[0-2])$/u;
const PID = /^p([1-9]|1[0-2])$/u;
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000\u202a-\u202e\u2066-\u2069]/u;

function validUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function safeText(value: unknown, cap = 2_000, allowEmpty = false): string | null {
  return typeof value === "string" && value.length <= cap && validUtf16(value)
    && !FORBIDDEN_VISIBLE_CONTROLS.test(value) && (allowEmpty || value.trim().length > 0)
    ? value
    : null;
}

function inspectRecord(value: unknown, keys: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || value.length > cap) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol" || (key !== "length" && !/^(?:0|[1-9]\d*)$/u.test(key)))) return null;
    if (keys.length !== value.length + 1) return null;
    const output: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function stringArray(value: unknown, cap: number): readonly string[] | null {
  const items = inspectArray(value, cap);
  if (!items) return null;
  const output: string[] = [];
  for (const item of items) {
    const text = safeText(item, 500);
    if (text === null) return null;
    output.push(text);
  }
  return Object.freeze(output);
}

function parseRequestRow(value: unknown): TaskSpecProposalPreviewV1["request"]["outcome"] | null {
  const row = inspectRecord(value, ["source", "text", "ownerText"]);
  if (!row || !["owner-stated", "owner-unsure", "cairn-chosen"].includes(String(row.source))) return null;
  const text = safeText(row.text, 2_000);
  const ownerText = row.ownerText === null ? null : safeText(row.ownerText, 2_000);
  if (text === null || (row.ownerText !== null && ownerText === null)) return null;
  return Object.freeze({ source: row.source as "owner-stated" | "owner-unsure" | "cairn-chosen", text, ownerText });
}

function parsePlan(value: unknown): TaskSpecProposalPreviewV1 | null {
  const plan = inspectRecord(value, [
    "version", "request", "supportedPath", "critic", "criteria", "preferences", "references", "unknowns", "callBudget",
  ]);
  if (!plan || plan.version !== "cairn-task-spec-proposal-preview/v1") return null;

  const requestRecord = inspectRecord(plan.request, ["outcome", "requirements"]);
  const outcome = requestRecord ? parseRequestRow(requestRecord.outcome) : null;
  const requirementItems = requestRecord ? inspectArray(requestRecord.requirements, 8) : null;
  if (!requestRecord || !outcome || !requirementItems) return null;
  const requirements = requirementItems.map(parseRequestRow);
  if (requirements.some((item) => item === null)) return null;

  const supported = inspectRecord(plan.supportedPath, ["statement", "sources"]);
  const supportedStatement = supported ? safeText(supported.statement) : null;
  const supportedSources = supported ? stringArray(supported.sources, 12) : null;
  const critic = inspectRecord(plan.critic, ["mode", "reason", "sources"]);
  const criticReason = critic ? safeText(critic.reason) : null;
  const criticSources = critic ? stringArray(critic.sources, 12) : null;
  if (!supported || supportedStatement === null || !supportedSources || !critic
    || !["required", "optional", "off"].includes(String(critic.mode)) || criticReason === null || !criticSources) return null;

  const criterionItems = inspectArray(plan.criteria, 12);
  if (!criterionItems || criterionItems.length === 0) return null;
  const criteria: Array<TaskSpecProposalPreviewV1["criteria"][number]> = [];
  const criterionIds = new Set<string>();
  for (const [index, item] of criterionItems.entries()) {
    const row = inspectRecord(item, ["id", "promise", "kind", "judge", "sources", "failure", "evidence"]);
    const id = row && typeof row.id === "string" && CID.test(row.id) ? row.id as `c${number}` : null;
    const promise = row ? safeText(row.promise) : null;
    const sources = row ? stringArray(row.sources, 12) : null;
    const failure = row ? safeText(row.failure) : null;
    const evidence = row ? inspectRecord(row.evidence, ["mode", "proves", "precondition"]) : null;
    const proves = evidence ? safeText(evidence.proves) : null;
    const precondition = evidence?.precondition === null ? null : evidence ? safeText(evidence.precondition) : null;
    if (!row || !id || id !== `c${index + 1}` || criterionIds.has(id) || promise === null || !sources || failure === null
      || !["acceptance", "non-regression", "comparison"].includes(String(row.kind))
      || !["cairn", "critic", "owner"].includes(String(row.judge)) || !evidence
      || !["adapter-attestation", "artifact-inspection", "comparison", "owner-observation"].includes(String(evidence.mode))
      || proves === null || (evidence.precondition !== null && precondition === null)) return null;
    criterionIds.add(id);
    criteria.push(Object.freeze({
      id, promise, kind: row.kind as "acceptance" | "non-regression" | "comparison",
      judge: row.judge as "cairn" | "critic" | "owner", sources, failure,
      evidence: Object.freeze({
        mode: evidence.mode as "adapter-attestation" | "artifact-inspection" | "comparison" | "owner-observation",
        proves, precondition,
      }),
    }));
  }

  const preferenceItems = inspectArray(plan.preferences, 12);
  const preferences: Array<TaskSpecProposalPreviewV1["preferences"][number]> = [];
  const preferenceIds = new Set<string>();
  if (!preferenceItems) return null;
  for (const [index, item] of preferenceItems.entries()) {
    const row = inspectRecord(item, ["id", "dimension", "desiredDirection", "sources"]);
    const id = row && typeof row.id === "string" && PID.test(row.id) ? row.id as `p${number}` : null;
    const dimension = row ? safeText(row.dimension) : null;
    const desiredDirection = row ? safeText(row.desiredDirection) : null;
    const sources = row ? stringArray(row.sources, 12) : null;
    if (!row || !id || id !== `p${index + 1}` || preferenceIds.has(id) || dimension === null || desiredDirection === null || !sources) return null;
    preferenceIds.add(id);
    preferences.push(Object.freeze({ id, dimension, desiredDirection, sources }));
  }

  const referenceItems = inspectArray(plan.references, 4);
  const references: Array<TaskSpecProposalPreviewV1["references"][number]> = [];
  if (!referenceItems) return null;
  for (const item of referenceItems) {
    const row = inspectRecord(item, ["title", "source", "dimensions", "antiCopyBoundary"]);
    const title = row ? safeText(row.title) : null;
    const source = row ? safeText(row.source) : null;
    const dimensions = row ? stringArray(row.dimensions, 12) : null;
    const antiCopyBoundary = row ? safeText(row.antiCopyBoundary) : null;
    if (!row || title === null || source === null || !dimensions || antiCopyBoundary === null) return null;
    references.push(Object.freeze({ title, source, dimensions, antiCopyBoundary }));
  }

  const unknownItems = inspectArray(plan.unknowns, 8);
  const unknowns: Array<TaskSpecProposalPreviewV1["unknowns"][number]> = [];
  if (!unknownItems) return null;
  for (const item of unknownItems) {
    const row = inspectRecord(item, ["text", "sources"]);
    const text = row ? safeText(row.text) : null;
    const sources = row ? stringArray(row.sources, 12) : null;
    if (!row || text === null || !sources) return null;
    unknowns.push(Object.freeze({ text, sources }));
  }

  const budget = inspectRecord(plan.callBudget, [
    "initialBuilderCalls", "maxRepairCalls", "maxCriticAttempts", "maxExternalEvidenceCalls",
    "maxBuilderElapsedMs", "maxCriticElapsedMs", "maxBuilderCapturedOutputBytes",
    "maxCriticCapturedOutputBytes", "enforceableDollarLimitCents",
  ]);
  if (!budget || budget.initialBuilderCalls !== 1 || budget.maxRepairCalls !== 1 || budget.maxCriticAttempts !== 3
    || budget.maxExternalEvidenceCalls !== 0 || budget.maxBuilderElapsedMs !== 3_600_000
    || budget.maxCriticElapsedMs !== 600_000 || budget.maxBuilderCapturedOutputBytes !== 2_000_000
    || budget.maxCriticCapturedOutputBytes !== 262_144 || budget.enforceableDollarLimitCents !== null) return null;

  return Object.freeze({
    version: "cairn-task-spec-proposal-preview/v1",
    request: Object.freeze({ outcome, requirements: Object.freeze(requirements as NonNullable<typeof outcome>[]) }),
    supportedPath: Object.freeze({ statement: supportedStatement, sources: supportedSources }),
    critic: Object.freeze({ mode: critic.mode as "required" | "optional" | "off", reason: criticReason, sources: criticSources }),
    criteria: Object.freeze(criteria), preferences: Object.freeze(preferences), references: Object.freeze(references),
    unknowns: Object.freeze(unknowns),
    callBudget: Object.freeze({
      initialBuilderCalls: 1,
      maxRepairCalls: 1,
      maxCriticAttempts: 3,
      maxExternalEvidenceCalls: 0,
      maxBuilderElapsedMs: 3_600_000,
      maxCriticElapsedMs: 600_000,
      maxBuilderCapturedOutputBytes: 2_000_000,
      maxCriticCapturedOutputBytes: 262_144,
      enforceableDollarLimitCents: null,
    }),
  });
}

function parseEvidence(value: unknown): readonly TaskReviewEvidenceViewV1[] | null {
  const items = inspectArray(value, 16);
  if (!items) return null;
  const output: TaskReviewEvidenceViewV1[] = [];
  for (const item of items) {
    const row = inspectRecord(item, ["label"]);
    const label = row ? safeText(row.label, 1_000) : null;
    if (!row || label === null) return null;
    output.push(Object.freeze({ label }));
  }
  return Object.freeze(output);
}

function sameEvidence(left: readonly TaskReviewEvidenceViewV1[], right: readonly TaskReviewEvidenceViewV1[]): boolean {
  return left.length === right.length && left.every((row, index) => row.label === right[index]?.label);
}

function parseActionView(
  value: unknown,
  kind: TaskReviewActionViewV1["kind"],
): TaskReviewActionViewV1 | null {
  if (value === null) return null;
  const row = inspectRecord(value, ["kind", "actionId"]);
  return row && row.kind === kind && typeof row.actionId === "string" && UUID_V4.test(row.actionId)
    ? Object.freeze({ kind, actionId: row.actionId })
    : null;
}

function parseOwnerCheck(value: unknown): TaskReviewOwnerCheckV1 | null {
  const base = inspectRecord(value, ["kind", "status", "supportingEvidence", "counterEvidence", "action"])
    ?? inspectRecord(value, ["kind", "status", "allegation", "smallestRepair", "supportingEvidence", "counterEvidence", "action"]);
  if (!base) return null;
  const supportingEvidence = parseEvidence(base.supportingEvidence);
  const counterEvidence = parseEvidence(base.counterEvidence);
  if (!supportingEvidence || !counterEvidence) return null;
  if (base.kind === "owner-observation") {
    const status = String(base.status);
    const action = base.action === null ? null : parseActionView(base.action, "observe");
    if (!["not-ready", "waiting-owner", "met", "not-met", "cant-tell"].includes(status)
      || (base.action !== null && !action) || ((status === "waiting-owner") !== (action !== null))) return null;
    return Object.freeze({
      kind: "owner-observation", status: status as "not-ready" | "waiting-owner" | "met" | "not-met" | "cant-tell",
      supportingEvidence, counterEvidence, action: action as Extract<TaskReviewActionViewV1, { kind: "observe" }> | null,
    });
  }
  if (base.kind === "cairn-failure") {
    const status = String(base.status);
    const action = base.action === null ? null : parseActionView(base.action, "review-cairn-failure");
    if (!["not-ready", "awaiting-confirmation", "confirmed", "dismissed", "cant-tell"].includes(status)
      || (base.action !== null && !action) || ((status === "awaiting-confirmation") !== (action !== null))) return null;
    return Object.freeze({
      kind: "cairn-failure",
      status: status as "not-ready" | "awaiting-confirmation" | "confirmed" | "dismissed" | "cant-tell",
      supportingEvidence,
      counterEvidence,
      action: action as Extract<TaskReviewActionViewV1, { kind: "review-cairn-failure" }> | null,
    });
  }
  if (base.kind !== "critic-allegation") return null;
  const status = String(base.status);
  const allegation = safeText(base.allegation, 2_000);
  const smallestRepair = base.smallestRepair === null ? null : safeText(base.smallestRepair, 2_000);
  const action = base.action === null ? null : parseActionView(base.action, "resolve");
  if (!["alleged-not-met", "confirmed", "dismissed", "cant-tell"].includes(status) || allegation === null
    || (base.smallestRepair !== null && smallestRepair === null)
    || (base.action !== null && !action) || ((status === "alleged-not-met") !== (action !== null))) return null;
  return Object.freeze({
    kind: "critic-allegation", status: status as "alleged-not-met" | "confirmed" | "dismissed" | "cant-tell",
    allegation, smallestRepair, supportingEvidence, counterEvidence,
    action: action as Extract<TaskReviewActionViewV1, { kind: "resolve" }> | null,
  });
}

export function parseTaskReviewProjection(value: unknown): TaskReviewProjectionV1 | null {
  const record = inspectRecord(value, ["version", "plan", "criteria", "preSealEvidence"]);
  const plan = record ? parsePlan(record.plan) : null;
  const items = record ? inspectArray(record.criteria, 12) : null;
  if (!record || record.version !== TASK_REVIEW_PROJECTION_VERSION || record.preSealEvidence !== true || !plan || !items
    || items.length !== plan.criteria.length) return null;
  const criteria: TaskReviewCriterionStateV1[] = [];
  const actionIds = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const row = inspectRecord(items[index], ["id", "state", "source", "supportingEvidence", "counterEvidence", "ownerChecks"]);
    const expected = plan.criteria[index];
    const supportingEvidence = row ? parseEvidence(row.supportingEvidence) : null;
    const counterEvidence = row ? parseEvidence(row.counterEvidence) : null;
    const ownerItems = row ? inspectArray(row.ownerChecks, 16) : null;
    if (!row || row.id !== expected?.id || !["pending", "met", "not-met", "cant-tell", "waiting-owner"].includes(String(row.state))
      || (row.source !== null && !["cairn-verifier", "adapter-execution", "critic-inspection", "owner-observation", "worker-claim"].includes(String(row.source)))
      || !supportingEvidence || !counterEvidence || !ownerItems) return null;
    const ownerChecks: TaskReviewOwnerCheckV1[] = [];
    let ownerObservationCount = 0;
    let criticAllegationCount = 0;
    let cairnFailureCount = 0;
    for (const item of ownerItems) {
      const parsed = parseOwnerCheck(item);
      if (!parsed) return null;
      if (parsed.kind === "owner-observation") {
        ownerObservationCount += 1;
        if (expected.judge !== "owner" || ownerObservationCount > 1) return null;
      } else if (parsed.kind === "cairn-failure") {
        cairnFailureCount += 1;
        if (expected.judge !== "cairn" || cairnFailureCount > 1) return null;
      } else {
        criticAllegationCount += 1;
        if (expected.judge !== "critic" || criticAllegationCount > 1) return null;
      }
      if (!sameEvidence(parsed.supportingEvidence, supportingEvidence)
        || !sameEvidence(parsed.counterEvidence, counterEvidence)) return null;
      if (parsed.action) {
        if (actionIds.has(parsed.action.actionId)) return null;
        actionIds.add(parsed.action.actionId);
      }
      ownerChecks.push(parsed);
    }
    if (expected.judge === "owner" && ownerObservationCount !== 1) return null;
    if (expected.judge === "owner") {
      const check = ownerChecks[0] as Extract<TaskReviewOwnerCheckV1, { kind: "owner-observation" }>;
      const state = check.status === "not-ready" ? "pending" : check.status;
      const source = check.status === "not-ready" || check.status === "waiting-owner" ? null : "owner-observation";
      if (row.state !== state || row.source !== source) return null;
    } else if (expected.judge === "critic" && ownerChecks.length === 1) {
      const check = ownerChecks[0] as Extract<TaskReviewOwnerCheckV1, { kind: "critic-allegation" }>;
      const state = check.status === "alleged-not-met" ? "waiting-owner"
        : check.status === "confirmed" ? "not-met" : "cant-tell";
      const source = check.status === "alleged-not-met" ? null : "critic-inspection";
      if (row.state !== state || row.source !== source) return null;
    } else if (expected.judge === "critic") {
      if (!((row.state === "pending" && row.source === null)
        || ((row.state === "met" || row.state === "cant-tell") && row.source === "critic-inspection"))) return null;
    } else if (ownerChecks.length === 1) {
      const check = ownerChecks[0] as Extract<TaskReviewOwnerCheckV1, { kind: "cairn-failure" }>;
      const state = check.status === "not-ready" || check.status === "awaiting-confirmation" ? "waiting-owner"
        : check.status === "confirmed" ? "not-met" : "cant-tell";
      if (row.state !== state || (row.source !== "cairn-verifier" && row.source !== "adapter-execution")) return null;
    } else {
      if (ownerChecks.length !== 0 || !((row.state === "pending" && row.source === null)
        || ((row.state === "met" || row.state === "cant-tell")
          && (row.source === "cairn-verifier" || row.source === "adapter-execution" || row.source === "worker-claim")))) return null;
    }
    if ((row.state === "met" || row.state === "not-met") && supportingEvidence.length === 0) return null;
    criteria.push(Object.freeze({
      id: row.id as `c${number}`,
      state: row.state as TaskReviewCriterionStateV1["state"],
      source: row.source as TaskReviewCriterionStateV1["source"], supportingEvidence, counterEvidence,
      ownerChecks: Object.freeze(ownerChecks),
    }));
  }
  return Object.freeze({ version: TASK_REVIEW_PROJECTION_VERSION, plan, criteria: Object.freeze(criteria), preSealEvidence: true });
}

export function parseTaskReviewActionRequest(value: unknown): TaskReviewActionRequest | null {
  const record = inspectRecord(value, ["dir", "actionId", "action"]);
  const dir = record ? safeText(record.dir, 32_767) : null;
  const actionId = record && typeof record.actionId === "string" && UUID_V4.test(record.actionId) ? record.actionId : null;
  const action = record ? inspectRecord(record.action, ["kind", "decision"]) : null;
  if (!record || dir === null || actionId === null || !action) return null;
  if (action.kind === "observe" && ["met", "not-met", "cant-tell"].includes(String(action.decision))) {
    return Object.freeze({ dir, actionId, action: Object.freeze({ kind: "observe", decision: action.decision as "met" | "not-met" | "cant-tell" }) });
  }
  if (action.kind === "resolve" && ["confirmed", "dismissed", "cant-tell"].includes(String(action.decision))) {
    return Object.freeze({ dir, actionId, action: Object.freeze({ kind: "resolve", decision: action.decision as "confirmed" | "dismissed" | "cant-tell" }) });
  }
  if (action.kind === "review-cairn-failure" && ["confirmed", "dismissed", "cant-tell"].includes(String(action.decision))) {
    return Object.freeze({
      dir,
      actionId,
      action: Object.freeze({
        kind: "review-cairn-failure",
        decision: action.decision as "confirmed" | "dismissed" | "cant-tell",
      }),
    });
  }
  return null;
}
