import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  bindTaskIntent,
  parseTaskIntentCandidate,
  type TaskIntent,
  type TaskIntentSourceInput,
} from "../src/intent.js";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION,
  EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION,
  QUALITY_LIMITS,
  QUALITY_PLAN_VERSION,
  TASK_CALL_BUDGET_V1,
  TASK_SPEC_VERSION,
  authorizeEvidencePlanRevision,
  bindInitialEvidencePlan,
  bindTaskSpec,
  canonicalEvidencePlan,
  canonicalTaskSpec,
  evidencePlanSha256,
  parseQualityPlanCandidate,
  previewEvidencePlanRevision,
  taskSpecReviewView,
  taskSpecSha256,
  validateTaskSpec,
  type ContractSectionAuthorityV1,
  type EvidenceCommandCandidateV1,
  type EvidencePlanRevisionPreviewV1,
  type QualityPlanCandidateV1,
  type TaskSpecV1,
} from "../src/quality.js";

const OWNER_INPUT_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_TEXT = "Build the local result. Keep the supported path working. Maybe make it premium.";
const CONTRACT_SHA = "a".repeat(64);

const sources: readonly TaskIntentSourceInput[] = Object.freeze([
  Object.freeze({ kind: "conversation", inputId: OWNER_INPUT_ID, text: OWNER_TEXT }),
]);

function boundIntent(overrides: Record<string, unknown> = {}): TaskIntent {
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Build the local result.",
      ownerQuote: "Build the local result.",
    },
    requirements: [
      {
        source: "owner-stated",
        text: "Keep the supported path working.",
        ownerQuote: "Keep the supported path working.",
      },
      {
        source: "owner-unsure",
        text: "Maybe make it premium.",
        ownerQuote: "Maybe make it premium.",
      },
    ],
    context: ["A private context note."],
    ...overrides,
  });
  assert.ok(candidate);
  const intent = bindTaskIntent(candidate, sources);
  assert.ok(intent);
  return intent;
}

function acceptance(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    promise: id === "c1" ? "The requested local result exists." : "The supported path still works.",
    kind: id === "c2" ? "non-regression" : "acceptance",
    judge: "cairn",
    basis: [id === "c1" ? { kind: "intent-outcome" } : { kind: "intent-requirement", index: 0 }],
    failureCondition: {
      id: `failure-${id}`,
      statement: id === "c1" ? "The requested result is absent." : "The supported path fails.",
      allowedArtifactIds: [id === "c1" ? "artifact-output" : "artifact-regression"],
    },
    evidenceStandard: {
      mode: id === "c1" ? "adapter-attestation" : "artifact-inspection",
      proves: id === "c1" ? "The approved check passed." : "The supported path remains intact.",
      precondition: null,
    },
    comparison: null,
    ...overrides,
  };
}

function state(id = "candidate-main"): Record<string, unknown> {
  return {
    id,
    route: "/main",
    viewport: { width: 1280, height: 720 },
    inputFixtureId: "fixture-input",
    dataFixtureId: "fixture-data",
    versionOrTime: "v1",
    locale: "en-US",
    accessibilityMode: "default",
  };
}

