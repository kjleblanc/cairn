import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  consumeCriticCallAuthorization,
  previewSerialCandidateQ9HarnessRevision,
  serialCandidateQ9HarnessFailure,
  serialQ9HarnessFailureSha256,
  type SerialCandidateTerminalResult,
} from "@cairn/core";

import {
  Q9_PENDING_CANDIDATE_TERMINAL,
  _resetQ9QualityLoopsForTests,
  activeQ9QualityLoops,
  applyQ9QualityLoopToSession,
  cancelQ9QualityLoop,
  canonicalQ9Json,
  canonicalQ9TerminalCard,
  currentQ9QualityLoop,
  decideQ9Critic,
  decideQ9HarnessRevision,
  decideQ9Repair,
  decideQ9TaskReview,
  q9TerminalCardInputForResult,
  restoreQ9QualityLoops,
  startQ9QualityLoop,
  suspendQ9QualityLoopForRestart,
} from "../src/main/qualityloop.js";
import {
  Q9_FAKE_REFERENCE_SHA256,
  Q9_FAKE_INVOCATION_RECEIPT_FILE,
  createQ9FakeCriticTransport,
  createQ9FakeScenarioDriver,
  createQ9FakeTaskHarness,
} from "../src/main/q9fake.js";
import { setEvidenceMarkerDir } from "../src/main/evidence.js";
import {
  clearQ9HarnessRevisionApprovalIfCurrent,
  openQ9HarnessRevisionApproval,
} from "../src/main/harnessapproval.js";
import {
  _resetPendingSerialCandidatesForTests,
  installPendingSerialCandidateRecovery,
  parkPendingSerialCandidatesForRestart,
  currentPendingSerialCandidate,
  pendingSerialCandidateWorkflow,
  pendingSerialCandidateTerminalCardDeliveries,
} from "../src/main/pendingcandidate.js";
import { _resetPendingRunsForTests } from "../src/main/pendingrun.js";

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
    "PROJECT NAME: Q9 lifecycle fixture",
    "WHAT WE ARE BUILDING: one guarded repair loop",
    "WHO WILL USE IT: tests",
    "CURRENT MILESTONE: close one honest result",
    "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Q9 lifecycle fixture\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"), LOG_HEADER);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
  git(root, ["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

async function waitForSnapshot(
  projectRoot: string,
  predicate: (snapshot: NonNullable<ReturnType<typeof currentQ9QualityLoop>>) => boolean,
): Promise<NonNullable<ReturnType<typeof currentQ9QualityLoop>>> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const snapshot = currentQ9QualityLoop(projectRoot);
    if (snapshot && predicate(snapshot)) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Q9_TEST_SNAPSHOT_TIMEOUT:${JSON.stringify(currentQ9QualityLoop(projectRoot))}`);
}

test("Q9 canonical JSON sorts every object key and never relies on insertion order", () => {
  const left = canonicalQ9Json({ z: 1, a: { y: 2, b: 3 }, omitted: undefined, list: [{ d: 4, c: 5 }, undefined] });
  const right = canonicalQ9Json({ list: [{ c: 5, d: 4 }, null], a: { b: 3, y: 2 }, z: 1 });
  assert.equal(left, right);
  assert.equal(left, '{"a":{"b":3,"y":2},"list":[{"c":5,"d":4},null],"z":1}');
  assert.equal(JSON.stringify(JSON.parse(left)), left, "PendingRun's canonical-card predicate accepts the bytes");
});

test("Q9 terminal-card helper rejects structural result lookalikes", () => {
  const result = {
    status: "stopped",
    reason: "MODEL_RESULT_NOT_VERIFIED",
    disposition: "STOPPED",
    taskNumber: 220,
    composed: {
      taskNumber: 220,
      acceptedRequest: {
        outcome: { source: "owner-stated", text: "Run Q9.", ownerText: "Run Q9." },
        requirements: [],
      },
      route: { adapterLabel: "Q9 fixture", provider: "Cairn E2E Fixture", model: "synthetic-q9/test" },
      disposition: "STOPPED",
      stopReason: "MODEL_RESULT_NOT_VERIFIED",
      claims: null,
      filesChanged: [],
      protectedIntact: true,
      commit: null,
      evidenceSummary: null,
      recordRecovery: null,
      processFailure: null,
      paidCallStarted: false,
    },
  } as never;
  const session = {
    conversationId: "31313131-3131-4131-8131-313131313131",
    startedAt: "2026-08-11T12:00:00.000Z",
    evidenceRunId: null,
  };
  assert.equal(canonicalQ9TerminalCard(result, session, null), null);
  const input = q9TerminalCardInputForResult(result, session);
  assert.equal(input, undefined);
});

test("Q9 has no unguarded dependency or transport fallback", async () => {
  const previous = {
    e2e: process.env.CAIRN_E2E,
    mock: process.env.CAIRN_MOCK,
    q9: process.env.CAIRN_TEST_Q9,
  };
  delete process.env.CAIRN_E2E;
  delete process.env.CAIRN_MOCK;
  delete process.env.CAIRN_TEST_Q9;
  try {
    await assert.rejects(
      startQ9QualityLoop({} as never),
      /Q9_QUALITY_LOOP_INACTIVE/,
    );
    assert.equal(currentQ9QualityLoop("not-a-project"), null);
    assert.deepEqual(activeQ9QualityLoops().dirs, []);
  } finally {
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E;
    else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK;
    else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9;
    else process.env.CAIRN_TEST_Q9 = previous.q9;
  }
});

test("Q9 refuses a session whose evidence run does not match pending evidence", async () => {
  const previous = {
    e2e: process.env.CAIRN_E2E,
    mock: process.env.CAIRN_MOCK,
    q9: process.env.CAIRN_TEST_Q9,
  };
  Object.assign(process.env, { CAIRN_E2E: "1", CAIRN_MOCK: "1", CAIRN_TEST_Q9: "1" });
  try {
    await assert.rejects(startQ9QualityLoop({
      projectRoot: process.cwd(),
      candidate: {} as never,
      evidence: { runId: "11111111-1111-4111-8111-111111111111" } as never,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "a".repeat(64),
        evidenceRunId: "22222222-2222-4222-8222-222222222222",
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: { kind: "synthetic-q9-builder", async run() { return null; } },
        criticTransport: { kind: "synthetic-q9-critic", async send() { throw new Error("must not send"); } },
        terminal: { settle() { throw new Error("must not settle"); } },
      },
    }), /Q9_QUALITY_LOOP_INACTIVE/);
  } finally {
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
  }
});

test("Q9 session projection carries output cards only and clears stale call cards", () => {
  const base = { status: "idle", repairCall: { stale: true }, criticCall: { stale: true } } as never;
  const projected = applyQ9QualityLoopToSession(base, {
    version: "cairn-q9-quality-loop/v1",
    projectRoot: "C:\\fixture",
    status: "checking",
    phase: "awaiting-critic",
    round: 0,
    repairSpent: 0,
    criticSpent: 0,
    taskReview: null,
    repairCall: null,
    criticCall: null,
    harnessRevision: null,
    result: null,
    refusal: null,
  });
  assert.equal(projected.repairCall, undefined);
  assert.equal(projected.criticCall, undefined);
  assert.equal(projected.taskReview, undefined);
});

test("a Cairn failure needs owner confirmation, then a separate repair approval, before Builder runs", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-cairn-confirm-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "cairn-blocker-confirmation" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let repairs = 0;
    let critics = 0;
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "9".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: {
          kind: "synthetic-q9-builder",
          async run(input) { repairs += 1; return harness.repairWriter.run(input); },
        },
        criticTransport: {
          kind: "synthetic-q9-critic",
          async send() { critics += 1; throw new Error("critic-off fixture must stay dark"); },
        },
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        now: () => new Date("2026-08-11T12:00:01.000Z"),
      },
    });
    void settlement.catch(() => undefined);
    let snapshot = await waitForSnapshot(project, (value) => value.status === "awaiting-owner");
    assert.equal(snapshot.repairCall, null);
    assert.equal(repairs, 0);
    assert.equal(critics, 0);
    const confirmation = snapshot.taskReview?.criteria.flatMap((criterion) => criterion.ownerChecks)
      .map((check) => check.action)
      .find((action): action is NonNullable<typeof action> => action?.kind === "review-cairn-failure");
    assert.ok(confirmation);
    const confirmed = decideQ9TaskReview({
      dir: project,
      actionId: confirmation.actionId,
      action: { kind: "review-cairn-failure", decision: "confirmed" },
    });
    assert.equal(confirmed.handled && confirmed.ok, true);
    const replay = decideQ9TaskReview({
      dir: project,
      actionId: confirmation.actionId,
      action: { kind: "review-cairn-failure", decision: "confirmed" },
    });
    assert.equal(replay.handled && replay.ok, false,
      "the stale replay is refused, never accepted as another confirmation");
    snapshot = await waitForSnapshot(project, (value) => value.repairCall !== null);
    assert.equal(repairs, 0, "confirmation itself never launches Builder");
    assert.equal(critics, 0);
    const repair = snapshot.repairCall;
    assert.ok(repair);
    const approved = decideQ9Repair({
      dir: project,
      approvalId: repair.approvalId,
      action: "approve",
      disclosure: repair,
    });
    assert.equal(approved.handled && approved.ok, true);
    const result = await settlement;
    assert.equal(result.disposition, "DONE");
    assert.equal(repairs, 1);
    assert.equal(critics, 0);
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("dismissing or being unable to confirm a Cairn failure STOPs without Builder or critic", async (t) => {
  for (const decision of ["dismissed", "cant-tell"] as const) await t.test(decision, async () => {
    const parent = mkdtempSync(join(tmpdir(), `cairn-q9-cairn-${decision}-`));
    const profile = join(parent, "profile");
    mkdirSync(profile);
    const project = governedProject(parent);
    const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
    Object.assign(process.env, GUARD);
    _resetPendingRunsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetQ9QualityLoopsForTests();
    setEvidenceMarkerDir(profile);
    try {
      assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
      const driver = createQ9FakeScenarioDriver({
        profileRoot: profile,
        environment: { ...GUARD, CAIRN_Q9_SCENARIO: "cairn-blocker-confirmation" },
      });
      assert.ok(driver);
      const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
      assert.ok(harness);
      const initial = await harness.runInitial();
      assert.equal(initial.status, "candidate");
      if (initial.status !== "candidate") return;
      let repairs = 0;
      let critics = 0;
      const settlement = startQ9QualityLoop({
        projectRoot: project,
        candidate: initial,
        evidence: null,
        session: {
          conversationId: null,
          startedAt: "2026-08-11T12:00:00.000Z",
          adapterIdentitySha256: "8".repeat(64),
          evidenceRunId: null,
          acceptedRequest: null,
        },
        dependencies: {
          repairWriter: { kind: "synthetic-q9-builder", async run() { repairs += 1; throw new Error("must not repair"); } },
          criticTransport: { kind: "synthetic-q9-critic", async send() { critics += 1; throw new Error("must not call critic"); } },
          terminal: Q9_PENDING_CANDIDATE_TERMINAL,
          now: () => new Date("2026-08-11T12:00:01.000Z"),
        },
      });
      void settlement.catch(() => undefined);
      const snapshot = await waitForSnapshot(project, (value) => value.status === "awaiting-owner");
      const action = snapshot.taskReview?.criteria.flatMap((criterion) => criterion.ownerChecks)
        .map((check) => check.action)
        .find((item): item is NonNullable<typeof item> => item?.kind === "review-cairn-failure");
      assert.ok(action);
      const ownerDecision = decideQ9TaskReview({
        dir: project,
        actionId: action.actionId,
        action: { kind: "review-cairn-failure", decision },
      });
      assert.equal(ownerDecision.handled && ownerDecision.ok, true);
      const result = await settlement;
      assert.equal(result.disposition, "STOPPED");
      assert.equal(result.status, "stopped");
      if (result.status === "stopped") assert.equal(result.reason, "Q9_REQUIRED_EVIDENCE_INCOMPLETE");
      assert.equal(repairs, 0);
      assert.equal(critics, 0);
      assert.equal(currentQ9QualityLoop(project), null);
    } finally {
      setEvidenceMarkerDir(null);
      _resetQ9QualityLoopsForTests();
      _resetPendingSerialCandidatesForTests();
      _resetPendingRunsForTests();
      if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
      if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
      if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

test("restart after durable Cairn confirmation but before admission STOPs without re-card or repair", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-cairn-confirm-cut-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "cairn-blocker-confirmation" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let repairs = 0;
    let critics = 0;
    let confirmationCuts = 0;
    const terminals: SerialCandidateTerminalResult[] = [];
    const dependencies = {
      repairWriter: { kind: "synthetic-q9-builder" as const, async run(): Promise<never> { repairs += 1; throw new Error("must not repair"); } },
      criticTransport: { kind: "synthetic-q9-critic" as const, async send(): Promise<never> { critics += 1; throw new Error("must not call critic"); } },
      terminal: Q9_PENDING_CANDIDATE_TERMINAL,
      now: () => new Date("2026-08-11T12:00:01.000Z"),
      onTerminal(_root: string, result: SerialCandidateTerminalResult) { terminals.push(result); },
      onCutPoint(point: string) {
        if (point === "after-cairn-confirmation") {
          confirmationCuts += 1;
          _resetQ9QualityLoopsForTests();
          return true;
        }
        return false;
      },
    };
    const abandoned = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "7".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies,
    });
    void abandoned.catch(() => undefined);
    const snapshot = await waitForSnapshot(project, (value) => value.status === "awaiting-owner");
    const action = snapshot.taskReview?.criteria.flatMap((criterion) => criterion.ownerChecks)
      .map((check) => check.action)
      .find((item): item is NonNullable<typeof item> => item?.kind === "review-cairn-failure");
    assert.ok(action);
    assert.equal(decideQ9TaskReview({
      dir: project,
      actionId: action.actionId,
      action: { kind: "review-cairn-failure", decision: "confirmed" },
    }).handled, true);
    // The injected hard cut fires after the authenticated decision event but
    // before scheduled live confirmation can enter a candidate checkpoint.
    assert.equal(confirmationCuts, 1);
    assert.deepEqual(parkPendingSerialCandidatesForRestart(), { parked: 1, failed: 0 });
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    const boot = installPendingSerialCandidateRecovery(profile);
    assert.equal(boot.resumed, 1, JSON.stringify(boot));
    assert.deepEqual(restoreQ9QualityLoops({ dependenciesFor: () => dependencies }), { restored: 1, refused: 0 });
    const deadline = Date.now() + 30_000;
    while (terminals.length === 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(terminals.length, 1);
    assert.equal(terminals[0]?.disposition, "STOPPED");
    assert.equal(terminals[0]?.status, "stopped");
    if (terminals[0]?.status === "stopped") assert.equal(terminals[0].reason, "Q9_WORKFLOW_VERIFICATION_FAILED");
    assert.equal(repairs, 0);
    assert.equal(critics, 0);
    assert.equal(currentQ9QualityLoop(project), null, "restart never re-cards the answered failure");
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("two unavailable critic attempts STOP without opening an impossible third card", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-retry-cap-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-retry" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let sends = 0;
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "a".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: harness.repairWriter,
        criticTransport: {
          kind: "synthetic-q9-critic",
          async send({ authorization, signal }) {
            sends += 1;
            assert.equal(consumeCriticCallAuthorization(authorization), true);
            return new Promise((resolve) => {
              signal.addEventListener("abort", () => resolve(Object.freeze({
                kind: "unavailable" as const,
                sent: true,
                code: "CRITIC_CALL_NETWORK_ERROR" as const,
                status: null,
                ownerMessage: "The test fixture observed its exact deadline signal.",
              })), { once: true });
            });
          },
        },
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        testDeadlineMs: { critic: 20 },
        now: () => new Date("2026-08-11T12:00:01.000Z"),
      },
    });
    void settlement.catch(() => undefined);
    for (const expectedAttempt of [1, 2]) {
      const snapshot = await waitForSnapshot(project, (value) => value.criticCall?.attempt === expectedAttempt);
      const disclosure = snapshot.criticCall;
      assert.ok(disclosure);
      const decision = decideQ9Critic({
        dir: project,
        approvalId: disclosure.approvalId,
        action: "approve",
        disclosure,
      });
      assert.equal(decision.handled && decision.ok, true);
    }
    const result = await settlement;
    assert.equal(result.disposition, "STOPPED");
    assert.equal(result.status, "stopped");
    if (result.status === "stopped") assert.equal(result.reason, "Q9_CRITIC_CALLS_EXHAUSTED");
    assert.match(readFileSync(result.reportPath, "utf8"),
      /the required critic did not return a usable result within its allowed calls and one retry\. \(Code: `Q9_CRITIC_CALLS_EXHAUSTED`\.\)/u);
    assert.ok(result.activities.some((activity) =>
      activity.detail.includes("Q9_CRITIC_CALLS_EXHAUSTED")
      && activity.detail.includes("the required critic did not return a usable result")),
    "the authenticated activity feed keeps the same exact cause as the report");
    const card = canonicalQ9TerminalCard(result, { evidenceRunId: null });
    assert.ok(card);
    assert.equal((JSON.parse(card) as { stopReason: string }).stopReason, "Q9_CRITIC_CALLS_EXHAUSTED");
    assert.equal(sends, 2);
    assert.equal(currentQ9QualityLoop(project), null, "there is no attempt-three approval projection");
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a post-repair original-check regression STOPs before a final required critic approval", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-repair-regression-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "repair-regression" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let criticSends = 0;
    const criticTransport = createQ9FakeCriticTransport({ driver });
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "b".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: harness.repairWriter,
        criticTransport: {
          kind: "synthetic-q9-critic",
          async send(input) {
            criticSends += 1;
            return criticTransport.send(input);
          },
        },
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        now: () => new Date("2026-08-11T12:00:01.000Z"),
      },
    });
    void settlement.catch(() => undefined);

    let snapshot = await waitForSnapshot(project, (value) => value.round === 0 && value.criticCall !== null);
    const firstCritic = snapshot.criticCall;
    assert.ok(firstCritic);
    assert.equal(decideQ9Critic({
      dir: project,
      approvalId: firstCritic.approvalId,
      action: "approve",
      disclosure: firstCritic,
    }).handled, true);

    snapshot = await waitForSnapshot(project, (value) => value.status === "awaiting-owner" || value.repairCall !== null);
    if (snapshot.repairCall === null) {
      const action = snapshot.taskReview?.criteria.flatMap((criterion) => criterion.ownerChecks)
        .map((check) => check.action)
        .find((item): item is NonNullable<typeof item> => item?.kind === "resolve");
      assert.ok(action);
      assert.equal(decideQ9TaskReview({
        dir: project,
        actionId: action.actionId,
        action: { kind: "resolve", decision: "confirmed" },
      }).handled, true);
    }

    snapshot = await waitForSnapshot(project, (value) => value.repairCall !== null);
    const repair = snapshot.repairCall;
    assert.ok(repair);
    assert.equal(decideQ9Repair({
      dir: project,
      approvalId: repair.approvalId,
      action: "approve",
      disclosure: repair,
    }).handled, true);

    const result = await settlement;
    assert.equal(result.disposition, "STOPPED");
    assert.equal(result.status, "stopped");
    if (result.status === "stopped") assert.equal(result.reason, "Q9_REQUIRED_CHECK_STILL_FAILED");
    assert.equal(criticSends, 1, "the final critic was neither offered nor sent after Cairn proved c2 regressed");
    assert.equal(currentQ9QualityLoop(project), null, "no final critic approval remains projected");
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a repair deadline aborts the exact call and records ADAPTER_TIMED_OUT", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-repair-timeout-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-off-repair" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let repairAborted = false;
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "a".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: {
          kind: "synthetic-q9-builder",
          async run({ signal }) {
            return new Promise((resolve) => signal.addEventListener("abort", () => {
              repairAborted = true;
              resolve(null);
            }, { once: true }));
          },
        },
        criticTransport: createQ9FakeCriticTransport({ driver }),
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        testDeadlineMs: { repair: 20 },
        now: () => new Date("2026-08-11T12:00:01.000Z"),
      },
    });
    void settlement.catch(() => undefined);
    let snapshot = await waitForSnapshot(project, (value) => value.status === "awaiting-owner");
    const observe = snapshot.taskReview?.criteria.flatMap((criterion) => criterion.ownerChecks)
      .map((check) => check.action)
      .find((action): action is NonNullable<typeof action> => action?.kind === "observe");
    assert.ok(observe);
    assert.equal(decideQ9TaskReview({
      dir: project,
      actionId: observe.actionId,
      action: { kind: "observe", decision: "not-met" },
    }).handled, true);
    snapshot = await waitForSnapshot(project, (value) => value.repairCall !== null);
    const repair = snapshot.repairCall;
    assert.ok(repair);
    assert.equal(decideQ9Repair({
      dir: project,
      approvalId: repair.approvalId,
      action: "approve",
      disclosure: repair,
    }).handled, true);
    const result = await settlement;
    assert.equal(result.disposition, "STOPPED");
    assert.equal(result.status, "stopped");
    if (result.status === "stopped") assert.equal(result.reason, "ADAPTER_TIMED_OUT");
    assert.equal(repairAborted, true);
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("Q9 cut hooks fire only at durable post-reserve and post-send boundaries", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-cut-hooks-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-retry" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    const cuts: string[] = [];
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "d".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: harness.repairWriter,
        criticTransport: createQ9FakeCriticTransport({ driver }),
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        onCutPoint(point, root) {
          assert.equal(root, project);
          const workflow = pendingSerialCandidateWorkflow(project);
          const latest = [...(workflow?.events ?? [])].reverse().find((row) => row.kind === "operation");
          assert.ok(latest && latest.kind === "operation");
          assert.equal(latest.status, point === "after-reserve" ? "reserved" : "sending");
          cuts.push(point);
          return false;
        },
      },
    });
    void settlement.catch(() => undefined);
    const snapshot = await waitForSnapshot(project, (value) => value.criticCall !== null);
    const disclosure = snapshot.criticCall;
    assert.ok(disclosure);
    const stopped = decideQ9Critic({
      dir: project,
      approvalId: disclosure.approvalId,
      action: "approve",
      disclosure,
    });
    assert.equal(stopped.handled && stopped.ok, true);
    await waitForSnapshot(project, (value) => value.criticCall?.attempt === 2);
    assert.deepEqual(cuts, ["after-reserve", "after-send"]);
    cancelQ9QualityLoop(project);
    await settlement;
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a selected Q9 after-reserve cut is a control-flow barrier before critic send", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-cut-barrier-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-retry" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let sends = 0;
    const transport = createQ9FakeCriticTransport({ driver });
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "e".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: harness.repairWriter,
        criticTransport: {
          kind: "synthetic-q9-critic",
          async send(input) {
            sends += 1;
            return transport.send(input);
          },
        },
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        onCutPoint(point) { return point === "after-reserve"; },
      },
    });
    void settlement.catch(() => undefined);
    const snapshot = await waitForSnapshot(project, (value) => value.criticCall !== null);
    const disclosure = snapshot.criticCall;
    assert.ok(disclosure);
    const decided = decideQ9Critic({
      dir: project,
      approvalId: disclosure.approvalId,
      action: "approve",
      disclosure,
    });
    assert.equal(decided.handled && decided.ok, true);
    const deadline = Date.now() + 30_000;
    let latest = pendingSerialCandidateWorkflow(project)?.events.at(-1);
    while (Date.now() < deadline && !(latest?.kind === "operation" && latest.status === "reserved")) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      latest = pendingSerialCandidateWorkflow(project)?.events.at(-1);
    }
    assert.ok(latest?.kind === "operation" && latest.status === "reserved");
    assert.equal(sends, 0);
    assert.equal(existsSync(join(profile, Q9_FAKE_INVOCATION_RECEIPT_FILE)), false);
    _resetQ9QualityLoopsForTests();
    await assert.rejects(settlement, /Q9_TEST_RESET/u);
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a recovery-required Q9 loop refuses cancellation without mutating retained custody", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-recovery-cancel-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-retry" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let terminalAttempts = 0;
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "f".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: harness.repairWriter,
        criticTransport: createQ9FakeCriticTransport({ driver }),
        terminal: {
          settle() {
            terminalAttempts += 1;
            return null;
          },
        },
      },
    });
    void settlement.catch(() => undefined);
    await waitForSnapshot(project, (value) => value.criticCall !== null);
    assert.equal(cancelQ9QualityLoop(project), true, "the original waiting call may request one STOP");
    const before = await waitForSnapshot(project, (value) => value.status === "recovery-required");
    const workflowBefore = canonicalQ9Json(pendingSerialCandidateWorkflow(project));
    const candidateBefore = currentPendingSerialCandidate(project)?.candidate;
    assert.equal(terminalAttempts, 1);

    assert.equal(cancelQ9QualityLoop(project), false,
      "a terminal seam that already failed cannot acknowledge a dropped cancellation");
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(currentQ9QualityLoop(project), before);
    assert.equal(currentPendingSerialCandidate(project)?.candidate, candidateBefore);
    assert.equal(canonicalQ9Json(pendingSerialCandidateWorkflow(project)), workflowBefore);
    assert.equal(terminalAttempts, 1, "refused cancellation does not retry terminal settlement");
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("restart after a durable approved critic decision never re-cards or auto-sends", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-approved-cut-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-retry" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let sends = 0;
    const terminals: string[] = [];
    const dependencies = {
      repairWriter: harness.repairWriter,
      criticTransport: {
        kind: "synthetic-q9-critic" as const,
        async send(): Promise<never> { sends += 1; throw new Error("must not auto-send after restart"); },
      },
      terminal: Q9_PENDING_CANDIDATE_TERMINAL,
      now: () => new Date("2026-08-11T12:00:01.000Z"),
      onTerminal(_root: string, result: SerialCandidateTerminalResult) {
        terminals.push(result.status === "stopped" ? result.reason : result.disposition);
      },
    };
    const abandoned = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "a".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies,
    });
    void abandoned.catch(() => undefined);
    const beforeCut = await waitForSnapshot(project, (value) => value.criticCall !== null);
    const disclosure = beforeCut.criticCall;
    assert.ok(disclosure);
    const decision = decideQ9Critic({
      dir: project,
      approvalId: disclosure.approvalId,
      action: "approve",
      disclosure,
    });
    assert.equal(decision.handled && decision.ok, true);

    // Exact cut: the decision event and card commit are synchronous; the
    // reservation/send is scheduled. Reset before that microtask executes.
    _resetQ9QualityLoopsForTests();
    await Promise.resolve();
    assert.equal(sends, 0);
    assert.deepEqual(parkPendingSerialCandidatesForRestart(), { parked: 1, failed: 0 });
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    const boot = installPendingSerialCandidateRecovery(profile);
    assert.equal(boot.resumed, 1);
    assert.equal(boot.recoveryRequired, 0);
    const postBootSnapshots: unknown[] = [];
    const restored = restoreQ9QualityLoops({
      dependenciesFor() {
        return {
          ...dependencies,
          onChanged(root: string) { postBootSnapshots.push(currentQ9QualityLoop(root)); },
        };
      },
    });
    assert.deepEqual(restored, { restored: 1, refused: 0 });
    await activeQ9QualityLoops().settled();
    assert.equal(sends, 0, "a durable decision is not reusable call authority");
    assert.deepEqual(terminals, ["Q9_WORKFLOW_VERIFICATION_FAILED"],
      "restore reconciles the durable approval forward to one honest STOP without reusing its lost grant");
    assert.equal(currentQ9QualityLoop(project), null, "restore never reopens the interrupted decision");
    assert.equal(postBootSnapshots.some((value) => (value as { criticCall?: unknown } | null)?.criticCall != null), false,
      "restore never opens a misleading replacement approval");
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("restart after a durable approved repair decision never re-cards or auto-runs Builder", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-approved-repair-cut-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-off-repair" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    const originalFixture = readFileSync(harness.fixturePath, "utf8");
    let repairs = 0;
    const terminals: string[] = [];
    const postBootSnapshots: unknown[] = [];
    const dependencies = {
      repairWriter: {
        kind: "synthetic-q9-builder" as const,
        async run(): Promise<never> { repairs += 1; throw new Error("must not auto-run after restart"); },
      },
      criticTransport: createQ9FakeCriticTransport({ driver }),
      terminal: Q9_PENDING_CANDIDATE_TERMINAL,
      now: () => new Date("2026-08-11T12:00:01.000Z"),
      onChanged(root: string) { postBootSnapshots.push(currentQ9QualityLoop(root)); },
      onTerminal(_root: string, result: SerialCandidateTerminalResult) {
        terminals.push(result.status === "stopped" ? result.reason : result.disposition);
      },
    };
    const abandoned = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "f".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies,
    });
    void abandoned.catch(() => undefined);
    let snapshot = await waitForSnapshot(project, (value) => value.status === "awaiting-owner");
    const observe = snapshot.taskReview?.criteria.flatMap((criterion) => criterion.ownerChecks)
      .map((check) => check.action)
      .find((action): action is NonNullable<typeof action> => action?.kind === "observe");
    assert.ok(observe);
    assert.equal(decideQ9TaskReview({
      dir: project,
      actionId: observe.actionId,
      action: { kind: "observe", decision: "not-met" },
    }).handled, true);
    snapshot = await waitForSnapshot(project, (value) => value.repairCall !== null);
    const disclosure = snapshot.repairCall;
    assert.ok(disclosure);
    const decision = decideQ9Repair({
      dir: project,
      approvalId: disclosure.approvalId,
      action: "approve",
      disclosure,
    });
    assert.equal(decision.handled && decision.ok, true);

    // Exact cut: the approved decision is synchronous and durable, while the
    // reservation and Builder call are scheduled onto the next microtask.
    _resetQ9QualityLoopsForTests();
    await Promise.resolve();
    assert.equal(repairs, 0);
    assert.deepEqual(parkPendingSerialCandidatesForRestart(), { parked: 1, failed: 0 });
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    postBootSnapshots.length = 0;
    const boot = installPendingSerialCandidateRecovery(profile);
    assert.equal(boot.resumed, 1);
    assert.equal(boot.recoveryRequired, 0);
    assert.deepEqual(restoreQ9QualityLoops({ dependenciesFor: () => dependencies }), { restored: 1, refused: 0 });
    await activeQ9QualityLoops().settled();
    assert.equal(repairs, 0);
    assert.deepEqual(terminals, ["Q9_WORKFLOW_VERIFICATION_FAILED"],
      "restore reconciles the durable approval forward to one honest STOP without reusing its lost grant");
    assert.equal(postBootSnapshots.some((value) =>
      (value as { repairCall?: unknown } | null)?.repairCall != null), false,
    "restore never exposes a misleading replacement repair card");
    assert.equal(readFileSync(harness.fixturePath, "utf8"), originalFixture,
      "no Builder bytes changed before or after restart");
    assert.equal(currentQ9QualityLoop(project), null);
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("graceful restart suspends an undecided approval without sending and restores a fresh action", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-suspend-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "critic-unavailable-retry" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    let sends = 0;
    const dependencies = {
      repairWriter: harness.repairWriter,
      criticTransport: {
        kind: "synthetic-q9-critic" as const,
        async send(): Promise<never> { sends += 1; throw new Error("undecided cards never send"); },
      },
      terminal: Q9_PENDING_CANDIDATE_TERMINAL,
      now: () => new Date("2026-08-11T12:00:01.000Z"),
    };
    const abandoned = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "a".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies,
    });
    void abandoned.catch(() => undefined);
    const before = await waitForSnapshot(project, (value) => value.criticCall !== null);
    const firstApprovalId = before.criticCall!.approvalId;
    const active = activeQ9QualityLoops();
    assert.equal(active.allParkable, true);
    assert.deepEqual(active.parkableDirs, [project]);
    assert.equal(suspendQ9QualityLoopForRestart(project), true);
    assert.deepEqual(parkPendingSerialCandidatesForRestart(), { parked: 1, failed: 0 });
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    const boot = installPendingSerialCandidateRecovery(profile);
    assert.equal(boot.resumed, 1, JSON.stringify(boot));
    assert.deepEqual(restoreQ9QualityLoops({ dependenciesFor: () => dependencies }), { restored: 1, refused: 0 });
    const after = await waitForSnapshot(project, (value) => value.criticCall !== null);
    assert.notEqual(after.criticCall!.approvalId, firstApprovalId, "restart mints a fresh Main-only action id");
    assert.equal(sends, 0);
    assert.equal(after.criticSpent, 0);
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("Q9 harness revision durably binds failed output, reruns exact cN, and reaches DONE", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-harness-revision-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "harness-revision" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    assert.equal(initial.candidate.lineage.evidencePlan.revision, 0);
    const initialFailure = serialCandidateQ9HarnessFailure(initial.candidate);
    assert.ok(initialFailure);
    const initialPreview = previewSerialCandidateQ9HarnessRevision(initial.candidate, initialFailure);
    assert.ok(initialPreview);
    assert.equal(serialQ9HarnessFailureSha256(initialFailure), initialFailure.failureSha256);
    assert.equal(initialPreview.fromPlanSha256, initial.candidate.evidencePlanSha256);
    assert.equal(initialPreview.taskSpecSha256, initial.candidate.taskSpecSha256);
    const beforeCommand = initial.candidate.lineage.evidencePlan.procedures
      .find((row) => row.criterionId === initialFailure.criterionId)?.command;
    const afterCommand = initialPreview.plan.procedures
      .find((row) => row.criterionId === initialFailure.criterionId)?.command;
    assert.equal(beforeCommand?.timeoutMs, 1_000);
    assert.equal(afterCommand?.timeoutMs, 60_000);
    const directApproval = openQ9HarnessRevisionApproval({ dir: project, candidate: initial.candidate });
    assert.ok(directApproval);
    assert.equal(clearQ9HarnessRevisionApprovalIfCurrent(project, directApproval.disclosure), true);
    const terminals: string[] = [];
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "b".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: harness.repairWriter,
        criticTransport: createQ9FakeCriticTransport({ driver }),
        harnessRevision: {
          kind: "synthetic-q9-harness-revision",
          adapter: harness.adapter,
          writerIsolation: harness.writerIsolation,
        },
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        now: () => new Date("2026-08-11T12:00:01.000Z"),
        onTerminal(_root, result) { terminals.push(result.disposition); },
      },
    });
    void settlement.catch(() => undefined);
    const snapshot = await waitForSnapshot(project, (value) => value.harnessRevision !== null);
    const disclosure = snapshot.harnessRevision;
    assert.ok(disclosure);
    assert.equal(disclosure.failureCode, "TIMED_OUT_BEFORE_ASSERTION");
    assert.equal(disclosure.exitCode, 124);
    assert.equal(disclosure.originalTimeoutMs, 1_000);
    assert.equal(disclosure.revisedTimeoutMs, 60_000);
    assert.match(disclosure.boundedOutput, /timed out before reaching/i);
    const altered = decideQ9HarnessRevision({
      dir: project,
      approvalId: disclosure.approvalId,
      action: "approve-revision",
      disclosure: { ...disclosure, boundedOutput: "renderer-altered output" },
    });
    assert.equal(altered.handled && altered.ok, false);
    assert.equal(currentQ9QualityLoop(project)?.harnessRevision, disclosure,
      "a malformed echo cannot consume the genuine Main-held approval");
    const decision = decideQ9HarnessRevision({
      dir: project,
      approvalId: disclosure.approvalId,
      action: "approve-revision",
      disclosure,
    });
    assert.equal(decision.handled && decision.ok, true);
    const workflow = pendingSerialCandidateWorkflow(project);
    const durable = workflow?.events.find((event) =>
      event.kind === "authority" && event.authorityKind === "harness-decision");
    assert.ok(durable && durable.kind === "authority");
    const payload = JSON.parse(durable.canonicalPayload) as Record<string, unknown>;
    const failure = JSON.parse(String(payload.failureCanonicalPayload)) as Record<string, unknown>;
    assert.equal(failure.boundedOutput, disclosure.boundedOutput);
    assert.equal(failure.outputSha256, disclosure.outputSha256);
    assert.equal(payload.failureSha256, disclosure.failureSha256);
    const result = await Promise.race([
      settlement,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(
        `Q9_HARNESS_SETTLEMENT_TIMEOUT:${JSON.stringify(currentQ9QualityLoop(project))};terminals=${JSON.stringify(terminals)};workflow=${JSON.stringify(pendingSerialCandidateWorkflow(project))}`,
      )), 30_000)),
    ]);
    assert.equal(result.disposition, "DONE");
    assert.deepEqual(terminals, ["DONE"]);
    assert.equal(currentQ9QualityLoop(project), null);
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("Q9 harness refusal remains revision zero and authors one STOP", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-harness-refusal-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = { e2e: process.env.CAIRN_E2E, mock: process.env.CAIRN_MOCK, q9: process.env.CAIRN_TEST_Q9 };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "harness-refusal" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    const initialFailure = serialCandidateQ9HarnessFailure(initial.candidate);
    assert.ok(initialFailure);
    assert.ok(previewSerialCandidateQ9HarnessRevision(initial.candidate, initialFailure));
    const settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session: {
        conversationId: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        adapterIdentitySha256: "c".repeat(64),
        evidenceRunId: null,
        acceptedRequest: null,
      },
      dependencies: {
        repairWriter: harness.repairWriter,
        criticTransport: createQ9FakeCriticTransport({ driver }),
        harnessRevision: {
          kind: "synthetic-q9-harness-revision",
          adapter: harness.adapter,
          writerIsolation: harness.writerIsolation,
        },
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        now: () => new Date("2026-08-11T12:00:01.000Z"),
      },
    });
    void settlement.catch(() => undefined);
    const snapshot = await waitForSnapshot(project, (value) => value.harnessRevision !== null);
    const disclosure = snapshot.harnessRevision;
    assert.ok(disclosure);
    const decision = decideQ9HarnessRevision({
      dir: project,
      approvalId: disclosure.approvalId,
      action: "stop-task",
      disclosure,
    });
    assert.equal(decision.handled && decision.ok, true);
    assert.equal(currentPendingSerialCandidate(project)?.candidate.lineage.evidencePlan.revision, 0,
      "refusal never adopts the proposed plan");
    const result = await settlement;
    assert.equal(result.disposition, "STOPPED");
    assert.equal(result.status, "stopped");
    if (result.status === "stopped") assert.equal(result.reason, "CANCELLED_BY_OWNER");
    assert.match(readFileSync(result.reportPath, "utf8"),
      /you stopped it yourself\. \(Code: `CANCELLED_BY_OWNER`\.\)/u);
    assert.equal(currentQ9QualityLoop(project), null);
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});

test("Q9 runs blocker, confirmed repair, final critic, and actual-result settlement once", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-q9-loop-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const project = governedProject(parent);
  const previous = {
    e2e: process.env.CAIRN_E2E,
    mock: process.env.CAIRN_MOCK,
    q9: process.env.CAIRN_TEST_Q9,
  };
  Object.assign(process.env, GUARD);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  _resetQ9QualityLoopsForTests();
  setEvidenceMarkerDir(profile);
  let settlement: Promise<unknown> | null = null;
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const driver = createQ9FakeScenarioDriver({
      profileRoot: profile,
      environment: { ...GUARD, CAIRN_Q9_SCENARIO: "required-repair-clear" },
    });
    assert.ok(driver);
    const harness = createQ9FakeTaskHarness({ projectRoot: project, profileRoot: profile, scenarioDriver: driver });
    assert.ok(harness);
    const initial = await harness.runInitial();
    assert.equal(initial.status, "candidate");
    if (initial.status !== "candidate") return;
    const terminals: Array<Readonly<{ disposition: string; card: unknown }>> = [];
    const snapshots: unknown[] = [];
    let repairFailure: unknown = null;
    const session = Object.freeze({
      conversationId: "007",
      startedAt: "2026-08-11T12:00:00.000Z",
      adapterIdentitySha256: createHash("sha256").update("q9-test-adapter").digest("hex"),
      evidenceRunId: null,
      acceptedRequest: null,
    });
    settlement = startQ9QualityLoop({
      projectRoot: project,
      candidate: initial,
      evidence: null,
      session,
      dependencies: {
        repairWriter: {
          kind: "synthetic-q9-builder",
          async run(input) {
            try { return await harness.repairWriter.run(input); }
            catch (error) { repairFailure = error; throw error; }
          },
        },
        criticTransport: createQ9FakeCriticTransport({
          driver,
          now: () => new Date("2026-08-11T12:00:01.000Z"),
        }),
        terminal: Q9_PENDING_CANDIDATE_TERMINAL,
        now: () => new Date("2026-08-11T12:00:02.000Z"),
        onChanged(root) { snapshots.push(currentQ9QualityLoop(root)); },
        onTerminal(_root, result, card) { terminals.push({ disposition: result.disposition, card }); },
      },
    });
    let settlementFailure: unknown = null;
    void settlement.catch((error) => { settlementFailure = error; });

    let snapshot = await waitForSnapshot(project, (value) => value.criticCall !== null)
      .catch((error) => { throw new Error(`${String(error)};failure=${String(settlementFailure)};repair=${String(repairFailure)};trace=${JSON.stringify(snapshots)};terminals=${JSON.stringify(terminals)}`); });
    const firstCritic = snapshot.criticCall;
    assert.ok(firstCritic);
    const firstDecision = decideQ9Critic({
      dir: project,
      approvalId: firstCritic.approvalId,
      action: "approve",
      disclosure: firstCritic,
    });
    assert.equal(firstDecision.handled, true);
    assert.equal(firstDecision.handled && firstDecision.ok, true);

    snapshot = await waitForSnapshot(project, (value) => value.status === "awaiting-owner" || value.repairCall !== null)
      .catch((error) => { throw new Error(`${String(error)};trace=${JSON.stringify(snapshots)}`); });
    if (snapshot.repairCall === null) {
      const action = snapshot.taskReview?.criteria.flatMap((criterion) => criterion.ownerChecks)
        .map((check) => check.action)
        .find((item): item is NonNullable<typeof item> => item?.kind === "resolve");
      assert.ok(action, "the blocker remains an allegation until the owner confirms it");
      const ownerDecision = decideQ9TaskReview({
        dir: project,
        actionId: action.actionId,
        action: { kind: "resolve", decision: "confirmed" },
      });
      assert.equal(ownerDecision.handled, true);
      assert.equal(ownerDecision.handled && ownerDecision.ok, true);
    }

    snapshot = await waitForSnapshot(project, (value) => value.repairCall !== null);
    const repair = snapshot.repairCall;
    assert.ok(repair);
    const repairDecision = decideQ9Repair({
      dir: project,
      approvalId: repair.approvalId,
      action: "approve",
      disclosure: repair,
    });
    assert.equal(repairDecision.handled, true);
    assert.equal(repairDecision.handled && repairDecision.ok, true);

    snapshot = await waitForSnapshot(project, (value) => value.round === 1 && value.criticCall !== null)
      .catch((error) => { throw new Error(`${String(error)};failure=${String(settlementFailure)};repair=${String(repairFailure)};trace=${JSON.stringify(snapshots)};terminals=${JSON.stringify(terminals)}`); });
    const finalCritic = snapshot.criticCall;
    assert.ok(finalCritic);
    const finalDecision = decideQ9Critic({
      dir: project,
      approvalId: finalCritic.approvalId,
      action: "approve",
      disclosure: finalCritic,
    });
    assert.equal(finalDecision.handled, true);
    assert.equal(finalDecision.handled && finalDecision.ok, true);

    const result = await Promise.race([
      settlement,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(
        `Q9_TEST_SETTLEMENT_TIMEOUT:${JSON.stringify(currentQ9QualityLoop(project))};repair=${String(repairFailure)};trace=${JSON.stringify(snapshots)}`,
      )), 10_000)),
    ]);
    assert.equal((result as { disposition?: unknown }).disposition, "DONE");
    assert.equal(terminals.length, 1);
    assert.equal(terminals[0]?.disposition, "DONE");
    assert.ok(terminals[0]?.card);
    assert.equal(currentQ9QualityLoop(project), null);
    const deliveries = pendingSerialCandidateTerminalCardDeliveries();
    assert.equal(deliveries.length, 1, "actual Core settlement produces one durable card delivery");
    const delivered = JSON.parse(deliveries[0]!.card.canonicalCard) as Record<string, unknown>;
    assert.equal(delivered.disposition, "DONE");
    assert.equal(Object.prototype.hasOwnProperty.call(delivered, "taskReview"), false);
    assert.equal(
      initial.candidate.lineage.taskSpec.quality.references[0]?.snapshotSha256,
      Q9_FAKE_REFERENCE_SHA256,
      "the final loop began with the exact immutable reference identity",
    );
    assert.equal(readFileSync(harness.fixturePath, "utf8"), "Q9 required-repair-clear round one: repaired.\n");
  } finally {
    setEvidenceMarkerDir(null);
    _resetQ9QualityLoopsForTests();
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    if (previous.e2e === undefined) delete process.env.CAIRN_E2E; else process.env.CAIRN_E2E = previous.e2e;
    if (previous.mock === undefined) delete process.env.CAIRN_MOCK; else process.env.CAIRN_MOCK = previous.mock;
    if (previous.q9 === undefined) delete process.env.CAIRN_TEST_Q9; else process.env.CAIRN_TEST_Q9 = previous.q9;
    rmSync(parent, { recursive: true, force: true });
  }
});
