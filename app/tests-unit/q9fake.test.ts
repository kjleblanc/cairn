import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CRITIC_SYNTHETIC_TASK_PACKET_AUTHORITY_CONTEXT_VERSION,
  CRITIC_SYNTHETIC_TASK_SELECTION_VERSION,
  composeCriticAssessment,
  composeCriticCallAuthorization,
  composeCriticRequest,
  composeCriticSyntheticTaskPacketAuthorityContext,
  evidencePlanSha256,
  reserveSerialCandidateCritic,
  taskSpecSha256,
} from "@cairn/core";

import {
  Q9_FAKE_INVOCATION_RECEIPT_FILE,
  Q9_FAKE_REFERENCE_CONTENT,
  Q9_FAKE_REFERENCE_SHA256,
  Q9_FAKE_SCENARIOS,
  createQ9FakeCriticTransport,
  createQ9FakeScenarioDriver,
  createQ9FakeTaskHarness,
  q9ScenarioFromEnvironment,
  q9SyntheticReferenceContent,
} from "../src/main/q9fake.js";
import { SYNTHETIC_TASK_CRITIC_ROUTE_V1 } from "../src/main/criticapproval.js";
import { evidencePlan, projectHash, sha256, taskSpec } from "./critic-call-fixture.js";

const GUARD = Object.freeze({ CAIRN_E2E: "1", CAIRN_MOCK: "1", CAIRN_TEST_Q9: "1" });

const LOG_HEADER = [
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |",
  "|---|---|---|---|---|---|---|---|",
  "",
].join("\n");

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

