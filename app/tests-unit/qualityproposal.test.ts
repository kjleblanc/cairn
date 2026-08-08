import test from "node:test";
import assert from "node:assert/strict";
import {
  bindTaskIntent,
  canonicalTaskSpec,
  createDirectTaskIntent,
  parseTaskIntentCandidate,
  taskSpecSha256,
  validateTaskSpec,
  type TaskIntent,
} from "@cairn/core";
import {
  composeConversationTaskSpecProposal,
  composeDirectTaskSpecProposal,
  parseConductorQualityProposal,
  sameConductorQualityProposal,
} from "../src/main/conductor/qualityproposal.js";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const DIRECT_ID = "22222222-2222-4222-8222-222222222222";
const OWNER_TEXT = "Show the status badge. Keep the save flow working. Maybe use rounded corners.";

const failureFor = (promise: string) =>
  `The result does not satisfy this exact request or its supported path: ${promise}`;
const proofFor = (promise: string) =>
  `The approved check answers this exact request and its supported path: ${promise}`;

function conversationIntent(overrides: Record<string, unknown> = {}): TaskIntent {
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Show the status badge.",
      ownerQuote: "Show the status badge.",
    },
    requirements: [
      {
        source: "owner-stated",
        text: "Keep the save flow working.",
        ownerQuote: "Keep the save flow working.",
      },
      {
        source: "owner-unsure",
        text: "Maybe use rounded corners.",
        ownerQuote: "Maybe use rounded corners.",
      },
      {
        source: "cairn-chosen",
        text: "Keep the label short.",
        ownerQuote: null,
      },
    ],
    context: [],
    ...overrides,
  });
  assert.ok(candidate);
  const intent = bindTaskIntent(candidate, [{ kind: "conversation", inputId: OWNER_ID, text: OWNER_TEXT }]);
  assert.ok(intent);
  return intent;
}

function check(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    promise: "Show the status badge.",
    basis: [{ kind: "outcome" }],
    supportsPath: false,
    judge: "cairn",
    failure: failureFor("Show the status badge."),
    evidence: {
      mode: "adapter-attestation",
      proves: proofFor("Show the status badge."),
      precondition: null,
    },
    ...overrides,
  };
}

function quality(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: "cairn-quality-proposal/v1",
    supportedPath: {
      statement: "Keep the save flow working.",
      basis: [{ kind: "requirement", position: 1 }],
    },
    critic: {
      mode: "optional",
      reason: "No required critic was requested.",
      basis: [],
    },
    checks: [
      check(),
      check({
        promise: "Keep the save flow working.",
        basis: [{ kind: "requirement", position: 1 }],
        supportsPath: true,
        failure: failureFor("Keep the save flow working."),
        evidence: {
          mode: "adapter-attestation",
          proves: proofFor("Keep the save flow working."),
          precondition: null,
        },
      }),
    ],
    preferences: [{
      dimension: "Corner shape",
      desiredDirection: "Prefer rounded corners when they do not change required behavior.",
      basis: [{ kind: "requirement", position: 2 }],
    }],
    referenceRequests: [],
    unknowns: [{
      text: "The owner has not adopted rounded corners as a promise.",
      basis: [{ kind: "requirement", position: 2 }],
    }],
    ...overrides,
  };
}

function parsedQuality(overrides: Record<string, unknown> = {}) {
  const parsed = parseConductorQualityProposal(quality(overrides));
  assert.ok(parsed);
  return parsed;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

test("quality proposal: strict content grammar detaches and deeply freezes a valid proposal", () => {
  const raw = quality();
  const parsed = parseConductorQualityProposal(raw);
  assert.ok(parsed);
  assert.notEqual(parsed, raw);
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.supportedPath), true);
  assert.equal(Object.isFrozen(parsed.supportedPath.basis), true);
  assert.equal(Object.isFrozen(parsed.checks), true);
  assert.equal(Object.isFrozen(parsed.checks[0]), true);
  assert.equal(Object.isFrozen(parsed.checks[0].evidence), true);
  assert.equal(Object.isFrozen(parsed.preferences), true);
  assert.equal(Object.isFrozen(parsed.unknowns), true);
  assert.equal(JSON.stringify(parsed).includes("inputId"), false);
  assert.equal(JSON.stringify(parsed).includes("c1"), false);
  assert.equal(JSON.stringify(parsed).includes("sha256"), false);

  (raw.supportedPath as { statement: string }).statement = "Mutated after parsing.";
  assert.equal(parsed.supportedPath.statement, "Keep the save flow working.");
});

