import { createHash, randomUUID } from "node:crypto";
import { types as nodeTypes } from "node:util";
import {
  composeCriticPolicyAuthorityContext,
  criticAssessmentSha256,
  criticFindingRenderSha256,
  evidencePlanSha256,
  ownerCheckResolutionSha256,
  taskSpecReviewView,
  taskSpecSha256,
  type CriticAssessmentV1,
  type CriticFindingV1,
  type CriterionResultV1,
  type EvidencePlanV1,
  type OwnerCheckResolutionV1,
  type OwnerCriterionObservationV1,
  type TaskSpecV1,
} from "@cairn/core";
import type { TaskSpecProposalPreviewV1 } from "../shared/quality-preview.js";
import {
  TASK_REVIEW_PROJECTION_VERSION,
  parseTaskReviewActionRequest,
  type TaskReviewActionRequest,
  type TaskReviewCriterionStateV1,
  type TaskReviewEvidenceViewV1,
  type TaskReviewProjectionV1,
} from "../shared/task-review.js";
import { taskSpecProposalPreviewView } from "./conductor/qualityproposal.js";
import { canonicalProjectKey } from "./conductor/turnauth.js";

const AUTHORITY_VERSION = "cairn-main-task-review-authority/v1" as const;
const OBSERVATION_VERSION = "cairn-owner-criterion-observation/v1" as const;
const RESOLUTION_VERSION = "cairn-owner-check-resolution/v1" as const;
const POLICY_CONTEXT_VERSION = "cairn-critic-policy-authority-context/v1" as const;
const SHA256 = /^[0-9a-f]{64}$/u;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const MACHINE_ID = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/u;
const FORBIDDEN_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;

export type MainTaskReviewAuthorityV1 = Readonly<{ version: typeof AUTHORITY_VERSION }>;
export type MainOwnerEvidenceV1 = Readonly<{
  ownerObservations: readonly OwnerCriterionObservationV1[];
  ownerResolutions: readonly OwnerCheckResolutionV1[];
}>;

type ArtifactDisplay = Readonly<{ id: string; label: string }>;

type ObserveAction = Readonly<{
  kind: "observe";
  criterionId: `c${number}`;
  procedureKind: "owner-observation" | "comparison-capture";
  failureConditionId: string;
  artifactIds: readonly string[];
  renderSha256: string;
}>;
type ResolveAction = Readonly<{
  kind: "resolve";
  findingId: string;
  criterionId: `c${number}`;
  failureConditionId: string;
  evidenceRefs: readonly string[];
  counterEvidenceRefs: readonly string[];
  findingRenderSha256: string;
}>;
type ActionBinding = ObserveAction | ResolveAction;

type PendingState = {
  kind: "pending";
  active: boolean;
  dirKey: string;
  taskSpec: TaskSpecV1;
  taskSpecSha256: string;
  preview: TaskSpecProposalPreviewV1;
  projection: TaskReviewProjectionV1;
  actions: Map<string, ActionBinding>;
};
type CandidateState = {
  kind: "candidate";
  active: boolean;
  dirKey: string;
  projectHash: string;
  runId: string;
  taskSpec: TaskSpecV1;
  taskSpecSha256: string;
  evidencePlan: EvidencePlanV1;
  evidencePlanSha256: string;
  candidateSha256: string;
  assessment: CriticAssessmentV1 | null;
  assessmentSha256: string | null;
  results: readonly CriterionResultV1[];
  artifacts: ReadonlyMap<string, ArtifactDisplay>;
  preview: TaskSpecProposalPreviewV1;
  observations: Map<`c${number}`, OwnerCriterionObservationV1>;
  resolutions: Map<string, OwnerCheckResolutionV1>;
  actions: Map<string, ActionBinding>;
  projection: TaskReviewProjectionV1;
};
type AuthorityState = PendingState | CandidateState;

const authorityStates = new WeakMap<object, AuthorityState>();
const observationBrands = new WeakSet<object>();
const resolutionBrands = new WeakSet<object>();
const observationBindings = new WeakMap<object, Readonly<{
  evidencePlanSha256: string;
  failureConditionId: string;
  renderSha256: string;
  shownEvidenceRefs: readonly string[];
}>>();
const resolutionBindings = new WeakMap<object, Readonly<{
  projectHash: string;
  evidencePlanSha256: string;
  shownEvidenceRefs: readonly string[];
  resolutionSha256: string;
}>>();

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

function inspectRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || nodeTypes.isProxy(value) || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actual = Object.keys(descriptors);
    if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) return null;
    if (actual.some((key) => descriptors[key]?.get !== undefined || descriptors[key]?.set !== undefined || descriptors[key]?.enumerable !== true)) return null;
    return Object.fromEntries(actual.map((key) => [key, descriptors[key]!.value]));
  } catch {
    return null;
  }
}

function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (nodeTypes.isProxy(value) || !Array.isArray(value) || value.length > cap || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length !== 0 || Object.keys(descriptors).length !== value.length + 1) return null;
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined || descriptor.enumerable !== true) return null;
    }
    return Array.from({ length: value.length }, (_, index) => descriptors[String(index)]!.value);
  } catch {
    return null;
  }
}

function wellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function safeText(value: unknown, cap: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= cap
    && wellFormedUtf16(value) && !FORBIDDEN_TEXT.test(value);
}

function freezeEvidence(artifacts: ReadonlyMap<string, ArtifactDisplay>, ids: readonly string[]): readonly TaskReviewEvidenceViewV1[] {
  return Object.freeze(ids.map((id) => {
    const artifact = artifacts.get(id)!;
    return Object.freeze({ label: artifact.label });
  }));
}

function blankEvidence(): readonly TaskReviewEvidenceViewV1[] {
  return Object.freeze([]);
}

function mintAuthority(state: AuthorityState): MainTaskReviewAuthorityV1 {
  const authority = Object.freeze({ version: AUTHORITY_VERSION });
  authorityStates.set(authority, state);
  return authority;
}

function pendingProjection(preview: TaskSpecProposalPreviewV1): TaskReviewProjectionV1 {
  return Object.freeze({
    version: TASK_REVIEW_PROJECTION_VERSION,
    plan: preview,
    criteria: Object.freeze(preview.criteria.map((criterion) => Object.freeze({
      id: criterion.id,
      state: "pending" as const,
      source: null,
      supportingEvidence: blankEvidence(),
      counterEvidence: blankEvidence(),
      ownerChecks: criterion.judge === "owner" ? Object.freeze([Object.freeze({
        kind: "owner-observation" as const,
        status: "not-ready" as const,
        supportingEvidence: blankEvidence(),
        counterEvidence: blankEvidence(),
        action: null,
      })]) : Object.freeze([]),
    }))),
    preSealEvidence: true,
  });
}

/** Mint an inert, plan-only projection before a candidate exists. */
export function composePendingTaskReviewAuthority(dir: string, taskSpec: unknown): MainTaskReviewAuthorityV1 | null {
  try {
    if (!safeText(dir, 4_096)) return null;
    const taskSha = taskSpecSha256(taskSpec);
    const preview = taskSpecProposalPreviewView(taskSpec as TaskSpecV1);
    if (taskSha === null || preview === null) return null;
    const projection = pendingProjection(preview);
    return mintAuthority({
      kind: "pending", active: true, dirKey: canonicalProjectKey(dir), taskSpec: taskSpec as TaskSpecV1,
      taskSpecSha256: taskSha, preview, projection, actions: new Map(),
    });
  } catch {
    return null;
  }
}

function parseArtifactRegistry(value: unknown, expectedIds: ReadonlySet<string>): ReadonlyMap<string, ArtifactDisplay> | null {
  const values = inspectArray(value, 512);
  if (values === null || values.length !== expectedIds.size) return null;
  const artifacts = new Map<string, ArtifactDisplay>();
  for (const item of values) {
    const row = inspectRecord(item, ["id", "label"]);
    if (!row || typeof row.id !== "string" || !MACHINE_ID.test(row.id)
      || !safeText(row.label, 1_000)
      || !expectedIds.has(row.id) || artifacts.has(row.id)) return null;
    artifacts.set(row.id, Object.freeze({ id: row.id, label: row.label.trim() }));
  }
  return artifacts.size === expectedIds.size ? artifacts : null;
}