function stateDigest(value: Record<string, unknown>): string {
  const viewport = value.viewport as { width: number; height: number } | null;
  const canonical = JSON.stringify({
    id: value.id,
    route: value.route,
    viewport: viewport === null ? null : { width: viewport.width, height: viewport.height },
    inputFixtureId: value.inputFixtureId,
    dataFixtureId: value.dataFixtureId,
    versionOrTime: value.versionOrTime,
    locale: value.locale,
    accessibilityMode: value.accessibilityMode,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function validPlan(overrides: Record<string, unknown> = {}): QualityPlanCandidateV1 {
  return {
    version: QUALITY_PLAN_VERSION,
    target: { kind: "local-task", basis: [{ kind: "intent-outcome" }] },
    supportedPath: {
      statement: "Keep the supported path working.",
      basis: [{ kind: "intent-requirement", index: 0 }],
    },
    critic: {
      mode: "off",
      basis: [{ kind: "cairn-default", reason: "not-requested" }],
      reason: "No critic is required for this task.",
    },
    candidateStates: [state()],
    acceptanceChecks: [acceptance("c1"), acceptance("c2")],
    qualityPreferences: [{
      id: "p1",
      dimension: "polish",
      desiredDirection: "Prefer a more polished result when it costs no required behavior.",
      basis: [{ kind: "intent-requirement", index: 1 }],
      comparison: null,
    }],
    references: [],
    unknowns: [{
      text: "The owner has not made polish a requirement.",
      basis: [{ kind: "intent-requirement", index: 1 }],
    }],
    coverage: {
      outcomeCriterionIds: ["c1"],
      requirementCriteria: [{ requirementIndex: 0, criterionIds: ["c2"] }],
      supportedPathCriterionId: "c2",
    },
    ...overrides,
  } as unknown as QualityPlanCandidateV1;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function bind(plan: unknown = validPlan(), contractSections: unknown = []): TaskSpecV1 {
  const parsed = parseQualityPlanCandidate(plan);
  assert.ok(parsed);
  const spec = bindTaskSpec(boundIntent(), parsed, contractSections);
  assert.ok(spec);
  return spec;
}

function command(overrides: Record<string, unknown> = {}): EvidenceCommandCandidateV1 {
  return {
    executablePath: "node",
    executableSha256: "e".repeat(64),
    arguments: [
      { kind: "literal", value: "--test" },
      { kind: "fixture", fixtureId: "suite" },
    ],
    fixtureBindings: [{ id: "suite", path: "dist/test/quality.test.js", sha256: "f".repeat(64) }],
    cwdRelative: "core",
    expectedExitCodes: [0],
    timeoutMs: 60_000,
    resultParserMode: "node-test-tap",
    assertion: { id: "quality-suite-passes", expectedResult: "zero failing tests" },
    ...overrides,
  } as EvidenceCommandCandidateV1;
}

function initialEvidencePlan(spec: TaskSpecV1) {
  const plan = bindInitialEvidencePlan(spec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [
      {
        criterionId: "c1",
        kind: "adapter-command-attestation",
        command: command(),
        artifactIds: ["artifact-output"],
      },
      {
        criterionId: "c2",
        kind: "packet-artifact",
        command: null,
        artifactIds: ["artifact-regression"],
      },
    ],
  });
  assert.ok(plan);
  return plan;
}

test("quality: strict parsing detaches and deeply freezes the complete candidate", () => {
  const raw = clone(validPlan());
  const parsed = parseQualityPlanCandidate(raw);
  assert.ok(parsed);
  assert.notEqual(parsed, raw);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.acceptanceChecks));
  assert.ok(parsed.acceptanceChecks.every(Object.isFrozen));
  assert.ok(Object.isFrozen(parsed.acceptanceChecks[0]?.failureCondition.allowedArtifactIds));
  assert.ok(Object.isFrozen(parsed.candidateStates[0]?.viewport));
  assert.ok(Object.isFrozen(parsed.coverage.requirementCriteria[0]?.criterionIds));

  (raw.acceptanceChecks[0] as { promise: string }).promise = "mutated after parsing";
  assert.equal(parsed.acceptanceChecks[0]?.promise, "The requested local result exists.");

  assert.equal(parseQualityPlanCandidate({ ...validPlan(), extra: true }), null);
  const missing = clone(validPlan()) as unknown as Record<string, unknown>;
  delete missing.coverage;
  assert.equal(parseQualityPlanCandidate(missing), null);
  assert.equal(parseQualityPlanCandidate({ ...validPlan(), version: "cairn-quality-plan/v2" }), null);
  assert.equal(parseQualityPlanCandidate({ ...validPlan(), target: { kind: "production-activation", basis: [] } }), null);
});

test("quality: hostile records, arrays, controls, and UTF-16 fail without executing caller code", () => {
  const accessor = clone(validPlan()) as unknown as Record<string, unknown>;
  Object.defineProperty(accessor, "target", { enumerable: true, get: () => assert.fail("accessor ran") });
  assert.equal(parseQualityPlanCandidate(accessor), null);

  const proxy = new Proxy(clone(validPlan()) as object, {
    get: () => assert.fail("proxy trap ran"),
    ownKeys: () => assert.fail("proxy trap ran"),
  });
  assert.equal(parseQualityPlanCandidate(proxy), null);

  const revoked = Proxy.revocable(clone(validPlan()) as object, {});
  revoked.revoke();
  assert.equal(parseQualityPlanCandidate(revoked.proxy), null);

  const symbol = clone(validPlan()) as QualityPlanCandidateV1 & { [key: symbol]: boolean };
  symbol[Symbol("hidden")] = true;
  assert.equal(parseQualityPlanCandidate(symbol), null);

  const custom = Object.assign(Object.create({ inherited: true }), clone(validPlan()));
  assert.equal(parseQualityPlanCandidate(custom), null);

  const sparse = clone(validPlan()) as unknown as { acceptanceChecks: unknown[] };
  sparse.acceptanceChecks = Array(2);
  assert.equal(parseQualityPlanCandidate(sparse), null);

  const extraArrayProperty = clone(validPlan()) as unknown as { acceptanceChecks: unknown[] };
  (extraArrayProperty.acceptanceChecks as unknown as Record<string, unknown>).hidden = true;
  assert.equal(parseQualityPlanCandidate(extraArrayProperty), null);

  for (const bad of ["bad\u0000text", "bad\ud800text", "bad\udc00text", "bad\u202etext"]) {
    const plan = clone(validPlan()) as unknown as { supportedPath: { statement: string } };
    plan.supportedPath.statement = bad;
    assert.equal(parseQualityPlanCandidate(plan), null, JSON.stringify(bad));
  }
});

test("quality: fixed caps, contiguous ids, vague promises, and structured relationships fail closed", () => {
  const overChecks = clone(validPlan()) as unknown as { acceptanceChecks: unknown[] };
  overChecks.acceptanceChecks = Array.from({ length: QUALITY_LIMITS.acceptanceChecks + 1 }, (_, index) => acceptance(`c${index + 1}`));
  assert.equal(parseQualityPlanCandidate(overChecks), null);

  for (const ids of [["c0", "c2"], ["c1", "c3"], ["c1", "c1"], ["208.c1", "c2"], ["C1", "c2"]]) {
    const plan = clone(validPlan()) as unknown as { acceptanceChecks: Array<Record<string, unknown>> };
    plan.acceptanceChecks[0]!.id = ids[0];
    plan.acceptanceChecks[1]!.id = ids[1];
    assert.equal(parseQualityPlanCandidate(plan), null, ids.join(","));
  }

  for (const vague of ["perfect", "Make it premium.", "best", "WOW!"]) {
    const plan = clone(validPlan()) as unknown as { acceptanceChecks: Array<Record<string, unknown>> };
    plan.acceptanceChecks[0]!.promise = vague;
    assert.equal(parseQualityPlanCandidate(plan), null, vague);
  }

  const nonComparisonWithComparison = clone(validPlan()) as unknown as { acceptanceChecks: Array<Record<string, unknown>> };
  nonComparisonWithComparison.acceptanceChecks[0]!.comparison = {
    id: "comparison-one", referenceId: "ref", dimensionId: "layout", candidateStateId: "candidate-main",
    comparator: "match", threshold: "same", tieOutcome: "meets",
  };
  assert.equal(parseQualityPlanCandidate(nonComparisonWithComparison), null);
});

test("quality: binding preserves branded intent and enforces exact reverse coverage", () => {
  const intent = boundIntent();
  const parsed = parseQualityPlanCandidate(validPlan());
  assert.ok(parsed);
  const spec = bindTaskSpec(intent, parsed);
  assert.ok(spec);
  assert.equal(spec.intent, intent);
  assert.equal(spec.version, TASK_SPEC_VERSION);
  assert.deepEqual(spec.callBudget, TASK_CALL_BUDGET_V1);
  assert.ok(Object.isFrozen(spec));
  assert.ok(Object.isFrozen(spec.quality));

  const clonedIntent = clone(intent);
  assert.equal(bindTaskSpec(clonedIntent, parsed), null, "a structural intent clone is not authority");

  const chosenOutcome = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: { source: "cairn-chosen", text: "Inferred outcome", ownerQuote: null },
    requirements: [],
    context: [],
  });
  assert.ok(chosenOutcome);
  const chosenBound = bindTaskIntent(chosenOutcome, []);
  assert.ok(chosenBound);
  assert.equal(bindTaskSpec(chosenBound, parsed), null, "the owner must adopt an inferred outcome");

  for (const mutate of [
    (plan: any) => { plan.coverage.outcomeCriterionIds = []; },
    (plan: any) => { plan.coverage.outcomeCriterionIds = ["c1", "c2"]; },
    (plan: any) => { plan.coverage.requirementCriteria = []; },
    (plan: any) => { plan.coverage.requirementCriteria[0].criterionIds = ["c1"]; },
    (plan: any) => { plan.coverage.requirementCriteria.push({ requirementIndex: 1, criterionIds: ["c2"] }); },
    (plan: any) => { plan.coverage.supportedPathCriterionId = "c1"; },
    (plan: any) => { plan.acceptanceChecks[1].kind = "acceptance"; },
    (plan: any) => { plan.acceptanceChecks[1].judge = "critic"; },
    (plan: any) => { plan.acceptanceChecks[1].basis = [{ kind: "intent-requirement", index: 1 }]; },
  ]) {
    const plan = clone(validPlan()) as any;
    mutate(plan);
    const candidate = parseQualityPlanCandidate(plan);
    assert.equal(candidate === null ? null : bindTaskSpec(intent, candidate), null);
  }
});

