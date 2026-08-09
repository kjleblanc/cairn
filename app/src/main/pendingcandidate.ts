import { createHash, randomUUID } from "node:crypto";
import {
  SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION,
  executeSerialCandidateTerminal,
  exportSerialCandidatePendingState,
  parkSerialCandidateForRestart,
  prepareSerialCandidateTerminal,
  reconcileSerialCandidateTerminalFromPending,
  resumeSerialCandidateFromPending,
  type SerialCandidateRunResult,
  type SerialCandidateSealAuthorizationV1,
  type SerialCandidateTerminalPreparationV1,
  type SerialCandidateTerminalReceiptV1,
  type SerialCandidateTerminalResult,
  type SerialCandidateV1,
  type SerialStopReason,
} from "@cairn/core";
import {
  pendingEvidenceRunState,
  pendingEvidenceRunStillExact,
  type PendingEvidenceRunStateV1,
} from "./evidence.js";
import {
  PENDING_RUN_STATE_VERSION,
  appendPendingRunRevision,
  closePendingRun,
  createPendingRun,
  installPendingRunStore,
  markPendingRunRecoveryRequired,
  pendingRunAuthority,
  pendingRunGate,
  pendingRunPreparedTerminalInputs,
  pendingRunRecoveryInputs,
  preparePendingRunTerminal,
  projectPendingRunHash,
  type PendingRunAuthorityV1,
  type PendingRunBootProjectionV1,
  type PendingRunMutationResultV1,
  type PendingRunRouteReceiptV1,
  type PendingRunStateV1,
} from "./pendingrun.js";

export type PendingSerialCandidateBootV1 = Readonly<{
  journal: PendingRunBootProjectionV1;
  resumed: number;
  recoveryRequired: number;
}>;

export type PendingSerialCandidatePersistInputV1 = Readonly<{
  projectRoot: string;
  result: Extract<SerialCandidateRunResult, { status: "candidate" }>;
  evidence: PendingEvidenceRunStateV1 | null;
}>;

export type PendingSerialCandidateTerminalAttemptV1 = Readonly<{
  journal: PendingRunMutationResultV1;
  result: SerialCandidateTerminalResult | null;
}>;

type LiveCandidate = {
  projectRoot: string;
  projectHash: string;
  candidate: SerialCandidateV1;
  authority: PendingRunAuthorityV1;
  route: PendingRunRouteReceiptV1;
  evidence: PendingEvidenceRunStateV1 | null;
  terminalPreparation: SerialCandidateTerminalPreparationV1 | null;
  terminalResult: SerialCandidateTerminalResult | null;
  terminalReceipt: SerialCandidateTerminalReceiptV1 | null;
};

const liveCandidates = new Map<string, LiveCandidate>();
let recoveryInstalled = false;

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function routeReceipt(result: Extract<SerialCandidateRunResult, { status: "candidate" }>): PendingRunRouteReceiptV1 {
  const descriptor = result.route.recommended;
  return Object.freeze({
    adapterLabel: descriptor.label,
    provider: descriptor.provider,
    model: descriptor.model,
    receiptSha256: sha256(JSON.stringify({
      adapterId: descriptor.id,
      adapterLabel: descriptor.label,
      provider: descriptor.provider,
      model: descriptor.model,
      reason: result.route.reason,
    })),
  });
}

function candidatePhase(candidate: SerialCandidateV1): PendingRunStateV1["phase"] | null {
  return candidate.phase === "awaiting-critic" || candidate.phase === "awaiting-owner-resolution"
    || candidate.phase === "awaiting-repair" || candidate.phase === "ready-to-seal" ? candidate.phase : null;
}

