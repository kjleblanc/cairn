import { createHash } from "node:crypto";
import { types as nodeTypes } from "node:util";
import {
  canonicalTaskIntent,
  taskRequestView,
  validateTaskIntent,
  type TaskIntent,
  type TaskRequestView,
} from "./intent.js";

export const QUALITY_PLAN_VERSION = "cairn-quality-plan/v1" as const;
export const TASK_SPEC_VERSION = "cairn-task-spec/v1" as const;
export const EVIDENCE_PLAN_CANDIDATE_VERSION = "cairn-evidence-plan-candidate/v1" as const;
export const EVIDENCE_PLAN_VERSION = "cairn-evidence-plan/v1" as const;
export const EVIDENCE_PLAN_REVISION_PREVIEW_VERSION = "cairn-evidence-plan-revision-preview/v1" as const;
export const EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION = "cairn-evidence-plan-revision-authorization/v1" as const;
export const EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION = "cairn-evidence-plan-revision-authority-context/v1" as const;

/** Fixed v1 limits. Callers cannot widen these values. Limits for concepts
 * used only by later Q-tasks are recorded here now so every parser/UI consumes
 * one vocabulary when those tasks land. */
export const QUALITY_LIMITS = Object.freeze({
  acceptanceChecks: 12,
  qualityPreferences: 12,
  candidateStates: 4,
  references: 4,
  unknowns: 8,
  selectedArtifacts: 8,
  selectedArtifactCharacters: 8_000,
  selectedContentCharacters: 32_000,
  criterionFindings: 24,
  unscopedAlerts: 8,
  evidenceRefsPerFinding: 8,
  ordinaryTextCharacters: 1_000,
  basesPerRow: 12,
  dimensionsPerReference: 12,
  coverageIdsPerRow: 12,
  contractSections: 16,
  evidenceProcedures: 12,
  commandArguments: 32,
  fixtureBindings: 8,
  expectedExitCodes: 8,
  revisionEvidenceRefs: 8,
  machineIdentifierCharacters: 128,
} as const);

export type IntentBasisV1 =
  | Readonly<{ kind: "intent-outcome" }>
  | Readonly<{ kind: "intent-requirement"; index: number }>;

/** The hash pins the exact authenticated local-contract section. A free-form
 * section label alone is not authority. */
export type ContractCriterionBasisV1 = Readonly<{
  kind: "contract";
  section: string;
  sha256: string;
}>;

export type CriterionBasisV1 = IntentBasisV1 | ContractCriterionBasisV1;

export type CriticModeBasisV1 = CriterionBasisV1 | Readonly<{
  kind: "cairn-default";
  reason: "not-requested" | "no-useful-inspection" | "route-incompatible";
}>;

export type ContractSectionAuthorityV1 = Readonly<{
  section: string;
  sha256: string;
}>;

export type CriticModeV1 =
  | Readonly<{
      mode: "required";
      basis: readonly CriterionBasisV1[];
      reason: string;
    }>
  | Readonly<{
      mode: "optional" | "off";
      basis: readonly CriticModeBasisV1[];
      reason: string;
    }>;

export type ComparableStateV1 = Readonly<{
  id: string;
  route: string;
  viewport: Readonly<{ width: number; height: number }> | null;
  inputFixtureId: string;
  dataFixtureId: string;
  versionOrTime: string;
  locale: string;
  accessibilityMode: string;
}>;

export type ComparisonCriterionV1 = Readonly<{
  id: string;
  referenceId: string;
  dimensionId: string;
  candidateStateId: string;
  comparator: "match" | "beat";
  threshold: string;
  tieOutcome: "meets" | "does-not-meet";
}>;

export type AcceptanceCheckV1 = Readonly<{
  id: `c${number}`;
  promise: string;
  kind: "acceptance" | "non-regression" | "comparison";
  judge: "cairn" | "critic" | "owner";
  basis: readonly CriterionBasisV1[];
  failureCondition: Readonly<{
    id: string;
    statement: string;
    allowedArtifactIds: readonly string[];
  }>;
  evidenceStandard: Readonly<{
    mode: "adapter-attestation" | "artifact-inspection" | "comparison" | "owner-observation";
    proves: string;
    precondition: string | null;
  }>;
  comparison: ComparisonCriterionV1 | null;
}>;

export type QualityPreferenceV1 = Readonly<{
  id: `p${number}`;
  dimension: string;
  desiredDirection: string;
  basis: readonly CriterionBasisV1[];
  comparison: ComparisonCriterionV1 | null;
}>;

export type QualityReferenceV1 = Readonly<{
  id: string;
  title: string;
  basis: IntentBasisV1;
  locator: string;
  snapshotSha256: string;
  capturedAt: string;
  state: ComparableStateV1;
  stateSha256: string;
  dimensions: readonly Readonly<{ id: string; description: string }>[];
  antiCopyBoundary: string;
}>;

export type QualityPlanCandidateV1 = Readonly<{
  version: typeof QUALITY_PLAN_VERSION;
  target: Readonly<{
    kind: "local-task" | "disabled-experiment";
    basis: readonly IntentBasisV1[];
  }>;
  supportedPath: Readonly<{
    statement: string;
    basis: readonly IntentBasisV1[];
  }>;
  critic: CriticModeV1;
  candidateStates: readonly ComparableStateV1[];
  acceptanceChecks: readonly AcceptanceCheckV1[];
  qualityPreferences: readonly QualityPreferenceV1[];
  references: readonly QualityReferenceV1[];
  unknowns: readonly Readonly<{ text: string; basis: readonly IntentBasisV1[] }>[];
  coverage: Readonly<{
    outcomeCriterionIds: readonly `c${number}`[];
    requirementCriteria: readonly Readonly<{
      requirementIndex: number;
      criterionIds: readonly `c${number}`[];
    }>[];
    supportedPathCriterionId: `c${number}`;
  }>;
}>;

export type QualityPlanV1 = QualityPlanCandidateV1;

export type TaskCallBudgetV1 = Readonly<{
  initialBuilderCalls: 1;
  maxRepairCalls: 1;
  maxCriticAttempts: 3;
  maxExternalEvidenceCalls: 0;
  maxBuilderElapsedMs: 3_600_000;
  maxCriticElapsedMs: 600_000;
  maxBuilderCapturedOutputBytes: 2_000_000;
  maxCriticCapturedOutputBytes: 262_144;
  enforceableDollarLimitCents: null;
}>;

export const TASK_CALL_BUDGET_V1: TaskCallBudgetV1 = Object.freeze({
  initialBuilderCalls: 1,
  maxRepairCalls: 1,
  maxCriticAttempts: 3,
  maxExternalEvidenceCalls: 0,
  maxBuilderElapsedMs: 3_600_000,
  maxCriticElapsedMs: 600_000,
  maxBuilderCapturedOutputBytes: 2_000_000,
  maxCriticCapturedOutputBytes: 262_144,
  enforceableDollarLimitCents: null,
});

export type TaskSpecV1 = Readonly<{
  version: typeof TASK_SPEC_VERSION;
  intent: TaskIntent;
  quality: QualityPlanV1;
  callBudget: TaskCallBudgetV1;
}>;

export type TaskSpecReviewV1 = Readonly<{
  version: "cairn-task-spec-review/v1";
  taskSpecSha256: string;
  intent: TaskRequestView;
  target: Readonly<{ kind: "local-task" | "disabled-experiment"; basis: readonly string[] }>;
  supportedPath: Readonly<{ statement: string; basis: readonly string[] }>;
  critic: Readonly<{ mode: "required" | "optional" | "off"; reason: string; basis: readonly string[] }>;
  candidateStates: readonly ComparableStateV1[];
  criteria: readonly Readonly<{
    id: `c${number}`;
    promise: string;
    kind: "acceptance" | "non-regression" | "comparison";
    judge: "cairn" | "critic" | "owner";
    basis: readonly string[];
    failureCondition: Readonly<{ id: string; statement: string; allowedArtifactIds: readonly string[] }>;
    evidenceStandard: AcceptanceCheckV1["evidenceStandard"];
    comparison: ComparisonCriterionV1 | null;
  }>[];
  preferences: readonly Readonly<{
    id: `p${number}`;
    dimension: string;
    desiredDirection: string;
    basis: readonly string[];
    comparison: ComparisonCriterionV1 | null;
  }>[];
  references: readonly Readonly<{
    id: string;
    title: string;
    source: string;
    snapshotSha256: string;
    capturedAt: string;
    state: ComparableStateV1;
    stateSha256: string;
    dimensions: readonly Readonly<{ id: string; description: string }>[];
    antiCopyBoundary: string;
  }>[];
  unknowns: readonly Readonly<{ text: string; basis: readonly string[] }>[];
  callBudget: TaskCallBudgetV1;
}>;

export type EvidenceCommandArgumentV1 =
  | Readonly<{ kind: "literal"; value: string }>
  | Readonly<{ kind: "fixture"; fixtureId: string }>;

export type EvidenceFixtureBindingV1 = Readonly<{ id: string; path: string; sha256: string }>;

export type EvidenceCommandCandidateV1 = Readonly<{
  executablePath: string;
  executableSha256: string;
  arguments: readonly EvidenceCommandArgumentV1[];
  fixtureBindings: readonly EvidenceFixtureBindingV1[];
  cwdRelative: string;
  expectedExitCodes: readonly number[];
  timeoutMs: number;
  resultParserMode:
    | "exit-code"
    | "node-test-tap"
    | "node-test-tap-crlf"
    | "json-assertion"
    | "json-assertion-lines";
  assertion: Readonly<{ id: string; expectedResult: string }>;
}>;

export type EvidenceCommandV1 = Readonly<EvidenceCommandCandidateV1 & {
  text: string;
  sha256: string;
}>;

export type EvidenceProcedureKindV1 =
  | "adapter-command-attestation"
  | "packet-artifact"
  | "owner-observation"
  | "comparison-capture";

export type EvidenceProcedureV1 = Readonly<{
  criterionId: `c${number}`;
  kind: EvidenceProcedureKindV1;
  command: EvidenceCommandV1 | null;
  artifactIds: readonly string[];
}>;

