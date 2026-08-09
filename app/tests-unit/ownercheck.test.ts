import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  QUALITY_PLAN_VERSION,
  bindInitialEvidencePlan,
  bindTaskIntent,
  bindTaskSpec,
  composeCriticAssessment,
  composeCriticAssessmentCustody,
  composeCriticCallAuthorization,
  composeCriticPacketAuthorityContext,
  composeCriticRequest,
  consumeCriticCallAuthorization,
  criticPacketSha256,
  criticRequestSha256,
  evidencePlanSha256,
  ownerCheckResolutionSha256,
  parseCriticOutput,
  parseQualityPlanCandidate,
  parseTaskIntentCandidate,
  taskSpecSha256,
  type CriticAssessmentV1,
  type EvidencePlanV1,
  type TaskSpecV1,
} from "@cairn/core";
import {
  applyTaskReviewAction,
  composeCandidateTaskReviewAuthority,
  composePendingTaskReviewAuthority,
  invalidateTaskReviewAuthority,
  isMainOwnerCheckResolution,
  isMainOwnerCriterionObservation,
  mainOwnerEvidence,
  taskReviewProjection,
} from "../src/main/ownercheck.js";
import { canonicalProjectKey } from "../src/main/conductor/turnauth.js";
import { parseTaskReviewProjection } from "../src/shared/task-review.js";

const DIR = process.cwd();
const RUN_ID = "22222222-2222-4222-8222-222222222222";
const CANDIDATE_SHA = "b".repeat(64);
const CONSENT_VERSION = "consent-v1";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function projectHash(dir = DIR): string {
  return sha256(canonicalProjectKey(dir));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function boundIntent() {
  const raw = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Build the local result.", ownerQuote: "Build the local result." },
    requirements: [{
      source: "owner-stated",
      text: "Keep the supported path working.",
      ownerQuote: "Keep the supported path working.",
    }],
    context: [],
  });
  assert.ok(raw);
  const intent = bindTaskIntent(raw, [{
    kind: "conversation",
    inputId: "11111111-1111-4111-8111-111111111111",
    text: "Build the local result. Keep the supported path working.",
  }]);
  assert.ok(intent);
  return intent;
}

function comparableState(id: string) {
  return {
    id, route: "/main", viewport: { width: 1280, height: 720 },
    inputFixtureId: "fixture-input", dataFixtureId: "fixture-data",
    versionOrTime: "v1", locale: "en-US", accessibilityMode: "default",
  };
}

function stateSha(value: ReturnType<typeof comparableState>): string {
  return sha256(JSON.stringify(value));
}

function criterion(
  id: `c${number}`,
  judge: "cairn" | "critic" | "owner",
  artifactIds: readonly string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    promise: `The exact ${id} promise holds.`,
    kind: "acceptance",
    judge,
    basis: [{ kind: "intent-outcome" }],
    failureCondition: {
      id: `failure-${id}`,
      statement: `The exact ${id} promise is broken.`,
      allowedArtifactIds: artifactIds,
    },
    evidenceStandard: {
      mode: judge === "owner" ? "owner-observation" : "artifact-inspection",
      proves: `The declared evidence decides ${id}.`,
      precondition: judge === "owner" ? "The owner can inspect the frozen candidate state." : null,
    },
    comparison: null,
    ...overrides,
  };
}