test("quality: critic mode and contract authority cannot create hidden gates", () => {
  const intent = boundIntent();
  const criticCheck = acceptance("c3", {
    promise: "The bounded artifact contains no broken owner-facing label.",
    judge: "critic",
    basis: [{ kind: "intent-outcome" }],
    failureCondition: {
      id: "failure-c3",
      statement: "The bounded artifact contains a broken owner-facing label.",
      allowedArtifactIds: ["artifact-output"],
    },
    evidenceStandard: {
      mode: "artifact-inspection",
      proves: "The bounded artifact was inspected against the frozen failure condition.",
      precondition: null,
    },
  });

  const required = clone(validPlan()) as any;
  required.critic = { mode: "required", basis: [{ kind: "intent-outcome" }], reason: "The owner requires inspection." };
  required.acceptanceChecks.push(criticCheck);
  required.coverage.outcomeCriterionIds = ["c1", "c3"];
  const requiredCandidate = parseQualityPlanCandidate(required);
  assert.ok(requiredCandidate);
  assert.ok(bindTaskSpec(intent, requiredCandidate));

  for (const mode of ["optional", "off"]) {
    const hidden = clone(required) as any;
    hidden.critic = { mode, basis: [{ kind: "cairn-default", reason: "not-requested" }], reason: "Advisory only." };
    const candidate = parseQualityPlanCandidate(hidden);
    assert.equal(candidate === null ? null : bindTaskSpec(intent, candidate), null);
  }

  const contractSections: readonly ContractSectionAuthorityV1[] = Object.freeze([
    Object.freeze({ section: "task-records-are-memory", sha256: CONTRACT_SHA }),
  ]);
  const contractPlan = clone(validPlan()) as any;
  contractPlan.acceptanceChecks[0].basis = [{
    kind: "contract", section: "task-records-are-memory", sha256: CONTRACT_SHA,
  }];
  contractPlan.coverage.outcomeCriterionIds = [];
  const contractCandidate = parseQualityPlanCandidate(contractPlan);
  assert.ok(contractCandidate);
  assert.equal(bindTaskSpec(intent, contractCandidate), null, "outcome coverage is still mandatory");
  contractPlan.acceptanceChecks.push(acceptance("c3", {
    basis: [{ kind: "intent-outcome" }],
    failureCondition: { id: "failure-c3", statement: "Outcome absent.", allowedArtifactIds: ["artifact-output"] },
  }));
  contractPlan.coverage.outcomeCriterionIds = ["c3"];
  const resolved = parseQualityPlanCandidate(contractPlan);
  assert.ok(resolved);
  assert.equal(bindTaskSpec(intent, resolved), null, "contract provenance is unavailable by default");
  assert.ok(bindTaskSpec(intent, resolved, contractSections));
  assert.equal(bindTaskSpec(intent, resolved, [{ section: "task-records-are-memory", sha256: "b".repeat(64) }]), null);
  assert.equal(bindTaskSpec(intent, resolved, [{ section: "Task-Records-Are-Memory", sha256: CONTRACT_SHA }]), null);
});