test("quality proposal: exact records reject model-authored ids, coverage, hashes, offsets, and custody", () => {
  const mutations: Array<(value: any) => void> = [
    (value) => { value.taskSpecSha256 = "a".repeat(64); },
    (value) => { value.coverage = { outcomeCriterionIds: ["c1"] }; },
    (value) => { value.checks[0].id = "c1"; },
    (value) => { value.checks[0].failureId = "failure-c1"; },
    (value) => { value.checks[0].evidence.artifactIds = ["artifact-c1-1"]; },
    (value) => { value.supportedPath.basis[0].source = "owner-stated"; },
    (value) => { value.supportedPath.basis[0].start = 0; },
    (value) => { value.critic.verdict = "PASS"; },
    (value) => { value.runId = "model-run"; },
  ];
  for (const mutate of mutations) {
    const value: any = quality();
    mutate(value);
    assert.equal(parseConductorQualityProposal(value), null);
  }
});

test("quality proposal: hostile objects, sparse arrays, symbols, accessors, and malformed UTF-16 fail closed", () => {
  let getterRead = false;
  const getter = quality() as any;
  Object.defineProperty(getter, "checks", {
    enumerable: true,
    get() {
      getterRead = true;
      return [];
    },
  });
  assert.equal(parseConductorQualityProposal(getter), null);
  assert.equal(getterRead, false);

  assert.equal(parseConductorQualityProposal(new Proxy(quality(), {})), null);
  const symbol = quality() as any;
  symbol[Symbol("authority")] = true;
  assert.equal(parseConductorQualityProposal(symbol), null);

  const sparse = quality() as any;
  sparse.checks = Array(2);
  sparse.checks[0] = check();
  assert.equal(parseConductorQualityProposal(sparse), null);

  const arrayProperty = quality() as any;
  arrayProperty.checks.extra = true;
  assert.equal(parseConductorQualityProposal(arrayProperty), null);

  const malformed = quality() as any;
  malformed.checks[0].promise = "broken\ud800";
  assert.equal(parseConductorQualityProposal(malformed), null);

  const control = quality() as any;
  control.checks[0].promise = "Visible\u202epromise";
  assert.equal(parseConductorQualityProposal(control), null);
});

test("quality proposal: basis arrays are exact, unique, one-based, dense, and bounded", () => {
  for (const basis of [
    [],
    [{ kind: "requirement", position: 0 }],
    [{ kind: "requirement", position: 9 }],
    [{ kind: "requirement", position: 1.5 }],
    [{ kind: "requirement", position: 1, index: 0 }],
    [{ kind: "outcome" }, { kind: "outcome" }],
    [{ kind: "intent-outcome" }],
  ]) {
    const value: any = quality();
    value.checks[0].basis = basis;
    assert.equal(parseConductorQualityProposal(value), null, JSON.stringify(basis));
  }
});