function expectedArtifactIds(plan: EvidencePlanV1, assessment: CriticAssessmentV1 | null): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const procedure of plan.procedures) for (const id of procedure.artifactIds) ids.add(id);
  for (const id of plan.revisionReasonEvidenceRefs) ids.add(id);
  if (assessment !== null) {
    for (const finding of assessment.output.findings) {
      for (const id of finding.evidenceRefs) ids.add(id);
      for (const id of finding.counterEvidenceRefs) ids.add(id);
    }
    for (const finding of assessment.output.unscopedFindings) {
      for (const id of finding.evidenceRefs) ids.add(id);
      for (const id of finding.counterEvidenceRefs) ids.add(id);
    }
    for (const comparison of assessment.output.comparisons) for (const id of comparison.evidenceRefs) ids.add(id);
  }
  return ids;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validatedResultRows(
  taskSpec: TaskSpecV1,
  evidencePlan: EvidencePlanV1,
  candidateSha256: string,
  evidencePlanDigest: string,
  rows: readonly CriterionResultV1[],
  artifacts: ReadonlyMap<string, ArtifactDisplay>,
): readonly CriterionResultV1[] | null {
  const review = taskSpecReviewView(taskSpec);
  if (review === null) return null;
  for (const row of rows) {
    const criterion = review.criteria.find((item) => item.id === row.criterionId);
    const procedure = evidencePlan.procedures.find((item) => item.criterionId === row.criterionId);
    if (criterion === undefined || procedure === undefined || row.candidateSha256 !== candidateSha256
      || row.evidencePlanSha256 !== evidencePlanDigest || row.evidenceRefs.some((id) => !artifacts.has(id))
      || row.resolutionSha256 !== null || row.source === "critic-inspection" || row.source === "owner-observation") return null;
    if (row.source === "worker-claim") continue;
    if (criterion.judge !== "cairn" || row.status === "waiting-owner") return null;
    const expectedSource = criterion.evidenceStandard.mode === "adapter-attestation" ? "adapter-execution" : "cairn-verifier";
    const expectedKind = criterion.evidenceStandard.mode === "adapter-attestation"
      ? "adapter-command-attestation"
      : criterion.evidenceStandard.mode === "artifact-inspection"
        ? "packet-artifact"
        : criterion.evidenceStandard.mode === "comparison"
          ? "comparison-capture"
          : "owner-observation";
    if (row.source !== expectedSource || procedure.kind !== expectedKind) return null;
    const allowed = new Set(criterion.failureCondition.allowedArtifactIds);
    const planned = new Set(procedure.artifactIds);
    if (row.evidenceRefs.some((id) => !allowed.has(id) || !planned.has(id))) return null;
  }
  return rows;
}

function projectResult(
  result: CriterionResultV1,
  artifacts: ReadonlyMap<string, ArtifactDisplay>,
): TaskReviewCriterionStateV1 {
  const workerClaim = result.source === "worker-claim";
  return Object.freeze({
    id: result.criterionId,
    state: workerClaim ? "cant-tell" : result.status,
    source: result.source,
    supportingEvidence: freezeEvidence(artifacts, result.evidenceRefs),
    counterEvidence: blankEvidence(),
    ownerChecks: Object.freeze([]),
  });
}

function eligibleCriticFinding(
  state: CandidateState,
  criterionId: `c${number}`,
): CriticFindingV1 | null {
  if (state.assessment === null) return null;
  const review = taskSpecReviewView(state.taskSpec);
  const criterion = review?.criteria.find((item) => item.id === criterionId);
  const finding = state.assessment.output.findings.find((item) => item.criterionId === criterionId);
  if (criterion === undefined || criterion.judge !== "critic" || finding === undefined || finding.status !== "not-met"
    || finding.failureConditionId !== criterion.failureCondition.id || finding.evidenceRefs.length === 0) return null;
  const allowed = new Set(criterion.failureCondition.allowedArtifactIds);
  return finding.evidenceRefs.every((id) => allowed.has(id) && state.artifacts.has(id))
    && finding.counterEvidenceRefs.every((id) => state.artifacts.has(id)) ? finding : null;
}