export type EvidencePlanV1 = Readonly<{
  version: typeof EVIDENCE_PLAN_VERSION;
  taskSpecSha256: string;
  revision: 0 | 1;
  previousPlanSha256: string | null;
  revisionReasonEvidenceRefs: readonly string[];
  procedures: readonly EvidenceProcedureV1[];
}>;

export type EvidencePlanRevisionChangeKindV1 =
  | "executable-path"
  | "fixture-path"
  | "timeout-increase"
  | "result-parser-mode";

export type EvidencePlanRevisionPreviewV1 = Readonly<{
  version: typeof EVIDENCE_PLAN_REVISION_PREVIEW_VERSION;
  taskSpecSha256: string;
  criterionId: `c${number}`;
  changeKind: EvidencePlanRevisionChangeKindV1;
  fromPlanSha256: string;
  toPlanSha256: string;
  unchangedAuthoritySha256: string;
  plan: EvidencePlanV1;
}>;

export type EvidencePlanRevisionAuthorizationV1 = Readonly<{
  version: typeof EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION;
  runId: string;
  taskSpecSha256: string;
  criterionId: `c${number}`;
  fromPlanSha256: string;
  toPlanSha256: string;
  unchangedAuthoritySha256: string;
  changeKind: EvidencePlanRevisionChangeKindV1;
  mainHarnessFailureCode:
    | "TOOL_NOT_FOUND"
    | "FIXTURE_NOT_FOUND"
    | "TIMED_OUT_BEFORE_ASSERTION"
    | "HARNESS_PARSE_ERROR";
  mainEvidenceRefs: readonly string[];
  ownerActionNonce: string;
  approvedAt: string;
}>;

/** Main-authenticated current-run and owner-action facts. This is a separate
 * input from the retained authorization record so a record from another run
 * or owner action cannot authorize an otherwise identical revision. Only main
 * may derive this context from its authenticated run and owner-event custody;
 * Q1 deliberately has no runtime caller. */
export type EvidencePlanRevisionAuthorityContextV1 = Readonly<{
  version: typeof EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION;
  runId: string;
  taskSpecSha256: string;
  criterionId: `c${number}`;
  fromPlanSha256: string;
  toPlanSha256: string;
  unchangedAuthoritySha256: string;
  changeKind: EvidencePlanRevisionChangeKindV1;
  mainHarnessFailureCode: EvidencePlanRevisionAuthorizationV1["mainHarnessFailureCode"];
  mainEvidenceRefs: readonly string[];
  ownerActionNonce: string;
  approvedAt: string;
}>;

export type AuthorizedEvidencePlanRevisionV1 = Readonly<{
  plan: EvidencePlanV1;
  authorization: EvidencePlanRevisionAuthorizationV1;
}>;

type InspectedRecord = Readonly<Record<string, unknown>>;

const candidateBrand = new WeakSet<object>();
const taskSpecBrand = new WeakSet<object>();
const evidencePlanBrand = new WeakSet<object>();
const evidencePreviewBrand = new WeakSet<object>();

const SHA256 = /^[0-9a-f]{64}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MACHINE_ID = /^[a-z][a-z0-9._:-]{0,127}$/;
const CONTRACT_SECTION = /^[a-z][a-z0-9-]{0,127}$/;
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000\u202a-\u202e\u2066-\u2069]/u;
const VAGUE_PROMISE = /^\s*(?:make\s+(?:it\s+)?)?(?:perfect|premium|best|wow)[.!?]?\s*$/iu;

function isProxy(value: object): boolean {
  try {
    return nodeTypes.isProxy(value);
  } catch {
    return true;
  }
}

/** Exact record inspection without evaluating caller-owned accessors. */
function inspectRecord(value: unknown, expected: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expected.length || keys.some((key) => typeof key !== "string" || !expected.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const inspected: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of expected) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      inspected[key] = descriptor.value;
    }
    return inspected;
  } catch {
    return null;
  }
}

/** Dense ordinary array inspection without iteration or indexed property reads. */
function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (value === null || typeof value !== "object" || !Array.isArray(value) || isProxy(value)) return null;
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || lengthDescriptor.enumerable || lengthDescriptor.get || lengthDescriptor.set || !("value" in lengthDescriptor)) return null;
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > cap) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || keys.some((key) => typeof key !== "string")) return null;
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output.push(descriptor.value);
    }
    if (keys.some((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key as string))) return null;
    return output;
  } catch {
    return null;
  }
}

function hasWellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function safeText(
  value: unknown,
  meaningful = true,
  cap: number = QUALITY_LIMITS.ordinaryTextCharacters,
): value is string {
  return typeof value === "string"
    && value.length <= cap
    && (!meaningful || value.trim().length > 0)
    && !FORBIDDEN_VISIBLE_CONTROLS.test(value)
    && hasWellFormedUtf16(value);
}

function safeMachineId(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= QUALITY_LIMITS.machineIdentifierCharacters
    && MACHINE_ID.test(value);
}

function safeContractSection(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= QUALITY_LIMITS.machineIdentifierCharacters
    && CONTRACT_SECTION.test(value);
}

function safeSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function safeUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

function safeInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && !Object.is(value, -0)
    && value >= min
    && value <= max;
}