function taskSpec(mode: "required" | "optional" | "off" = "required", withPreference = false): TaskSpecV1 {
  const candidateState = comparableState("candidate-main");
  const referenceState = comparableState("reference-main");
  const raw = parseQualityPlanCandidate({
    version: QUALITY_PLAN_VERSION,
    target: { kind: "local-task", basis: [{ kind: "intent-outcome" }] },
    supportedPath: {
      statement: "Keep the supported path working.",
      basis: [{ kind: "intent-requirement", index: 0 }],
    },
    critic: mode === "required"
      ? { mode, basis: [{ kind: "intent-outcome" }], reason: "The owner requires bounded artifact inspection." }
      : { mode, basis: [{ kind: "cairn-default", reason: "not-requested" }], reason: `The critic is ${mode}.` },
    candidateStates: [candidateState],
    acceptanceChecks: [
      criterion("c1", mode === "required" ? "critic" : "cairn", ["artifact-output"]),
      criterion("c2", "owner", ["comparison-candidate", "comparison-reference"], {
        kind: "comparison",
        evidenceStandard: {
          mode: "comparison",
          proves: "The frozen candidate and reference decide c2.",
          precondition: "The owner can inspect both frozen states.",
        },
        comparison: {
          id: "comparison-c2", referenceId: "reference-one", dimensionId: "layout",
          candidateStateId: "candidate-main", comparator: "match",
          threshold: "The declared layout relationship is preserved.", tieOutcome: "meets",
        },
      }),
      criterion("c3", "cairn", ["evidence-regression"], {
        kind: "non-regression",
        basis: [{ kind: "intent-requirement", index: 0 }],
      }),
      criterion("c4", "owner", ["artifact-owner"]),
    ],
    qualityPreferences: withPreference ? [{
      id: "p1",
      dimension: "clarity",
      desiredDirection: "Prefer a clear explanation without changing required behavior.",
      basis: [{ kind: "intent-outcome" }],
      comparison: null,
    }] : [],
    references: [{
      id: "reference-one", title: "Owner-supplied reference",
      basis: { kind: "intent-outcome" }, locator: "project-snapshot/reference-one",
      snapshotSha256: sha256("Reference state."), capturedAt: "2026-08-07T17:00:00.000Z",
      state: referenceState, stateSha256: stateSha(referenceState),
      dimensions: [{ id: "layout", description: "Declared layout relationship." }],
      antiCopyBoundary: "Do not copy protected branding, text, assets, or code.",
    }],
    unknowns: [],
    coverage: {
      outcomeCriterionIds: ["c1", "c2", "c4"],
      requirementCriteria: [{ requirementIndex: 0, criterionIds: ["c3"] }],
      supportedPathCriterionId: "c3",
    },
  });
  assert.ok(raw);
  const spec = bindTaskSpec(boundIntent(), raw);
  assert.ok(spec);
  return spec;
}

function evidencePlan(spec: TaskSpecV1): EvidencePlanV1 {
  const plan = bindInitialEvidencePlan(spec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [
      { criterionId: "c1", kind: "packet-artifact", command: null, artifactIds: ["artifact-output"] },
      { criterionId: "c2", kind: "comparison-capture", command: null, artifactIds: ["comparison-candidate", "comparison-reference"] },
      { criterionId: "c3", kind: "packet-artifact", command: null, artifactIds: ["evidence-regression"] },
      { criterionId: "c4", kind: "owner-observation", command: null, artifactIds: ["artifact-owner"] },
    ],
  });
  assert.ok(plan);
  return plan;
}

function provenance() {
  return {
    selectorVersion: "cairn-conductor-context-selector/v1", projectHash: projectHash(), gitTracked: true,
    ordinaryText: true, regularFile: true, symbolicLink: false, gitIgnored: false, dependency: false,
    generated: false, credentialLikePath: false, credentialLikeContent: false, insideProject: true,
    reservedArea: false, consented: true,
  };
}

function selectedText(id: string, path: string, content: string) {
  return { id, projectRelativePath: path, sha256: sha256(content), content, truncated: false, provenance: provenance() };
}