function observationRenderSha256(
  state: CandidateState,
  criterionId: `c${number}`,
  artifactIds: readonly string[],
): string {
  const review = taskSpecReviewView(state.taskSpec)!;
  const criterion = review.criteria.find((item) => item.id === criterionId)!;
  const procedure = state.evidencePlan.procedures.find((item) => item.criterionId === criterionId)!;
  return sha256(canonical({
    domain: "cairn-owner-observation-render/v1",
    projectHash: state.projectHash,
    runId: state.runId,
    taskSpecSha256: state.taskSpecSha256,
    evidencePlanSha256: state.evidencePlanSha256,
    candidateSha256: state.candidateSha256,
    criterionId,
    promise: criterion.promise,
    failureCondition: criterion.failureCondition,
    evidenceStandard: criterion.evidenceStandard,
    procedureKind: procedure.kind,
    shownEvidence: artifactIds.map((id) => state.artifacts.get(id)),
  }));
}

function buildCandidateProjection(state: CandidateState): TaskReviewProjectionV1 | null {
  const review = taskSpecReviewView(state.taskSpec);
  if (review === null) return null;
  state.actions.clear();
  const criteria: TaskReviewCriterionStateV1[] = [];
  for (const criterion of review.criteria) {
    const procedure = state.evidencePlan.procedures.find((item) => item.criterionId === criterion.id);
    if (procedure === undefined) return null;
    if (criterion.judge === "owner") {
      const observation = state.observations.get(criterion.id);
      const evidence = freezeEvidence(state.artifacts, procedure.artifactIds);
      if (observation !== undefined) {
        criteria.push(Object.freeze({
          id: criterion.id, state: observation.decision, source: "owner-observation",
          supportingEvidence: evidence, counterEvidence: blankEvidence(),
          ownerChecks: Object.freeze([Object.freeze({
            kind: "owner-observation", status: observation.decision,
            supportingEvidence: evidence, counterEvidence: blankEvidence(), action: null,
          })]),
        }));
      } else {
        const expectedKind = criterion.evidenceStandard.mode === "owner-observation"
          ? "owner-observation"
          : criterion.evidenceStandard.mode === "comparison" ? "comparison-capture" : null;
        if (expectedKind === null || procedure.kind !== expectedKind || procedure.artifactIds.length === 0) return null;
        const actionId = randomUUID();
        const renderSha256 = observationRenderSha256(state, criterion.id, procedure.artifactIds);
        state.actions.set(actionId, Object.freeze({
          kind: "observe", criterionId: criterion.id, procedureKind: expectedKind,
          failureConditionId: criterion.failureCondition.id,
          artifactIds: Object.freeze([...procedure.artifactIds]), renderSha256,
        }));
        criteria.push(Object.freeze({
          id: criterion.id, state: "waiting-owner", source: null,
          supportingEvidence: evidence, counterEvidence: blankEvidence(),
          ownerChecks: Object.freeze([Object.freeze({
            kind: "owner-observation", status: "waiting-owner",
            supportingEvidence: evidence, counterEvidence: blankEvidence(),
            action: Object.freeze({ kind: "observe", actionId }),
          })]),
        }));
      }
      continue;
    }

    if (criterion.judge === "critic") {
      const finding = state.assessment?.output.findings.find((item) => item.criterionId === criterion.id);
      const eligible = eligibleCriticFinding(state, criterion.id);
      if (eligible !== null) {
        const evidence = freezeEvidence(state.artifacts, eligible.evidenceRefs);
        const counter = freezeEvidence(state.artifacts, eligible.counterEvidenceRefs);
        const resolution = state.resolutions.get(eligible.id);
        if (resolution === undefined) {
          const render = criticFindingRenderSha256(state.assessment, eligible.id);
          if (render === null) return null;
          const actionId = randomUUID();
          state.actions.set(actionId, Object.freeze({
            kind: "resolve", findingId: eligible.id, criterionId: criterion.id,
            failureConditionId: criterion.failureCondition.id,
            evidenceRefs: Object.freeze([...eligible.evidenceRefs]),
            counterEvidenceRefs: Object.freeze([...eligible.counterEvidenceRefs]),
            findingRenderSha256: render,
          }));
          criteria.push(Object.freeze({
            id: criterion.id, state: "waiting-owner", source: null,
            supportingEvidence: evidence, counterEvidence: counter,
            ownerChecks: Object.freeze([Object.freeze({
              kind: "critic-allegation", status: "alleged-not-met",
              allegation: eligible.observed, smallestRepair: eligible.smallestRepair,
              supportingEvidence: evidence, counterEvidence: counter,
              action: Object.freeze({ kind: "resolve", actionId }),
            })]),
          }));
        } else {
          const stateValue = resolution.decision === "confirmed" ? "not-met" : "cant-tell";
          criteria.push(Object.freeze({
            id: criterion.id, state: stateValue, source: "critic-inspection",
            supportingEvidence: evidence, counterEvidence: counter,
            ownerChecks: Object.freeze([Object.freeze({
              kind: "critic-allegation", status: resolution.decision,
              allegation: eligible.observed, smallestRepair: eligible.smallestRepair,
              supportingEvidence: evidence, counterEvidence: counter, action: null,
            })]),
          }));
        }
      } else if (finding !== undefined && (finding.status === "met" || finding.status === "cant-tell")) {
        criteria.push(Object.freeze({
          id: criterion.id, state: finding.status, source: "critic-inspection",
          supportingEvidence: freezeEvidence(state.artifacts, finding.evidenceRefs),
          counterEvidence: freezeEvidence(state.artifacts, finding.counterEvidenceRefs),
          ownerChecks: Object.freeze([]),
        }));
      } else {
        criteria.push(Object.freeze({
          id: criterion.id, state: "pending", source: null,
          supportingEvidence: blankEvidence(), counterEvidence: blankEvidence(),
          ownerChecks: Object.freeze([]),
        }));
      }
      continue;
    }

    const result = state.results.find((item) => item.criterionId === criterion.id);
    criteria.push(result === undefined
      ? Object.freeze({ id: criterion.id, state: "pending", source: null, supportingEvidence: blankEvidence(), counterEvidence: blankEvidence(), ownerChecks: Object.freeze([]) })
      : projectResult(result, state.artifacts));
  }
  return Object.freeze({
    version: TASK_REVIEW_PROJECTION_VERSION,
    plan: state.preview,
    criteria: Object.freeze(criteria),
    preSealEvidence: true,
  });
}