test("quality proposal: vague promises, nonempty references, and dishonest judge/evidence pairs are refused", () => {
  for (const promise of ["Make it perfect.", "The page looks premium.", "The result is beautiful.", "The app is fast."]) {
    const value: any = quality();
    value.checks[0].promise = promise;
    assert.equal(parseConductorQualityProposal(value), null, promise);
  }

  const bounded: any = quality();
  bounded.checks[0].promise = "The response completes in 200 ms.";
  assert.ok(parseConductorQualityProposal(bounded));

  const reference: any = quality();
  reference.referenceRequests = [{ title: "Live site", url: "https://example.com" }];
  assert.equal(parseConductorQualityProposal(reference), null);

  for (const [judge, mode] of [
    ["critic", "adapter-attestation"],
    ["owner", "artifact-inspection"],
    ["cairn", "owner-observation"],
  ]) {
    const value: any = quality();
    value.checks[0].judge = judge;
    value.checks[0].evidence.mode = mode;
    assert.equal(parseConductorQualityProposal(value), null, `${judge}/${mode}`);
  }
});

test("conversation composer assigns contiguous ids, reverse coverage, sources, and the fixed budget", () => {
  const intent = conversationIntent();
  const result = composeConversationTaskSpecProposal(intent, parsedQuality());
  assert.ok(result);
  assert.equal(result.taskSpec.intent, intent);
  assert.deepEqual(result.taskSpec.quality.acceptanceChecks.map((row) => row.id), ["c1", "c2"]);
  assert.deepEqual(result.taskSpec.quality.qualityPreferences.map((row) => row.id), ["p1"]);
  assert.deepEqual(result.taskSpec.quality.coverage, {
    outcomeCriterionIds: ["c1"],
    requirementCriteria: [{ requirementIndex: 0, criterionIds: ["c2"] }],
    supportedPathCriterionId: "c2",
  });
  assert.equal(result.taskSpec.quality.acceptanceChecks.filter((row) => row.kind === "non-regression").length, 1);
  assert.deepEqual(result.preview.request.outcome, {
    source: "owner-stated",
    text: "Show the status badge.",
    ownerText: "Show the status badge.",
  });
  assert.equal(result.preview.request.requirements[0].ownerText, "Keep the save flow working.");
  assert.equal(result.preview.request.requirements[1].ownerText, "Maybe use rounded corners.");
  assert.deepEqual(result.preview.criteria.map((row) => [row.id, row.sources]), [
    ["c1", ["owner outcome"]],
    ["c2", ["requirement 1: owner-stated"]],
  ]);
  assert.deepEqual(result.preview.preferences.map((row) => [row.id, row.sources]), [
    ["p1", ["requirement 2: owner-unsure"]],
  ]);
  assert.deepEqual(result.preview.unknowns[0].sources, ["requirement 2: owner-unsure"]);
  assert.equal(result.preview.critic.mode, "optional");
  assert.deepEqual(result.preview.critic.sources, ["Cairn default: not-requested"]);
  assert.deepEqual(result.preview.callBudget, {
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
  assert.ok(canonicalTaskSpec(result.taskSpec));
  assert.ok(taskSpecSha256(result.taskSpec));
});

test("conversation preview is deeply frozen and omits private authority fields", () => {
  const result = composeConversationTaskSpecProposal(conversationIntent(), parsedQuality());
  assert.ok(result);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.preview), true);
  assert.equal(Object.isFrozen(result.preview.request), true);
  assert.equal(Object.isFrozen(result.preview.request.requirements), true);
  assert.equal(Object.isFrozen(result.preview.criteria), true);
  assert.equal(Object.isFrozen(result.preview.criteria[0].sources), true);
  assert.equal(Object.isFrozen(result.preview.criteria[0].evidence), true);
  assert.equal(Object.isFrozen(result.preview.preferences), true);
  assert.equal(Object.isFrozen(result.preview.unknowns), true);
  assert.equal(Object.isFrozen(result.preview.callBudget), true);
  const json = JSON.stringify(result.preview);
  for (const privateName of [
    "taskSpecSha256", OWNER_ID, "inputId", "start", "end", "failure-c1", "artifact-c1-1",
    "snapshotSha256", "stateSha256", "locator", "coverage", "verdict", "runId", "custody",
  ]) {
    assert.equal(json.includes(privateName), false, privateName);
  }
});