test("quality: frozen references compare only declared states/dimensions and never make uncertain taste required", () => {
  const referenceState = state("reference-main");
  const reference = {
    id: "reference-one",
    title: "Owner supplied reference",
    basis: { kind: "intent-requirement", index: 0 },
    locator: "project-snapshot/reference-one",
    snapshotSha256: "d".repeat(64),
    capturedAt: "2026-08-07T17:00:00.000Z",
    state: referenceState,
    stateSha256: stateDigest(referenceState),
    dimensions: [{ id: "layout", description: "Declared layout relationship." }],
    antiCopyBoundary: "Do not copy brand text, assets, or code.",
  };
  const comparison = {
    id: "comparison-one",
    referenceId: "reference-one",
    dimensionId: "layout",
    candidateStateId: "candidate-main",
    comparator: "match",
    threshold: "The declared layout relationship is preserved.",
    tieOutcome: "meets",
  };
  const required = clone(validPlan()) as any;
  required.references = [reference];
  required.acceptanceChecks.push(acceptance("c3", {
    promise: "The owner-observed layout matches the declared reference dimension.",
    kind: "comparison",
    judge: "owner",
    basis: [{ kind: "intent-requirement", index: 0 }],
    failureCondition: {
      id: "failure-c3",
      statement: "The owner observes that the declared layout dimension does not match.",
      allowedArtifactIds: ["artifact-comparison"],
    },
    evidenceStandard: {
      mode: "comparison",
      proves: "The owner observed the blinded declared comparison.",
      precondition: "Both frozen states are available.",
    },
    comparison,
  }));
  required.coverage.requirementCriteria[0].criterionIds = ["c2", "c3"];
  const parsed = parseQualityPlanCandidate(required);
  assert.ok(parsed);
  assert.ok(bindTaskSpec(boundIntent(), parsed));

  const criticJudge = clone(required) as any;
  criticJudge.acceptanceChecks[2].judge = "critic";
  assert.equal(parseQualityPlanCandidate(criticJudge), null, "subjective comparison cannot become a critic veto");
  const falseTie = clone(required) as any;
  falseTie.acceptanceChecks[2].comparison.tieOutcome = "does-not-meet";
  assert.equal(parseQualityPlanCandidate(falseTie), null, "match treats a tie as meeting the bar");
  const wrongStateHash = clone(required) as any;
  wrongStateHash.references[0].state.locale = "fr-FR";
  assert.equal(parseQualityPlanCandidate(wrongStateHash), null);
  const unknownDimension = clone(required) as any;
  unknownDimension.acceptanceChecks[2].comparison.dimensionId = "invented";
  assert.equal(parseQualityPlanCandidate(unknownDimension), null);

  const uncertain = clone(validPlan()) as any;
  uncertain.references = [{
    ...reference,
    basis: { kind: "intent-requirement", index: 1 },
  }];
  uncertain.qualityPreferences[0].comparison = comparison;
  const uncertainParsed = parseQualityPlanCandidate(uncertain);
  assert.ok(uncertainParsed);
  assert.ok(bindTaskSpec(boundIntent(), uncertainParsed), "owner-unsure references may remain advisory pN evidence");

  const hiddenGate = clone(required) as any;
  hiddenGate.references[0].basis = { kind: "intent-requirement", index: 1 };
  const hiddenParsed = parseQualityPlanCandidate(hiddenGate);
  assert.ok(hiddenParsed);
  assert.equal(bindTaskSpec(boundIntent(), hiddenParsed), null, "owner-unsure reference cannot support cN");
});