/**
 * Main-only candidate authority mint. Every identity-bearing value remains
 * private; the returned projection exposes labels and opaque one-use actions.
 */
export function composeCandidateTaskReviewAuthority(raw: unknown): MainTaskReviewAuthorityV1 | null {
  try {
    const input = inspectRecord(raw, [
      "dir", "runId", "taskSpec", "evidencePlan", "candidateSha256", "assessment", "criterionResults", "artifactRegistry",
    ]);
    if (!input || !safeText(input.dir, 4_096) || typeof input.runId !== "string" || !UUID_V4.test(input.runId)
      || typeof input.candidateSha256 !== "string" || !SHA256.test(input.candidateSha256)) return null;
    const taskSha = taskSpecSha256(input.taskSpec);
    const planSha = evidencePlanSha256(input.evidencePlan);
    const preview = taskSpecProposalPreviewView(input.taskSpec as TaskSpecV1);
    if (taskSha === null || planSha === null || preview === null) return null;
    const taskSpec = input.taskSpec as TaskSpecV1;
    const evidencePlan = input.evidencePlan as EvidencePlanV1;
    if (evidencePlan.taskSpecSha256 !== taskSha) return null;
    const review = taskSpecReviewView(taskSpec);
    if (review === null || evidencePlan.procedures.length !== review.criteria.length
      || evidencePlan.procedures.some((procedure, index) => procedure.criterionId !== review.criteria[index]?.id)) return null;
    const assessmentSha = input.assessment === null ? null : criticAssessmentSha256(input.assessment);
    if (input.assessment !== null && assessmentSha === null) return null;
    const assessment = input.assessment as CriticAssessmentV1 | null;
    const expectedIds = expectedArtifactIds(evidencePlan, assessment);
    const artifacts = parseArtifactRegistry(input.artifactRegistry, expectedIds);
    const resultInput = inspectArray(input.criterionResults, review.criteria.length);
    if (artifacts === null || resultInput === null) return null;
    const dirKey = canonicalProjectKey(input.dir);
    const projectHash = sha256(dirKey);
    const authorityContext = composeCriticPolicyAuthorityContext(taskSpec, evidencePlan, assessment, {
      version: POLICY_CONTEXT_VERSION,
      projectHash,
      runId: input.runId,
      taskSpecSha256: taskSha,
      evidencePlanSha256: planSha,
      candidateSha256: input.candidateSha256,
      assessmentSha256: assessmentSha,
      criterionResults: resultInput,
      ownerObservations: [],
      ownerResolutions: [],
      nativeBoundaryResults: [],
    });
    if (authorityContext === null) return null;
    const results = validatedResultRows(taskSpec, evidencePlan, input.candidateSha256, planSha, authorityContext.criterionResults, artifacts);
    if (results === null) return null;
    const state: CandidateState = {
      kind: "candidate", active: true, dirKey, projectHash, runId: input.runId,
      taskSpec, taskSpecSha256: taskSha, evidencePlan, evidencePlanSha256: planSha,
      candidateSha256: input.candidateSha256, assessment, assessmentSha256: assessmentSha,
      results, artifacts, preview, observations: new Map(), resolutions: new Map(),
      actions: new Map(), projection: null as unknown as TaskReviewProjectionV1,
    };
    const projection = buildCandidateProjection(state);
    if (projection === null) return null;
    state.projection = projection;
    return mintAuthority(state);
  } catch {
    return null;
  }
}