function assessmentBundle(): { spec: TaskSpecV1; plan: EvidencePlanV1; assessment: CriticAssessmentV1 } {
  const spec = taskSpec("required");
  const plan = evidencePlan(spec);
  const packetAuthority = composeCriticPacketAuthorityContext(spec, plan, {
    version: "cairn-critic-packet-authority-context/v1",
    projectHash: projectHash(),
    connectionConsentVersion: CONSENT_VERSION,
    taskSpecSha256: taskSpecSha256(spec),
    evidencePlanSha256: evidencePlanSha256(plan),
    candidateSha256: CANDIDATE_SHA,
    selectedTrackedText: [
      selectedText("artifact-output", "src/result.ts", "export const result = 'broken';"),
      selectedText("comparison-candidate", "fixtures/candidate.txt", "Candidate state."),
      selectedText("comparison-reference", "fixtures/reference.txt", "Reference state."),
      selectedText("artifact-owner", "fixtures/owner.txt", "Owner-visible state."),
    ],
    checkEvidence: [{
      id: "evidence-regression", criterionId: "c3", status: "met",
      source: "cairn-verifier", evidenceRefs: ["artifact-output"],
    }],
    priorConfirmedFindings: [],
    comparisonTrials: [{
      comparisonId: "comparison-c2", criterionId: "c2", referenceId: "reference-one", dimensionId: "layout",
      candidateArtifactId: "comparison-candidate", referenceArtifactId: "comparison-reference", presentationOrder: "A-B",
    }],
  });
  assert.ok(packetAuthority);
  const request = composeCriticRequest(spec, plan, packetAuthority);
  assert.ok(request);
  const registryHash = (id: string): string => {
    const row = request.packet.artifactRegistry.find((item) => item.id === id);
    assert.ok(row);
    return row.sha256;
  };
  const output = parseCriticOutput({
    version: "cairn-critic-output/v1",
    findings: [
      {
        id: "f1", criterionId: "c1", status: "not-met", severity: "major", confidence: "high",
        failureConditionId: "failure-c1", observed: "The exact c1 failure is visible.",
        evidenceRefs: ["artifact-output"], counterEvidenceRefs: [], selfCheck: "supported",
        rootCauseKey: null, smallestRepair: null,
      },
      {
        id: "f2", criterionId: "c2", status: "tie", severity: null, confidence: "medium",
        failureConditionId: null, observed: "The owner comparison remains owner-judged.",
        evidenceRefs: ["comparison-candidate", "comparison-reference"], counterEvidenceRefs: [],
        selfCheck: "supported", rootCauseKey: null, smallestRepair: null,
      },
      {
        id: "f3", criterionId: "c3", status: "met", severity: null, confidence: "high",
        failureConditionId: null, observed: "The supported path remains intact.",
        evidenceRefs: ["evidence-regression"], counterEvidenceRefs: [], selfCheck: "supported",
        rootCauseKey: null, smallestRepair: null,
      },
      {
        id: "f4", criterionId: "c4", status: "cant-tell", severity: null, confidence: "low",
        failureConditionId: null, observed: "Only the owner can judge c4.", evidenceRefs: [], counterEvidenceRefs: [],
        selfCheck: "unresolved", rootCauseKey: null, smallestRepair: null,
      },
    ],
    unscopedFindings: [],
    comparisons: [{
      comparisonId: "comparison-c2", criterionId: "c2", referenceId: "reference-one", dimensionId: "layout",
      candidateSha256: registryHash("comparison-candidate"), referenceSha256: registryHash("comparison-reference"),
      presentationOrder: "A-B", result: "tie", evidenceRefs: ["comparison-candidate", "comparison-reference"],
    }],
    largestGapId: "f1",
  }, request);
  assert.ok(output);
  // Custody is the approved call plus a timestamp, so the fixture composes the
  // approval and copies it rather than inventing route facts.
  const authorization = composeCriticCallAuthorization(request, {
    runId: RUN_ID, candidateRound: 0, callAttempt: 1, provider: "fake-provider",
    baseUrl: "https://fake-provider.invalid/v1", model: "fake/critic", resolvedModel: "fake/critic",
    resolvedModelRevision: "fake-critic-2026-08-07", connectionConsentVersion: CONSENT_VERSION,
    transportRevision: "openai-compatible/v1", serializer: "cairn-critic-body/v1",
    timeoutMs: 600_000, maxOutputCharacters: 262_144, purpose: "critic-assessment",
    serverSideTools: "none", billingBasis: "Billed by the connected provider at its published rate.",
  });
  assert.ok(authorization);
  // Custody may only be recorded for an approval that was actually spent,
  // which is what a send does.
  assert.equal(consumeCriticCallAuthorization(authorization), true);
  const rawCustody = {
    version: "cairn-critic-assessment-custody/v1", runId: RUN_ID, candidateRound: 0, callAttempt: 1,
    taskSpecSha256: request.packet.taskSpecSha256, evidencePlanSha256: request.packet.evidencePlanSha256,
    packetSha256: criticPacketSha256(request.packet), requestSha256: criticRequestSha256(request),
    candidateSha256: CANDIDATE_SHA, provider: authorization.provider, model: authorization.resolvedModel,
    resolvedModelRevision: authorization.resolvedModelRevision, connectionConsentVersion: CONSENT_VERSION,
    routeRequestFingerprintSha256: authorization.routeRequestFingerprintSha256,
    criticPromptSha256: sha256(request.systemPrompt),
    policySha256: request.policySha256, createdAt: "2026-08-07T18:00:00.000Z",
  };
  const custody = composeCriticAssessmentCustody(request, rawCustody, authorization);
  assert.ok(custody);
  const assessment = composeCriticAssessment(request, output, custody);
  assert.ok(assessment);
  return { spec, plan, assessment };
}