test("conversation composer refuses missing or forged reverse coverage and supported-path ambiguity", () => {
  const intent = conversationIntent();
  const cases: Array<(value: any) => void> = [
    (value) => { value.checks = value.checks.slice(1); },
    (value) => { value.checks[1].basis = [{ kind: "outcome" }]; },
    (value) => { value.checks[0].supportsPath = true; },
    (value) => { value.checks[1].supportsPath = false; },
    (value) => { value.checks[0].basis = [{ kind: "requirement", position: 2 }]; },
    (value) => { value.checks[0].basis = [{ kind: "requirement", position: 3 }]; },
    (value) => { value.unknowns[0].basis = [{ kind: "outcome" }]; },
  ];
  for (const mutate of cases) {
    const raw: any = quality();
    mutate(raw);
    const proposal = parseConductorQualityProposal(raw);
    assert.ok(proposal);
    assert.equal(composeConversationTaskSpecProposal(intent, proposal), null);
  }
});

test("conversation composer rejects material choices that are absent from every cited owner row", () => {
  const raw: any = quality();
  raw.checks[0].promise = "The status badge uses Google OAuth.";
  raw.checks[0].failure = "The status badge does not use Google OAuth.";
  raw.checks[0].evidence.proves = "The status badge Google OAuth choice was inspected.";
  const proposal = parseConductorQualityProposal(raw);
  assert.ok(proposal, "the content-only parser should not pretend to authenticate prose");
  assert.equal(composeConversationTaskSpecProposal(conversationIntent(), proposal), null);

  for (const promise of [
    "The requested status badge is not visible.",
    "The requested status badge uses Go.",
  ]) {
    const changed: any = quality();
    changed.checks[0].promise = promise;
    const parsed = parseConductorQualityProposal(changed);
    assert.ok(parsed);
    assert.equal(composeConversationTaskSpecProposal(conversationIntent(), parsed), null, promise);
  }

  const invertedPath: any = quality();
  invertedPath.supportedPath.statement = "The save flow does not work.";
  invertedPath.checks[1].promise = "The save flow does not work.";
  const parsedInversion = parseConductorQualityProposal(invertedPath);
  assert.ok(parsedInversion);
  assert.equal(composeConversationTaskSpecProposal(conversationIntent(), parsedInversion), null);

  const mismatchedPath: any = quality();
  mismatchedPath.supportedPath.statement = "The save flow remains usable.";
  const parsedMismatch = parseConductorQualityProposal(mismatchedPath);
  assert.ok(parsedMismatch);
  assert.equal(composeConversationTaskSpecProposal(conversationIntent(), parsedMismatch), null);

  const badFailure: any = quality();
  badFailure.checks[0].failure = "The requested status badge is visible.";
  const parsedBadFailure = parseConductorQualityProposal(badFailure);
  assert.ok(parsedBadFailure);
  assert.equal(composeConversationTaskSpecProposal(conversationIntent(), parsedBadFailure), null);

  const badEvidence: any = quality();
  badEvidence.checks[0].evidence.proves = "The requested status badge is absent.";
  const parsedBadEvidence = parseConductorQualityProposal(badEvidence);
  assert.ok(parsedBadEvidence);
  assert.equal(composeConversationTaskSpecProposal(conversationIntent(), parsedBadEvidence), null);
});

