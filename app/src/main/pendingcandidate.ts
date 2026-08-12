import { createHash, randomUUID } from "node:crypto";
import {
  SERIAL_PENDING_CANDIDATE_CAPSULE_VERSION,
  executeSerialCandidateTerminal,
  exportSerialCandidatePendingState,
  parkSerialCandidateForRestart,
  prepareSerialCandidateTerminal,
  resumeSerialCandidateRepairFailureForStop,
  serialCandidateCurrentIdentity,
  serialCandidateTerminalResultSha256,
  type SerialCandidateRunResult,
  type SerialCandidateSealAuthorizationV1,
  type SerialCandidateTerminalPreparationV1,
  type SerialCandidateTerminalReceiptV1,
  type SerialCandidateTerminalResult,
  type SerialCandidateV1,
  type SerialStopReason,
} from "@cairn/core";
import {
  reconcileSerialCandidateTerminalFromAuthenticatedPending,
  resumeSerialCandidateFromAuthenticatedPending,
} from "#cairn-main-pending";
import {
  pendingEvidenceRunState,
  pendingEvidenceRunStillExact,
  type PendingEvidenceRunStateV1,
} from "./evidence.js";
import { isEvidenceRunId } from "../shared/ipc.js";
import { composeResultCard } from "./conductor/relay.js";
import {
  PENDING_RUN_STATE_VERSION,
  PENDING_RUN_TERMINAL_CARD_DELIVERY_VERSION,
  appendPendingRunCandidateWorkflowRevision,
  appendPendingRunHarnessRerunRevision,
  appendPendingRunRevision,
  appendPendingRunWorkflowRevision,
  closePendingRun,
  createPendingRun,
  installPendingRunStore,
  initialPendingRunWorkflow,
  interruptPendingRunOperationForRecovery,
  markPendingRunRecoveryRequired,
  pendingRunAuthority,
  pendingRunGate,
  pendingRunPreparedTerminalInputs,
  pendingRunRecoveryInputs,
  pendingRunTerminalCardDeliveries,
  pendingRunWorkflowProjection,
  preparePendingRunTerminal,
  projectPendingRunHash,
  recordPendingRunTerminalCardDelivery,
  type PendingRunAuthorityV1,
  type PendingRunBootProjectionV1,
  type PendingRunMutationResultV1,
  type PendingRunRouteReceiptV1,
  type PendingRunStateV1,
  type PendingRunTerminalCardDeliveryV1,
  type PendingRunTerminalCardInputV1,
  type PendingRunTerminalCardOutboxV1,
  type PendingRunWorkflowEventInputV1,
  type PendingRunWorkflowProjectionV1,
  type PendingRunWorkflowV1,
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

export type PendingSerialCandidateTerminalCardFactoryV1 = (
  result: SerialCandidateTerminalResult,
) => PendingRunTerminalCardInputV1 | undefined;

export type PendingSerialCandidateRecoveryOptionsV1 = Readonly<{
  terminalCardForResult?: (input: Readonly<{
    projectRoot: string;
    result: SerialCandidateTerminalResult;
    state: PendingRunStateV1;
  }>) => PendingRunTerminalCardInputV1 | undefined;
}>;

export type PendingSerialCandidateCurrentV1 = Readonly<{
  projectRoot: string;
  candidate: SerialCandidateV1;
  candidateIdentitySha256: string;
  route: PendingRunRouteReceiptV1;
  evidence: PendingEvidenceRunStateV1 | null;
  workflow: PendingRunWorkflowProjectionV1;
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
  terminalCardDraft: PendingRunTerminalCardInputV1 | undefined;
};

const liveCandidates = new Map<string, LiveCandidate>();
let recoveryInstalled = false;
let q9E2eTerminalPreparedHook: ((projectRoot: string) => boolean) | null = null;

/** Guarded Electron-only hard-cut seam. It is installed exclusively by Main
 * after the complete Q9 test tuple is verified and fires only after the
 * authenticated terminal preparation is durable. */
export function installPendingSerialCandidateQ9E2eTerminalPreparedHook(
  hook: ((projectRoot: string) => boolean) | null,
): boolean {
  if (process.env.CAIRN_E2E !== "1" || process.env.CAIRN_MOCK !== "1" || process.env.CAIRN_TEST_Q9 !== "1") {
    q9E2eTerminalPreparedHook = null;
    return hook === null;
  }
  q9E2eTerminalPreparedHook = hook;
  return true;
}

function q9E2eTerminalPrepared(projectRoot: string): boolean {
  return q9E2eTerminalPreparedHook?.(projectRoot) === true;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

type DurableTerminalSession = Readonly<{
  conversationId: string | null;
  startedAt: string;
  evidenceRunId: string | null;
}>;

function canonicalData(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalData);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, item]) => [key, canonicalData(item)]));
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalData(value));
}

