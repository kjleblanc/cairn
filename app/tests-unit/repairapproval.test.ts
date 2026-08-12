import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  REPAIR_CALL_ACTIONS,
  REPAIR_CALL_DISCLOSURE_VERSION,
  REPAIR_CALL_PURPOSE_TEXT,
  canonicalRepairCallDisclosure,
  type RepairCallDisclosureV1,
} from "../src/shared/repair-call.js";
import { parseRepairCallDecisionRequest, parseRepairCallDisclosure } from "../src/shared/repair-call-parse.js";
import {
  clearRepairCallApprovalIfCurrent,
  commitRepairCallDecision,
  currentRepairCallApproval,
  decideRepairCall,
  isCurrentRepairCallApproval,
  mintRepairCallAuthorization,
  openRepairCallApproval,
  pendingRepairCallApprovalCount,
  preflightRepairCallDecision,
  repairCallAuthorizationCoversDisclosure,
  repairCallAuthorizationCoversPreview,
  takeRepairCallAuthorization,
} from "../src/main/repairapproval.js";

const hash = (digit: string) => digit.repeat(64);

function disclosure(): RepairCallDisclosureV1 {
  return Object.freeze({
    version: REPAIR_CALL_DISCLOSURE_VERSION,
    approvalId: "10000000-0000-4000-8000-000000000001",
    provider: "OpenAI",
    model: "gpt-5.6-sol",
    purpose: REPAIR_CALL_PURPOSE_TEXT,
    dataScope: "The frozen prose-free repair instruction and files inside the selected project that Codex chooses to read.",
    quota: "Exactly one already-reserved ephemeral Codex Exec repair process; no retry, resume, continuation, scheduling, delegation, or parallel run.",
    taskNumber: 220,
    round: 0,
    attempt: 1,
    attemptCap: 1,
    taskSpecSha256: hash("1"),
    evidencePlanSha256: hash("2"),
    candidateSha256: hash("3"),
    repairInstructionSha256: hash("4"),
    repairPreviewSha256: hash("a"),
    blockerAuthoritySha256: hash("5"),
    routeReceiptSha256: hash("6"),
    routeRequestFingerprintSha256: hash("7"),
    blockers: Object.freeze([Object.freeze({
      criterionId: "c1" as const,
      promise: "The saved result remains available after restart.",
      failureConditionId: "failure-c1",
      failureCondition: "The saved result is absent after a restart.",
      source: "cairn" as const,
      sourceSha256: hash("b"),
      artifacts: Object.freeze([
        Object.freeze({ kind: "adapter-command-attestation" as const, id: "evidence.c1.restart" }),
        Object.freeze({ kind: "adapter-command-attestation" as const, id: "tracked.result.fixture" }),
      ]),
    })]),
    timeoutMs: 3_600_000,
    maxCapturedOutputBytes: 2_000_000,
    billingBasis: "Connected OpenAI account pricing, credits, and limits; Cairn cannot promise a dollar cap.",
    actions: REPAIR_CALL_ACTIONS,
  });
}

test("repair approval: the complete output-only disclosure and project-bound decision round-trip exactly", () => {
  const call = disclosure();
  const parsed = parseRepairCallDisclosure(structuredClone(call));
  assert.ok(parsed);
  assert.equal(canonicalRepairCallDisclosure(parsed), canonicalRepairCallDisclosure(call));
  assert.deepEqual(parsed.actions, ["approve", "stop-task"]);
  assert.equal(parsed.attempt, 1);
  assert.equal(parsed.attemptCap, 1);
  assert.equal(parsed.round, 0);
  assert.equal(parsed.taskSpecSha256, hash("1"));
  assert.equal(parsed.evidencePlanSha256, hash("2"));
  assert.equal(parsed.candidateSha256, hash("3"));
  assert.equal(parsed.repairInstructionSha256, hash("4"));
  assert.equal(parsed.repairPreviewSha256, hash("a"));
  assert.equal(parsed.blockerAuthoritySha256, hash("5"));
  assert.equal(parsed.routeReceiptSha256, hash("6"));
  assert.equal(parsed.routeRequestFingerprintSha256, hash("7"));
  assert.deepEqual(parsed.blockers, call.blockers);
  assert.equal(Object.hasOwn(parsed, "instruction"), false);
  assert.equal(Object.hasOwn(parsed, "authorization"), false);
  assert.ok(parseRepairCallDecisionRequest({
    dir: "C:/projects/cairn",
    approvalId: call.approvalId,
    action: "approve",
    disclosure: structuredClone(call),
  }));
});