const ARTIFACT_REGISTRY = Object.freeze([
  Object.freeze({ id: "artifact-output", label: "Built output" }),
  Object.freeze({ id: "comparison-candidate", label: "Candidate view" }),
  Object.freeze({ id: "comparison-reference", label: "Reference view" }),
  Object.freeze({ id: "evidence-regression", label: "Supported-path check" }),
  Object.freeze({ id: "artifact-owner", label: "Owner-visible result" }),
]);

function resultC3(plan: EvidencePlanV1) {
  return {
    criterionId: "c3", candidateSha256: CANDIDATE_SHA, status: "met", source: "cairn-verifier",
    evidenceRefs: ["evidence-regression"], evidencePlanSha256: evidencePlanSha256(plan), resolutionSha256: null,
  };
}

function candidateRaw(spec: TaskSpecV1, plan: EvidencePlanV1, assessment: CriticAssessmentV1 | null = null) {
  return {
    dir: DIR, runId: RUN_ID, taskSpec: spec, evidencePlan: plan, candidateSha256: CANDIDATE_SHA,
    assessment, criterionResults: [resultC3(plan)], artifactRegistry: ARTIFACT_REGISTRY,
  };
}

function actionFor(projection: NonNullable<ReturnType<typeof taskReviewProjection>>, criterionId: string) {
  const action = projection.criteria.find((criterion) => criterion.id === criterionId)?.ownerChecks[0]?.action;
  assert.ok(action);
  return action;
}

function assertNoAuthorityFields(value: unknown): void {
  const forbidden = new Set([
    "taskSpecSha256", "evidencePlanSha256", "candidateSha256", "assessmentSha256", "findingId",
    "failureConditionId", "findingRenderSha256", "resolutionSha256", "verdict", "seal", "disposition",
  ]);
  const visit = (item: unknown): void => {
    if (item === null || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      assert.equal(forbidden.has(key), false, `projection leaked ${key}`);
      visit(child);
    }
  };
  visit(value);
}

test("pending review is a branded plan-only projection with no action or seal authority", () => {
  const spec = taskSpec();
  const authority = composePendingTaskReviewAuthority(DIR, spec);
  assert.ok(authority);
  const projection = taskReviewProjection(authority);
  assert.ok(projection);
  assert.ok(parseTaskReviewProjection(projection));
  assert.ok(Object.isFrozen(projection));
  assert.ok(projection.criteria.every((row) => row.state === "pending" && row.source === null));
  assert.deepEqual(
    projection.criteria.filter((row) => row.ownerChecks.length > 0).map((row) => [row.id, row.ownerChecks[0]?.status, row.ownerChecks[0]?.action]),
    [["c2", "not-ready", null], ["c4", "not-ready", null]],
  );
  assertNoAuthorityFields(projection);
  assert.equal(taskReviewProjection(clone(authority)), null, "a structural authority clone is powerless");
  assert.equal(composePendingTaskReviewAuthority(DIR, clone(spec)), null, "a structural Task Spec clone is powerless");
  assert.deepEqual(mainOwnerEvidence(authority), { ownerObservations: [], ownerResolutions: [] });
});