test("conversation promises must preserve exact owner words, not inferred polarity or verbs", () => {
  for (const [ownerText, proposedPromise] of [
    ["Show the status badge and do not hide the status badge.", "The status badge is not visible."],
    ["Remove the status badge.", "Show the status badge."],
    ["Do not hide the status badge.", "Do not fail to hide the status badge."],
  ]) {
    const candidate = parseTaskIntentCandidate({
      version: "cairn-task-intent/v1",
      outcome: { source: "owner-stated", text: ownerText, ownerQuote: ownerText },
      requirements: [],
      context: [],
    });
    assert.ok(candidate);
    const intent = bindTaskIntent(candidate, [{ kind: "conversation", inputId: OWNER_ID, text: ownerText }]);
    assert.ok(intent);
    const proposal = parseConductorQualityProposal({
      version: "cairn-quality-proposal/v1",
      supportedPath: { statement: proposedPromise, basis: [{ kind: "outcome" }] },
      critic: { mode: "optional", reason: "No required critic was requested.", basis: [] },
      checks: [{
        promise: proposedPromise,
        basis: [{ kind: "outcome" }],
        supportsPath: true,
        judge: "cairn",
        failure: failureFor(proposedPromise),
        evidence: { mode: "adapter-attestation", proves: proofFor(proposedPromise), precondition: null },
      }],
      preferences: [],
      referenceRequests: [],
      unknowns: [],
    });
    assert.ok(proposal);
    assert.equal(composeConversationTaskSpecProposal(intent, proposal), null, `${ownerText} -> ${proposedPromise}`);
  }
});

test("conversation exact words still refuse open-ended or delegated required gates", () => {
  for (const ownerText of ["Make it work.", "You decide."]) {
    const candidate = parseTaskIntentCandidate({
      version: "cairn-task-intent/v1",
      outcome: { source: "owner-stated", text: ownerText, ownerQuote: ownerText },
      requirements: [],
      context: [],
    });
    assert.ok(candidate);
    const intent = bindTaskIntent(candidate, [{ kind: "conversation", inputId: OWNER_ID, text: ownerText }]);
    assert.ok(intent);
    const proposal = parseConductorQualityProposal({
      version: "cairn-quality-proposal/v1",
      supportedPath: { statement: ownerText, basis: [{ kind: "outcome" }] },
      critic: { mode: "optional", reason: "No required critic was requested.", basis: [] },
      checks: [{
        promise: ownerText,
        basis: [{ kind: "outcome" }],
        supportsPath: true,
        judge: "cairn",
        failure: failureFor(ownerText),
        evidence: { mode: "adapter-attestation", proves: proofFor(ownerText), precondition: null },
      }],
      preferences: [],
      referenceRequests: [],
      unknowns: [],
    });
    assert.ok(proposal);
    assert.equal(composeConversationTaskSpecProposal(intent, proposal), null, ownerText);
  }
});

test("a changed authenticated owner source makes the frozen conversation spec unusable", () => {
  const result = composeConversationTaskSpecProposal(conversationIntent(), parsedQuality());
  assert.ok(result);
  const originalSources = [{ kind: "conversation", inputId: OWNER_ID, text: OWNER_TEXT }];
  const validated = validateTaskSpec(result.taskSpec, originalSources);
  assert.ok(validated);
  assert.equal(taskSpecSha256(validated), taskSpecSha256(result.taskSpec));
  assert.equal(validateTaskSpec(result.taskSpec, [{
    kind: "conversation",
    inputId: OWNER_ID,
    text: OWNER_TEXT.replace("status badge", "account badge"),
  }]), null);
});

test("conversation composer derives critic policy only from exact owner quotes", () => {
  const requiredText = "Show the status badge and use the critic. Keep the save flow working.";
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Show the status badge and use the critic.",
      ownerQuote: "Show the status badge and use the critic.",
    },
    requirements: [{
      source: "owner-stated",
      text: "Keep the save flow working.",
      ownerQuote: "Keep the save flow working.",
    }],
    context: [],
  });
  assert.ok(candidate);
  const reboundRequired = bindTaskIntent(candidate, [{ kind: "conversation", inputId: OWNER_ID, text: requiredText }]);
  assert.ok(reboundRequired);

  const requiredRaw: any = quality({
    critic: {
      mode: "required",
      reason: "The owner's exact request requires a critic.",
      basis: [{ kind: "outcome" }],
    },
    preferences: [],
    unknowns: [],
  });
  requiredRaw.checks[0] = check({
    promise: "Show the status badge and use the critic.",
    failure: failureFor("Show the status badge and use the critic."),
    evidence: {
      mode: "adapter-attestation",
      proves: proofFor("Show the status badge and use the critic."),
      precondition: null,
    },
  });
  const required = parseConductorQualityProposal(requiredRaw);
  assert.ok(required);
  assert.equal(composeConversationTaskSpecProposal(reboundRequired, required)?.preview.critic.mode, "required");

  const ordinary = conversationIntent();
  assert.equal(composeConversationTaskSpecProposal(ordinary, required), null,
    "a model cannot promote silence to required critic authority");

  const optionalWithBasis: any = quality();
  optionalWithBasis.critic.basis = [{ kind: "outcome" }];
  assert.equal(parseConductorQualityProposal(optionalWithBasis), null);
});