test("quality: a task with no comparison needs no invented candidate state", () => {
  const noComparisonState = clone(validPlan()) as any;
  noComparisonState.candidateStates = [];
  const parsed = parseQualityPlanCandidate(noComparisonState);
  assert.ok(parsed);
  assert.ok(bindTaskSpec(boundIntent(), parsed));
});

test("quality: canonical Task Spec bytes are branded, stable, complete, and insertion-order independent", () => {
  const spec = bind();
  const canonical = canonicalTaskSpec(spec);
  const digest = taskSpecSha256(spec);
  assert.ok(canonical);
  assert.equal(digest, createHash("sha256").update(canonical, "utf8").digest("hex"));
  assert.equal(canonicalTaskSpec(clone(spec)), null);
  assert.equal(taskSpecSha256(Object.freeze(clone(spec))), null);
  assert.equal(taskSpecReviewView(clone(spec)), null);

  const reordered = {
    coverage: clone(validPlan().coverage),
    unknowns: clone(validPlan().unknowns),
    references: [],
    qualityPreferences: clone(validPlan().qualityPreferences),
    acceptanceChecks: clone(validPlan().acceptanceChecks),
    candidateStates: clone(validPlan().candidateStates),
    critic: clone(validPlan().critic),
    supportedPath: clone(validPlan().supportedPath),
    target: clone(validPlan().target),
    version: QUALITY_PLAN_VERSION,
  };
  assert.equal(canonicalTaskSpec(bind(reordered)), canonical);

  const mutations: Array<(plan: any) => void> = [
    (plan) => { plan.target.kind = "disabled-experiment"; },
    (plan) => { plan.supportedPath.statement += " Safely."; },
    (plan) => { plan.critic.reason += " Explicitly."; },
    (plan) => { plan.candidateStates[0].locale = "fr-FR"; },
    (plan) => { plan.acceptanceChecks[0].promise += " Confirmed."; },
    (plan) => { plan.qualityPreferences[0].desiredDirection += " If possible."; },
    (plan) => { plan.unknowns[0].text += " Still unresolved."; },
  ];
  for (const mutate of mutations) {
    const plan = clone(validPlan()) as any;
    mutate(plan);
    const candidate = parseQualityPlanCandidate(plan);
    assert.ok(candidate);
    const variant = bindTaskSpec(boundIntent(), candidate);
    assert.ok(variant);
    assert.notEqual(taskSpecSha256(variant), digest);
  }

  const poisoned = Object.prototype as { toJSON?: () => unknown };
  const prior = poisoned.toJSON;
  try {
    poisoned.toJSON = () => ({ forged: true });
    assert.equal(canonicalTaskSpec(spec), canonical);
  } finally {
    if (prior) poisoned.toJSON = prior;
    else delete poisoned.toJSON;
  }
});