function durableTerminalSession(state: PendingRunStateV1): DurableTerminalSession | null | undefined {
  const session = state.workflow?.events.find((event) => event.kind === "session");
  if (session?.kind !== "session") return undefined;
  try {
    const payload = JSON.parse(session.canonicalPayload) as Record<string, unknown>;
    const keys = Object.keys(payload).sort();
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)
      || canonicalJson(payload) !== session.canonicalPayload
      || JSON.stringify(keys) !== JSON.stringify([
        "acceptedRequest", "adapterIdentitySha256", "conversationId", "evidenceRunId", "startedAt",
      ])) return null;
    if (payload.conversationId !== session.conversationId || payload.startedAt !== session.startedAt
      || payload.adapterIdentitySha256 !== session.adapterIdentitySha256
      || (payload.evidenceRunId !== null && !isEvidenceRunId(payload.evidenceRunId))) return null;
    return Object.freeze({
      conversationId: session.conversationId,
      startedAt: session.startedAt,
      evidenceRunId: payload.evidenceRunId as string | null,
    });
  } catch {
    return null;
  }
}

function composeTerminalCardAfterResult(
  state: PendingRunStateV1,
  result: SerialCandidateTerminalResult,
  factory: PendingSerialCandidateTerminalCardFactoryV1 | undefined,
): PendingRunTerminalCardInputV1 | undefined | null {
  if (serialCandidateTerminalResultSha256(result) === null) return null;
  let card: PendingRunTerminalCardInputV1 | undefined;
  try {
    card = factory?.(result);
  } catch {
    return null;
  }
  const session = durableTerminalSession(state);
  if (session === undefined) return card === undefined ? undefined : null;
  if (session === null) return null;
  if (session.conversationId === null) return card === undefined ? undefined : null;
  if (card === undefined || card.conversationId !== session.conversationId
    || card.turnTimestamp !== session.startedAt) return null;
  try {
    const parsed = JSON.parse(card.canonicalCard) as unknown;
    const expected = composeResultCard(result, session.evidenceRunId);
    if (canonicalJson(parsed) !== canonicalJson(expected)) return null;
  } catch {
    return null;
  }
  return card;
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
  return candidate.phase === "awaiting-critic" || candidate.phase === "awaiting-critic-result"
    || candidate.phase === "awaiting-owner-resolution" || candidate.phase === "awaiting-repair"
    || candidate.phase === "awaiting-repair-result" || candidate.phase === "ready-to-seal" ? candidate.phase : null;
}

function candidateIdentitySha256(candidate: SerialCandidateV1): string | null {
  const identity = serialCandidateCurrentIdentity(candidate);
  return identity ? sha256(JSON.stringify(identity)) : null;
}