test("critic off/optional cannot hide a critic-judged promise", () => {
  const criticCheck: any = quality();
  criticCheck.checks[0].judge = "critic";
  criticCheck.checks[0].evidence.mode = "artifact-inspection";
  const proposal = parseConductorQualityProposal(criticCheck);
  assert.ok(proposal);
  assert.equal(composeConversationTaskSpecProposal(conversationIntent(), proposal), null);

  for (const [judge, mode] of [
    ["owner", "owner-observation"],
    ["critic", "artifact-inspection"],
  ]) {
    const modelJudge: any = quality();
    modelJudge.checks[1].judge = judge;
    modelJudge.checks[1].evidence.mode = mode;
    const parsedModelJudge = parseConductorQualityProposal(modelJudge);
    assert.ok(parsedModelJudge);
    assert.equal(composeConversationTaskSpecProposal(conversationIntent(), parsedModelJudge), null,
      `the conductor cannot assign the supported check to ${judge}`);
  }

  const offText = "Show the status badge with no critic. Keep the save flow working.";
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Show the status badge with no critic.",
      ownerQuote: "Show the status badge with no critic.",
    },
    requirements: [{
      source: "owner-stated",
      text: "Keep the save flow working.",
      ownerQuote: "Keep the save flow working.",
    }],
    context: [],
  });
  assert.ok(candidate);
  const offIntent = bindTaskIntent(candidate, [{ kind: "conversation", inputId: OWNER_ID, text: offText }]);
  assert.ok(offIntent);
  const offRaw: any = quality({
    critic: { mode: "off", reason: "The owner's exact request turns the critic off.", basis: [{ kind: "outcome" }] },
    preferences: [],
    unknowns: [],
  });
  offRaw.checks[0] = check({
    promise: "Show the status badge with no critic.",
    failure: failureFor("Show the status badge with no critic."),
    evidence: {
      mode: "adapter-attestation",
      proves: proofFor("Show the status badge with no critic."),
      precondition: null,
    },
  });
  const off = parseConductorQualityProposal(offRaw);
  assert.ok(off);
  assert.equal(composeConversationTaskSpecProposal(offIntent, off)?.preview.critic.mode, "off");
  offRaw.checks[0].judge = "critic";
  offRaw.checks[0].evidence.mode = "artifact-inspection";
  const hidden = parseConductorQualityProposal(offRaw);
  assert.ok(hidden);
  assert.equal(composeConversationTaskSpecProposal(offIntent, hidden), null);
});

test("unsupported global critic approval and contradictory exact modes are refused", () => {
  for (const text of [
    "Show the status badge; the critic must approve it.",
    "Show the status badge, require the critic, but use no critic.",
    "Add the badge and use the critic to decide whether the task is done.",
    "Add the badge and let the critic accept the task.",
    "Add the badge and only finish if the critic agrees.",
    "Use the critic and give it final say on whether we ship.",
    "Use the critic; we ship only with its go-ahead.",
    "Use the critic as the sole arbiter.",
  ]) {
    const intent = createDirectTaskIntent(text, DIRECT_ID);
    assert.ok(intent);
    assert.equal(composeDirectTaskSpecProposal(intent), null, text);
  }
});