test("quality: review projection is frozen output only and omits custody/locator fields", () => {
  const spec = bind();
  const view = taskSpecReviewView(spec);
  assert.ok(view);
  assert.ok(Object.isFrozen(view));
  assert.ok(Object.isFrozen(view.criteria));
  const text = JSON.stringify(view);
  assert.doesNotMatch(text, new RegExp(OWNER_INPUT_ID, "i"));
  assert.doesNotMatch(text, /private context note/i);
  assert.doesNotMatch(text, /locator/i);
  assert.equal(parseQualityPlanCandidate(view), null);
  assert.deepEqual(view.callBudget, TASK_CALL_BUDGET_V1);
});

test("quality: serialized Task Specs reauthenticate intent and exact fixed budget", () => {
  const spec = bind();
  const restored = validateTaskSpec(clone(spec), sources);
  assert.ok(restored);
  assert.equal(canonicalTaskSpec(restored), canonicalTaskSpec(spec));

  const wrongSource = [{ ...sources[0], text: "The authenticated owner source changed." }];
  assert.equal(validateTaskSpec(clone(spec), wrongSource), null);

  for (const change of [
    { maxRepairCalls: 2 },
    { maxCriticAttempts: 4 },
    { enforceableDollarLimitCents: 1 },
  ]) {
    const stored = clone(spec) as any;
    Object.assign(stored.callBudget, change);
    assert.equal(validateTaskSpec(stored, sources), null);
  }
});