test("candidate review refuses cross-scope and incomplete or forged evidence inputs", () => {
  const spec = taskSpec();
  const plan = evidencePlan(spec);
  const raw = candidateRaw(spec, plan);
  assert.ok(composeCandidateTaskReviewAuthority(raw));

  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, taskSpec: clone(spec) }), null);
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, evidencePlan: clone(plan) }), null);
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, candidateSha256: "a".repeat(64) }), null);
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, runId: "not-a-run" }), null);
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, artifactRegistry: ARTIFACT_REGISTRY.slice(1) }), null);
  assert.equal(composeCandidateTaskReviewAuthority({
    ...raw,
    artifactRegistry: [...ARTIFACT_REGISTRY, { id: "extra", label: "Unexpected evidence" }],
  }), null);
  assert.equal(composeCandidateTaskReviewAuthority({
    ...raw,
    artifactRegistry: ARTIFACT_REGISTRY.map((row) => row.id === "artifact-owner" ? { ...row, detail: "hidden" } : row),
  }), null, "the private registry has one exact id/label shape");
  assert.equal(composeCandidateTaskReviewAuthority({
    ...raw,
    criterionResults: [{ ...resultC3(plan), source: "owner-observation" }],
  }), null, "a raw caller cannot forge Main's owner source");
  assert.equal(composeCandidateTaskReviewAuthority({
    ...raw,
    criterionResults: [{ ...resultC3(plan), evidenceRefs: ["artifact-output"] }],
  }), null, "a result cannot substitute an unplanned artifact");
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, extra: true }), null);
});

test("hostile records, accessors, symbols, Proxies, and sparse arrays stay inert", () => {
  const spec = taskSpec();
  const plan = evidencePlan(spec);
  const raw = candidateRaw(spec, plan);
  let getterRan = false;
  const accessor = { ...raw } as Record<string, unknown>;
  Object.defineProperty(accessor, "taskSpec", {
    enumerable: true,
    get() {
      getterRan = true;
      return spec;
    },
  });
  assert.equal(composeCandidateTaskReviewAuthority(accessor), null);
  assert.equal(getterRan, false);
  assert.equal(composeCandidateTaskReviewAuthority(new Proxy(raw, {
    ownKeys() { throw new Error("contained proxy trap"); },
  })), null);
  assert.equal(composeCandidateTaskReviewAuthority(new Proxy(raw, {})), null, "a transparent Proxy is still not plain Main input");
  let proxyTrapRuns = 0;
  assert.equal(composeCandidateTaskReviewAuthority(new Proxy(raw, {
    getPrototypeOf() { proxyTrapRuns += 1; return Object.prototype; },
    ownKeys() { proxyTrapRuns += 1; return Reflect.ownKeys(raw); },
  })), null);
  assert.equal(proxyTrapRuns, 0, "Proxy identity is rejected before reflective traps can run");
  const withSymbol = { ...raw } as Record<PropertyKey, unknown>;
  withSymbol[Symbol("hidden")] = true;
  assert.equal(composeCandidateTaskReviewAuthority(withSymbol), null);
  const sparse = [...ARTIFACT_REGISTRY] as Array<(typeof ARTIFACT_REGISTRY)[number]>;
  delete sparse[2];
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, artifactRegistry: sparse }), null);

  const authority = composeCandidateTaskReviewAuthority(raw);
  assert.ok(authority);
  const projection = taskReviewProjection(authority);
  assert.ok(projection);
  const action = actionFor(projection, "c4");
  const valid = { dir: DIR, actionId: action.actionId, action: { kind: "observe", decision: "met" } };
  assert.equal(applyTaskReviewAction(authority, new Proxy(valid, {
    ownKeys() { throw new Error("contained action trap"); },
  })), null);
  const actionAccessor = { ...valid } as Record<string, unknown>;
  Object.defineProperty(actionAccessor, "action", {
    enumerable: true,
    get() {
      getterRan = true;
      return valid.action;
    },
  });
  getterRan = false;
  assert.equal(applyTaskReviewAction(authority, actionAccessor), null);
  assert.equal(getterRan, false);
  assert.ok(applyTaskReviewAction(authority, valid), "malformed attempts do not consume a genuine action");
});