function safeIsoTime(value: unknown): value is string {
  if (!safeText(value, true, 64)) return false;
  try {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
  } catch {
    return false;
  }
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function arrayCanonical(values: readonly string[]): string {
  return `[${values.join(",")}]`;
}

function objectCanonical(entries: readonly (readonly [string, string])[]): string {
  return `{${entries.map(([key, value]) => `${quote(key)}:${value}`).join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalIntentBasis(value: IntentBasisV1): string {
  return value.kind === "intent-outcome"
    ? objectCanonical([["kind", quote(value.kind)]])
    : objectCanonical([["kind", quote(value.kind)], ["index", String(value.index)]]);
}

function canonicalCriterionBasis(value: CriterionBasisV1): string {
  return value.kind === "contract"
    ? objectCanonical([["kind", quote(value.kind)], ["section", quote(value.section)], ["sha256", quote(value.sha256)]])
    : canonicalIntentBasis(value);
}

function canonicalCriticModeBasis(value: CriticModeBasisV1): string {
  return value.kind === "cairn-default"
    ? objectCanonical([["kind", quote(value.kind)], ["reason", quote(value.reason)]])
    : canonicalCriterionBasis(value);
}

function parseIntentBasis(value: unknown): IntentBasisV1 | null {
  const outcome = inspectRecord(value, ["kind"]);
  if (outcome?.kind === "intent-outcome") return Object.freeze({ kind: "intent-outcome" });
  const requirement = inspectRecord(value, ["kind", "index"]);
  if (requirement?.kind !== "intent-requirement" || !safeInteger(requirement.index, 0, 7)) return null;
  return Object.freeze({ kind: "intent-requirement", index: requirement.index });
}

function parseCriterionBasis(value: unknown): CriterionBasisV1 | null {
  const intent = parseIntentBasis(value);
  if (intent) return intent;
  const contract = inspectRecord(value, ["kind", "section", "sha256"]);
  if (contract?.kind !== "contract" || !safeContractSection(contract.section) || !safeSha256(contract.sha256)) return null;
  return Object.freeze({ kind: "contract", section: contract.section, sha256: contract.sha256 });
}

function parseCriticModeBasis(value: unknown): CriticModeBasisV1 | null {
  const criterion = parseCriterionBasis(value);
  if (criterion) return criterion;
  const record = inspectRecord(value, ["kind", "reason"]);
  if (record?.kind !== "cairn-default"
    || (record.reason !== "not-requested" && record.reason !== "no-useful-inspection" && record.reason !== "route-incompatible")) return null;
  return Object.freeze({ kind: "cairn-default", reason: record.reason });
}

function parseBasisArray<T>(
  value: unknown,
  parser: (entry: unknown) => T | null,
  canonical: (entry: T) => string,
): readonly T[] | null {
  const entries = inspectArray(value, QUALITY_LIMITS.basesPerRow);
  if (!entries || entries.length === 0) return null;
  const output: T[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const parsed = parser(entry);
    if (!parsed) return null;
    const key = canonical(parsed);
    if (seen.has(key)) return null;
    seen.add(key);
    output.push(parsed);
  }
  return Object.freeze(output);
}

function parseStringIdArray(value: unknown, cap: number, pattern: RegExp = MACHINE_ID): readonly string[] | null {
  const entries = inspectArray(value, cap);
  if (!entries) return null;
  const output: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (typeof entry !== "string" || entry.length > QUALITY_LIMITS.machineIdentifierCharacters || !pattern.test(entry)) return null;
    if (seen.has(entry)) return null;
    seen.add(entry);
    output.push(entry);
  }
  return Object.freeze(output);
}

function parseViewport(value: unknown): Readonly<{ width: number; height: number }> | null | undefined {
  if (value === null) return null;
  const record = inspectRecord(value, ["width", "height"]);
  if (!record || !safeInteger(record.width, 1, 16_384) || !safeInteger(record.height, 1, 16_384)) return undefined;
  return Object.freeze({ width: record.width, height: record.height });
}

function parseComparableState(value: unknown): ComparableStateV1 | null {
  const record = inspectRecord(value, [
    "id", "route", "viewport", "inputFixtureId", "dataFixtureId", "versionOrTime", "locale", "accessibilityMode",
  ]);
  if (!record || !safeMachineId(record.id) || !safeText(record.route)) return null;
  if (!safeMachineId(record.inputFixtureId) || !safeMachineId(record.dataFixtureId)) return null;
  if (!safeText(record.versionOrTime) || !safeText(record.locale) || !safeText(record.accessibilityMode)) return null;
  const viewport = parseViewport(record.viewport);
  if (viewport === undefined) return null;
  return Object.freeze({
    id: record.id,
    route: record.route,
    viewport,
    inputFixtureId: record.inputFixtureId,
    dataFixtureId: record.dataFixtureId,
    versionOrTime: record.versionOrTime,
    locale: record.locale,
    accessibilityMode: record.accessibilityMode,
  });
}

function canonicalComparableState(value: ComparableStateV1): string {
  const viewport = value.viewport === null
    ? "null"
    : objectCanonical([["width", String(value.viewport.width)], ["height", String(value.viewport.height)]]);
  return objectCanonical([
    ["id", quote(value.id)],
    ["route", quote(value.route)],
    ["viewport", viewport],
    ["inputFixtureId", quote(value.inputFixtureId)],
    ["dataFixtureId", quote(value.dataFixtureId)],
    ["versionOrTime", quote(value.versionOrTime)],
    ["locale", quote(value.locale)],
    ["accessibilityMode", quote(value.accessibilityMode)],
  ]);
}

function parseComparison(value: unknown): ComparisonCriterionV1 | null {
  const record = inspectRecord(value, [
    "id", "referenceId", "dimensionId", "candidateStateId", "comparator", "threshold", "tieOutcome",
  ]);
  if (!record || !safeMachineId(record.id) || !safeMachineId(record.referenceId)
    || !safeMachineId(record.dimensionId) || !safeMachineId(record.candidateStateId)
    || !safeText(record.threshold)) return null;
  if (record.comparator !== "match" && record.comparator !== "beat") return null;
  if (record.tieOutcome !== "meets" && record.tieOutcome !== "does-not-meet") return null;
  if (record.comparator === "match" && record.tieOutcome !== "meets") return null;
  if (record.comparator === "beat" && record.tieOutcome !== "does-not-meet") return null;
  return Object.freeze({
    id: record.id,
    referenceId: record.referenceId,
    dimensionId: record.dimensionId,
    candidateStateId: record.candidateStateId,
    comparator: record.comparator,
    threshold: record.threshold,
    tieOutcome: record.tieOutcome,
  });
}

function canonicalComparison(value: ComparisonCriterionV1): string {
  return objectCanonical([
    ["id", quote(value.id)],
    ["referenceId", quote(value.referenceId)],
    ["dimensionId", quote(value.dimensionId)],
    ["candidateStateId", quote(value.candidateStateId)],
    ["comparator", quote(value.comparator)],
    ["threshold", quote(value.threshold)],
    ["tieOutcome", quote(value.tieOutcome)],
  ]);
}

function parseFailureCondition(value: unknown): AcceptanceCheckV1["failureCondition"] | null {
  const record = inspectRecord(value, ["id", "statement", "allowedArtifactIds"]);
  if (!record || !safeMachineId(record.id) || !safeText(record.statement)) return null;
  const allowedArtifactIds = parseStringIdArray(record.allowedArtifactIds, QUALITY_LIMITS.selectedArtifacts);
  if (!allowedArtifactIds || allowedArtifactIds.length === 0) return null;
  return Object.freeze({ id: record.id, statement: record.statement, allowedArtifactIds });
}

function parseEvidenceStandard(value: unknown): AcceptanceCheckV1["evidenceStandard"] | null {
  const record = inspectRecord(value, ["mode", "proves", "precondition"]);
  if (!record || (record.mode !== "adapter-attestation" && record.mode !== "artifact-inspection"
    && record.mode !== "comparison" && record.mode !== "owner-observation")) return null;
  if (!safeText(record.proves) || (record.precondition !== null && !safeText(record.precondition))) return null;
  return Object.freeze({ mode: record.mode, proves: record.proves, precondition: record.precondition });
}

function parseAcceptanceCheck(value: unknown): AcceptanceCheckV1 | null {
  const record = inspectRecord(value, [
    "id", "promise", "kind", "judge", "basis", "failureCondition", "evidenceStandard", "comparison",
  ]);
  if (!record || typeof record.id !== "string" || !/^c(?:[1-9]|1[0-2])$/.test(record.id)) return null;
  if (!safeText(record.promise) || VAGUE_PROMISE.test(record.promise)) return null;
  if (record.kind !== "acceptance" && record.kind !== "non-regression" && record.kind !== "comparison") return null;
  if (record.judge !== "cairn" && record.judge !== "critic" && record.judge !== "owner") return null;
  const basis = parseBasisArray(record.basis, parseCriterionBasis, canonicalCriterionBasis);
  const failureCondition = parseFailureCondition(record.failureCondition);
  const evidenceStandard = parseEvidenceStandard(record.evidenceStandard);
  if (!basis || !failureCondition || !evidenceStandard) return null;

  let comparison: ComparisonCriterionV1 | null = null;
  if (record.kind === "comparison") {
    comparison = parseComparison(record.comparison);
    // Q1 conservatively routes subjective match/beat to the owner. A named
    // deterministic method can be added later only as a typed schema field.
    if (!comparison || record.judge !== "owner" || evidenceStandard.mode !== "comparison") return null;
  } else if (record.comparison !== null) {
    return null;
  }

  if (record.judge === "critic" && evidenceStandard.mode !== "artifact-inspection") return null;
  if (record.judge === "owner" && record.kind !== "comparison" && evidenceStandard.mode !== "owner-observation") return null;
  if (record.judge === "cairn" && (evidenceStandard.mode === "owner-observation" || evidenceStandard.mode === "comparison")) return null;
  return Object.freeze({
    id: record.id as `c${number}`,
    promise: record.promise,
    kind: record.kind,
    judge: record.judge,
    basis,
    failureCondition,
    evidenceStandard,
    comparison,
  });
}

function parseQualityPreference(value: unknown): QualityPreferenceV1 | null {
  const record = inspectRecord(value, ["id", "dimension", "desiredDirection", "basis", "comparison"]);
  if (!record || typeof record.id !== "string" || !/^p(?:[1-9]|1[0-2])$/.test(record.id)) return null;
  if (!safeText(record.dimension) || !safeText(record.desiredDirection)) return null;
  const basis = parseBasisArray(record.basis, parseCriterionBasis, canonicalCriterionBasis);
  if (!basis) return null;
  const comparison = record.comparison === null ? null : parseComparison(record.comparison);
  if (record.comparison !== null && !comparison) return null;
  return Object.freeze({
    id: record.id as `p${number}`,
    dimension: record.dimension,
    desiredDirection: record.desiredDirection,
    basis,
    comparison,
  });
}

function parseReference(value: unknown): QualityReferenceV1 | null {
  const record = inspectRecord(value, [
    "id", "title", "basis", "locator", "snapshotSha256", "capturedAt", "state", "stateSha256", "dimensions", "antiCopyBoundary",
  ]);
  if (!record || !safeMachineId(record.id) || !safeText(record.title) || !safeText(record.locator)
    || !safeSha256(record.snapshotSha256) || !safeIsoTime(record.capturedAt)
    || !safeSha256(record.stateSha256) || !safeText(record.antiCopyBoundary)) return null;
  const basis = parseIntentBasis(record.basis);
  const state = parseComparableState(record.state);
  const dimensionValues = inspectArray(record.dimensions, QUALITY_LIMITS.dimensionsPerReference);
  if (!basis || !state || !dimensionValues || dimensionValues.length === 0) return null;
  if (sha256(canonicalComparableState(state)) !== record.stateSha256) return null;
  const dimensions: Array<Readonly<{ id: string; description: string }>> = [];
  const seen = new Set<string>();
  for (const value of dimensionValues) {
    const dimension = inspectRecord(value, ["id", "description"]);
    if (!dimension || !safeMachineId(dimension.id) || !safeText(dimension.description) || seen.has(dimension.id)) return null;
    seen.add(dimension.id);
    dimensions.push(Object.freeze({ id: dimension.id, description: dimension.description }));
  }
  return Object.freeze({
    id: record.id,
    title: record.title,
    basis,
    locator: record.locator,
    snapshotSha256: record.snapshotSha256,
    capturedAt: record.capturedAt,
    state,
    stateSha256: record.stateSha256,
    dimensions: Object.freeze(dimensions),
    antiCopyBoundary: record.antiCopyBoundary,
  });
}

function parseCriticMode(value: unknown): CriticModeV1 | null {
  const record = inspectRecord(value, ["mode", "basis", "reason"]);
  if (!record || !safeText(record.reason)) return null;
  if (record.mode === "required") {
    const basis = parseBasisArray(record.basis, parseCriterionBasis, canonicalCriterionBasis);
    return basis ? Object.freeze({ mode: "required", basis, reason: record.reason }) : null;
  }
  if (record.mode !== "optional" && record.mode !== "off") return null;
  const basis = parseBasisArray(record.basis, parseCriticModeBasis, canonicalCriticModeBasis);
  return basis ? Object.freeze({ mode: record.mode, basis, reason: record.reason }) : null;
}

function parseTarget(value: unknown): QualityPlanV1["target"] | null {
  const record = inspectRecord(value, ["kind", "basis"]);
  if (!record || (record.kind !== "local-task" && record.kind !== "disabled-experiment")) return null;
  const basis = parseBasisArray(record.basis, parseIntentBasis, canonicalIntentBasis);
  return basis ? Object.freeze({ kind: record.kind, basis }) : null;
}

function parseSupportedPath(value: unknown): QualityPlanV1["supportedPath"] | null {
  const record = inspectRecord(value, ["statement", "basis"]);
  if (!record || !safeText(record.statement)) return null;
  const basis = parseBasisArray(record.basis, parseIntentBasis, canonicalIntentBasis);
  return basis ? Object.freeze({ statement: record.statement, basis }) : null;
}

function parseCoverage(value: unknown): QualityPlanV1["coverage"] | null {
  const record = inspectRecord(value, ["outcomeCriterionIds", "requirementCriteria", "supportedPathCriterionId"]);
  if (!record || typeof record.supportedPathCriterionId !== "string" || !/^c(?:[1-9]|1[0-2])$/.test(record.supportedPathCriterionId)) return null;
  const cPattern = /^c(?:[1-9]|1[0-2])$/;
  const outcomeCriterionIds = parseStringIdArray(record.outcomeCriterionIds, QUALITY_LIMITS.coverageIdsPerRow, cPattern);
  const rows = inspectArray(record.requirementCriteria, 8);
  if (!outcomeCriterionIds || !rows) return null;
  const requirementCriteria: Array<Readonly<{ requirementIndex: number; criterionIds: readonly `c${number}`[] }>> = [];
  const seen = new Set<number>();
  for (const value of rows) {
    const row = inspectRecord(value, ["requirementIndex", "criterionIds"]);
    if (!row || !safeInteger(row.requirementIndex, 0, 7) || seen.has(row.requirementIndex)) return null;
    const ids = parseStringIdArray(row.criterionIds, QUALITY_LIMITS.coverageIdsPerRow, cPattern);
    if (!ids || ids.length === 0) return null;
    seen.add(row.requirementIndex);
    requirementCriteria.push(Object.freeze({
      requirementIndex: row.requirementIndex,
      criterionIds: ids as readonly `c${number}`[],
    }));
  }
  return Object.freeze({
    outcomeCriterionIds: outcomeCriterionIds as readonly `c${number}`[],
    requirementCriteria: Object.freeze(requirementCriteria),
    supportedPathCriterionId: record.supportedPathCriterionId as `c${number}`,
  });
}

function freezeCandidate(value: QualityPlanCandidateV1): QualityPlanCandidateV1 {
  candidateBrand.add(value);
  return value;
}

/** Strictly parse and detach a complete Quality Plan candidate. Intent-source
 * authority is resolved later by bindTaskSpec. */
export function parseQualityPlanCandidate(value: unknown): QualityPlanCandidateV1 | null {
  try {
    const record = inspectRecord(value, [
      "version", "target", "supportedPath", "critic", "candidateStates", "acceptanceChecks",
      "qualityPreferences", "references", "unknowns", "coverage",
    ]);
    if (!record || record.version !== QUALITY_PLAN_VERSION) return null;
    const target = parseTarget(record.target);
    const supportedPath = parseSupportedPath(record.supportedPath);
    const critic = parseCriticMode(record.critic);
    const stateValues = inspectArray(record.candidateStates, QUALITY_LIMITS.candidateStates);
    const checkValues = inspectArray(record.acceptanceChecks, QUALITY_LIMITS.acceptanceChecks);
    const preferenceValues = inspectArray(record.qualityPreferences, QUALITY_LIMITS.qualityPreferences);
    const referenceValues = inspectArray(record.references, QUALITY_LIMITS.references);
    const unknownValues = inspectArray(record.unknowns, QUALITY_LIMITS.unknowns);
    const coverage = parseCoverage(record.coverage);
    if (!target || !supportedPath || !critic || !stateValues || !checkValues
      || !preferenceValues || !referenceValues || !unknownValues || !coverage) return null;
    if (checkValues.length === 0) return null;

    const candidateStates: ComparableStateV1[] = [];
    const stateIds = new Set<string>();
    for (const entry of stateValues) {
      const parsed = parseComparableState(entry);
      if (!parsed || stateIds.has(parsed.id)) return null;
      stateIds.add(parsed.id);
      candidateStates.push(parsed);
    }

    const acceptanceChecks: AcceptanceCheckV1[] = [];
    const failureIds = new Set<string>();
    for (let index = 0; index < checkValues.length; index += 1) {
      const parsed = parseAcceptanceCheck(checkValues[index]);
      if (!parsed || parsed.id !== `c${index + 1}` || failureIds.has(parsed.failureCondition.id)) return null;
      failureIds.add(parsed.failureCondition.id);
      acceptanceChecks.push(parsed);
    }

    const qualityPreferences: QualityPreferenceV1[] = [];
    for (let index = 0; index < preferenceValues.length; index += 1) {
      const parsed = parseQualityPreference(preferenceValues[index]);
      if (!parsed || parsed.id !== `p${index + 1}`) return null;
      qualityPreferences.push(parsed);
    }

    const references: QualityReferenceV1[] = [];
    const referencesById = new Map<string, QualityReferenceV1>();
    for (const entry of referenceValues) {
      const parsed = parseReference(entry);
      if (!parsed || referencesById.has(parsed.id)) return null;
      referencesById.set(parsed.id, parsed);
      references.push(parsed);
    }

    const unknowns: Array<Readonly<{ text: string; basis: readonly IntentBasisV1[] }>> = [];
    for (const entry of unknownValues) {
      const unknown = inspectRecord(entry, ["text", "basis"]);
      if (!unknown || !safeText(unknown.text)) return null;
      const basis = parseBasisArray(unknown.basis, parseIntentBasis, canonicalIntentBasis);
      if (!basis) return null;
      unknowns.push(Object.freeze({ text: unknown.text, basis }));
    }

    const comparisonIds = new Set<string>();
    for (const row of [...acceptanceChecks, ...qualityPreferences]) {
      if (!row.comparison) continue;
      const comparison = row.comparison;
      if (comparisonIds.has(comparison.id) || !stateIds.has(comparison.candidateStateId)) return null;
      const reference = referencesById.get(comparison.referenceId);
      if (!reference || !reference.dimensions.some((dimension) => dimension.id === comparison.dimensionId)) return null;
      comparisonIds.add(comparison.id);
    }

    return freezeCandidate(Object.freeze({
      version: QUALITY_PLAN_VERSION,
      target,
      supportedPath,
      critic,
      candidateStates: Object.freeze(candidateStates),
      acceptanceChecks: Object.freeze(acceptanceChecks),
      qualityPreferences: Object.freeze(qualityPreferences),
      references: Object.freeze(references),
      unknowns: Object.freeze(unknowns),
      coverage,
    }));
  } catch {
    return null;
  }
}

function parseContractSections(value: unknown): readonly ContractSectionAuthorityV1[] | null {
  const entries = inspectArray(value, QUALITY_LIMITS.contractSections);
  if (!entries) return null;
  const output: ContractSectionAuthorityV1[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const record = inspectRecord(entry, ["section", "sha256"]);
    if (!record || !safeContractSection(record.section) || !safeSha256(record.sha256) || seen.has(record.section)) return null;
    seen.add(record.section);
    output.push(Object.freeze({ section: record.section, sha256: record.sha256 }));
  }
  return Object.freeze(output);
}

function resolveIntentBasis(intent: TaskIntent, basis: IntentBasisV1): TaskIntent["outcome"] | null {
  if (basis.kind === "intent-outcome") return intent.outcome;
  return intent.requirements[basis.index] ?? null;
}

function contractBasisResolves(
  basis: ContractCriterionBasisV1,
  contractSections: readonly ContractSectionAuthorityV1[],
): boolean {
  return contractSections.some((section) => section.section === basis.section && section.sha256 === basis.sha256);
}

function basisResolves(
  intent: TaskIntent,
  basis: CriterionBasisV1,
  contractSections: readonly ContractSectionAuthorityV1[],
): boolean {
  return basis.kind === "contract"
    ? contractBasisResolves(basis, contractSections)
    : resolveIntentBasis(intent, basis) !== null;
}

function requiredBasisResolves(
  intent: TaskIntent,
  basis: CriterionBasisV1,
  contractSections: readonly ContractSectionAuthorityV1[],
): boolean {
  if (basis.kind === "contract") return contractBasisResolves(basis, contractSections);
  return resolveIntentBasis(intent, basis)?.source === "owner-stated";
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => right[index] === value);
}

function basisIntersects(left: readonly CriterionBasisV1[], right: readonly IntentBasisV1[]): boolean {
  const rightKeys = new Set(right.map(canonicalIntentBasis));
  return left.some((basis) => basis.kind !== "contract" && rightKeys.has(canonicalIntentBasis(basis)));
}

function referenceBasisSource(intent: TaskIntent, basis: IntentBasisV1): TaskIntent["outcome"]["source"] | null {
  return resolveIntentBasis(intent, basis)?.source ?? null;
}

function modeBasisResolves(
  intent: TaskIntent,
  basis: CriticModeBasisV1,
  contractSections: readonly ContractSectionAuthorityV1[],
): boolean {
  return basis.kind === "cairn-default" || basisResolves(intent, basis, contractSections);
}

function criticBasisShared(mode: CriticModeV1, criterion: AcceptanceCheckV1): boolean {
  if (mode.mode !== "required") return false;
  const modeKeys = new Set(mode.basis.map(canonicalCriterionBasis));
  return criterion.basis.some((basis) => modeKeys.has(canonicalCriterionBasis(basis)));
}

function bindQualityPlan(
  intent: TaskIntent,
  candidate: QualityPlanCandidateV1,
  contractSections: readonly ContractSectionAuthorityV1[],
): QualityPlanV1 | null {
  if (intent.outcome.source !== "owner-stated") return null;

  for (const basis of candidate.target.basis) if (!resolveIntentBasis(intent, basis)) return null;
  for (const basis of candidate.supportedPath.basis) if (!resolveIntentBasis(intent, basis)) return null;

  if (candidate.critic.mode === "required") {
    for (const basis of candidate.critic.basis) {
      if (!requiredBasisResolves(intent, basis, contractSections)) return null;
    }
  } else {
    for (const basis of candidate.critic.basis) {
      if (!modeBasisResolves(intent, basis, contractSections)) return null;
    }
  }

  for (const criterion of candidate.acceptanceChecks) {
    for (const basis of criterion.basis) {
      if (!requiredBasisResolves(intent, basis, contractSections)) return null;
    }
    if (candidate.critic.mode !== "required" && criterion.judge === "critic") return null;
    if (criterion.judge === "critic" && !criticBasisShared(candidate.critic, criterion)) return null;
  }

  for (const preference of candidate.qualityPreferences) {
    for (const basis of preference.basis) {
      if (!basisResolves(intent, basis, contractSections)) return null;
    }
  }

  for (const unknown of candidate.unknowns) {
    for (const basis of unknown.basis) {
      const row = resolveIntentBasis(intent, basis);
      if (!row || row.source === "owner-stated") return null;
    }
  }

  const referencesById = new Map(candidate.references.map((reference) => [reference.id, reference] as const));
  for (const reference of candidate.references) {
    if (!referenceBasisSource(intent, reference.basis)) return null;
  }
  for (const criterion of candidate.acceptanceChecks) {
    if (!criterion.comparison) continue;
    const reference = referencesById.get(criterion.comparison.referenceId);
    if (!reference || referenceBasisSource(intent, reference.basis) !== "owner-stated") return null;
  }

  const actualOutcome = candidate.acceptanceChecks
    .filter((criterion) => criterion.basis.some((basis) => basis.kind === "intent-outcome"))
    .map((criterion) => criterion.id);
  if (!sameStrings(candidate.coverage.outcomeCriterionIds, actualOutcome) || actualOutcome.length === 0) return null;

  const ownerRequirementIndices = intent.requirements
    .map((row, index) => row.source === "owner-stated" ? index : null)
    .filter((index): index is number => index !== null);
  if (candidate.coverage.requirementCriteria.length !== ownerRequirementIndices.length) return null;
  for (let position = 0; position < ownerRequirementIndices.length; position += 1) {
    const requirementIndex = ownerRequirementIndices[position] as number;
    const row = candidate.coverage.requirementCriteria[position];
    if (!row || row.requirementIndex !== requirementIndex) return null;
    const actual = candidate.acceptanceChecks
      .filter((criterion) => criterion.basis.some((basis) => basis.kind === "intent-requirement" && basis.index === requirementIndex))
      .map((criterion) => criterion.id);
    if (actual.length === 0 || !sameStrings(row.criterionIds, actual)) return null;
  }

  const nonRegression = candidate.acceptanceChecks.filter((criterion) => criterion.kind === "non-regression");
  if (nonRegression.length !== 1) return null;
  const supported = nonRegression[0];
  if (!supported || supported.id !== candidate.coverage.supportedPathCriterionId
    || supported.judge === "critic" || supported.comparison !== null
    || !basisIntersects(supported.basis, candidate.supportedPath.basis)) return null;

  return candidate;
}

/** Bind a parsed candidate to an already authenticated/branded TaskIntent.
 * Contract sections are caller-authenticated snapshots; absent authority means
 * contract bases fail rather than accepting a free-form label. */
export function bindTaskSpec(
  intent: unknown,
  candidate: unknown,
  authenticatedContractSections: unknown = [],
): TaskSpecV1 | null {
  try {
    if (canonicalTaskIntent(intent) === null) return null;
    const parsedCandidate = candidate !== null && typeof candidate === "object" && candidateBrand.has(candidate)
      ? candidate as QualityPlanCandidateV1
      : parseQualityPlanCandidate(candidate);
    const contractSections = parseContractSections(authenticatedContractSections);
    if (!parsedCandidate || !contractSections) return null;
    const quality = bindQualityPlan(intent as TaskIntent, parsedCandidate, contractSections);
    if (!quality) return null;
    const spec = Object.freeze({
      version: TASK_SPEC_VERSION,
      intent: intent as TaskIntent,
      quality,
      callBudget: TASK_CALL_BUDGET_V1,
    });
    taskSpecBrand.add(spec);
    return spec;
  } catch {
    return null;
  }
}

function canonicalCriticMode(value: CriticModeV1): string {
  const bases = value.mode === "required"
    ? value.basis.map(canonicalCriterionBasis)
    : value.basis.map(canonicalCriticModeBasis);
  return objectCanonical([
    ["mode", quote(value.mode)],
    ["basis", arrayCanonical(bases)],
    ["reason", quote(value.reason)],
  ]);
}

function canonicalFailureCondition(value: AcceptanceCheckV1["failureCondition"]): string {
  return objectCanonical([
    ["id", quote(value.id)],
    ["statement", quote(value.statement)],
    ["allowedArtifactIds", arrayCanonical(value.allowedArtifactIds.map(quote))],
  ]);
}

function canonicalEvidenceStandard(value: AcceptanceCheckV1["evidenceStandard"]): string {
  return objectCanonical([
    ["mode", quote(value.mode)],
    ["proves", quote(value.proves)],
    ["precondition", value.precondition === null ? "null" : quote(value.precondition)],
  ]);
}

function canonicalAcceptanceCheck(value: AcceptanceCheckV1): string {
  return objectCanonical([
    ["id", quote(value.id)],
    ["promise", quote(value.promise)],
    ["kind", quote(value.kind)],
    ["judge", quote(value.judge)],
    ["basis", arrayCanonical(value.basis.map(canonicalCriterionBasis))],
    ["failureCondition", canonicalFailureCondition(value.failureCondition)],
    ["evidenceStandard", canonicalEvidenceStandard(value.evidenceStandard)],
    ["comparison", value.comparison === null ? "null" : canonicalComparison(value.comparison)],
  ]);
}

function canonicalPreference(value: QualityPreferenceV1): string {
  return objectCanonical([
    ["id", quote(value.id)],
    ["dimension", quote(value.dimension)],
    ["desiredDirection", quote(value.desiredDirection)],
    ["basis", arrayCanonical(value.basis.map(canonicalCriterionBasis))],
    ["comparison", value.comparison === null ? "null" : canonicalComparison(value.comparison)],
  ]);
}

function canonicalReference(value: QualityReferenceV1): string {
  const dimensions = value.dimensions.map((dimension) => objectCanonical([
    ["id", quote(dimension.id)],
    ["description", quote(dimension.description)],
  ]));
  return objectCanonical([
    ["id", quote(value.id)],
    ["title", quote(value.title)],
    ["basis", canonicalIntentBasis(value.basis)],
    ["locator", quote(value.locator)],
    ["snapshotSha256", quote(value.snapshotSha256)],
    ["capturedAt", quote(value.capturedAt)],
    ["state", canonicalComparableState(value.state)],
    ["stateSha256", quote(value.stateSha256)],
    ["dimensions", arrayCanonical(dimensions)],
    ["antiCopyBoundary", quote(value.antiCopyBoundary)],
  ]);
}

function canonicalQualityPlan(value: QualityPlanV1): string {
  const requirementCriteria = value.coverage.requirementCriteria.map((row) => objectCanonical([
    ["requirementIndex", String(row.requirementIndex)],
    ["criterionIds", arrayCanonical(row.criterionIds.map(quote))],
  ]));
  return objectCanonical([
    ["version", quote(value.version)],
    ["target", objectCanonical([
      ["kind", quote(value.target.kind)],
      ["basis", arrayCanonical(value.target.basis.map(canonicalIntentBasis))],
    ])],
    ["supportedPath", objectCanonical([
      ["statement", quote(value.supportedPath.statement)],
      ["basis", arrayCanonical(value.supportedPath.basis.map(canonicalIntentBasis))],
    ])],
    ["critic", canonicalCriticMode(value.critic)],
    ["candidateStates", arrayCanonical(value.candidateStates.map(canonicalComparableState))],
    ["acceptanceChecks", arrayCanonical(value.acceptanceChecks.map(canonicalAcceptanceCheck))],
    ["qualityPreferences", arrayCanonical(value.qualityPreferences.map(canonicalPreference))],
    ["references", arrayCanonical(value.references.map(canonicalReference))],
    ["unknowns", arrayCanonical(value.unknowns.map((unknown) => objectCanonical([
      ["text", quote(unknown.text)],
      ["basis", arrayCanonical(unknown.basis.map(canonicalIntentBasis))],
    ])))],
    ["coverage", objectCanonical([
      ["outcomeCriterionIds", arrayCanonical(value.coverage.outcomeCriterionIds.map(quote))],
      ["requirementCriteria", arrayCanonical(requirementCriteria)],
      ["supportedPathCriterionId", quote(value.coverage.supportedPathCriterionId)],
    ])],
  ]);
}

function canonicalCallBudget(value: TaskCallBudgetV1): string {
  return objectCanonical([
    ["initialBuilderCalls", String(value.initialBuilderCalls)],
    ["maxRepairCalls", String(value.maxRepairCalls)],
    ["maxCriticAttempts", String(value.maxCriticAttempts)],
    ["maxExternalEvidenceCalls", String(value.maxExternalEvidenceCalls)],
    ["maxBuilderElapsedMs", String(value.maxBuilderElapsedMs)],
    ["maxCriticElapsedMs", String(value.maxCriticElapsedMs)],
    ["maxBuilderCapturedOutputBytes", String(value.maxBuilderCapturedOutputBytes)],
    ["maxCriticCapturedOutputBytes", String(value.maxCriticCapturedOutputBytes)],
    ["enforceableDollarLimitCents", "null"],
  ]);
}

/** Fixed-order authority serialization. Only module-branded Task Specs pass. */
export function canonicalTaskSpec(value: unknown): string | null {
  if (value === null || typeof value !== "object" || !taskSpecBrand.has(value)) return null;
  const spec = value as TaskSpecV1;
  const intent = canonicalTaskIntent(spec.intent);
  if (intent === null) return null;
  return objectCanonical([
    ["version", quote(spec.version)],
    ["intent", intent],
    ["quality", canonicalQualityPlan(spec.quality)],
    ["callBudget", canonicalCallBudget(spec.callBudget)],
  ]);
}

export function taskSpecSha256(value: unknown): string | null {
  const canonical = canonicalTaskSpec(value);
  return canonical === null ? null : sha256(canonical);
}

function parseTaskCallBudget(value: unknown): TaskCallBudgetV1 | null {
  const record = inspectRecord(value, [
    "initialBuilderCalls", "maxRepairCalls", "maxCriticAttempts", "maxExternalEvidenceCalls",
    "maxBuilderElapsedMs", "maxCriticElapsedMs", "maxBuilderCapturedOutputBytes",
    "maxCriticCapturedOutputBytes", "enforceableDollarLimitCents",
  ]);
  if (!record) return null;
  for (const [key, expected] of Object.entries(TASK_CALL_BUDGET_V1)) {
    if (!Object.is(record[key], expected)) return null;
  }
  return TASK_CALL_BUDGET_V1;
}

/** Re-authenticate a serialized Task Spec against the same owner sources and
 * contract-section snapshot that originally supplied its authority. */
export function validateTaskSpec(
  value: unknown,
  authenticatedSources: unknown,
  authenticatedContractSections: unknown = [],
): TaskSpecV1 | null {
  try {
    const record = inspectRecord(value, ["version", "intent", "quality", "callBudget"]);
    if (!record || record.version !== TASK_SPEC_VERSION || !parseTaskCallBudget(record.callBudget)) return null;
    const intent = validateTaskIntent(record.intent, authenticatedSources);
    const quality = parseQualityPlanCandidate(record.quality);
    if (!intent || !quality) return null;
    return bindTaskSpec(intent, quality, authenticatedContractSections);
  } catch {
    return null;
  }
}

function cloneState(value: ComparableStateV1): ComparableStateV1 {
  return Object.freeze({
    id: value.id,
    route: value.route,
    viewport: value.viewport === null ? null : Object.freeze({ width: value.viewport.width, height: value.viewport.height }),
    inputFixtureId: value.inputFixtureId,
    dataFixtureId: value.dataFixtureId,
    versionOrTime: value.versionOrTime,
    locale: value.locale,
    accessibilityMode: value.accessibilityMode,
  });
}

function cloneComparison(value: ComparisonCriterionV1 | null): ComparisonCriterionV1 | null {
  return value === null ? null : Object.freeze({ ...value });
}

function basisLabel(intent: TaskIntent, basis: CriterionBasisV1 | CriticModeBasisV1): string {
  if (basis.kind === "contract") return `contract: ${basis.section}`;
  if (basis.kind === "cairn-default") return `Cairn default: ${basis.reason}`;
  if (basis.kind === "intent-outcome") return "owner outcome";
  const row = intent.requirements[basis.index];
  return `requirement ${basis.index + 1}: ${row?.source ?? "unavailable"}`;
}

function freezeLabels(values: readonly (CriterionBasisV1 | CriticModeBasisV1)[], intent: TaskIntent): readonly string[] {
  return Object.freeze(values.map((basis) => basisLabel(intent, basis)));
}

/** Output-only owner review projection. It omits source IDs/offsets, intent
 * context, reference locators, and every branded authority object. */
export function taskSpecReviewView(value: unknown): TaskSpecReviewV1 | null {
  if (value === null || typeof value !== "object" || !taskSpecBrand.has(value)) return null;
  const spec = value as TaskSpecV1;
  const digest = taskSpecSha256(spec);
  const intent = taskRequestView(spec.intent);
  if (!digest || !intent) return null;
  const criteria = spec.quality.acceptanceChecks.map((criterion) => Object.freeze({
    id: criterion.id,
    promise: criterion.promise,
    kind: criterion.kind,
    judge: criterion.judge,
    basis: freezeLabels(criterion.basis, spec.intent),
    failureCondition: Object.freeze({
      id: criterion.failureCondition.id,
      statement: criterion.failureCondition.statement,
      allowedArtifactIds: Object.freeze([...criterion.failureCondition.allowedArtifactIds]),
    }),
    evidenceStandard: Object.freeze({ ...criterion.evidenceStandard }),
    comparison: cloneComparison(criterion.comparison),
  }));
  const preferences = spec.quality.qualityPreferences.map((preference) => Object.freeze({
    id: preference.id,
    dimension: preference.dimension,
    desiredDirection: preference.desiredDirection,
    basis: freezeLabels(preference.basis, spec.intent),
    comparison: cloneComparison(preference.comparison),
  }));
  const references = spec.quality.references.map((reference) => Object.freeze({
    id: reference.id,
    title: reference.title,
    source: basisLabel(spec.intent, reference.basis),
    snapshotSha256: reference.snapshotSha256,
    capturedAt: reference.capturedAt,
    state: cloneState(reference.state),
    stateSha256: reference.stateSha256,
    dimensions: Object.freeze(reference.dimensions.map((dimension) => Object.freeze({ ...dimension }))),
    antiCopyBoundary: reference.antiCopyBoundary,
  }));
  return Object.freeze({
    version: "cairn-task-spec-review/v1",
    taskSpecSha256: digest,
    intent,
    target: Object.freeze({ kind: spec.quality.target.kind, basis: freezeLabels(spec.quality.target.basis, spec.intent) }),
    supportedPath: Object.freeze({
      statement: spec.quality.supportedPath.statement,
      basis: freezeLabels(spec.quality.supportedPath.basis, spec.intent),
    }),
    critic: Object.freeze({
      mode: spec.quality.critic.mode,
      reason: spec.quality.critic.reason,
      basis: freezeLabels(spec.quality.critic.basis, spec.intent),
    }),
    candidateStates: Object.freeze(spec.quality.candidateStates.map(cloneState)),
    criteria: Object.freeze(criteria),
    preferences: Object.freeze(preferences),
    references: Object.freeze(references),
    unknowns: Object.freeze(spec.quality.unknowns.map((unknown) => Object.freeze({
      text: unknown.text,
      basis: freezeLabels(unknown.basis, spec.intent),
    }))),
    callBudget: TASK_CALL_BUDGET_V1,
  });
}

function safeRelativePath(value: unknown, allowDot: boolean): value is string {
  if (!safeText(value)) return false;
  if (allowDot && value === ".") return true;
  if (value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/.test(value)) return false;
  const segments = value.split("/");
  return segments.length > 0 && segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function parseCommandArgument(value: unknown): EvidenceCommandArgumentV1 | null {
  const literal = inspectRecord(value, ["kind", "value"]);
  if (literal?.kind === "literal" && safeText(literal.value)) {
    return Object.freeze({ kind: "literal", value: literal.value });
  }
  const fixture = inspectRecord(value, ["kind", "fixtureId"]);
  if (fixture?.kind === "fixture" && safeMachineId(fixture.fixtureId)) {
    return Object.freeze({ kind: "fixture", fixtureId: fixture.fixtureId });
  }
  return null;
}

function canonicalCommandArgument(value: EvidenceCommandArgumentV1): string {
  return value.kind === "literal"
    ? objectCanonical([["kind", quote(value.kind)], ["value", quote(value.value)]])
    : objectCanonical([["kind", quote(value.kind)], ["fixtureId", quote(value.fixtureId)]]);
}

function canonicalFixtureBinding(value: EvidenceFixtureBindingV1): string {
  return objectCanonical([["id", quote(value.id)], ["path", quote(value.path)], ["sha256", quote(value.sha256)]]);
}

function parseEvidenceCommand(value: unknown): EvidenceCommandV1 | null {
  const record = inspectRecord(value, [
    "executablePath", "executableSha256", "arguments", "fixtureBindings", "cwdRelative", "expectedExitCodes",
    "timeoutMs", "resultParserMode", "assertion",
  ]);
  if (!record || !safeRelativePath(record.executablePath, false) || !safeSha256(record.executableSha256)
    || !safeRelativePath(record.cwdRelative, true)) return null;
  const argumentValues = inspectArray(record.arguments, QUALITY_LIMITS.commandArguments);
  const fixtureValues = inspectArray(record.fixtureBindings, QUALITY_LIMITS.fixtureBindings);
  const exitValues = inspectArray(record.expectedExitCodes, QUALITY_LIMITS.expectedExitCodes);
  if (!argumentValues || !fixtureValues || !exitValues || exitValues.length === 0) return null;
  if (!safeInteger(record.timeoutMs, 1, TASK_CALL_BUDGET_V1.maxBuilderElapsedMs)) return null;
  if (record.resultParserMode !== "exit-code" && record.resultParserMode !== "node-test-tap"
    && record.resultParserMode !== "node-test-tap-crlf" && record.resultParserMode !== "json-assertion"
    && record.resultParserMode !== "json-assertion-lines") return null;
  const assertionRecord = inspectRecord(record.assertion, ["id", "expectedResult"]);
  if (!assertionRecord || !safeMachineId(assertionRecord.id) || !safeText(assertionRecord.expectedResult)) return null;

  const fixtureBindings: EvidenceFixtureBindingV1[] = [];
  const fixturePaths = new Set<string>();
  const fixturesById = new Map<string, string>();
  for (const entry of fixtureValues) {
    const fixture = inspectRecord(entry, ["id", "path", "sha256"]);
    if (!fixture || !safeMachineId(fixture.id) || !safeRelativePath(fixture.path, false)
      || !safeSha256(fixture.sha256) || fixturesById.has(fixture.id) || fixturePaths.has(fixture.path)) return null;
    fixturesById.set(fixture.id, fixture.path);
    fixturePaths.add(fixture.path);
    fixtureBindings.push(Object.freeze({ id: fixture.id, path: fixture.path, sha256: fixture.sha256 }));
  }

  const args: EvidenceCommandArgumentV1[] = [];
  const usedFixtures = new Set<string>();
  for (const entry of argumentValues) {
    const argument = parseCommandArgument(entry);
    if (!argument) return null;
    if (argument.kind === "fixture") {
      if (!fixturesById.has(argument.fixtureId)) return null;
      usedFixtures.add(argument.fixtureId);
    }
    args.push(argument);
  }
  if (fixtureBindings.some((fixture) => !usedFixtures.has(fixture.id))) return null;

  const expectedExitCodes: number[] = [];
  let previous = -1;
  for (const entry of exitValues) {
    if (!safeInteger(entry, 0, 255) || entry <= previous) return null;
    previous = entry;
    expectedExitCodes.push(entry);
  }

  const resolvedArguments = args.map((argument) => argument.kind === "literal"
    ? argument.value
    : fixturesById.get(argument.fixtureId) as string);
  const text = arrayCanonical([record.executablePath, ...resolvedArguments].map(quote));
  return Object.freeze({
    executablePath: record.executablePath,
    executableSha256: record.executableSha256,
    arguments: Object.freeze(args),
    fixtureBindings: Object.freeze(fixtureBindings),
    cwdRelative: record.cwdRelative,
    expectedExitCodes: Object.freeze(expectedExitCodes),
    timeoutMs: record.timeoutMs,
    resultParserMode: record.resultParserMode,
    assertion: Object.freeze({ id: assertionRecord.id, expectedResult: assertionRecord.expectedResult }),
    text,
    sha256: sha256(text),
  });
}

function canonicalEvidenceCommand(value: EvidenceCommandV1): string {
  return objectCanonical([
    ["executablePath", quote(value.executablePath)],
    ["executableSha256", quote(value.executableSha256)],
    ["arguments", arrayCanonical(value.arguments.map(canonicalCommandArgument))],
    ["fixtureBindings", arrayCanonical(value.fixtureBindings.map(canonicalFixtureBinding))],
    ["cwdRelative", quote(value.cwdRelative)],
    ["expectedExitCodes", arrayCanonical(value.expectedExitCodes.map(String))],
    ["timeoutMs", String(value.timeoutMs)],
    ["resultParserMode", quote(value.resultParserMode)],
    ["assertion", objectCanonical([
      ["id", quote(value.assertion.id)],
      ["expectedResult", quote(value.assertion.expectedResult)],
    ])],
    ["text", quote(value.text)],
    ["sha256", quote(value.sha256)],
  ]);
}

function parseEvidenceProcedure(value: unknown): EvidenceProcedureV1 | null {
  const record = inspectRecord(value, ["criterionId", "kind", "command", "artifactIds"]);
  if (!record || typeof record.criterionId !== "string" || !/^c(?:[1-9]|1[0-2])$/.test(record.criterionId)) return null;
  if (record.kind !== "adapter-command-attestation" && record.kind !== "packet-artifact"
    && record.kind !== "owner-observation" && record.kind !== "comparison-capture") return null;
  const artifactIds = parseStringIdArray(record.artifactIds, QUALITY_LIMITS.selectedArtifacts);
  if (!artifactIds || artifactIds.length === 0) return null;
  const command = record.kind === "adapter-command-attestation" ? parseEvidenceCommand(record.command) : null;
  if ((record.kind === "adapter-command-attestation" && !command)
    || (record.kind !== "adapter-command-attestation" && record.command !== null)) return null;
  return Object.freeze({
    criterionId: record.criterionId as `c${number}`,
    kind: record.kind,
    command,
    artifactIds,
  });
}

function canonicalEvidenceProcedure(value: EvidenceProcedureV1): string {
  return objectCanonical([
    ["criterionId", quote(value.criterionId)],
    ["kind", quote(value.kind)],
    ["command", value.command === null ? "null" : canonicalEvidenceCommand(value.command)],
    ["artifactIds", arrayCanonical(value.artifactIds.map(quote))],
  ]);
}

function expectedProcedureKind(criterion: AcceptanceCheckV1): EvidenceProcedureKindV1 {
  switch (criterion.evidenceStandard.mode) {
    case "adapter-attestation": return "adapter-command-attestation";
    case "artifact-inspection": return "packet-artifact";
    case "owner-observation": return "owner-observation";
    case "comparison": return "comparison-capture";
  }
}

function frozenEvidencePlan(value: EvidencePlanV1, brand: boolean): EvidencePlanV1 {
  const plan = Object.freeze({
    version: EVIDENCE_PLAN_VERSION,
    taskSpecSha256: value.taskSpecSha256,
    revision: value.revision,
    previousPlanSha256: value.previousPlanSha256,
    revisionReasonEvidenceRefs: Object.freeze([...value.revisionReasonEvidenceRefs]),
    procedures: Object.freeze([...value.procedures]),
  }) as EvidencePlanV1;
  if (brand) evidencePlanBrand.add(plan);
  return plan;
}

/** Bind revision zero to every criterion in one branded Task Spec. */
export function bindInitialEvidencePlan(taskSpec: unknown, candidate: unknown): EvidencePlanV1 | null {
  try {
    const taskSpecDigest = taskSpecSha256(taskSpec);
    if (!taskSpecDigest) return null;
    const record = inspectRecord(candidate, ["version", "procedures"]);
    if (!record || record.version !== EVIDENCE_PLAN_CANDIDATE_VERSION) return null;
    const entries = inspectArray(record.procedures, QUALITY_LIMITS.evidenceProcedures);
    if (!entries) return null;
    const spec = taskSpec as TaskSpecV1;
    if (entries.length !== spec.quality.acceptanceChecks.length) return null;
    const procedures: EvidenceProcedureV1[] = [];
    for (let index = 0; index < entries.length; index += 1) {
      const procedure = parseEvidenceProcedure(entries[index]);
      const criterion = spec.quality.acceptanceChecks[index];
      if (!procedure || !criterion || procedure.criterionId !== criterion.id
        || procedure.kind !== expectedProcedureKind(criterion)) return null;
      const allowed = new Set(criterion.failureCondition.allowedArtifactIds);
      if (procedure.artifactIds.some((id) => !allowed.has(id))) return null;
      procedures.push(procedure);
    }
    return frozenEvidencePlan({
      version: EVIDENCE_PLAN_VERSION,
      taskSpecSha256: taskSpecDigest,
      revision: 0,
      previousPlanSha256: null,
      revisionReasonEvidenceRefs: Object.freeze([]),
      procedures: Object.freeze(procedures),
    }, true);
  } catch {
    return null;
  }
}

function canonicalEvidencePlanValue(value: EvidencePlanV1): string {
  return objectCanonical([
    ["version", quote(value.version)],
    ["taskSpecSha256", quote(value.taskSpecSha256)],
    ["revision", String(value.revision)],
    ["previousPlanSha256", value.previousPlanSha256 === null ? "null" : quote(value.previousPlanSha256)],
    ["revisionReasonEvidenceRefs", arrayCanonical(value.revisionReasonEvidenceRefs.map(quote))],
    ["procedures", arrayCanonical(value.procedures.map(canonicalEvidenceProcedure))],
  ]);
}

export function canonicalEvidencePlan(value: unknown): string | null {
  return value !== null && typeof value === "object" && evidencePlanBrand.has(value)
    ? canonicalEvidencePlanValue(value as EvidencePlanV1)
    : null;
}

export function evidencePlanSha256(value: unknown): string | null {
  const canonical = canonicalEvidencePlan(value);
  return canonical === null ? null : sha256(canonical);
}

function commandPart(value: EvidenceCommandV1, omit: EvidencePlanRevisionChangeKindV1): string {
  const executablePath = omit === "executable-path" ? "<changed>" : value.executablePath;
  const fixtures = omit === "fixture-path"
    ? value.fixtureBindings.map((fixture) => objectCanonical([
        ["id", quote(fixture.id)], ["path", quote("<changed>")], ["sha256", quote(fixture.sha256)],
      ]))
    : value.fixtureBindings.map(canonicalFixtureBinding);
  const timeout = omit === "timeout-increase" ? "<changed>" : String(value.timeoutMs);
  const parser = omit === "result-parser-mode" ? "<changed>" : quote(value.resultParserMode);
  return objectCanonical([
    ["executablePath", quote(executablePath)],
    ["executableSha256", quote(value.executableSha256)],
    ["arguments", arrayCanonical(value.arguments.map(canonicalCommandArgument))],
    ["fixtureBindings", arrayCanonical(fixtures)],
    ["cwdRelative", quote(value.cwdRelative)],
    ["expectedExitCodes", arrayCanonical(value.expectedExitCodes.map(String))],
    ["timeoutMs", quote(timeout)],
    ["resultParserMode", parser],
    ["assertion", objectCanonical([
      ["id", quote(value.assertion.id)],
      ["expectedResult", quote(value.assertion.expectedResult)],
    ])],
  ]);
}

function validMechanicalChange(
  original: EvidenceCommandV1,
  replacement: EvidenceCommandV1,
  changeKind: EvidencePlanRevisionChangeKindV1,
): boolean {
  if (commandPart(original, changeKind) !== commandPart(replacement, changeKind)) return false;
  switch (changeKind) {
    case "executable-path":
      return original.executablePath !== replacement.executablePath;
    case "fixture-path": {
      if (original.fixtureBindings.length !== replacement.fixtureBindings.length) return false;
      let changed = 0;
      for (let index = 0; index < original.fixtureBindings.length; index += 1) {
        const left = original.fixtureBindings[index];
        const right = replacement.fixtureBindings[index];
        if (!left || !right || left.id !== right.id || left.sha256 !== right.sha256) return false;
        if (left.path !== right.path) changed += 1;
      }
      return changed === 1;
    }
    case "timeout-increase":
      return replacement.timeoutMs > original.timeoutMs;
    case "result-parser-mode":
      return replacement.resultParserMode !== original.resultParserMode
        && parserFamily(replacement.resultParserMode) === parserFamily(original.resultParserMode);
  }
}

function parserFamily(mode: EvidenceCommandV1["resultParserMode"]): "exit" | "node-test" | "json" {
  if (mode === "exit-code") return "exit";
  return mode.startsWith("node-test-") ? "node-test" : "json";
}

function unchangedCriterionSha256(taskSpecDigest: string, criterion: AcceptanceCheckV1): string {
  return sha256(objectCanonical([
    ["taskSpecSha256", quote(taskSpecDigest)],
    ["criterion", canonicalAcceptanceCheck(criterion)],
  ]));
}

/** Build a non-authoritative preview so the owner can approve exact from/to
 * hashes. The contained plan is deliberately unbranded until authorization. */
export function previewEvidencePlanRevision(
  taskSpec: unknown,
  fromPlan: unknown,
  change: unknown,
  mainEvidenceRefs: unknown,
): EvidencePlanRevisionPreviewV1 | null {
  try {
    const taskSpecDigest = taskSpecSha256(taskSpec);
    const fromDigest = evidencePlanSha256(fromPlan);
    if (!taskSpecDigest || !fromDigest) return null;
    const spec = taskSpec as TaskSpecV1;
    const prior = fromPlan as EvidencePlanV1;
    if (prior.taskSpecSha256 !== taskSpecDigest || prior.revision !== 0 || prior.previousPlanSha256 !== null) return null;
    const record = inspectRecord(change, ["criterionId", "changeKind", "replacementCommand"]);
    if (!record || typeof record.criterionId !== "string" || !/^c(?:[1-9]|1[0-2])$/.test(record.criterionId)) return null;
    if (record.changeKind !== "executable-path" && record.changeKind !== "fixture-path"
      && record.changeKind !== "timeout-increase" && record.changeKind !== "result-parser-mode") return null;
    const replacement = parseEvidenceCommand(record.replacementCommand);
    const evidenceRefs = parseStringIdArray(mainEvidenceRefs, QUALITY_LIMITS.revisionEvidenceRefs);
    if (!replacement || !evidenceRefs || evidenceRefs.length === 0) return null;
    const procedureIndex = prior.procedures.findIndex((procedure) => procedure.criterionId === record.criterionId);
    const procedure = prior.procedures[procedureIndex];
    const criterion = spec.quality.acceptanceChecks.find((row) => row.id === record.criterionId);
    if (procedureIndex < 0 || !procedure?.command || !criterion) return null;
    if (!validMechanicalChange(procedure.command, replacement, record.changeKind)) return null;

    const procedures = prior.procedures.map((value, index) => index === procedureIndex
      ? Object.freeze({
          criterionId: value.criterionId,
          kind: value.kind,
          command: replacement,
          artifactIds: value.artifactIds,
        })
      : value);
    const plan = frozenEvidencePlan({
      version: EVIDENCE_PLAN_VERSION,
      taskSpecSha256: taskSpecDigest,
      revision: 1,
      previousPlanSha256: fromDigest,
      revisionReasonEvidenceRefs: evidenceRefs,
      procedures: Object.freeze(procedures),
    }, false);
    const preview = Object.freeze({
      version: EVIDENCE_PLAN_REVISION_PREVIEW_VERSION,
      taskSpecSha256: taskSpecDigest,
      criterionId: record.criterionId as `c${number}`,
      changeKind: record.changeKind,
      fromPlanSha256: fromDigest,
      toPlanSha256: sha256(canonicalEvidencePlanValue(plan)),
      unchangedAuthoritySha256: unchangedCriterionSha256(taskSpecDigest, criterion),
      plan,
    });
    evidencePreviewBrand.add(preview);
    return preview;
  } catch {
    return null;
  }
}

function parseRevisionAuthorization(value: unknown): EvidencePlanRevisionAuthorizationV1 | null {
  const record = inspectRecord(value, [
    "version", "runId", "taskSpecSha256", "criterionId", "fromPlanSha256", "toPlanSha256",
    "unchangedAuthoritySha256", "changeKind", "mainHarnessFailureCode", "mainEvidenceRefs",
    "ownerActionNonce", "approvedAt",
  ]);
  if (!record || record.version !== EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION || !safeUuid(record.runId)
    || !safeSha256(record.taskSpecSha256) || typeof record.criterionId !== "string"
    || !/^c(?:[1-9]|1[0-2])$/.test(record.criterionId) || !safeSha256(record.fromPlanSha256)
    || !safeSha256(record.toPlanSha256) || !safeSha256(record.unchangedAuthoritySha256)
    || !safeUuid(record.ownerActionNonce) || !safeIsoTime(record.approvedAt)) return null;
  if (record.changeKind !== "executable-path" && record.changeKind !== "fixture-path"
    && record.changeKind !== "timeout-increase" && record.changeKind !== "result-parser-mode") return null;
  if (record.mainHarnessFailureCode !== "TOOL_NOT_FOUND" && record.mainHarnessFailureCode !== "FIXTURE_NOT_FOUND"
    && record.mainHarnessFailureCode !== "TIMED_OUT_BEFORE_ASSERTION" && record.mainHarnessFailureCode !== "HARNESS_PARSE_ERROR") return null;
  const mainEvidenceRefs = parseStringIdArray(record.mainEvidenceRefs, QUALITY_LIMITS.revisionEvidenceRefs);
  if (!mainEvidenceRefs || mainEvidenceRefs.length === 0) return null;
  return Object.freeze({
    version: EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION,
    runId: record.runId,
    taskSpecSha256: record.taskSpecSha256,
    criterionId: record.criterionId as `c${number}`,
    fromPlanSha256: record.fromPlanSha256,
    toPlanSha256: record.toPlanSha256,
    unchangedAuthoritySha256: record.unchangedAuthoritySha256,
    changeKind: record.changeKind,
    mainHarnessFailureCode: record.mainHarnessFailureCode,
    mainEvidenceRefs,
    ownerActionNonce: record.ownerActionNonce,
    approvedAt: record.approvedAt,
  });
}

function parseRevisionAuthorityContext(value: unknown): EvidencePlanRevisionAuthorityContextV1 | null {
  const record = inspectRecord(value, [
    "version", "runId", "taskSpecSha256", "criterionId", "fromPlanSha256", "toPlanSha256",
    "unchangedAuthoritySha256", "changeKind", "mainHarnessFailureCode", "mainEvidenceRefs",
    "ownerActionNonce", "approvedAt",
  ]);
  if (!record || record.version !== EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION || !safeUuid(record.runId)
    || !safeSha256(record.taskSpecSha256) || typeof record.criterionId !== "string"
    || !/^c(?:[1-9]|1[0-2])$/.test(record.criterionId) || !safeSha256(record.fromPlanSha256)
    || !safeSha256(record.toPlanSha256) || !safeSha256(record.unchangedAuthoritySha256)
    || !safeUuid(record.ownerActionNonce) || !safeIsoTime(record.approvedAt)) return null;
  if (record.changeKind !== "executable-path" && record.changeKind !== "fixture-path"
    && record.changeKind !== "timeout-increase" && record.changeKind !== "result-parser-mode") return null;
  if (record.mainHarnessFailureCode !== "TOOL_NOT_FOUND" && record.mainHarnessFailureCode !== "FIXTURE_NOT_FOUND"
    && record.mainHarnessFailureCode !== "TIMED_OUT_BEFORE_ASSERTION" && record.mainHarnessFailureCode !== "HARNESS_PARSE_ERROR") return null;
  const mainEvidenceRefs = parseStringIdArray(record.mainEvidenceRefs, QUALITY_LIMITS.revisionEvidenceRefs);
  if (!mainEvidenceRefs || mainEvidenceRefs.length === 0) return null;
  return Object.freeze({
    version: EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION,
    runId: record.runId,
    taskSpecSha256: record.taskSpecSha256,
    criterionId: record.criterionId as `c${number}`,
    fromPlanSha256: record.fromPlanSha256,
    toPlanSha256: record.toPlanSha256,
    unchangedAuthoritySha256: record.unchangedAuthoritySha256,
    changeKind: record.changeKind,
    mainHarnessFailureCode: record.mainHarnessFailureCode,
    mainEvidenceRefs,
    ownerActionNonce: record.ownerActionNonce,
    approvedAt: record.approvedAt,
  });
}

function failureMatchesChange(
  failure: EvidencePlanRevisionAuthorizationV1["mainHarnessFailureCode"],
  change: EvidencePlanRevisionChangeKindV1,
): boolean {
  return (failure === "TOOL_NOT_FOUND" && change === "executable-path")
    || (failure === "FIXTURE_NOT_FOUND" && change === "fixture-path")
    || (failure === "TIMED_OUT_BEFORE_ASSERTION" && change === "timeout-increase")
    || (failure === "HARNESS_PARSE_ERROR" && change === "result-parser-mode");
}

/** Turn one module-created preview into revision one only after an exact typed
 * main/owner authorization. No second revision is accepted. */
export function authorizeEvidencePlanRevision(
  taskSpec: unknown,
  fromPlan: unknown,
  preview: unknown,
  authorization: unknown,
  authenticatedAuthorityContext: unknown,
): AuthorizedEvidencePlanRevisionV1 | null {
  try {
    const taskSpecDigest = taskSpecSha256(taskSpec);
    const fromDigest = evidencePlanSha256(fromPlan);
    if (!taskSpecDigest || !fromDigest || preview === null || typeof preview !== "object" || !evidencePreviewBrand.has(preview)) return null;
    const spec = taskSpec as TaskSpecV1;
    const prior = fromPlan as EvidencePlanV1;
    const proposed = preview as EvidencePlanRevisionPreviewV1;
    if (prior.revision !== 0 || prior.taskSpecSha256 !== taskSpecDigest
      || proposed.taskSpecSha256 !== taskSpecDigest || proposed.fromPlanSha256 !== fromDigest
      || proposed.plan.revision !== 1 || proposed.plan.previousPlanSha256 !== fromDigest
      || proposed.toPlanSha256 !== sha256(canonicalEvidencePlanValue(proposed.plan))) return null;
    const criterion = spec.quality.acceptanceChecks.find((row) => row.id === proposed.criterionId);
    if (!criterion || proposed.unchangedAuthoritySha256 !== unchangedCriterionSha256(taskSpecDigest, criterion)) return null;
    const parsed = parseRevisionAuthorization(authorization);
    const authority = parseRevisionAuthorityContext(authenticatedAuthorityContext);
    if (!parsed || !authority || parsed.taskSpecSha256 !== taskSpecDigest || parsed.criterionId !== proposed.criterionId
      || parsed.fromPlanSha256 !== fromDigest || parsed.toPlanSha256 !== proposed.toPlanSha256
      || parsed.unchangedAuthoritySha256 !== proposed.unchangedAuthoritySha256
      || parsed.changeKind !== proposed.changeKind || !failureMatchesChange(parsed.mainHarnessFailureCode, parsed.changeKind)
      || !sameStrings(parsed.mainEvidenceRefs, proposed.plan.revisionReasonEvidenceRefs)
      || authority.runId !== parsed.runId
      || authority.taskSpecSha256 !== parsed.taskSpecSha256
      || authority.criterionId !== parsed.criterionId
      || authority.fromPlanSha256 !== parsed.fromPlanSha256
      || authority.toPlanSha256 !== parsed.toPlanSha256
      || authority.unchangedAuthoritySha256 !== parsed.unchangedAuthoritySha256
      || authority.changeKind !== parsed.changeKind
      || authority.mainHarnessFailureCode !== parsed.mainHarnessFailureCode
      || !sameStrings(authority.mainEvidenceRefs, parsed.mainEvidenceRefs)
      || authority.ownerActionNonce !== parsed.ownerActionNonce
      || authority.approvedAt !== parsed.approvedAt) return null;
    const plan = frozenEvidencePlan(proposed.plan, true);
    return Object.freeze({ plan, authorization: parsed });
  } catch {
    return null;
  }
}