function stateForCandidate(
  candidate: SerialCandidateV1,
  capsuleSha256: string,
  route: PendingRunRouteReceiptV1,
  evidence: PendingEvidenceRunStateV1 | null,
): PendingRunStateV1 | null {
  const phase = candidatePhase(candidate);
  if (phase === null) return null;
  const bundleSha256s = candidate.round === 0
    ? [candidate.lineage.round0BundleSha256]
    : [candidate.lineage.round0BundleSha256, candidate.bundleSha256];
  return Object.freeze({
    version: PENDING_RUN_STATE_VERSION,
    displayOutcome: candidate.lineage.taskSpec.intent.outcome.text,
    taskNumber: candidate.taskNumber,
    phase,
    criticMode: candidate.criticMode,
    generation: candidate.generation,
    round: candidate.round,
    baseHead: candidate.bundle.baseHead,
    gitStateSha256: sha256(JSON.stringify({
      baseHead: candidate.bundle.baseHead,
      projectRootSha256: candidate.projectRootSha256,
      bundleSha256: candidate.bundleSha256,
      evidenceStateSha256: candidate.evidenceStateSha256,
    })),
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    capsuleSha256,
    bundleSha256s: Object.freeze(bundleSha256s),
    evidenceRunId: evidence?.runId ?? null,
    evidenceStateSha256: evidence?.stateSha256 ?? null,
    evidenceRevision: evidence?.revision ?? 0,
    route,
    counters: Object.freeze({
      builder: Object.freeze({ spent: candidate.callsUsed.builder, remaining: 1 - candidate.callsUsed.builder }),
      repair: Object.freeze({ spent: candidate.callsUsed.repair, remaining: 1 - candidate.callsUsed.repair }),
      critic: Object.freeze({ spent: candidate.callsUsed.critic, remaining: 3 - candidate.callsUsed.critic }),
      externalEvidence: Object.freeze({ spent: candidate.callsUsed.externalEvidence, remaining: 0 }),
    }),
    terminalAction: null,
  });
}

function candidateMatchesJournalBindings(candidate: SerialCandidateV1, state: PendingRunStateV1): boolean {
  const bundles = candidate.round === 0
    ? [candidate.lineage.round0BundleSha256]
    : [candidate.lineage.round0BundleSha256, candidate.bundleSha256];
  const gitStateSha256 = sha256(JSON.stringify({
    baseHead: candidate.bundle.baseHead,
    projectRootSha256: candidate.projectRootSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
  }));
  return candidate.taskNumber === state.taskNumber && candidate.generation === state.generation
    && candidate.round === state.round && candidate.bundle.baseHead === state.baseHead
    && candidate.criticMode === state.criticMode && gitStateSha256 === state.gitStateSha256
    && candidate.taskSpecSha256 === state.taskSpecSha256 && candidate.evidencePlanSha256 === state.evidencePlanSha256
    && candidate.candidateSha256 === state.candidateSha256
    && candidate.callsUsed.builder === state.counters.builder.spent
    && candidate.callsUsed.repair === state.counters.repair.spent
    && candidate.callsUsed.critic === state.counters.critic.spent
    && candidate.callsUsed.externalEvidence === state.counters.externalEvidence.spent
    && bundles.length === state.bundleSha256s.length
    && bundles.every((sha, index) => state.bundleSha256s[index] === sha);
}

function candidateMatchesState(candidate: SerialCandidateV1, state: PendingRunStateV1): boolean {
  return candidatePhase(candidate) === state.phase && candidateMatchesJournalBindings(candidate, state);
}

function evidenceStillExact(projectRoot: string, state: PendingRunStateV1): PendingEvidenceRunStateV1 | null | false {
  if (state.evidenceRunId === null) return state.evidenceStateSha256 === null && state.evidenceRevision === 0 ? null : false;
  const current = pendingEvidenceRunState(projectRoot, state.evidenceRunId);
  return current && current.stateSha256 === state.evidenceStateSha256 && current.revision === state.evidenceRevision
    && pendingEvidenceRunStillExact(projectRoot, current) ? current : false;
}

function decodedCapsule(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return Buffer.from(text, "utf8").equals(Buffer.from(bytes)) ? text : null;
  } catch {
    return null;
  }
}

function coreCapsule(value: Readonly<{ canonicalBytes: Uint8Array; capsuleSha256: string }>): Readonly<{
  version: typeof SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION;
  canonicalBytes: string;
  capsuleSha256: string;
}> | null {
  const canonicalBytes = decodedCapsule(value.canonicalBytes);
  return canonicalBytes === null ? null : Object.freeze({
    version: SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION,
    canonicalBytes,
    capsuleSha256: value.capsuleSha256,
  });
}

function receiptMatchesPreparedState(receipt: SerialCandidateTerminalReceiptV1, state: PendingRunStateV1): boolean {
  const action = state.terminalAction;
  return state.phase === "terminal-prepared" && action !== null
    && receipt.actionId === action.actionId && receipt.kind === action.kind
    && receipt.candidateSha256 === state.candidateSha256
    && receipt.preparedCapsuleSha256 === state.capsuleSha256;
}

function parkPreparedCandidate(candidate: SerialCandidateV1): void {
  const base = exportSerialCandidatePendingState(candidate);
  if (base) parkSerialCandidateForRestart(candidate, base.capsuleSha256);
}

function releaseUnexpectedResume(candidate: SerialCandidateV1): void {
  const capsule = exportSerialCandidatePendingState(candidate);
  if (capsule) parkSerialCandidateForRestart(candidate, capsule.capsuleSha256);
}