test("critic instructions are distinct from literal product copy and bounded per-check inspection", () => {
  const required = [
    "Run the critic while adding a status badge.",
    "Do not change the save flow; use the critic.",
    "Require the critic to reject only if the Save button is missing.",
  ];
  for (const text of required) {
    const intent = createDirectTaskIntent(text, DIRECT_ID);
    assert.ok(intent);
    assert.equal(composeDirectTaskSpecProposal(intent)?.preview.critic.mode, "required", text);
  }

  const literal = createDirectTaskIntent("Add a label that says no critic.", DIRECT_ID);
  assert.ok(literal);
  assert.equal(composeDirectTaskSpecProposal(literal)?.preview.critic.mode, "optional");

  const paddedApproval = createDirectTaskIntent(
    `Use the critic ${"bounded filler ".repeat(12)}and make it approve the task.`,
    DIRECT_ID,
  );
  assert.ok(paddedApproval);
  assert.equal(composeDirectTaskSpecProposal(paddedApproval), null);

  const falseReason: any = quality();
  falseReason.critic.reason = "The owner paid for and enabled the critic.";
  const parsed = parseConductorQualityProposal(falseReason);
  assert.ok(parsed);
  assert.equal(composeConversationTaskSpecProposal(conversationIntent(), parsed), null);
});

test("proposal equality accepts only separately parsed exact content and detects every content mutation", () => {
  const left = parsedQuality();
  const right = parsedQuality();
  assert.equal(sameConductorQualityProposal(left, right), true);
  assert.equal(sameConductorQualityProposal(left, clone(right)), false,
    "a structural clone has no parser provenance");
  assert.equal(sameConductorQualityProposal(left, quality()), false);

  const base = composeConversationTaskSpecProposal(conversationIntent(), left);
  assert.ok(base);
  const mutations: Array<(value: any) => void> = [
    (value) => { value.supportedPath.statement += " Still."; },
    (value) => { value.critic.reason += " Explicitly."; },
    (value) => { value.checks[0].promise += " Confirmed."; },
    (value) => { value.checks[0].failure += " Confirmed."; },
    (value) => { value.checks[0].evidence.proves += " Confirmed."; },
    (value) => { value.preferences[0].desiredDirection += " Slightly."; },
    (value) => { value.unknowns[0].text += " Still unresolved."; },
  ];
  let rejected = 0;
  let rebound = 0;
  for (const mutate of mutations) {
    const raw: any = quality();
    mutate(raw);
    const changed = parseConductorQualityProposal(raw);
    assert.ok(changed);
    assert.equal(sameConductorQualityProposal(left, changed), false);
    const result = composeConversationTaskSpecProposal(conversationIntent(), changed);
    if (result === null) {
      rejected += 1;
    } else {
      rebound += 1;
      assert.notEqual(taskSpecSha256(result.taskSpec), taskSpecSha256(base.taskSpec));
    }
  }
  assert.ok(rejected > 0, "a mutation outside the grounded grammar must make the proposal unusable");
  assert.ok(rebound > 0, "a still-valid mutation must produce a different frozen Task Spec");
});

