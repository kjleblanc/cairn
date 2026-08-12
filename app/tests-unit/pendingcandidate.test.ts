import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setEvidenceMarkerDir } from "../src/main/evidence.js";
import {
  _resetPendingSerialCandidatesForTests,
  activePendingSerialCandidates,
  installPendingSerialCandidateRecovery,
  parkPendingSerialCandidatesForRestart,
} from "../src/main/pendingcandidate.js";
import {
  PENDING_RUN_STATE_VERSION,
  _resetPendingRunsForTests,
  createPendingRun,
  installPendingRunStore,
  pendingRunGate,
  type PendingRunStateV1,
} from "../src/main/pendingrun.js";

const RUN_ID = "18181818-1818-4818-8818-181818181818";

function sha(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function state(bytes: Uint8Array, evidence = false): PendingRunStateV1 {
  return {
    version: PENDING_RUN_STATE_VERSION,
    displayOutcome: "Show the exact restart state.",
    taskNumber: 215,
    phase: "ready-to-seal",
    criticMode: "off",
    generation: 0,
    round: 0,
    baseHead: "a".repeat(40),
    gitStateSha256: "b".repeat(64),
    taskSpecSha256: "c".repeat(64),
    evidencePlanSha256: "d".repeat(64),
    candidateSha256: "e".repeat(64),
    capsuleSha256: sha(bytes),
    bundleSha256s: ["f".repeat(64)],
    evidenceRunId: evidence ? RUN_ID : null,
    evidenceStateSha256: evidence ? "7".repeat(64) : null,
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
  };
}

test("the boot bridge opens an empty profile without inventing a pending candidate", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-pending-candidate-empty-"));
  const profile = join(root, "profile");
  mkdirSync(profile);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.deepEqual(installPendingSerialCandidateRecovery(profile), {
      journal: { ready: true, activeProjects: 0, recoveryRequired: false },
      resumed: 0,
      recoveryRequired: 0,
    });
    assert.deepEqual(activePendingSerialCandidates(), []);
    assert.deepEqual(parkPendingSerialCandidatesForRestart(), { parked: 0, failed: 0 });
  } finally {
    setEvidenceMarkerDir(null);
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    rmSync(root, { recursive: true, force: true });
  }
});

test("an invalid Core capsule or missing evidence checkpoint remains durably gated", () => {
  for (const evidence of [false, true]) {
    const root = mkdtempSync(join(tmpdir(), "cairn-pending-candidate-stale-"));
    const profile = join(root, "profile");
    const project = join(root, "project");
    mkdirSync(profile);
    mkdirSync(project);
    _resetPendingRunsForTests();
    _resetPendingSerialCandidatesForTests();
    setEvidenceMarkerDir(profile);
    try {
      assert.equal(installPendingRunStore(profile).ready, true);
      const bytes = Buffer.from("{}", "utf8");
      assert.equal(createPendingRun({ projectRoot: project, runId: RUN_ID, state: state(bytes, evidence), capsuleBytes: bytes }).ok, true);
      _resetPendingRunsForTests();

      const boot = installPendingSerialCandidateRecovery(profile);
      assert.equal(boot.journal.ready, true);
      assert.equal(boot.resumed, 0);
      assert.equal(boot.recoveryRequired, 1);
      assert.equal(pendingRunGate(project)?.status, "recovery-required");
      assert.deepEqual(activePendingSerialCandidates(), []);
    } finally {
      setEvidenceMarkerDir(null);
      _resetPendingSerialCandidatesForTests();
      _resetPendingRunsForTests();
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("source order keeps journal preparation before Core terminal writes and close after the result", () => {
  const source = readFileSync(join(process.cwd(), "src", "main", "pendingcandidate.ts"), "utf8");
  const stopStart = source.indexOf("export function stopPendingSerialCandidate");
  const finalizeStart = source.indexOf("export function finalizePendingSerialCandidate");
  const stopSource = source.slice(stopStart, finalizeStart);
  const finalizeSource = source.slice(finalizeStart);
  assert.ok(stopSource.indexOf("prepareSerialCandidateTerminal") < stopSource.indexOf("preparePendingRunTerminal"));
  assert.ok(stopSource.indexOf("preparePendingRunTerminal") < stopSource.indexOf("live.terminalPreparation ="));
  assert.ok(stopSource.indexOf("live.terminalPreparation =") < stopSource.lastIndexOf("executeLiveTerminal"));
  assert.ok(finalizeSource.indexOf("prepareSerialCandidateTerminal") < finalizeSource.indexOf("preparePendingRunTerminal"));
  assert.ok(finalizeSource.indexOf("preparePendingRunTerminal") < finalizeSource.indexOf("live.terminalPreparation ="));
  assert.ok(finalizeSource.indexOf("live.terminalPreparation =") < finalizeSource.lastIndexOf("executeLiveTerminal"));
  assert.ok(source.indexOf("installPendingRunStore") < source.indexOf("pendingRunRecoveryInputs"));
  const recoverySource = source.slice(source.indexOf("export function installPendingSerialCandidateRecovery"));
  const authenticatedResume = recoverySource.indexOf("resumeSerialCandidateFromAuthenticatedPending");
  const authenticatedReconcile = recoverySource.indexOf("reconcileSerialCandidateTerminalFromAuthenticatedPending");
  assert.ok(recoverySource.indexOf("interruptPendingRunOperationForRecovery") < authenticatedResume,
    "durable interruption classification precedes authenticated Core resume");
  assert.ok(authenticatedResume >= 0 && authenticatedReconcile > authenticatedResume);
  assert.ok(source.includes('from "#cairn-main-pending"'),
    "Main reaches the trusted recovery seam only through its private package-import bridge");
  assert.equal(source.includes("resumeSerialCandidateFromPending("), false,
    "Main recovery must never fall back to Core's public untrusted capsule path");
  assert.equal(source.includes("reconcileSerialCandidateTerminalFromPending("), false,
    "prepared recovery must never fall back to Core's public untrusted capsule path");
  assert.ok(recoverySource.slice(authenticatedResume, recoverySource.indexOf(");", authenticatedResume))
    .includes("input.journalAuthority"));
  assert.ok(recoverySource.slice(authenticatedReconcile, recoverySource.indexOf(");", authenticatedReconcile))
    .includes("input.journalAuthority"));
  assert.ok(source.includes("pendingRunPreparedTerminalInputs"));
  assert.ok(source.includes("markPendingRunRecoveryRequired"));
});