function candidateIdentityStillExact(state: CandidateState): boolean {
  const taskSha = taskSpecSha256(state.taskSpec);
  const planSha = evidencePlanSha256(state.evidencePlan);
  const assessmentSha = state.assessment === null ? null : criticAssessmentSha256(state.assessment);
  if (taskSha !== state.taskSpecSha256 || planSha !== state.evidencePlanSha256
    || state.evidencePlan.taskSpecSha256 !== taskSha || assessmentSha !== state.assessmentSha256) return false;
  const expected = expectedArtifactIds(state.evidencePlan, state.assessment);
  if (expected.size !== state.artifacts.size || [...expected].some((id) => !state.artifacts.has(id))) return false;
  const context = composeCriticPolicyAuthorityContext(state.taskSpec, state.evidencePlan, state.assessment, {
    version: POLICY_CONTEXT_VERSION,
    projectHash: state.projectHash,
    runId: state.runId,
    taskSpecSha256: state.taskSpecSha256,
    evidencePlanSha256: state.evidencePlanSha256,
    candidateSha256: state.candidateSha256,
    assessmentSha256: state.assessmentSha256,
    criterionResults: state.results,
    ownerObservations: [...state.observations.values()],
    ownerResolutions: [...state.resolutions.values()],
    nativeBoundaryResults: [],
  });
  return context !== null;
}

function actionStillExact(state: CandidateState, binding: ActionBinding): boolean {
  const review = taskSpecReviewView(state.taskSpec);
  const criterion = review?.criteria.find((item) => item.id === binding.criterionId);
  if (criterion === undefined || criterion.failureCondition.id !== binding.failureConditionId) return false;
  if (binding.kind === "observe") {
    const procedure = state.evidencePlan.procedures.find((item) => item.criterionId === binding.criterionId);
    return criterion.judge === "owner" && state.observations.get(binding.criterionId) === undefined
      && procedure?.kind === binding.procedureKind && sameStrings(procedure.artifactIds, binding.artifactIds)
      && observationRenderSha256(state, binding.criterionId, binding.artifactIds) === binding.renderSha256;
  }
  const finding = eligibleCriticFinding(state, binding.criterionId);
  const render = state.assessment === null ? null : criticFindingRenderSha256(state.assessment, binding.findingId);
  return finding !== null && finding.id === binding.findingId && state.resolutions.get(binding.findingId) === undefined
    && sameStrings(finding.evidenceRefs, binding.evidenceRefs)
    && sameStrings(finding.counterEvidenceRefs, binding.counterEvidenceRefs)
    && render === binding.findingRenderSha256;
}