/**
 * Boot boundary: authenticated journals are installed first, then each exact
 * nonterminal Core capsule reacquires its fresh process lock. A stale capsule
 * leaves the durable project gate in recovery-required state and writes no
 * terminal record.
 */
export function installPendingSerialCandidateRecovery(userDataRoot: string): PendingSerialCandidateBootV1 {
  if (recoveryInstalled) {
    const journal = installPendingRunStore(userDataRoot);
    return Object.freeze({
      journal,
      resumed: liveCandidates.size,
      recoveryRequired: Math.max(0, journal.activeProjects - liveCandidates.size),
    });
  }
  recoveryInstalled = true;
  liveCandidates.clear();
  const journal = installPendingRunStore(userDataRoot);
  if (!journal.ready) return Object.freeze({ journal, resumed: 0, recoveryRequired: journal.activeProjects || 1 });
  let resumed = 0;
  let recoveryRequired = 0;
  // Core's resume, reconcile, and terminal calls throw on ordinary I/O trouble
  // — a report file held open by the owner's editor, a permission change, a
  // vanished root. Unguarded, that escapes bootstrap() and the whole of
  // app.whenReady(), so no IPC registers and no window appears: the owner gets
  // no seam and no message. One run's failure gates that run and nothing else.
  for (const input of pendingRunRecoveryInputs()) {
    try {
      const state = input.projection.state;
      const capsule = coreCapsule(input.capsule);
      const evidence = state ? evidenceStillExact(input.projectRoot, state) : false;
      if (!state || capsule === null || evidence === false) {
        markPendingRunRecoveryRequired(input.authority);
        recoveryRequired += 1;
        continue;
      }
      const result = resumeSerialCandidateFromPending(input.projectRoot, capsule);
      if (result.status !== "resumed" || !candidateMatchesState(result.candidate, state)) {
        if (result.status === "resumed") releaseUnexpectedResume(result.candidate);
        markPendingRunRecoveryRequired(input.authority);
        recoveryRequired += 1;
        continue;
      }
      liveCandidates.set(input.projection.projectHash, {
        projectRoot: input.projectRoot,
        projectHash: input.projection.projectHash,
        candidate: result.candidate,
        authority: input.authority,
        route: state.route,
        evidence,
        terminalPreparation: null,
        terminalResult: null,
        terminalReceipt: null,
      });
      resumed += 1;
    } catch {
      liveCandidates.delete(input.projection.projectHash);
      markPendingRunRecoveryRequired(input.authority);
      recoveryRequired += 1;
    }
  }
  for (const input of pendingRunPreparedTerminalInputs()) {
    try {
      const state = input.projection.state;
      const capsule = coreCapsule(input.capsule);
      const evidence = state ? evidenceStillExact(input.projectRoot, state) : false;
      if (!state?.terminalAction || capsule === null || evidence === false) {
        markPendingRunRecoveryRequired(input.authority);
        recoveryRequired += 1;
        continue;
      }
      const reconciled = reconcileSerialCandidateTerminalFromPending(
        input.projectRoot,
        capsule,
        state.terminalAction,
      );
      if (reconciled.status === "terminal") {
        if (!receiptMatchesPreparedState(reconciled.receipt, state)
          || !closePendingRun(
            input.authority,
            input.projection.revision as number,
            state.terminalAction.actionId,
            reconciled.receipt.terminalReceiptSha256,
          ).ok) {
          markPendingRunRecoveryRequired(input.authority);
          recoveryRequired += 1;
        }
        continue;
      }
      if (reconciled.status !== "resumed"
        || !candidateMatchesJournalBindings(reconciled.candidate, state)
        || reconciled.preparation.action.actionId !== state.terminalAction.actionId
        || reconciled.preparation.action.kind !== state.terminalAction.kind
        || reconciled.preparation.action.candidateSha256 !== state.candidateSha256
        || reconciled.preparation.action.capsuleSha256 !== state.capsuleSha256) {
        if (reconciled.status === "resumed") parkPreparedCandidate(reconciled.candidate);
        markPendingRunRecoveryRequired(input.authority);
        recoveryRequired += 1;
        continue;
      }
      const execution = executeSerialCandidateTerminal(
        reconciled.candidate,
        reconciled.preparation,
        state.capsuleSha256,
      );
      if (!execution || !receiptMatchesPreparedState(execution.receipt, state)
        || !closePendingRun(
          input.authority,
          input.projection.revision as number,
          state.terminalAction.actionId,
          execution.receipt.terminalReceiptSha256,
        ).ok) {
        if (!execution) parkPreparedCandidate(reconciled.candidate);
        markPendingRunRecoveryRequired(input.authority);
        recoveryRequired += 1;
      }
    } catch {
      // A throw here may have landed after Core wrote its records. Gate the
      // run rather than closing it: restart reconciliation classifies the
      // on-disk bytes, and nothing else in the profile is held back.
      markPendingRunRecoveryRequired(input.authority);
      recoveryRequired += 1;
    }
  }
  const settledJournal = installPendingRunStore(userDataRoot);
  recoveryRequired = Math.max(recoveryRequired, settledJournal.activeProjects - resumed);
  return Object.freeze({ journal: settledJournal, resumed, recoveryRequired });
}