function governedProject(parent: string): string {
  const root = join(parent, "project");
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract",
    "",
    "Cairn Contract v0.8.0",
    "STATUS: ACTIVE",
    "PROJECT NAME: Q9 fixture",
    "WHAT WE ARE BUILDING: a guarded quality-loop fixture",
    "WHO WILL USE IT: tests",
    "CURRENT MILESTONE: prove one exact Q9 candidate",
    "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Q9 fixture\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"), LOG_HEADER);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
  git(root, ["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

test("Q9 scenario selection is a closed boot-only environment tuple", () => {
  assert.deepEqual(Q9_FAKE_SCENARIOS, [
    "required-repair-clear",
    "critic-off-repair",
    "optional-decline",
    "critic-allegation-dismissed",
    "advisory-only",
    "repair-decline",
    "repair-regression",
    "malicious-critic",
    "critic-unavailable-retry",
    "harness-revision",
    "harness-refusal",
    "critic-unavailable-exhausted",
    "cairn-blocker-confirmation",
  ], "the closed scenario ordering keeps every existing deterministic fixture identity stable");
  assert.equal(q9ScenarioFromEnvironment({ ...GUARD, CAIRN_Q9_SCENARIO: "required-repair-clear" }), "required-repair-clear");
  assert.equal(q9ScenarioFromEnvironment({ ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-exhausted" }), "critic-unavailable-exhausted");
  assert.equal(q9ScenarioFromEnvironment({ ...GUARD, CAIRN_Q9_SCENARIO: "cairn-blocker-confirmation" }), "cairn-blocker-confirmation");
  assert.equal(q9ScenarioFromEnvironment({ ...GUARD, CAIRN_Q9_SCENARIO: "renderer-chosen" }), null);
  assert.equal(q9ScenarioFromEnvironment({ ...GUARD, CAIRN_Q9_SCENARIO: "required-repair-clear", CAIRN_TEST_Q9: "0" }), null);
  assert.equal(q9SyntheticReferenceContent(Q9_FAKE_REFERENCE_SHA256, GUARD), Q9_FAKE_REFERENCE_CONTENT);
  assert.equal(q9SyntheticReferenceContent("f".repeat(64), GUARD), null, "unknown reference bytes are never guessed");
  assert.equal(q9SyntheticReferenceContent(Q9_FAKE_REFERENCE_SHA256, { ...GUARD, CAIRN_MOCK: "0" }), null);
});

test("every boot-selected Q9 scenario composes one exact offline task harness", () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-harness-"));
  const prior = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  try {
    for (const scenario of Q9_FAKE_SCENARIOS) {
      const project = join(parent, `project-${scenario}`);
      const profile = join(parent, `profile-${scenario}`);
      mkdirSync(project);
      mkdirSync(profile);
      const driver = createQ9FakeScenarioDriver({
        profileRoot: profile,
        environment: { ...GUARD, CAIRN_Q9_SCENARIO: scenario },
      });
      assert.ok(driver);
      const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
      assert.ok(harness, scenario);
      assert.equal(harness.scenario, scenario);
      assert.equal(harness.repairWriter.kind, "synthetic-q9-builder");
      assert.equal(harness.adapter.descriptor.provider, "Cairn E2E Fixture");
      assert.deepEqual(harness.adapter.descriptor.capabilities, ["serial-task", "serial-task-candidate", "offline-demo"]);
      assert.equal(harness.authority.taskSpec.quality.references[0]?.snapshotSha256, Q9_FAKE_REFERENCE_SHA256);
      assert.deepEqual(harness.expectedOriginalCriteria.map((row) => row.id), ["c1", "c2"]);
    }
  } finally {
    if (prior.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = prior.e2e;
    if (prior.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = prior.mock;
    if (prior.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = prior.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("the harness runs a mixed-judge candidate with the immutable reference identity intact", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-run-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const prior = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  try {
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "required-repair-clear" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const beforeReference = harness.authority.taskSpec.quality.references[0];
    assert.equal(beforeReference?.snapshotSha256, Q9_FAKE_REFERENCE_SHA256);
    const result = await harness.runInitial();
    assert.equal(result.status, "candidate");
    if (result.status !== "candidate") return;
    assert.equal(result.candidate.lineage.taskSpec.quality.references[0]?.snapshotSha256, Q9_FAKE_REFERENCE_SHA256);
    assert.equal(
      result.candidate.lineage.taskSpec.quality.references[0]?.stateSha256,
      beforeReference?.stateSha256,
      "the candidate carries the exact preregistered comparison identity",
    );
    assert.equal(result.candidate.lineage.evidencePlan.procedures[0]?.kind, "packet-artifact");
    assert.equal(result.candidate.lineage.evidencePlan.procedures[1]?.kind, "adapter-command-attestation");
    assert.equal(readFileSync(harness.fixturePath, "utf8"), "Q9 required-repair-clear round zero.\n");
  } finally {
    if (prior.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = prior.e2e;
    if (prior.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = prior.mock;
    if (prior.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = prior.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("the guarded fake records append-only bounded invocation receipts", () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-fake-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  try {
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-retry" },
    });
    assert.ok(driver);
    assert.equal(driver.scenario, "critic-unavailable-retry");
    assert.equal(driver.criticOutcome(0, 1), "unavailable");
    assert.equal(driver.criticOutcome(0, 2), "clear");
    driver.record({ kind: "critic", round: 0, attempt: 1, requestSha256: "a".repeat(64), outcome: "unavailable" });
    driver.record({ kind: "critic", round: 0, attempt: 2, requestSha256: "b".repeat(64), outcome: "clear" });
    const lines = readFileSync(join(profile, Q9_FAKE_INVOCATION_RECEIPT_FILE), "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    assert.deepEqual(lines.map((line) => JSON.parse(line).sequence), [1, 2]);
    assert.deepEqual(lines.map((line) => JSON.parse(line).scenario), ["critic-unavailable-retry", "critic-unavailable-retry"]);
    assert.throws(() => createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "required-repair-clear" },
    }), /Q9_FAKE_RECEIPT_SCENARIO_MISMATCH/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("the exhausted critic scenario returns exactly the two unavailable outcomes allowed by policy", () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-exhausted-fake-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  try {
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-exhausted" },
    });
    assert.ok(driver);
    assert.equal(driver.criticOutcome(0, 1), "unavailable");
    assert.equal(driver.criticOutcome(0, 2), "unavailable");
    assert.equal(driver.criticOutcome(0, 3), "unavailable",
      "the fake never invents a clear result; Main/Core must prevent this impossible third call");
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("the Q9 critic fake spends only a synthetic-task authorization and returns Core-verifiable custody", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-critic-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const prior = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  try {
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "advisory-only" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    const candidate = initial.candidate;
    const spec = harness.authority.taskSpec;
    const plan = harness.authority.evidencePlan;
    const primary = readFileSync(harness.fixturePath, "utf8");
    const regression = "The guarded Q9 supported path attested successfully.";
    const comparisonCandidate = "The candidate preserves the declared reference relationship.";
    const selectedSyntheticText = [{
      id: "q9-primary", syntheticPath: "synthetic-q9/q9-unit-critic/primary.txt",
      sha256: sha256(primary), content: primary, truncated: false,
    }, {
      id: "q9-regression", syntheticPath: "synthetic-q9/q9-unit-critic/regression.txt",
      sha256: sha256(regression), content: regression, truncated: false,
    }, {
      id: "comparison-candidate", syntheticPath: "synthetic-q9/q9-unit-critic/comparison-candidate.txt",
      sha256: sha256(comparisonCandidate), content: comparisonCandidate, truncated: false,
    }, {
      id: "comparison-reference", syntheticPath: "synthetic-q9/q9-unit-critic/comparison-reference.txt",
      sha256: Q9_FAKE_REFERENCE_SHA256, content: Q9_FAKE_REFERENCE_CONTENT, truncated: false,
    }];
    const packet = composeCriticSyntheticTaskPacketAuthorityContext(spec, plan, {
      version: CRITIC_SYNTHETIC_TASK_PACKET_AUTHORITY_CONTEXT_VERSION,
      selectionVersion: CRITIC_SYNTHETIC_TASK_SELECTION_VERSION,
      manifestSha256: sha256(JSON.stringify(selectedSyntheticText)),
      fixtureId: "q9-unit-critic",
      syntheticScopeSha256: candidate.projectRootSha256,
      connectionConsentVersion: SYNTHETIC_TASK_CRITIC_ROUTE_V1.connectionConsentVersion,
      taskSpecSha256: taskSpecSha256(spec),
      evidencePlanSha256: evidencePlanSha256(plan),
      candidateSha256: candidate.candidateSha256,
      selectedSyntheticText,
      checkEvidence: [{
        id: "q9-check-c2",
        criterionId: "c2",
        status: "met",
        source: "adapter-execution",
        evidenceRefs: ["q9-regression"],
      }],
      priorConfirmedFindings: [],
      comparisonTrials: [{
        comparisonId: "comparison-p2",
        criterionId: "p2",
        referenceId: "reference-one",
        dimensionId: "layout",
        candidateArtifactId: "comparison-candidate",
        referenceArtifactId: "comparison-reference",
        presentationOrder: "A-B",
      }],
    });
    assert.ok(packet);
    const request = composeCriticRequest(spec, plan, packet);
    assert.ok(request);
    const authorization = composeCriticCallAuthorization(request, {
      ...SYNTHETIC_TASK_CRITIC_ROUTE_V1,
      runId: candidate.runId, candidateRound: candidate.round, callAttempt: 1,
    });
    assert.ok(authorization);
    const reserved = reserveSerialCandidateCritic(candidate, authorization);
    assert.ok(reserved);
    const result = await createQ9FakeCriticTransport({
      driver,
      now: () => new Date("2026-08-11T12:00:00.000Z"),
    }).send({
      request,
      authorization,
      candidate: reserved.candidate,
      reservation: reserved.reservation,
      signal: new AbortController().signal,
    });
    assert.equal(result.kind, "answered");
    if (result.kind === "answered") assert.ok(composeCriticAssessment(request, result.rawOutput, result.custody));
  } finally {
    if (prior.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = prior.e2e;
    if (prior.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = prior.mock;
    if (prior.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = prior.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});