test("quality: initial Evidence Plan is exact, branded, complete, and hash-bound", () => {
  const spec = bind();
  const plan = initialEvidencePlan(spec);
  assert.equal(plan.revision, 0);
  assert.equal(plan.previousPlanSha256, null);
  assert.deepEqual(plan.revisionReasonEvidenceRefs, []);
  assert.ok(Object.isFrozen(plan));
  assert.ok(plan.procedures.every(Object.isFrozen));
  assert.ok(plan.procedures[0]?.command);
  assert.equal(
    plan.procedures[0]?.command?.sha256,
    createHash("sha256").update(plan.procedures[0]?.command?.text ?? "", "utf8").digest("hex"),
  );
  const canonical = canonicalEvidencePlan(plan);
  assert.ok(canonical);
  assert.equal(evidencePlanSha256(plan), createHash("sha256").update(canonical, "utf8").digest("hex"));
  assert.equal(canonicalEvidencePlan(clone(plan)), null);

  const missing = {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [{
      criterionId: "c1", kind: "adapter-command-attestation", command: command(), artifactIds: ["artifact-output"],
    }],
  };
  assert.equal(bindInitialEvidencePlan(spec, missing), null);

  const widened = clone({
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [
      { criterionId: "c1", kind: "adapter-command-attestation", command: command(), artifactIds: ["not-allowed"] },
      { criterionId: "c2", kind: "packet-artifact", command: null, artifactIds: ["artifact-regression"] },
    ],
  });
  assert.equal(bindInitialEvidencePlan(spec, widened), null);
});

function preview(
  spec: TaskSpecV1,
  changeKind: "executable-path" | "fixture-path" | "timeout-increase" | "result-parser-mode",
  replacement: EvidenceCommandCandidateV1,
): EvidencePlanRevisionPreviewV1 {
  const initial = initialEvidencePlan(spec);
  const value = previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind,
    replacementCommand: replacement,
  }, ["main-harness-evidence"]);
  assert.ok(value);
  return value;
}

test("quality: Evidence Plan revision permits only one typed mechanical delta", () => {
  const spec = bind();
  assert.ok(preview(spec, "executable-path", command({ executablePath: "node-alt" })));
  assert.ok(preview(spec, "fixture-path", command({
    fixtureBindings: [{ id: "suite", path: "dist/test/quality-fixed.test.js", sha256: "f".repeat(64) }],
  })));
  assert.ok(preview(spec, "timeout-increase", command({ timeoutMs: 90_000 })));
  assert.ok(preview(spec, "result-parser-mode", command({ resultParserMode: "node-test-tap-crlf" })));

  const initial = initialEvidencePlan(spec);
  assert.equal(previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind: "timeout-increase",
    replacementCommand: command({ timeoutMs: 30_000 }),
  }, ["main-harness-evidence"]), null);
  assert.equal(previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind: "executable-path",
    replacementCommand: command({ executablePath: "node-alt", assertion: { id: "easier", expectedResult: "anything" } }),
  }, ["main-harness-evidence"]), null);
  assert.equal(previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind: "fixture-path",
    replacementCommand: command({
      fixtureBindings: [{ id: "suite", path: "../outside.test.js", sha256: "f".repeat(64) }],
    }),
  }, ["main-harness-evidence"]), null);
  assert.equal(previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind: "executable-path",
    replacementCommand: command({ executablePath: "curl", executableSha256: "0".repeat(64) }),
  }, ["main-harness-evidence"]), null, "an executable path repair cannot change executable identity");
  assert.equal(previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind: "fixture-path",
    replacementCommand: command({
      fixtureBindings: [{ id: "suite", path: "dist/test/quality-fixed.test.js", sha256: "0".repeat(64) }],
    }),
  }, ["main-harness-evidence"]), null, "a fixture path repair cannot change fixture content");
  assert.equal(previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind: "result-parser-mode",
    replacementCommand: command({ resultParserMode: "exit-code" }),
  }, ["main-harness-evidence"]), null, "a parser repair cannot weaken to a different assertion family");
});