/** Persist the exact Core capsule before the fake/live candidate can be
 * presented as pending. This function is not wired into the production task
 * path in Q7. */
export function persistPendingSerialCandidate(input: PendingSerialCandidatePersistInputV1): PendingRunMutationResultV1 {
  const capsule = exportSerialCandidatePendingState(input.result.candidate);
  const projectHash = projectPendingRunHash(input.projectRoot);
  if (!capsule || !projectHash || (input.evidence !== null && !pendingEvidenceRunStillExact(input.projectRoot, input.evidence))) {
    return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_NOT_EXPORTABLE" });
  }
  const route = routeReceipt(input.result);
  const state = stateForCandidate(input.result.candidate, capsule.capsuleSha256, route, input.evidence);
  if (!state) return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_STATE_INVALID" });
  const created = createPendingRun({
    projectRoot: input.projectRoot,
    runId: input.result.candidate.runId,
    state,
    capsuleBytes: Buffer.from(capsule.canonicalBytes, "utf8"),
  });
  if (!created.ok) return created;
  const authority = pendingRunAuthority(input.projectRoot);
  if (!authority) return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_AUTHORITY_MISSING" });
  liveCandidates.set(projectHash, {
    projectRoot: input.projectRoot,
    projectHash,
    candidate: input.result.candidate,
    authority,
    route,
    evidence: input.evidence,
    terminalPreparation: null,
    terminalResult: null,
    terminalReceipt: null,
  });
  return created;
}

/** Persist a newly branded generation before Q8/Q9 may expose it. */
export function checkpointPendingSerialCandidate(
  projectRoot: string,
  candidate: SerialCandidateV1,
  evidence: PendingEvidenceRunStateV1 | null,
): PendingRunMutationResultV1 {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  const gate = pendingRunGate(projectRoot);
  const capsule = live && exportSerialCandidatePendingState(candidate);
  if (!live || !gate?.state || !capsule || (evidence !== null && !pendingEvidenceRunStillExact(projectRoot, evidence))) {
    return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_NOT_EXPORTABLE" });
  }
  const state = stateForCandidate(candidate, capsule.capsuleSha256, live.route, evidence);
  if (!state) return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_STATE_INVALID" });
  const appended = appendPendingRunRevision(
    live.authority,
    gate.revision as number,
    state,
    Buffer.from(capsule.canonicalBytes, "utf8"),
  );
  if (appended.ok) {
    live.candidate = candidate;
    live.evidence = evidence;
  }
  return appended;
}

export function activePendingSerialCandidates(): readonly string[] {
  return Object.freeze([...liveCandidates.values()].map((entry) => entry.projectRoot).sort());
}

/** Graceful quit writes nothing terminal. It releases a live PID lock only
 * when the exact capsule already present in the authenticated journal is the
 * one Core is parking. */
export function parkPendingSerialCandidatesForRestart(): Readonly<{ parked: number; failed: number }> {
  let parked = 0;
  let failed = 0;
  for (const [projectHash, live] of [...liveCandidates]) {
    const gate = pendingRunGate(live.projectRoot);
    const exported = exportSerialCandidatePendingState(live.candidate);
    const durable = pendingRunRecoveryInputs().find((input) => input.authority === live.authority);
    if (!gate?.state || gate.state.phase === "terminal-prepared" || !exported
      || !durable || durable.projection.revision !== gate.revision
      || gate.state.capsuleSha256 !== exported.capsuleSha256
      || !candidateMatchesState(live.candidate, gate.state)
      || !parkSerialCandidateForRestart(live.candidate, exported.capsuleSha256)) {
      failed += 1;
      continue;
    }
    liveCandidates.delete(projectHash);
    parked += 1;
  }
  return Object.freeze({ parked, failed });
}