function mintObservation(
  state: CandidateState,
  binding: ObserveAction,
  decision: Extract<TaskReviewActionRequest, { action: { kind: "observe" } }>["action"]["decision"],
): OwnerCriterionObservationV1 | null {
  const record: OwnerCriterionObservationV1 = Object.freeze({
    version: OBSERVATION_VERSION,
    projectHash: state.projectHash,
    runId: state.runId,
    taskSpecSha256: state.taskSpecSha256,
    candidateSha256: state.candidateSha256,
    criterionId: binding.criterionId,
    stateArtifactIds: Object.freeze([...binding.artifactIds]),
    evidenceRefsSeen: Object.freeze([...binding.artifactIds]),
    decision,
    actionNonce: randomUUID(),
    observedAt: new Date().toISOString(),
  });
  const context = composeCriticPolicyAuthorityContext(state.taskSpec, state.evidencePlan, state.assessment, {
    version: POLICY_CONTEXT_VERSION,
    projectHash: state.projectHash,
    runId: state.runId,
    taskSpecSha256: state.taskSpecSha256,
    evidencePlanSha256: state.evidencePlanSha256,
    candidateSha256: state.candidateSha256,
    assessmentSha256: state.assessmentSha256,
    criterionResults: state.results,
    ownerObservations: [...state.observations.values(), record],
    ownerResolutions: [...state.resolutions.values()],
    nativeBoundaryResults: [],
  });
  if (context === null) return null;
  observationBrands.add(record);
  observationBindings.set(record, Object.freeze({
    evidencePlanSha256: state.evidencePlanSha256,
    failureConditionId: binding.failureConditionId,
    renderSha256: binding.renderSha256,
    shownEvidenceRefs: Object.freeze([...binding.artifactIds]),
  }));
  return record;
}

function mintResolution(
  state: CandidateState,
  binding: ResolveAction,
  decision: Extract<TaskReviewActionRequest, { action: { kind: "resolve" } }>["action"]["decision"],
): OwnerCheckResolutionV1 | null {
  if (state.assessment === null || state.assessmentSha256 === null) return null;
  const record: OwnerCheckResolutionV1 = Object.freeze({
    version: RESOLUTION_VERSION,
    runId: state.runId,
    taskSpecSha256: state.taskSpecSha256,
    candidateSha256: state.candidateSha256,
    assessmentSha256: state.assessmentSha256,
    findingId: binding.findingId,
    criterionId: binding.criterionId,
    failureConditionId: binding.failureConditionId,
    evidenceRefsSeen: Object.freeze([...binding.evidenceRefs]),
    counterEvidenceRefsSeen: Object.freeze([...binding.counterEvidenceRefs]),
    findingRenderSha256: binding.findingRenderSha256,
    decision,
    actionNonce: randomUUID(),
    decidedAt: new Date().toISOString(),
  });
  const resolutionSha256 = ownerCheckResolutionSha256(record);
  if (resolutionSha256 === null) return null;
  const context = composeCriticPolicyAuthorityContext(state.taskSpec, state.evidencePlan, state.assessment, {
    version: POLICY_CONTEXT_VERSION,
    projectHash: state.projectHash,
    runId: state.runId,
    taskSpecSha256: state.taskSpecSha256,
    evidencePlanSha256: state.evidencePlanSha256,
    candidateSha256: state.candidateSha256,
    assessmentSha256: state.assessmentSha256,
    criterionResults: state.results,
    ownerObservations: [...state.observations.values()],
    ownerResolutions: [...state.resolutions.values(), record],
    nativeBoundaryResults: [],
  });
  if (context === null) return null;
  resolutionBrands.add(record);
  resolutionBindings.set(record, Object.freeze({
    projectHash: state.projectHash,
    evidencePlanSha256: state.evidencePlanSha256,
    shownEvidenceRefs: Object.freeze([...binding.evidenceRefs, ...binding.counterEvidenceRefs]),
    resolutionSha256,
  }));
  return record;
}