test("quality: revision authorization binds exact hashes, owner action, main evidence, and failure pairing", () => {
  const spec = bind();
  const initial = initialEvidencePlan(spec);
  const revision = previewEvidencePlanRevision(spec, initial, {
    criterionId: "c1",
    changeKind: "timeout-increase",
    replacementCommand: command({ timeoutMs: 90_000 }),
  }, ["main-harness-evidence"]);
  assert.ok(revision);
  const authorization = {
    version: EVIDENCE_PLAN_REVISION_AUTHORIZATION_VERSION,
    runId: "22222222-2222-4222-8222-222222222222",
    taskSpecSha256: taskSpecSha256(spec),
    criterionId: "c1",
    fromPlanSha256: revision.fromPlanSha256,
    toPlanSha256: revision.toPlanSha256,
    unchangedAuthoritySha256: revision.unchangedAuthoritySha256,
    changeKind: "timeout-increase",
    mainHarnessFailureCode: "TIMED_OUT_BEFORE_ASSERTION",
    mainEvidenceRefs: ["main-harness-evidence"],
    ownerActionNonce: "33333333-3333-4333-8333-333333333333",
    approvedAt: "2026-08-07T18:00:00.000Z",
  };
  const authorityContext = {
    version: EVIDENCE_PLAN_REVISION_AUTHORITY_CONTEXT_VERSION,
    runId: authorization.runId,
    taskSpecSha256: authorization.taskSpecSha256,
    criterionId: authorization.criterionId,
    fromPlanSha256: authorization.fromPlanSha256,
    toPlanSha256: authorization.toPlanSha256,
    unchangedAuthoritySha256: authorization.unchangedAuthoritySha256,
    changeKind: authorization.changeKind,
    mainHarnessFailureCode: authorization.mainHarnessFailureCode,
    mainEvidenceRefs: [...authorization.mainEvidenceRefs],
    ownerActionNonce: authorization.ownerActionNonce,
    approvedAt: authorization.approvedAt,
  };
  const authorized = authorizeEvidencePlanRevision(spec, initial, revision, authorization, authorityContext);
  assert.ok(authorized);
  assert.equal(authorized.plan.revision, 1);
  assert.equal(authorized.plan.previousPlanSha256, evidencePlanSha256(initial));
  assert.ok(Object.isFrozen(authorized.authorization));
  assert.ok(canonicalEvidencePlan(authorized.plan));
  assert.equal(previewEvidencePlanRevision(spec, authorized.plan, {
    criterionId: "c1", changeKind: "timeout-increase", replacementCommand: command({ timeoutMs: 120_000 }),
  }, ["second"]), null, "a second revision is impossible");

  for (const mutate of [
    (value: any) => { value.toPlanSha256 = "f".repeat(64); },
    (value: any) => { value.unchangedAuthoritySha256 = "f".repeat(64); },
    (value: any) => { value.mainHarnessFailureCode = "HARNESS_PARSE_ERROR"; },
    (value: any) => { value.mainEvidenceRefs = ["different-evidence"]; },
    (value: any) => { value.ownerActionNonce = "not-a-uuid"; },
  ]) {
    const bad = clone(authorization) as any;
    mutate(bad);
    assert.equal(authorizeEvidencePlanRevision(spec, initial, revision, bad, authorityContext), null);
  }

  for (const mutate of [
    (value: any) => { value.runId = "44444444-4444-4444-8444-444444444444"; },
    (value: any) => { value.taskSpecSha256 = "f".repeat(64); },
    (value: any) => { value.criterionId = "c2"; },
    (value: any) => { value.fromPlanSha256 = "f".repeat(64); },
    (value: any) => { value.toPlanSha256 = "f".repeat(64); },
    (value: any) => { value.unchangedAuthoritySha256 = "f".repeat(64); },
    (value: any) => { value.changeKind = "result-parser-mode"; },
    (value: any) => { value.ownerActionNonce = "55555555-5555-4555-8555-555555555555"; },
    (value: any) => { value.approvedAt = "2026-08-07T18:00:01.000Z"; },
    (value: any) => { value.mainHarnessFailureCode = "HARNESS_PARSE_ERROR"; },
    (value: any) => { value.mainEvidenceRefs = ["second", "main-harness-evidence"]; },
  ]) {
    const wrongContext = clone(authorityContext) as any;
    mutate(wrongContext);
    assert.equal(authorizeEvidencePlanRevision(spec, initial, revision, authorization, wrongContext), null);
  }

  assert.equal(authorizeEvidencePlanRevision(spec, initial, revision, authorization, {
    ...authorityContext,
    extra: true,
  }), null);
  const accessorContext = clone(authorityContext) as any;
  Object.defineProperty(accessorContext, "runId", { enumerable: true, get: () => authorityContext.runId });
  assert.equal(authorizeEvidencePlanRevision(spec, initial, revision, authorization, accessorContext), null);
  assert.equal(authorizeEvidencePlanRevision(spec, initial, revision, authorization, new Proxy(authorityContext, {})), null);
});