test("repair approval: shared parsers reject proxy, accessor, extra, sparse, duplicate, and widened values", () => {
  const call = disclosure();
  let touched = false;
  const proxy = new Proxy(call, {
    get() { touched = true; throw new Error("must not run"); },
    ownKeys() { touched = true; throw new Error("must not run"); },
  });
  assert.equal(parseRepairCallDisclosure(proxy), null);
  assert.equal(touched, false);

  const accessor = { ...call } as Record<string, unknown>;
  Object.defineProperty(accessor, "provider", {
    enumerable: true,
    get() { touched = true; return "forged"; },
  });
  assert.equal(parseRepairCallDisclosure(accessor), null);
  assert.equal(touched, false);
  assert.equal(parseRepairCallDisclosure({ ...call, extra: true }), null);
  assert.equal(parseRepairCallDisclosure({ ...call, attemptCap: 2 }), null);
  assert.equal(parseRepairCallDisclosure({ ...call, timeoutMs: 3_600_001 }), null);
  assert.equal(parseRepairCallDisclosure({ ...call, maxCapturedOutputBytes: 2_000_001 }), null);
  assert.equal(parseRepairCallDisclosure({ ...call, actions: ["stop-task", "approve"] }), null);
  assert.equal(parseRepairCallDisclosure({ ...call, blockers: [call.blockers[0], call.blockers[0]] }), null);
  assert.equal(parseRepairCallDisclosure({ ...call, blockers: new Array(1) }), null);
  assert.equal(parseRepairCallDecisionRequest({
    dir: "C:/projects/cairn",
    approvalId: call.approvalId,
    action: "approve",
    disclosure: call,
    extra: true,
  }), null);
});

test("repair approval: Main refuses plain lookalikes because only exact Core brands can mint authority", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-repair-unbranded-"));
  const baseline = pendingRepairCallApprovalCount();
  try {
    const preview = {
      taskNumber: 220,
      round: 0,
      taskSpecSha256: hash("1"),
      evidencePlanSha256: hash("2"),
      candidateSha256: hash("3"),
      repairAuthoritySha256: hash("5"),
      repairPreviewSha256: hash("a"),
      instruction: { repairInstructionSha256: hash("4") },
    };
    const route = {
      provider: "OpenAI",
      model: "gpt-5.6-sol",
      project: dir,
      disclosureSha256: hash("6"),
    };
    assert.equal(mintRepairCallAuthorization({ dir, preview, route }), null);
    assert.equal(mintRepairCallAuthorization({ dir, preview: structuredClone(preview), route: structuredClone(route) }), null);
    assert.equal(openRepairCallApproval({
      dir,
      authorization: { version: "cairn-repair-call-authorization/v1" },
    }), null);
    assert.equal(currentRepairCallApproval(dir), null);
    assert.equal(pendingRepairCallApprovalCount(), baseline);
    assert.equal(repairCallAuthorizationCoversPreview({}, preview, route), false);
    assert.equal(repairCallAuthorizationCoversDisclosure({}, disclosure()), false);
    assert.equal(isCurrentRepairCallApproval(dir, disclosure()), false);
    assert.equal(clearRepairCallApprovalIfCurrent(dir, disclosure()), false);
    assert.equal(takeRepairCallAuthorization({}), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("repair approval: Main wrapper parsing invokes no proxy or accessor and no malformed decision grants authority", () => {
  const dir = mkdtempSync(join(tmpdir(), "cairn-repair-wrapper-"));
  try {
    let touched = false;
    const proxy = new Proxy({ dir, preview: {}, route: {} }, {
      get() { touched = true; throw new Error("must not run"); },
      ownKeys() { touched = true; throw new Error("must not run"); },
    });
    assert.equal(mintRepairCallAuthorization(proxy), null);
    assert.equal(touched, false);
    const accessor: Record<string, unknown> = { dir, preview: {}, route: {} };
    Object.defineProperty(accessor, "preview", {
      enumerable: true,
      get() { touched = true; return {}; },
    });
    assert.equal(mintRepairCallAuthorization(accessor), null);
    assert.equal(touched, false);
    assert.equal(mintRepairCallAuthorization({ dir, preview: {}, route: {}, extra: true }), null);

    const call = disclosure();
    assert.deepEqual(decideRepairCall({
      dir,
      approvalId: call.approvalId,
      action: "approve",
      disclosure: call,
    }), { ok: false, code: "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL" });
    assert.deepEqual(decideRepairCall({
      dir,
      approvalId: call.approvalId,
      action: "approve",
      disclosure: call,
      extra: true,
    }), { ok: false, code: "REPAIR_CALL_DECISION_MALFORMED" });
    assert.deepEqual(preflightRepairCallDecision({
      dir,
      approvalId: call.approvalId,
      action: "approve",
      disclosure: call,
    }), { ok: false, code: "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL" });
    assert.deepEqual(commitRepairCallDecision({}), {
      ok: false,
      code: "REPAIR_CALL_DECISION_UNKNOWN_APPROVAL",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