test("owner observation actions are exact, one-use, cross-project safe, and regenerate siblings", () => {
  const spec = taskSpec();
  const plan = evidencePlan(spec);
  const authority = composeCandidateTaskReviewAuthority(candidateRaw(spec, plan));
  assert.ok(authority);
  const initial = taskReviewProjection(authority);
  assert.ok(initial);
  assert.ok(parseTaskReviewProjection(initial));
  assertNoAuthorityFields(initial);
  assert.equal(initial.criteria.find((row) => row.id === "c3")?.state, "met");
  assert.equal(initial.criteria.find((row) => row.id === "c2")?.state, "waiting-owner");
  assert.equal(initial.criteria.find((row) => row.id === "c4")?.state, "waiting-owner");

  const c2Old = actionFor(initial, "c2");
  const c4 = actionFor(initial, "c4");
  const validRequest = { dir: DIR, actionId: c4.actionId, action: { kind: "observe", decision: "met" } };
  assert.equal(applyTaskReviewAction(clone(authority), validRequest), null);
  assert.equal(applyTaskReviewAction(authority, { ...validRequest, dir: join(DIR, "other-project") }), null);
  assert.equal(applyTaskReviewAction(authority, { ...validRequest, action: { kind: "resolve", decision: "confirmed" } }), null);
  assert.equal(applyTaskReviewAction(authority, { ...validRequest, candidateSha256: CANDIDATE_SHA }), null);
  assert.equal(applyTaskReviewAction(authority, { ...validRequest, actionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }), null);

  const afterC4 = applyTaskReviewAction(authority, validRequest);
  assert.ok(afterC4);
  assert.equal(afterC4.criteria.find((row) => row.id === "c4")?.state, "met");
  assert.equal(afterC4.criteria.find((row) => row.id === "c4")?.source, "owner-observation");
  assert.equal(applyTaskReviewAction(authority, validRequest), null, "the same action cannot replay");
  assert.equal(applyTaskReviewAction(authority, {
    dir: DIR, actionId: c2Old.actionId, action: { kind: "observe", decision: "not-met" },
  }), null, "a sibling token from the old render is stale");

  const c2New = actionFor(afterC4, "c2");
  assert.notEqual(c2New.actionId, c2Old.actionId);
  const afterC2 = applyTaskReviewAction(authority, {
    dir: DIR, actionId: c2New.actionId, action: { kind: "observe", decision: "not-met" },
  });
  assert.ok(afterC2);
  assert.equal(afterC2.criteria.find((row) => row.id === "c2")?.state, "not-met");

  const evidence = mainOwnerEvidence(authority);
  assert.ok(evidence);
  assert.equal(evidence.ownerObservations.length, 2);
  const comparison = evidence.ownerObservations.find((row) => row.criterionId === "c2");
  assert.ok(comparison);
  assert.deepEqual(comparison.stateArtifactIds, ["comparison-candidate", "comparison-reference"]);
  assert.deepEqual(comparison.evidenceRefsSeen, ["comparison-candidate", "comparison-reference"]);
  assert.ok(evidence.ownerObservations.every(isMainOwnerCriterionObservation));
  assert.equal(isMainOwnerCriterionObservation(clone(comparison)), false);
  assertNoAuthorityFields(afterC2);

  assert.equal(invalidateTaskReviewAuthority(authority), true);
  assert.equal(taskReviewProjection(authority), null);
  assert.equal(mainOwnerEvidence(authority), null);
  assert.equal(invalidateTaskReviewAuthority(authority), false);
});

test("owner rows complete without an assessment under required, optional, and off critic modes while pN stays advisory", () => {
  for (const mode of ["required", "optional", "off"] as const) {
    const spec = taskSpec(mode, true);
    const plan = evidencePlan(spec);
    const authority = composeCandidateTaskReviewAuthority(candidateRaw(spec, plan, null));
    assert.ok(authority, mode);
    const initial = taskReviewProjection(authority);
    assert.ok(initial, mode);
    assert.equal(initial.plan.critic.mode, mode);
    assert.deepEqual(initial.plan.preferences.map((row) => row.id), ["p1"], `${mode}: the advisory preference remains visible`);
    assert.equal(initial.criteria.some((row) => String(row.id) === "p1"), false, `${mode}: pN creates no criterion or owner action`);
    const action = actionFor(initial, "c4");
    assert.equal(action.kind, "observe", mode);
    const updated = applyTaskReviewAction(authority, {
      dir: DIR, actionId: action.actionId, action: { kind: "observe", decision: "met" },
    });
    assert.ok(updated, mode);
    assert.equal(updated.criteria.find((row) => row.id === "c4")?.state, "met", mode);
    assert.equal(updated.criteria.find((row) => row.id === "c4")?.source, "owner-observation", mode);
    const evidence = mainOwnerEvidence(authority);
    assert.ok(evidence, mode);
    assert.equal(evidence.ownerObservations.length, 1, mode);
    assert.equal(evidence.ownerResolutions.length, 0, mode);
    assert.equal(Object.hasOwn(updated, "disposition"), false, mode);
  }
});