function stateForCandidate(
  candidate: SerialCandidateV1,
  capsuleSha256: string,
  route: PendingRunRouteReceiptV1,
  evidence: PendingEvidenceRunStateV1 | null,
  workflowValue?: PendingRunWorkflowV1,
  allowActivePlanTransition = false,
): PendingRunStateV1 | null {
  const phase = candidatePhase(candidate);
  const identitySha256 = candidateIdentitySha256(candidate);
  const workflow = workflowValue ?? initialPendingRunWorkflow(candidate.evidencePlanSha256);
  if (phase === null || identitySha256 === null || workflow === null
    || (!allowActivePlanTransition && workflow.activeEvidencePlanSha256 !== candidate.evidencePlanSha256)) return null;
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
    evidencePlanSha256: workflow.initialEvidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    candidateIdentitySha256: identitySha256,
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
    workflow,
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
    && candidate.taskSpecSha256 === state.taskSpecSha256
    && candidate.evidencePlanSha256 === (state.workflow?.activeEvidencePlanSha256 ?? state.evidencePlanSha256)
    && candidate.candidateSha256 === state.candidateSha256
    && (state.candidateIdentitySha256 === undefined || candidateIdentitySha256(candidate) === state.candidateIdentitySha256)
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
export function installPendingSerialCandidateRecovery(
  userDataRoot: string,
  options: PendingSerialCandidateRecoveryOptionsV1 = {},
): PendingSerialCandidateBootV1 {
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
  // A process disappeared after durable reservation (or after recording that
  // bytes were being sent). Persist that fact before Core reacquires anything;
  // recovery may present the candidate, but it can never silently send again.
  for (const input of pendingRunRecoveryInputs()) {
    const interrupted = interruptPendingRunOperationForRecovery(input.authority, input.projection.revision as number);
    if (interrupted && !interrupted.ok) {
      markPendingRunRecoveryRequired(input.authority);
      recoveryRequired += 1;
    }
  }
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
      let result = resumeSerialCandidateFromAuthenticatedPending(
        input.projectRoot,
        capsule,
        input.projection.revision as number,
        input.journalAuthority,
      );
      const latestRepairOperation = [...(pendingRunWorkflowProjection(state)?.events ?? [])]
        .reverse()
        .find((event) => event.kind === "operation" && event.operationKind === "repair"
          && event.candidateSha256 === state.candidateSha256);
      const failedRepair = state.phase === "awaiting-repair-result"
        && latestRepairOperation?.kind === "operation"
        && ["interrupted", "unavailable", "cancelled"].includes(latestRepairOperation.status);
      if (result.status === "stale" && result.reason === "WORKSPACE_CHANGED" && failedRepair) {
        // The one repair may have changed task bytes before its injected
        // writer failed, was cancelled, or disappeared.  Core authenticates
        // the exact spent capsule and returns a stop-only candidate: never
        // rerun, capture, adopt, or silently discard those bytes.
        result = resumeSerialCandidateRepairFailureForStop(input.projectRoot, capsule);
      }
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
        terminalCardDraft: state.terminalCardDraft,
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
      const reconciled = reconcileSerialCandidateTerminalFromAuthenticatedPending(
        input.projectRoot,
        capsule,
        state.terminalAction,
        input.projection.revision as number,
        input.journalAuthority,
      );
      if (reconciled.status === "terminal") {
        const terminalCard = composeTerminalCardAfterResult(
          state,
          reconciled.result,
          (result) => options.terminalCardForResult?.({ projectRoot: input.projectRoot, result, state }),
        );
        if (terminalCard === null || !receiptMatchesPreparedState(reconciled.receipt, state)
          || !closePendingRun(
            input.authority,
            input.projection.revision as number,
            state.terminalAction.actionId,
            reconciled.receipt.terminalReceiptSha256,
            terminalCard,
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
      const terminalCard = execution ? composeTerminalCardAfterResult(
        state,
        execution.result,
        (result) => options.terminalCardForResult?.({ projectRoot: input.projectRoot, result, state }),
      ) : null;
      if (!execution || terminalCard === null || !receiptMatchesPreparedState(execution.receipt, state)
        || !closePendingRun(
          input.authority,
          input.projection.revision as number,
          state.terminalAction.actionId,
          execution.receipt.terminalReceiptSha256,
          terminalCard,
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
  if (!created.ok) {
    // Admission has already activated Core's one-way quality-loop authority.
    // If Main cannot create its authenticated journal, release that in-memory
    // workspace lock only against the exact exported capsule. No later task
    // may inherit a stranded candidate that Main can neither show nor recover.
    parkSerialCandidateForRestart(input.result.candidate, capsule.capsuleSha256);
    return created;
  }
  const authority = pendingRunAuthority(input.projectRoot);
  if (!authority) {
    // `createPendingRun` succeeded, so its global pending gate remains the
    // durable owner of this project even if the process-local handle is lost.
    parkSerialCandidateForRestart(input.result.candidate, capsule.capsuleSha256);
    return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_AUTHORITY_MISSING" });
  }
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
    terminalCardDraft: undefined,
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
  const state = stateForCandidate(candidate, capsule.capsuleSha256, live.route, evidence, gate.state.workflow);
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

/** Atomically persist one pre-spend reservation or settled call outcome with
 * the exact new branded Core candidate it belongs to. */
export function checkpointPendingSerialCandidateWithWorkflowEvent(
  projectRoot: string,
  candidate: SerialCandidateV1,
  evidence: PendingEvidenceRunStateV1 | null,
  event: PendingRunWorkflowEventInputV1,
): PendingRunMutationResultV1 {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  const gate = pendingRunGate(projectRoot);
  const capsule = live && exportSerialCandidatePendingState(candidate);
  if (!live || !gate?.state?.workflow || !capsule
    || (evidence !== null && !pendingEvidenceRunStillExact(projectRoot, evidence))) {
    return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_NOT_EXPORTABLE" });
  }
  const state = stateForCandidate(candidate, capsule.capsuleSha256, live.route, evidence, gate.state.workflow, true);
  if (!state) return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_STATE_INVALID" });
  const appended = appendPendingRunCandidateWorkflowRevision(
    live.authority,
    gate.revision as number,
    state,
    Buffer.from(capsule.canonicalBytes, "utf8"),
    event,
  );
  if (appended.ok) {
    live.candidate = candidate;
    live.evidence = evidence;
  }
  return appended;
}

/** Persist the guarded revision-one evidence rerun whose Core candidate object
 * and generation intentionally remain unchanged while its capsule gains the
 * refreshed attestation custody. */
export function checkpointPendingSerialCandidateHarnessRerun(
  projectRoot: string,
  candidate: SerialCandidateV1,
  evidence: PendingEvidenceRunStateV1 | null,
): PendingRunMutationResultV1 {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  const gate = pendingRunGate(projectRoot);
  const capsule = live && live.candidate === candidate && exportSerialCandidatePendingState(candidate);
  if (!live || !gate?.state?.workflow || !capsule
    || (evidence !== null && !pendingEvidenceRunStillExact(projectRoot, evidence))) {
    return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_NOT_EXPORTABLE" });
  }
  const state = stateForCandidate(candidate, capsule.capsuleSha256, live.route, evidence, gate.state.workflow);
  if (!state) return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_STATE_INVALID" });
  const appended = appendPendingRunHarnessRerunRevision(
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

/** Authenticated authority/outcome append that does not replace Core state. */
export function appendPendingSerialCandidateWorkflowEvent(
  projectRoot: string,
  event: PendingRunWorkflowEventInputV1,
): PendingRunMutationResultV1 {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  const gate = pendingRunGate(projectRoot);
  if (!live || !gate?.revision || !gate.state?.workflow) {
    return Object.freeze({ ok: false, code: "PENDING_CANDIDATE_AUTHORITY_MISSING" });
  }
  return appendPendingRunWorkflowRevision(live.authority, gate.revision, event);
}

export function pendingSerialCandidateWorkflow(projectRoot: string): PendingRunWorkflowProjectionV1 | null {
  const state = pendingRunGate(projectRoot)?.state;
  return state ? pendingRunWorkflowProjection(state) : null;
}

/** Main's orchestrator receives the live branded identity but never the
 * pending-run mutation authority or journal directory. */
export function currentPendingSerialCandidate(projectRoot: string): PendingSerialCandidateCurrentV1 | null {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  const workflow = live ? pendingSerialCandidateWorkflow(projectRoot) : null;
  const identitySha256 = live ? candidateIdentitySha256(live.candidate) : null;
  return live && workflow && identitySha256 ? Object.freeze({
    projectRoot: live.projectRoot,
    candidate: live.candidate,
    candidateIdentitySha256: identitySha256,
    route: live.route,
    evidence: live.evidence,
    workflow,
  }) : null;
}

export function pendingSerialCandidateProjects(): readonly string[] {
  return Object.freeze([...liveCandidates.values()].map((entry) => entry.projectRoot).sort());
}

export function pendingSerialCandidateTerminalCardDeliveries(): readonly PendingRunTerminalCardOutboxV1[] {
  return pendingRunTerminalCardDeliveries();
}

export function recordPendingSerialCandidateTerminalCardDelivery(
  deliveryIdSha256: string,
  deliveredSha256: string,
): boolean {
  const delivery: PendingRunTerminalCardDeliveryV1 = Object.freeze({
    version: PENDING_RUN_TERMINAL_CARD_DELIVERY_VERSION,
    deliveryIdSha256,
    deliveredSha256,
  });
  return recordPendingRunTerminalCardDelivery(delivery);
}

export function activePendingSerialCandidates(): readonly string[] {
  return pendingSerialCandidateProjects();
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
    live.terminalCardDraft,
  );
  if (!journal.ok) {
    journal = closePendingRun(
      live.authority,
      gate.revision,
      live.terminalReceipt.actionId,
      live.terminalReceipt.terminalReceiptSha256,
      live.terminalCardDraft,
    );
  }
  if (journal.ok) liveCandidates.delete(live.projectHash);
  else {
    markPendingRunRecoveryRequired(live.authority);
    liveCandidates.delete(live.projectHash);
  }
  return Object.freeze({ journal, result: live.terminalResult });
}

function executeLiveTerminal(
  live: LiveCandidate,
  cardForResult?: PendingSerialCandidateTerminalCardFactoryV1,
): PendingSerialCandidateTerminalAttemptV1 {
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
  const gate = pendingRunGate(live.projectRoot);
  const terminalCard = gate?.state
    ? composeTerminalCardAfterResult(gate.state, execution.result, cardForResult)
    : null;
  if (terminalCard === null) {
    markPendingRunRecoveryRequired(live.authority);
    liveCandidates.delete(live.projectHash);
    return Object.freeze({
      journal: Object.freeze({ ok: false, code: "PENDING_CANDIDATE_TERMINAL_CARD_REFUSED" }),
      result: execution.result,
    });
  }
  live.terminalCardDraft = terminalCard;
  return closeTerminalAttempt(live) as PendingSerialCandidateTerminalAttemptV1;
}

export function stopPendingSerialCandidate(
  projectRoot: string,
  reason: SerialStopReason = "MODEL_RESULT_NOT_VERIFIED",
  cardForResult?: PendingSerialCandidateTerminalCardFactoryV1,
): PendingSerialCandidateTerminalAttemptV1 | null {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  if (!live) return null;
  const replay = closeTerminalAttempt(live);
  if (replay) return replay;
  if (live.terminalPreparation) {
    return live.terminalPreparation.action.kind === "stop" ? executeLiveTerminal(live, cardForResult) : null;
  }
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
  live.terminalCardDraft = undefined;
  if (q9E2eTerminalPrepared(projectRoot)) {
    return Object.freeze({ journal: prepared, result: null });
  }
  return executeLiveTerminal(live, cardForResult);
}

export function finalizePendingSerialCandidate(
  projectRoot: string,
  sealAuthorization: SerialCandidateSealAuthorizationV1,
  cardForResult?: PendingSerialCandidateTerminalCardFactoryV1,
): PendingSerialCandidateTerminalAttemptV1 | null {
  const projectHash = projectPendingRunHash(projectRoot);
  const live = projectHash ? liveCandidates.get(projectHash) : undefined;
  if (!live) return null;
  const replay = closeTerminalAttempt(live);
  if (replay) return replay;
  if (live.terminalPreparation) {
    return live.terminalPreparation.action.kind === "finalize" ? executeLiveTerminal(live, cardForResult) : null;
  }
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
  live.terminalCardDraft = undefined;
  if (q9E2eTerminalPrepared(projectRoot)) {
    return Object.freeze({ journal: prepared, result: null });
  }
  return executeLiveTerminal(live, cardForResult);
}

export function _resetPendingSerialCandidatesForTests(): void {
  if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== "test") return;
  liveCandidates.clear();
  recoveryInstalled = false;
  q9E2eTerminalPreparedHook = null;
}