function closeTerminalAttempt(live: LiveCandidate): PendingSerialCandidateTerminalAttemptV1 | null {
  const gate = pendingRunGate(live.projectRoot);
  if (!gate?.revision || !live.terminalResult || !live.terminalReceipt) return null;
  let journal = closePendingRun(
    live.authority,
    gate.revision,
    live.terminalReceipt.actionId,
    live.terminalReceipt.terminalReceiptSha256,
  );
  if (!journal.ok) {
    journal = closePendingRun(
      live.authority,
      gate.revision,
      live.terminalReceipt.actionId,
      live.terminalReceipt.terminalReceiptSha256,
    );
  }
  if (journal.ok) liveCandidates.delete(live.projectHash);
  else {
    markPendingRunRecoveryRequired(live.authority);
    liveCandidates.delete(live.projectHash);
  }
  return Object.freeze({ journal, result: live.terminalResult });
}

function executeLiveTerminal(live: LiveCandidate): PendingSerialCandidateTerminalAttemptV1 {
  const preparation = live.terminalPreparation;
  if (!preparation) return Object.freeze({
    journal: Object.freeze({ ok: false, code: "PENDING_CANDIDATE_TERMINAL_NOT_PREPARED" }),
    result: null,
  });
  const execution = executeSerialCandidateTerminal(
    live.candidate,
    preparation,
    preparation.action.capsuleSha256,
  );
  if (!execution) {
    parkPreparedCandidate(live.candidate);
    markPendingRunRecoveryRequired(live.authority);
    liveCandidates.delete(live.projectHash);
    return Object.freeze({
      journal: Object.freeze({ ok: false, code: "PENDING_CANDIDATE_TERMINAL_EXECUTION_REFUSED" }),
      result: null,
    });
  }
  live.terminalResult = execution.result;
  live.terminalReceipt = execution.receipt;
  return closeTerminalAttempt(live) as PendingSerialCandidateTerminalAttemptV1;
}

export function stopPendingSerialCandidate(
  projectRoot: string,
  reason: SerialStopReason = "MODEL_RESULT_NOT_VERIFIED",
): PendingSerialCandidateTerminalAttemptV1 | null {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  if (!live) return null;
  const replay = closeTerminalAttempt(live);
  if (replay) return replay;
  if (live.terminalPreparation) return live.terminalPreparation.action.kind === "stop" ? executeLiveTerminal(live) : null;
  const gate = pendingRunGate(projectRoot);
  if (!gate?.revision || gate.status !== "pending") return null;
  const corePreparation = prepareSerialCandidateTerminal(live.candidate, {
    actionId: randomUUID(),
    kind: "stop",
    reason,
  });
  if (!corePreparation) return Object.freeze({
    journal: Object.freeze({ ok: false, code: "PENDING_CANDIDATE_TERMINAL_NOT_PREPARABLE" }),
    result: null,
  });
  const prepared = preparePendingRunTerminal(
    live.authority,
    gate.revision,
    corePreparation.action,
    Buffer.from(corePreparation.capsule.canonicalBytes, "utf8"),
  );
  if (!prepared.ok) {
    parkPreparedCandidate(live.candidate);
    liveCandidates.delete(live.projectHash);
    return Object.freeze({ journal: prepared, result: null });
  }
  live.terminalPreparation = corePreparation;
  return executeLiveTerminal(live);
}

export function finalizePendingSerialCandidate(
  projectRoot: string,
  sealAuthorization: SerialCandidateSealAuthorizationV1,
): PendingSerialCandidateTerminalAttemptV1 | null {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  if (!live) return null;
  const replay = closeTerminalAttempt(live);
  if (replay) return replay;
  if (live.terminalPreparation) return live.terminalPreparation.action.kind === "finalize" ? executeLiveTerminal(live) : null;
  const gate = pendingRunGate(projectRoot);
  if (!gate?.revision || gate.status !== "pending" || gate.state?.phase !== "ready-to-seal") return null;
  const corePreparation = prepareSerialCandidateTerminal(live.candidate, {
    actionId: randomUUID(),
    kind: "finalize",
    sealAuthorization,
  });
  if (!corePreparation) return Object.freeze({
    journal: Object.freeze({ ok: false, code: "PENDING_CANDIDATE_TERMINAL_NOT_PREPARABLE" }),
    result: null,
  });
  const prepared = preparePendingRunTerminal(
    live.authority,
    gate.revision,
    corePreparation.action,
    Buffer.from(corePreparation.capsule.canonicalBytes, "utf8"),
  );
  if (!prepared.ok) {
    parkPreparedCandidate(live.candidate);
    liveCandidates.delete(live.projectHash);
    return Object.freeze({ journal: prepared, result: null });
  }
  live.terminalPreparation = corePreparation;
  return executeLiveTerminal(live);
}

export function _resetPendingSerialCandidatesForTests(): void {
  if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== "test") return;
  liveCandidates.clear();
  recoveryInstalled = false;
}