test("critic allegations mint exact private resolutions for each closed owner decision", () => {
  const { spec, plan, assessment } = assessmentBundle();
  for (const [decision, expectedState] of [
    ["confirmed", "not-met"],
    ["dismissed", "cant-tell"],
    ["cant-tell", "cant-tell"],
  ] as const) {
    const authority = composeCandidateTaskReviewAuthority(candidateRaw(spec, plan, assessment));
    assert.ok(authority, decision);
    const initial = taskReviewProjection(authority);
    assert.ok(initial);
    const c1 = initial.criteria.find((row) => row.id === "c1");
    assert.equal(c1?.state, "waiting-owner");
    assert.equal(c1?.source, null);
    assert.equal(c1?.ownerChecks[0]?.kind, "critic-allegation");
    assert.equal(c1?.ownerChecks[0]?.status, "alleged-not-met");
    if (c1?.ownerChecks[0]?.kind !== "critic-allegation") throw new Error("test fixture must show the critic allegation");
    assert.equal(c1.ownerChecks[0].smallestRepair, null, "a missing repair remains missing instead of hiding the finding");
    const action = actionFor(initial, "c1");
    assert.equal(action.kind, "resolve");

    const updated = applyTaskReviewAction(authority, {
      dir: DIR, actionId: action.actionId, action: { kind: "resolve", decision },
    });
    assert.ok(updated);
    const resolved = updated.criteria.find((row) => row.id === "c1");
    assert.equal(resolved?.state, expectedState);
    assert.equal(resolved?.source, "critic-inspection");
    assert.equal(resolved?.ownerChecks[0]?.status, decision);
    assert.equal(resolved?.ownerChecks[0]?.action, null);
    assertNoAuthorityFields(updated);

    const evidence = mainOwnerEvidence(authority);
    assert.ok(evidence);
    assert.equal(evidence.ownerResolutions.length, 1);
    const resolution = evidence.ownerResolutions[0]!;
    assert.equal(resolution.decision, decision);
    assert.equal(resolution.runId, RUN_ID);
    assert.equal(resolution.candidateSha256, CANDIDATE_SHA);
    assert.deepEqual(resolution.evidenceRefsSeen, ["artifact-output"]);
    assert.ok(ownerCheckResolutionSha256(resolution));
    assert.equal(isMainOwnerCheckResolution(resolution), true);
    assert.equal(isMainOwnerCheckResolution(clone(resolution)), false);
    assert.equal(applyTaskReviewAction(authority, {
      dir: DIR, actionId: action.actionId, action: { kind: "resolve", decision },
    }), null);
  }
});

test("assessment/run/project/candidate bindings fail closed before an allegation can be shown", () => {
  const { spec, plan, assessment } = assessmentBundle();
  const raw = candidateRaw(spec, plan, assessment);
  assert.ok(composeCandidateTaskReviewAuthority(raw));
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, assessment: clone(assessment) }), null);
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, candidateSha256: "e".repeat(64), criterionResults: [] }), null);
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, runId: "33333333-3333-4333-8333-333333333333" }), null);
  assert.equal(composeCandidateTaskReviewAuthority({ ...raw, dir: join(DIR, "another-project") }), null);
  const otherSpec = taskSpec("required");
  const otherPlan = evidencePlan(otherSpec);
  assert.equal(composeCandidateTaskReviewAuthority(candidateRaw(otherSpec, otherPlan, assessment)), null);
});
