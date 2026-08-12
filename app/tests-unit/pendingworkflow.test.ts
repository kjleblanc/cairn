import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PENDING_RUN_STATE_VERSION,
  PENDING_RUN_HARNESS_DECISION_VERSION,
  PENDING_RUN_TERMINAL_CARD_DELIVERY_VERSION,
  _interruptPendingRunAfterCardDeliveryWriteForTests,
  _interruptPendingRunAfterCloseIntentForTests,
  _resetPendingRunsForTests,
  appendPendingRunCandidateWorkflowRevision,
  appendPendingRunHarnessRerunRevision,
  appendPendingRunRevision,
  appendPendingRunWorkflowEvent,
  appendPendingRunWorkflowRevision,
  closePendingRun,
  createPendingRun,
  initialPendingRunWorkflow,
  installPendingRunStore,
  interruptPendingRunOperationForRecovery,
  pendingRunAuthority,
  pendingRunGate,
  pendingRunRecoveryInputs,
  pendingRunTerminalCardDeliveries,
  pendingRunWorkflowProjection,
  preparePendingRunTerminal,
  parsePendingRunState,
  recordPendingRunTerminalCardDelivery,
  type PendingRunOperationEventInputV1,
  type PendingRunDecisionEventInputV1,
  type PendingRunAuthorityEventInputV1,
  type PendingRunStateV1,
  type PendingRunWorkflowEventInputV1,
} from "../src/main/pendingrun.js";
import { postResultCardOnce } from "../src/main/conductor/relay.js";
import { setCardMarkerDir } from "../src/main/conductor/cardauth.js";
import { setTurnMarkerDir } from "../src/main/conductor/turnauth.js";
import { newConversationId } from "../src/main/conductor/store.js";
import type { ResultCard } from "../src/shared/ipc.js";

const RUN_ID = "41414141-4141-4141-8141-414141414141";
const ACTION_ID = "42424242-4242-4242-8242-424242424242";
const OPERATION_A = "43434343-4343-4343-8343-434343434343";
const OPERATION_B = "44444444-4444-4444-8444-444444444444";
const OPERATION_C = "45454545-4545-4545-8545-454545454545";
const PREVIEW_A = "46464646-4646-4646-8646-464646464646";
const PREVIEW_B = "47474747-4747-4747-8747-474747474747";
const PREVIEW_C = "48484848-4848-4848-8848-484848484848";