/** Return the inert output projection only for this exact live Main mint. */
export function taskReviewProjection(authority: unknown): TaskReviewProjectionV1 | null {
  try {
    if (authority === null || typeof authority !== "object") return null;
    const state = authorityStates.get(authority);
    if (state === undefined || !state.active) return null;
    if (state.kind === "pending") {
      return taskSpecSha256(state.taskSpec) === state.taskSpecSha256 ? state.projection : null;
    }
    return candidateIdentityStillExact(state) ? state.projection : null;
  } catch {
    return null;
  }
}

/**
 * Consume one opaque renderer action. Exact-but-failed mints revoke the whole
 * authority; successful actions revoke and regenerate every remaining token.
 */
export function applyTaskReviewAction(authority: unknown, unknownRequest: unknown): TaskReviewProjectionV1 | null {
  const request = parseTaskReviewActionRequest(unknownRequest);
  if (request === null || authority === null || typeof authority !== "object") return null;
  const state = authorityStates.get(authority);
  if (state === undefined || !state.active || state.kind !== "candidate") return null;
  let requestDirKey: string;
  try {
    requestDirKey = canonicalProjectKey(request.dir);
  } catch {
    return null;
  }
  if (requestDirKey !== state.dirKey) return null;
  const binding = state.actions.get(request.actionId);
  if (binding === undefined || binding.kind !== request.action.kind) return null;
  if (!candidateIdentityStillExact(state) || !actionStillExact(state, binding)) {
    state.active = false;
    state.actions.clear();
    return null;
  }

  // Consumption happens only after exact parse, project, token, kind, and
  // current-scope checks. No sibling action from the old render survives.
  state.actions.clear();
  if (binding.kind === "observe" && request.action.kind === "observe") {
    const observation = mintObservation(state, binding, request.action.decision);
    if (observation === null) {
      state.active = false;
      return null;
    }
    state.observations.set(binding.criterionId, observation);
  } else if (binding.kind === "resolve" && request.action.kind === "resolve") {
    const resolution = mintResolution(state, binding, request.action.decision);
    if (resolution === null) {
      state.active = false;
      return null;
    }
    state.resolutions.set(binding.findingId, resolution);
  } else {
    state.active = false;
    return null;
  }
  const projection = buildCandidateProjection(state);
  if (projection === null || !candidateIdentityStillExact(state)) {
    state.active = false;
    state.actions.clear();
    return null;
  }
  state.projection = projection;
  return projection;
}

export function invalidateTaskReviewAuthority(authority: unknown): boolean {
  if (authority === null || typeof authority !== "object") return false;
  const state = authorityStates.get(authority);
  if (state === undefined || !state.active) return false;
  state.active = false;
  state.actions.clear();
  return true;
}

export function isMainTaskReviewAuthority(value: unknown): value is MainTaskReviewAuthorityV1 {
  return value !== null && typeof value === "object" && authorityStates.has(value);
}

export function isMainOwnerCriterionObservation(value: unknown): value is OwnerCriterionObservationV1 {
  return value !== null && typeof value === "object" && observationBrands.has(value) && observationBindings.has(value);
}

export function isMainOwnerCheckResolution(value: unknown): value is OwnerCheckResolutionV1 {
  return value !== null && typeof value === "object" && resolutionBrands.has(value) && resolutionBindings.has(value);
}

/** Exact privately branded Core rows for a future Main policy call. */
export function mainOwnerEvidence(authority: unknown): MainOwnerEvidenceV1 | null {
  if (authority === null || typeof authority !== "object") return null;
  const state = authorityStates.get(authority);
  if (state === undefined || !state.active) return null;
  if (state.kind === "pending") return Object.freeze({ ownerObservations: Object.freeze([]), ownerResolutions: Object.freeze([]) });
  if (!candidateIdentityStillExact(state)) return null;
  const observations = [...state.observations.values()];
  const resolutions = [...state.resolutions.values()];
  if (!observations.every(isMainOwnerCriterionObservation) || !resolutions.every(isMainOwnerCheckResolution)) return null;
  return Object.freeze({ ownerObservations: Object.freeze(observations), ownerResolutions: Object.freeze(resolutions) });
}