test("direct composer creates exactly one owner-sourced non-regression c1 and no inferred advisory rows", () => {
  const intent = createDirectTaskIntent("Add a visible Save button.", DIRECT_ID);
  assert.ok(intent);
  const result = composeDirectTaskSpecProposal(intent);
  assert.ok(result);
  assert.equal(result.taskSpec.intent, intent);
  assert.equal(result.taskSpec.quality.acceptanceChecks.length, 1);
  assert.deepEqual(result.taskSpec.quality.acceptanceChecks[0], {
    id: "c1",
    promise: "Add a visible Save button.",
    kind: "non-regression",
    judge: "cairn",
    basis: [{ kind: "intent-outcome" }],
    failureCondition: {
      id: "failure-c1",
      statement: "The result does not satisfy this exact request or its supported path: Add a visible Save button.",
      allowedArtifactIds: ["artifact-c1-1"],
    },
    evidenceStandard: {
      mode: "adapter-attestation",
      proves: "The approved check answers this exact request and its supported path: Add a visible Save button.",
      precondition: null,
    },
    comparison: null,
  });
  assert.deepEqual(result.taskSpec.quality.coverage, {
    outcomeCriterionIds: ["c1"],
    requirementCriteria: [],
    supportedPathCriterionId: "c1",
  });
  assert.deepEqual(result.preview.request.outcome, {
    source: "owner-stated",
    text: "Add a visible Save button.",
    ownerText: "Add a visible Save button.",
  });
  assert.deepEqual(result.preview.preferences, []);
  assert.deepEqual(result.preview.references, []);
  assert.deepEqual(result.preview.unknowns, []);
  assert.equal(result.preview.critic.mode, "optional");
});

test("direct composer derives required/off only from exact owner text", () => {
  const required = createDirectTaskIntent("Add a visible Save button and use the critic.", DIRECT_ID);
  assert.ok(required);
  assert.equal(composeDirectTaskSpecProposal(required)?.preview.critic.mode, "required");
  assert.deepEqual(composeDirectTaskSpecProposal(required)?.preview.critic.sources, ["owner outcome"]);

  const off = createDirectTaskIntent("Add a visible Save button with no critic.", DIRECT_ID);
  assert.ok(off);
  assert.equal(composeDirectTaskSpecProposal(off)?.preview.critic.mode, "off");

  const optional = createDirectTaskIntent("Add a visible Save button; a critic could inspect it.", DIRECT_ID);
  assert.ok(optional);
  assert.equal(composeDirectTaskSpecProposal(optional)?.preview.critic.mode, "optional");
});

test("direct composer refuses vague taste, missing standards, unavailable references, and unbranded authority", () => {
  for (const text of [
    "Make it perfect.",
    "Make the page beautiful.",
    "Make the page fast.",
    "Make the page match https://example.com.",
    "Make the page look like the reference.",
  ]) {
    const intent = createDirectTaskIntent(text, DIRECT_ID);
    assert.ok(intent);
    assert.equal(composeDirectTaskSpecProposal(intent), null, text);
  }

  const bounded = createDirectTaskIntent("Make the response finish in 200 ms.", DIRECT_ID);
  assert.ok(bounded);
  assert.ok(composeDirectTaskSpecProposal(bounded));

  const forged = clone(bounded);
  assert.equal(composeDirectTaskSpecProposal(forged), null);
});

test("direct inspectability accepts owner-supplied bars and literal self-hosting text", () => {
  for (const text of [
    "Make the response fast: under 200 ms.",
    "Meet WCAG 2.2 AA accessibility.",
    "Improve the Save button by renaming it Save.",
    'Add heading "Best sellers".',
    "Fix c1 coverage and display DONE.",
    "Add a link to https://example.com.",
    "Mirror this setting in Preferences.",
  ]) {
    const intent = createDirectTaskIntent(text, DIRECT_ID);
    assert.ok(intent);
    assert.ok(composeDirectTaskSpecProposal(intent), text);
  }

  for (const text of [
    "Make the response fast with 14px text.",
    "Make the page accessible in 200 ms.",
    "Make it beautiful with 14px text.",
    "Make it secure with 14px text.",
    "Make the page visually pleasing.",
    "Make the page visually striking.",
    "Match the attached screenshot.",
    "Use the Figma mockup as the design.",
    "Use the attached screenshot.",
    "Follow the Figma design.",
    "Build from the attached mockup.",
    "Implement the attached design.",
    "Recreate this screenshot.",
  ]) {
    const intent = createDirectTaskIntent(text, DIRECT_ID);
    assert.ok(intent);
    assert.equal(composeDirectTaskSpecProposal(intent), null, text);
  }
});