function sha(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function roots() {
  const root = mkdtempSync(join(tmpdir(), "cairn-pending-workflow-"));
  const profile = join(root, "profile");
  const project = join(root, "project");
  mkdirSync(profile);
  mkdirSync(project);
  return { root, profile, project };
}

function capsule(label: string): Buffer {
  return Buffer.from(JSON.stringify({ version: "workflow-test/v1", label }), "utf8");
}

function harnessFailurePayload(state: PendingRunStateV1): Readonly<{
  failureSha256: string;
  canonicalPayload: string;
}> {
  const boundedOutput = "Q9 injected harness timeout before assertion.";
  const withoutSha = {
    version: "cairn-serial-q9-harness-failure/v1",
    projectHash: "a".repeat(64),
    runId: RUN_ID,
    candidateSha256: state.candidateSha256,
    taskSpecSha256: state.taskSpecSha256,
    evidencePlanSha256: state.workflow?.activeEvidencePlanSha256 as string,
    criterionId: "c1",
    commandSha256: "b".repeat(64),
    code: "TIMED_OUT_BEFORE_ASSERTION",
    exitCode: 124,
    boundedOutput,
    outputSha256: sha(boundedOutput),
    evidenceRef: "q9-harness-abcdefabcdefabcdefabcdef",
  };
  const failureSha256 = sha(JSON.stringify(withoutSha));
  return Object.freeze({
    failureSha256,
    canonicalPayload: JSON.stringify({ ...withoutSha, failureSha256 }),
  });
}

function stateFor(bytes: Uint8Array, overrides: Partial<PendingRunStateV1> = {}): PendingRunStateV1 {
  const initialPlan = "d".repeat(64);
  const workflow = initialPendingRunWorkflow(initialPlan);
  assert.ok(workflow);
  return {
    version: PENDING_RUN_STATE_VERSION,
    displayOutcome: "Keep one exact Q9 workflow.",
    taskNumber: 220,
    phase: "awaiting-critic",
    criticMode: "required",
    generation: 0,
    round: 0,
    baseHead: "a".repeat(40),
    gitStateSha256: "b".repeat(64),
    taskSpecSha256: "c".repeat(64),
    evidencePlanSha256: initialPlan,
    candidateSha256: "e".repeat(64),
    candidateIdentitySha256: "0".repeat(64),
    capsuleSha256: sha(bytes),
    bundleSha256s: ["f".repeat(64)],
    evidenceRunId: null,
    evidenceStateSha256: null,
    evidenceRevision: 0,
    route: {
      adapterLabel: "Hermetic fake Builder",
      provider: "local fake",
      model: "fixture-v1",
      receiptSha256: "1".repeat(64),
    },
    counters: {
      builder: { spent: 1, remaining: 0 },
      repair: { spent: 0, remaining: 1 },
      critic: { spent: 0, remaining: 3 },
      externalEvidence: { spent: 0, remaining: 0 },
    },
    terminalAction: null,
    workflow,
    ...overrides,
  };
}

function operation(
  state: PendingRunStateV1,
  operationId: string,
  previewId: string,
  attempt: number,
  status: PendingRunOperationEventInputV1["status"],
  retryOfOperationId: string | null = null,
): PendingRunOperationEventInputV1 {
  return {
    kind: "operation",
    operationKind: "critic",
    operationId,
    status,
    previewId,
    previewSha256: sha(`preview-${operationId}`),
    authorizationSha256: sha(`authorization-${operationId}`),
    routeReceiptSha256: sha(`route-${operationId}`),
    requestSha256: sha(`request-${operationId}`),
    candidateSha256: state.candidateSha256,
    candidateIdentitySha256: state.candidateIdentitySha256 as string,
    taskSpecSha256: state.taskSpecSha256,
    activeEvidencePlanSha256: state.workflow?.activeEvidencePlanSha256 as string,
    round: state.round,
    attempt,
    retryOfOperationId,
    outcomeSha256: status === "reserved" || status === "sending" ? null : sha(`outcome-${operationId}-${status}`),
  };
}

function decision(
  state: PendingRunStateV1,
  event: PendingRunOperationEventInputV1,
  outcome: PendingRunDecisionEventInputV1["outcome"] = "approved",
): PendingRunDecisionEventInputV1 {
  const stoppedRepair = event.operationKind === "repair" && outcome !== "approved";
  return {
    kind: "decision",
    decisionKind: event.operationKind,
    approvalId: event.previewId,
    operationId: event.operationId,
    outcome,
    decidedAt: `2026-08-11T14:00:0${Math.min(event.attempt, 9)}.000Z`,
    disclosureSha256: sha(`disclosure-${event.operationId}`),
    previewSha256: event.previewSha256,
    authorizationSha256: stoppedRepair ? null : event.authorizationSha256,
    routeReceiptSha256: event.routeReceiptSha256,
    requestSha256: stoppedRepair ? null : event.requestSha256,
    candidateSha256: event.candidateSha256,
    candidateIdentitySha256: state.candidateIdentitySha256 as string,
    taskSpecSha256: event.taskSpecSha256,
    activeEvidencePlanSha256: event.activeEvidencePlanSha256,
    round: event.round,
    attempt: event.attempt,
    retryOfOperationId: event.retryOfOperationId,
  };
}

function withWorkflow(state: PendingRunStateV1, workflowState: PendingRunStateV1): PendingRunStateV1 {
  return { ...state, workflow: workflowState.workflow };
}

test("authority custody separates owner observation, critic resolution, and the one harness-plan authorization", () => {
  const bytes0 = capsule("authority-0");
  let state = stateFor(bytes0, { phase: "ready-to-seal", criticMode: "off" });
  const payload = (kind: string) => JSON.stringify({ kind });
  const sessionPayload = JSON.stringify({
    acceptedRequest: { outcome: "Keep one exact Q9 workflow." },
    outputProjection: { disposition: null },
  });
  state = appendPendingRunWorkflowEvent(state, {
    kind: "session",
    sessionSha256: sha(sessionPayload),
    canonicalPayload: sessionPayload,
    conversationId: "007",
    startedAt: "2026-08-11T14:00:00.000Z",
    adapterIdentitySha256: sha("adapter"),
    candidateSha256: state.candidateSha256,
    candidateIdentitySha256: state.candidateIdentitySha256 as string,
    taskSpecSha256: state.taskSpecSha256,
    activeEvidencePlanSha256: state.workflow?.activeEvidencePlanSha256 as string,
    round: state.round,
  }) as PendingRunStateV1;
  assert.equal(pendingRunWorkflowProjection(state)?.session?.conversationId, "007");
  assert.equal(pendingRunWorkflowProjection(state)?.session?.canonicalPayload, sessionPayload);
  const authority = (
    kind: PendingRunAuthorityEventInputV1["authorityKind"],
    label: string,
    assessmentSha256: string | null,
  ): PendingRunAuthorityEventInputV1 => ({
    kind: "authority",
    authorityKind: kind,
    authoritySha256: sha(payload(label)),
    canonicalPayload: payload(label),
    assessmentSha256,
    candidateSha256: state.candidateSha256,
    candidateIdentitySha256: state.candidateIdentitySha256 as string,
    taskSpecSha256: state.taskSpecSha256,
    activeEvidencePlanSha256: state.workflow?.activeEvidencePlanSha256 as string,
    round: state.round,
  });

  const assessment = authority("assessment", "assessment", null);
  state = appendPendingRunWorkflowEvent(state, assessment) as PendingRunStateV1;
  assert.ok(state);
  const observation = authority("owner-observation", "owner-observation", null);
  state = appendPendingRunWorkflowEvent(state, observation) as PendingRunStateV1;
  assert.ok(state, "an owner-judged observation has no critic-assessment parent");
  assert.equal(appendPendingRunWorkflowEvent(state, authority("owner-resolution", "forged", sha("unknown"))), null);
  state = appendPendingRunWorkflowEvent(
    state,
    authority("owner-resolution", "owner-resolution", assessment.authoritySha256),
  ) as PendingRunStateV1;
  assert.ok(state, "a resolution may link only to a recorded critic assessment");
  assert.equal(appendPendingRunWorkflowEvent(
    state,
    authority("harness-authorization", "unapproved-harness-authorization", null),
  ), null, "harness authorization cannot precede the durable owner decision");
  assert.equal(parsePendingRunState({
    ...state,
    workflow: { ...state.workflow, events: [...(state.workflow?.events ?? [])].reverse() },
  }), null, "event order is part of the hash chain");

  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    assert.equal(createPendingRun({ projectRoot: fixture.project, runId: RUN_ID, state, capsuleBytes: bytes0 }).ok, true);
    const main = pendingRunAuthority(fixture.project);
    const gate0 = pendingRunGate(fixture.project);
    assert.ok(main && gate0?.state);
    const rolledWorkflow = state.workflow && { ...state.workflow, events: state.workflow.events.slice(0, -1) };
    assert.equal(appendPendingRunRevision(
      main,
      gate0.revision as number,
      { ...state, workflow: rolledWorkflow },
      bytes0,
    ).ok, false, "a valid earlier workflow prefix cannot replace the durable current state");
    const wrongPlan = {
      kind: "evidence-plan-revision" as const,
      fromEvidencePlanSha256: state.evidencePlanSha256,
      toEvidencePlanSha256: "2".repeat(64),
      authorizationSha256: sha(payload("owner-resolution")),
      failedOutputSha256: "3".repeat(64),
    };
    const bytes1 = capsule("authority-1");
    const revised = withWorkflow(stateFor(bytes1, {
      phase: state.phase,
      criticMode: state.criticMode,
      generation: 1,
      gitStateSha256: "4".repeat(64),
      candidateSha256: "5".repeat(64),
      candidateIdentitySha256: "6".repeat(64),
      workflow: state.workflow,
    }), state);
    assert.equal(appendPendingRunCandidateWorkflowRevision(
      main, gate0.revision as number, revised, bytes1, wrongPlan,
    ).ok, false, "an owner resolution is not harness-revision authority");

    const harnessAuthorizationPayload = payload("harness-authorization");
    const harnessAuthorizationSha256 = sha(harnessAuthorizationPayload);
    const harnessFailure = harnessFailurePayload(state);
    const harnessDecisionPayload = JSON.stringify({
      version: PENDING_RUN_HARNESS_DECISION_VERSION,
      approvalId: PREVIEW_C,
      outcome: "approved",
      failureSha256: harnessFailure.failureSha256,
      failureCanonicalPayload: harnessFailure.canonicalPayload,
      previewSha256: sha("harness-preview"),
      authorizationSha256: harnessAuthorizationSha256,
      decidedAt: "2026-08-11T14:01:00.000Z",
    });
    const harnessDecision = {
      ...authority("harness-decision", "unused", null),
      authoritySha256: sha(harnessDecisionPayload),
      canonicalPayload: harnessDecisionPayload,
    } satisfies PendingRunAuthorityEventInputV1;
    const decisionAppend = appendPendingRunWorkflowRevision(main, gate0.revision as number, harnessDecision);
    assert.equal(decisionAppend.ok, true, decisionAppend.ok ? "" : decisionAppend.code);
    const gate1 = pendingRunGate(fixture.project);
    assert.ok(gate1?.state);
    const harness = {
      ...authority("harness-authorization", "harness-authorization", null),
      authoritySha256: harnessAuthorizationSha256,
      canonicalPayload: harnessAuthorizationPayload,
    } satisfies PendingRunAuthorityEventInputV1;
    const harnessAppend = appendPendingRunWorkflowRevision(main, gate1.revision as number, harness);
    assert.equal(harnessAppend.ok, true, harnessAppend.ok ? "" : harnessAppend.code);
    const gate2 = pendingRunGate(fixture.project);
    assert.ok(gate2?.state);
    const planEvent = { ...wrongPlan, authorizationSha256: harness.authoritySha256 };
    const revisedWithCurrent = { ...revised, workflow: gate1.state.workflow };
    const planAppend = appendPendingRunCandidateWorkflowRevision(
      main, gate2.revision as number, { ...revisedWithCurrent, workflow: gate2.state.workflow }, bytes1, planEvent,
    );
    assert.equal(planAppend.ok, true, planAppend.ok ? "" : planAppend.code);
    assert.equal(planAppend.value.state?.evidencePlanSha256, state.evidencePlanSha256, "plan zero remains immutable");
    assert.equal(planAppend.value.state?.workflow?.activeEvidencePlanSha256, wrongPlan.toEvidencePlanSha256);
    const beforeRerun = planAppend.value.state as PendingRunStateV1;
    const rerunBytes = capsule("harness-rerun");
    const afterRerun = { ...beforeRerun, capsuleSha256: sha(rerunBytes) };
    assert.equal(appendPendingRunRevision(
      main, planAppend.value.revision as number, afterRerun, rerunBytes,
    ).ok, false, "a generic same-generation capsule replacement remains forbidden");
    const forgedRerunPayload = JSON.stringify({
      version: "cairn-pending-run-harness-rerun/v1",
      fromCapsuleSha256: beforeRerun.capsuleSha256,
      toCapsuleSha256: sha(rerunBytes),
      candidateIdentitySha256: beforeRerun.candidateIdentitySha256,
      activeEvidencePlanSha256: beforeRerun.workflow?.activeEvidencePlanSha256,
    });
    assert.equal(appendPendingRunWorkflowRevision(
      main,
      planAppend.value.revision as number,
      {
        ...authority("harness-rerun", "unused", null),
        authoritySha256: sha(forgedRerunPayload),
        canonicalPayload: forgedRerunPayload,
        candidateSha256: beforeRerun.candidateSha256,
        candidateIdentitySha256: beforeRerun.candidateIdentitySha256 as string,
        taskSpecSha256: beforeRerun.taskSpecSha256,
        activeEvidencePlanSha256: beforeRerun.workflow?.activeEvidencePlanSha256 as string,
        round: beforeRerun.round,
      },
    ).ok, false, "the rerun event cannot be appended without the exact capsule transition");
    const rerunAppend = appendPendingRunHarnessRerunRevision(
      main, planAppend.value.revision as number, afterRerun, rerunBytes,
    );
    assert.equal(rerunAppend.ok, true, rerunAppend.ok ? "" : rerunAppend.code);
    assert.equal(rerunAppend.value.state?.workflow?.events.at(-1)?.kind, "authority");
    const rerunEvent = rerunAppend.value.state?.workflow?.events.at(-1);
    assert.equal(rerunEvent?.kind === "authority" ? rerunEvent.authorityKind : null, "harness-rerun");
    const duplicateRerunBytes = capsule("harness-rerun-duplicate");
    assert.equal(appendPendingRunHarnessRerunRevision(
      main,
      rerunAppend.value.revision as number,
      { ...afterRerun, workflow: rerunAppend.value.state?.workflow, capsuleSha256: sha(duplicateRerunBytes) },
      duplicateRerunBytes,
    ).ok, false, "the sole harness rerun cannot be replayed");
    const bytes2 = capsule("authority-2");
    const twiceRevised = stateFor(bytes2, {
      phase: state.phase,
      criticMode: state.criticMode,
      generation: 2,
      gitStateSha256: "7".repeat(64),
      candidateSha256: "8".repeat(64),
      candidateIdentitySha256: "9".repeat(64),
      workflow: rerunAppend.value.state?.workflow,
    });
    assert.equal(appendPendingRunCandidateWorkflowRevision(
      main,
      rerunAppend.value.revision as number,
      twiceRevised,
      bytes2,
      {
        ...planEvent,
        fromEvidencePlanSha256: wrongPlan.toEvidencePlanSha256,
        toEvidencePlanSha256: "a".repeat(64),
      },
    ).ok, false, "EvidencePlan lineage cannot advance beyond the authorized 0-to-1 seam");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("a durable harness refusal is terminal and cannot be reopened after restart", () => {
  const bytes = capsule("harness-refusal");
  const state = stateFor(bytes, { phase: "ready-to-seal", criticMode: "off" });
  const harnessFailure = harnessFailurePayload(state);
  const canonicalPayload = JSON.stringify({
    version: PENDING_RUN_HARNESS_DECISION_VERSION,
    approvalId: PREVIEW_C,
    outcome: "task-stopped",
    failureSha256: harnessFailure.failureSha256,
    failureCanonicalPayload: harnessFailure.canonicalPayload,
    previewSha256: sha("harness-preview"),
    authorizationSha256: null,
    decidedAt: "2026-08-11T14:02:00.000Z",
  });
  const refused = appendPendingRunWorkflowEvent(state, {
    kind: "authority",
    authorityKind: "harness-decision",
    authoritySha256: sha(canonicalPayload),
    canonicalPayload,
    assessmentSha256: null,
    candidateSha256: state.candidateSha256,
    candidateIdentitySha256: state.candidateIdentitySha256 as string,
    taskSpecSha256: state.taskSpecSha256,
    activeEvidencePlanSha256: state.workflow?.activeEvidencePlanSha256 as string,
    round: state.round,
  });
  assert.ok(refused);
  const attemptedReopen = appendPendingRunWorkflowEvent(refused, {
    kind: "authority",
    authorityKind: "owner-observation",
    authoritySha256: sha(JSON.stringify({ kind: "reopen" })),
    canonicalPayload: JSON.stringify({ kind: "reopen" }),
    assessmentSha256: null,
    candidateSha256: state.candidateSha256,
    candidateIdentitySha256: state.candidateIdentitySha256 as string,
    taskSpecSha256: state.taskSpecSha256,
    activeEvidencePlanSha256: state.workflow?.activeEvidencePlanSha256 as string,
    round: state.round,
  });
  assert.equal(attemptedReopen, null);
  assert.ok(parsePendingRunState(refused), "the exact refusal remains parseable after a process restart");
});

test("critic reservations are pre-spent atomically and one unavailable retry cannot be replayed", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const bytes0 = capsule("critic-0");
    const initial = stateFor(bytes0);
    assert.equal(createPendingRun({ projectRoot: fixture.project, runId: RUN_ID, state: initial, capsuleBytes: bytes0 }).ok, true);
    const main = pendingRunAuthority(fixture.project);
    assert.ok(main);

    const reservationShape = (before: PendingRunStateV1, bytes: Buffer, identity: string, generation: number,
      spent: number, operationId: string, previewId: string, retryOf: string | null,
      eventOverride: Partial<PendingRunOperationEventInputV1> = {}) => {
      const next: PendingRunStateV1 = stateFor(bytes, {
        phase: "awaiting-critic-result",
        generation,
        gitStateSha256: sha(`git-${generation}`),
        candidateIdentitySha256: identity,
        counters: {
          ...before.counters,
          critic: { spent, remaining: 3 - spent },
        },
        workflow: before.workflow,
      });
      const event = { ...operation(next, operationId, previewId, spent, "reserved", retryOf), ...eventOverride };
      return { next, event };
    };
    const reserveApproved = (before: PendingRunStateV1, bytes: Buffer, identity: string, generation: number,
      spent: number, operationId: string, previewId: string, retryOf: string | null) => {
      const shaped = reservationShape(before, bytes, identity, generation, spent, operationId, previewId, retryOf);
      const gate = pendingRunGate(fixture.project);
      assert.ok(gate?.revision);
      const durableDecision = appendPendingRunWorkflowRevision(main, gate.revision, decision(before, shaped.event));
      assert.equal(durableDecision.ok, true, durableDecision.ok ? "" : durableDecision.code);
      const next = { ...shaped.next, workflow: durableDecision.value.state?.workflow };
      const result = appendPendingRunCandidateWorkflowRevision(
        main, durableDecision.value.revision as number, next, bytes, shaped.event,
      );
      return { result, next: result.ok ? result.value.state as PendingRunStateV1 : next, event: shaped.event };
    };
    const settleUnavailable = (before: PendingRunStateV1, bytes: Buffer, identity: string, generation: number,
      reserved: PendingRunOperationEventInputV1) => {
      const next = stateFor(bytes, {
        phase: "awaiting-critic",
        generation,
        gitStateSha256: sha(`git-${generation}`),
        candidateIdentitySha256: identity,
        counters: before.counters,
        workflow: before.workflow,
      });
      const gate = pendingRunGate(fixture.project);
      assert.ok(gate?.revision);
      const result = appendPendingRunCandidateWorkflowRevision(main, gate.revision, next, bytes, {
        ...reserved,
        status: "unavailable",
        outcomeSha256: sha(`unavailable-${reserved.operationId}`),
      });
      assert.equal(result.ok, true, result.ok ? "" : result.code);
      return result.value.state as PendingRunStateV1;
    };
    const markSending = (reserved: PendingRunOperationEventInputV1) => {
      const gate = pendingRunGate(fixture.project);
      assert.ok(gate?.revision);
      const result = appendPendingRunWorkflowRevision(main, gate.revision, {
        ...reserved,
        status: "sending",
        outcomeSha256: null,
      });
      assert.equal(result.ok, true, result.ok ? "" : result.code);
      return result.value.state as PendingRunStateV1;
    };

    const first = reserveApproved(initial, capsule("critic-1"), "1".repeat(64), 1, 1, OPERATION_A, PREVIEW_A, null);
    assert.equal(first.result.ok, true, first.result.ok ? "" : first.result.code);
    let current = first.result.value.state as PendingRunStateV1;
    const gateAfterReserve = pendingRunGate(fixture.project);
    assert.ok(gateAfterReserve?.revision);
    assert.equal(appendPendingRunWorkflowRevision(main, gateAfterReserve.revision, first.event).ok, false,
      "a duplicate/reordered reservation is not a successor");
    current = markSending(first.event);
    current = settleUnavailable(current, capsule("critic-2"), "2".repeat(64), 2, first.event);

    const launderedRetry = reservationShape(
      current, capsule("critic-3x"), "3".repeat(64), 3, 2, OPERATION_B, PREVIEW_B, null,
    );
    assert.equal(appendPendingRunWorkflowEvent(current, decision(current, launderedRetry.event)), null,
      "an unavailable successor must name the exact call it retries");
    const replayedApproval = reservationShape(
      current, capsule("critic-3y"), "3".repeat(64), 3, 2, OPERATION_B, PREVIEW_B, OPERATION_A,
      { authorizationSha256: first.event.authorizationSha256 },
    );
    assert.equal(appendPendingRunWorkflowEvent(current, decision(current, replayedApproval.event)), null,
      "a fresh operation cannot replay an earlier approval identity");
    const retry = reserveApproved(current, capsule("critic-3"), "3".repeat(64), 3, 2, OPERATION_B, PREVIEW_B, OPERATION_A);
    assert.equal(retry.result.ok, true, retry.result.ok ? "" : retry.result.code);
    current = markSending(retry.event);
    current = settleUnavailable(current, capsule("critic-4"), "4".repeat(64), 4, retry.event);
    assert.equal(pendingRunWorkflowProjection(current)?.unavailableRetryUsed, true);

    const secondRetry = reservationShape(
      current, capsule("critic-5"), "5".repeat(64), 5, 3, OPERATION_C, PREVIEW_C, OPERATION_B,
    );
    assert.equal(appendPendingRunWorkflowEvent(current, decision(current, secondRetry.event)), null,
      "the single unavailable retry cannot be reset or replayed");
    const thirdOrdinary = reservationShape(
      current, capsule("critic-5b"), "6".repeat(64), 5, 3, OPERATION_C, PREVIEW_C, null,
    );
    assert.equal(appendPendingRunWorkflowEvent(current, decision(current, thirdOrdinary.event)), null,
      "dropping retryOf cannot launder a second unavailable retry");
    assert.equal(pendingRunWorkflowProjection(current)?.criticOperations, 2);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("a declined repair spends no call and a reserved repair can never be replaced", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const bytes0 = capsule("repair-0");
    const initial = stateFor(bytes0, { phase: "awaiting-repair", criticMode: "off" });
    const repairEvent = (state: PendingRunStateV1, operationId: string, previewId: string, attempt: number,
      status: PendingRunOperationEventInputV1["status"]): PendingRunOperationEventInputV1 => ({
      ...operation(state, operationId, previewId, attempt, status),
      operationKind: "repair",
    });
    const declinedEvent = repairEvent(initial, OPERATION_A, PREVIEW_A, 1, "reserved");
    const declined = appendPendingRunWorkflowEvent(initial, decision(initial, declinedEvent, "task-stopped"));
    assert.ok(declined);
    assert.equal(pendingRunWorkflowProjection(declined)?.repairOperations, 0);

    assert.equal(createPendingRun({ projectRoot: fixture.project, runId: RUN_ID, state: initial, capsuleBytes: bytes0 }).ok, true);
    const authority = pendingRunAuthority(fixture.project);
    const gate0 = pendingRunGate(fixture.project);
    assert.ok(authority && gate0?.revision);
    const bytes1 = capsule("repair-1");
    const reserved = stateFor(bytes1, {
      phase: "awaiting-repair-result",
      criticMode: "off",
      generation: 1,
      gitStateSha256: "a".repeat(64),
      candidateIdentitySha256: "1".repeat(64),
      counters: { ...initial.counters, repair: { spent: 1, remaining: 0 } },
      workflow: initial.workflow,
    });
    const reservation = repairEvent(reserved, OPERATION_A, PREVIEW_A, 1, "reserved");
    const approved = appendPendingRunWorkflowRevision(authority, gate0.revision, decision(initial, reservation));
    assert.equal(approved.ok, true, approved.ok ? "" : approved.code);
    const reservedWithDecision = { ...reserved, workflow: approved.value.state?.workflow };
    const first = appendPendingRunCandidateWorkflowRevision(
      authority, approved.value.revision as number, reservedWithDecision, bytes1, reservation,
    );
    assert.equal(first.ok, true, first.ok ? "" : first.code);
    const gate1 = pendingRunGate(fixture.project);
    assert.ok(gate1?.revision);
    const sending = appendPendingRunWorkflowRevision(authority, gate1.revision, {
      ...reservation, status: "sending", outcomeSha256: null,
    });
    assert.equal(sending.ok, true, sending.ok ? "" : sending.code);
    const settled = appendPendingRunWorkflowRevision(authority, sending.value.revision as number, {
      ...reservation, status: "unavailable", outcomeSha256: "3".repeat(64),
    });
    assert.equal(settled.ok, true, settled.ok ? "" : settled.code);
    const unavailable = settled.value.state as PendingRunStateV1;
    assert.equal(unavailable.phase, "awaiting-repair-result", "no fake Core successor is invented for repair unavailability");
    assert.equal(appendPendingRunWorkflowRevision(
      authority,
      settled.value.revision as number,
      repairEvent(unavailable, OPERATION_B, PREVIEW_B, 2, "reserved"),
    ).ok, false, "repair cap remains spent while the orchestrator proceeds to STOP");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("a durable decline is terminal for that operation kind", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const bytes0 = capsule("decline-0");
    const initial = stateFor(bytes0, { phase: "awaiting-repair", criticMode: "off" });
    const repair = (state: PendingRunStateV1, operationId: string, previewId: string,
      status: PendingRunOperationEventInputV1["status"]): PendingRunOperationEventInputV1 => ({
      ...operation(state, operationId, previewId, 1, status),
      operationKind: "repair",
    });
    const declinedReservation = repair(initial, OPERATION_A, PREVIEW_A, "reserved");
    const declined = appendPendingRunWorkflowEvent(initial, decision(initial, declinedReservation, "task-stopped"));
    assert.ok(declined);
    assert.equal(createPendingRun({ projectRoot: fixture.project, runId: RUN_ID, state: declined, capsuleBytes: bytes0 }).ok, true);
    const authority = pendingRunAuthority(fixture.project);
    const gate = pendingRunGate(fixture.project);
    assert.ok(authority && gate?.revision);
    const bytes1 = capsule("decline-1");
    const replacement = stateFor(bytes1, {
      phase: "awaiting-repair-result",
      criticMode: "off",
      generation: 1,
      gitStateSha256: "a".repeat(64),
      candidateIdentitySha256: "1".repeat(64),
      counters: { ...declined.counters, repair: { spent: 1, remaining: 0 } },
      workflow: declined.workflow,
    });
    const laterReservation = repair(replacement, OPERATION_B, PREVIEW_B, "reserved");
    assert.equal(appendPendingRunWorkflowEvent(declined, decision(declined, laterReservation)), null,
      "the durable stop decision prevents a replacement approval from entering custody");
    assert.equal(appendPendingRunCandidateWorkflowRevision(
      authority,
      gate.revision,
      replacement,
      bytes1,
      laterReservation,
    ).ok, false, "a later reservation cannot reinterpret a no-call decline as an unused cap");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("restart persists one interrupted successor and never restores sending", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const bytes0 = capsule("interrupt-0");
    const initial = stateFor(bytes0);
    assert.equal(createPendingRun({ projectRoot: fixture.project, runId: RUN_ID, state: initial, capsuleBytes: bytes0 }).ok, true);
    const authority = pendingRunAuthority(fixture.project);
    const gate0 = pendingRunGate(fixture.project);
    assert.ok(authority && gate0?.revision);
    const bytes1 = capsule("interrupt-1");
    const reservedState = stateFor(bytes1, {
      phase: "awaiting-critic-result",
      generation: 1,
      gitStateSha256: "7".repeat(64),
      candidateIdentitySha256: "8".repeat(64),
      counters: { ...initial.counters, critic: { spent: 1, remaining: 2 } },
      workflow: initial.workflow,
    });
    const firstReservation = operation(reservedState, OPERATION_A, PREVIEW_A, 1, "reserved");
    const firstDecision = appendPendingRunWorkflowRevision(
      authority, gate0.revision, decision(initial, firstReservation),
    );
    assert.equal(firstDecision.ok, true, firstDecision.ok ? "" : firstDecision.code);
    const reservedWithDecision = { ...reservedState, workflow: firstDecision.value.state?.workflow };
    assert.equal(appendPendingRunCandidateWorkflowRevision(
      authority, firstDecision.value.revision as number, reservedWithDecision, bytes1, firstReservation,
    ).ok, true);

    _resetPendingRunsForTests();
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const recovery = pendingRunRecoveryInputs()[0];
    assert.ok(recovery);
    const interrupted = interruptPendingRunOperationForRecovery(recovery.authority, recovery.projection.revision as number);
    assert.equal(interrupted?.ok, true);
    assert.equal(interrupted?.value.state?.workflow?.events.at(-1)?.kind, "operation");
    assert.equal((interrupted?.value.state?.workflow?.events.at(-1) as { status?: string }).status, "interrupted");
    const interruptedLength = interrupted?.value.state?.workflow?.events.length;

    _resetPendingRunsForTests();
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const afterSecondBoot = pendingRunGate(fixture.project)?.state;
    assert.equal(afterSecondBoot?.workflow?.events.length, interruptedLength);
    assert.equal((afterSecondBoot?.workflow?.events.at(-1) as { status?: string }).status, "interrupted");
    assert.ok(afterSecondBoot);

    const recoveryAuthority = pendingRunAuthority(fixture.project);
    const recoveryGate = pendingRunGate(fixture.project);
    assert.ok(recoveryAuthority && recoveryGate?.revision);
    const settledBytes = capsule("interrupt-settled");
    const settledState = stateFor(settledBytes, {
      phase: "awaiting-critic",
      generation: 2,
      gitStateSha256: "9".repeat(64),
      candidateIdentitySha256: "a".repeat(64),
      counters: afterSecondBoot.counters,
      workflow: afterSecondBoot.workflow,
    });
    const settled = appendPendingRunRevision(
      recoveryAuthority,
      recoveryGate.revision,
      settledState,
      settledBytes,
    );
    assert.equal(settled.ok, true, settled.ok ? "" : settled.code);

    const retryBytes = capsule("interrupt-retry");
    const retryState = stateFor(retryBytes, {
      phase: "awaiting-critic-result",
      generation: 3,
      gitStateSha256: "b".repeat(64),
      candidateIdentitySha256: "c".repeat(64),
      counters: { ...settledState.counters, critic: { spent: 2, remaining: 1 } },
      workflow: settledState.workflow,
    });
    const retryWithoutLineage = operation(retryState, OPERATION_B, PREVIEW_B, 2, "reserved", null);
    assert.equal(appendPendingRunWorkflowEvent(settled.value.state, decision(settled.value.state as PendingRunStateV1,
      retryWithoutLineage)), null, "an interrupted send cannot be laundered into an ordinary later call");
    const retryReservation = { ...retryWithoutLineage, retryOfOperationId: OPERATION_A };
    const retryDecision = appendPendingRunWorkflowRevision(
      recoveryAuthority,
      settled.value.revision as number,
      decision(settled.value.state as PendingRunStateV1, retryReservation),
    );
    assert.equal(retryDecision.ok, true, retryDecision.ok ? "" : retryDecision.code);
    const retryWithDecision = { ...retryState, workflow: retryDecision.value.state?.workflow };
    const exactRetry = appendPendingRunCandidateWorkflowRevision(
      recoveryAuthority,
      retryDecision.value.revision as number,
      retryWithDecision,
      retryBytes,
      retryReservation,
    );
    assert.equal(exactRetry.ok, true, exactRetry.ok ? "" : exactRetry.code);
    assert.equal(pendingRunWorkflowProjection(exactRetry.value.state)?.unavailableRetryUsed, true);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("terminal-card close and delivered hard cuts converge on one deterministic outbox", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    setCardMarkerDir(fixture.profile);
    setTurnMarkerDir(fixture.profile);
    const bytes0 = capsule("card-0");
    const initial = stateFor(bytes0, { phase: "ready-to-seal", criticMode: "off" });
    assert.equal(createPendingRun({ projectRoot: fixture.project, runId: RUN_ID, state: initial, capsuleBytes: bytes0 }).ok, true);
    const authority = pendingRunAuthority(fixture.project);
    const gate0 = pendingRunGate(fixture.project);
    assert.ok(authority && gate0?.revision);
    const bytes1 = capsule("card-terminal");
    const conversationId = newConversationId(fixture.project);
    const resultCard: ResultCard = {
      kind: "result",
      disposition: "DONE",
      taskNumber: 220,
      stopReason: null,
      errorCode: null,
      filesChanged: [],
      protectedIntact: true,
      commit: null,
      evidenceSummary: "The exact local terminal result was verified.",
      recordRecovery: null,
      processFailure: null,
      claims: null,
      route: null,
    };
    const card = {
      conversationId,
      turnTimestamp: "2026-08-11T14:30:00.000Z",
      canonicalCard: JSON.stringify(resultCard),
    };
    const prepared = preparePendingRunTerminal(authority, gate0.revision, {
      actionId: ACTION_ID,
      kind: "finalize",
      candidateSha256: initial.candidateSha256,
      capsuleSha256: sha(bytes1),
    }, bytes1, card);
    assert.equal(prepared.ok, true, prepared.ok ? "" : prepared.code);

    assert.equal(_interruptPendingRunAfterCloseIntentForTests(), true);
    assert.equal(closePendingRun(authority, prepared.value.revision as number, ACTION_ID, "9".repeat(64)).ok, false);
    _resetPendingRunsForTests();
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const deliveries = pendingRunTerminalCardDeliveries();
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0]?.projectRoot, fixture.project);
    assert.equal(deliveries[0]?.card.turnTimestamp, card.turnTimestamp);
    assert.equal(deliveries[0]?.card.canonicalCard, card.canonicalCard);
    const forgedDelivery = {
      version: PENDING_RUN_TERMINAL_CARD_DELIVERY_VERSION,
      deliveryIdSha256: deliveries[0]?.card.deliveryIdSha256 as string,
      deliveredSha256: "8".repeat(64),
    };
    assert.equal(recordPendingRunTerminalCardDelivery(forgedDelivery), false,
      "a caller cannot acknowledge an outbox before its exact card exists in the authenticated conversation");
    assert.equal(pendingRunTerminalCardDeliveries().length, 1);
    const posted = postResultCardOnce(fixture.project, conversationId, resultCard, card.turnTimestamp);
    const delivery = { ...forgedDelivery, deliveredSha256: posted.deliveredSha256 };
    assert.equal(_interruptPendingRunAfterCardDeliveryWriteForTests(), true);
    assert.equal(recordPendingRunTerminalCardDelivery(delivery), false);

    _resetPendingRunsForTests();
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    assert.deepEqual(pendingRunTerminalCardDeliveries(), []);
    assert.equal(recordPendingRunTerminalCardDelivery(delivery), true, "the exact delivered marker is idempotent after restart");
    assert.equal(recordPendingRunTerminalCardDelivery({ ...delivery, deliveredSha256: "7".repeat(64) }), false);
  } finally {
    setCardMarkerDir(null);
    setTurnMarkerDir(null);
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
