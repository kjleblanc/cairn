import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  QUALITY_PLAN_VERSION,
  bindInitialEvidencePlan,
  bindTaskIntent,
  bindTaskSpec,
  composeCriticCallAuthorization,
  composeCriticPacketAuthorityContext,
  composeCriticRequest,
  parseQualityPlanCandidate,
  parseTaskIntentCandidate,
  taskSpecSha256,
  evidencePlanSha256,
  type EvidencePlanV1,
  type TaskSpecV1,
} from "@cairn/core";
import { CRITIC_TRANSPORT_REVISION } from "../src/main/critictransport.js";
import { canonicalProjectKey } from "../src/main/conductor/turnauth.js";

/** Shared by every critic-transport test file. The ledger of spent calls is
 * module-global by design, so exhausting it needs its own process and its own
 * test file — which needs these fixtures too. */
const DIR = process.cwd();
export const CANDIDATE_SHA = "b".repeat(64);
export const CONSENT_VERSION = "consent-v1";
export const API_KEY = "inert-critic-test-key";
export const BASE_URL = "https://openrouter.ai/api/v1";
export const RESOLVED_MODEL = "anthropic/claude-opus-5";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function projectHash(dir = DIR): string {
  return sha256(canonicalProjectKey(dir));
}

/** Every send spends its fingerprint in one module-level ledger, so each case
 * takes its own run rather than sharing one. */
let runSeed = 0;
export function nextRunId(): string {
  runSeed += 1;
  return `22222222-2222-4222-8222-${String(runSeed).padStart(12, "0")}`;
}

export function boundIntent() {
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

export function criterion(id: `c${number}`, judge: "cairn" | "critic", artifactIds: readonly string[], overrides: Record<string, unknown> = {}) {
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
      mode: "artifact-inspection",
      proves: `The declared evidence decides ${id}.`,
      precondition: null,
    },
    comparison: null,
    ...overrides,
  };
}

export function taskSpec(): TaskSpecV1 {
  const raw = parseQualityPlanCandidate({
    version: QUALITY_PLAN_VERSION,
    target: { kind: "local-task", basis: [{ kind: "intent-outcome" }] },
    supportedPath: {
      statement: "Keep the supported path working.",
      basis: [{ kind: "intent-requirement", index: 0 }],
    },
    critic: {
      mode: "required",
      basis: [{ kind: "intent-outcome" }],
      reason: "The owner requires bounded artifact inspection.",
    },
    candidateStates: [{
      id: "candidate-main", route: "/main", viewport: { width: 1280, height: 720 },
      inputFixtureId: "fixture-input", dataFixtureId: "fixture-data",
      versionOrTime: "v1", locale: "en-US", accessibilityMode: "default",
    }],
    acceptanceChecks: [
      criterion("c1", "critic", ["artifact-output"]),
      criterion("c2", "cairn", ["evidence-regression"], {
        kind: "non-regression",
        basis: [{ kind: "intent-requirement", index: 0 }],
      }),
    ],
    qualityPreferences: [],
    references: [],
    unknowns: [],
    coverage: {
      outcomeCriterionIds: ["c1"],
      requirementCriteria: [{ requirementIndex: 0, criterionIds: ["c2"] }],
      supportedPathCriterionId: "c2",
    },
  });
  assert.ok(raw);
  const spec = bindTaskSpec(boundIntent(), raw);
  assert.ok(spec);
  return spec;
}

export function evidencePlan(spec: TaskSpecV1): EvidencePlanV1 {
  const plan = bindInitialEvidencePlan(spec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [
      { criterionId: "c1", kind: "packet-artifact", command: null, artifactIds: ["artifact-output"] },
      { criterionId: "c2", kind: "packet-artifact", command: null, artifactIds: ["evidence-regression"] },
    ],
  });
  assert.ok(plan);
  return plan;
}

export function provenance() {
  return {
    selectorVersion: "cairn-conductor-context-selector/v1", projectHash: projectHash(), gitTracked: true,
    ordinaryText: true, regularFile: true, symbolicLink: false, gitIgnored: false, dependency: false,
    generated: false, credentialLikePath: false, credentialLikeContent: false, insideProject: true,
    reservedArea: false, consented: true,
  };
}

export function bundle(overrides: {
  path?: string;
  connectionConsentVersion?: string;
  candidateSha256?: string;
} = {}) {
  const spec = taskSpec();
  const plan = evidencePlan(spec);
  const packetAuthority = composeCriticPacketAuthorityContext(spec, plan, {
    version: "cairn-critic-packet-authority-context/v1",
    projectHash: projectHash(),
    connectionConsentVersion: overrides.connectionConsentVersion ?? CONSENT_VERSION,
    taskSpecSha256: taskSpecSha256(spec),
    evidencePlanSha256: evidencePlanSha256(plan),
    candidateSha256: overrides.candidateSha256 ?? CANDIDATE_SHA,
    selectedTrackedText: [{
      id: "artifact-output",
      projectRelativePath: overrides.path ?? "src/result.ts",
      sha256: sha256("export const result = 'built';"),
      content: "export const result = 'built';",
      truncated: false,
      provenance: provenance(),
    }],
    checkEvidence: [{
      id: "evidence-regression", criterionId: "c2", status: "met",
      source: "cairn-verifier", evidenceRefs: ["artifact-output"],
    }],
    priorConfirmedFindings: [],
    comparisonTrials: [],
  });
  assert.ok(packetAuthority);
  const request = composeCriticRequest(spec, plan, packetAuthority);
  assert.ok(request);
  return { spec, plan, request };
}

export function route(overrides: Record<string, unknown> = {}) {
  return {
    runId: nextRunId(),
    candidateRound: 0,
    callAttempt: 1,
    provider: "openrouter",
    baseUrl: BASE_URL,
    model: RESOLVED_MODEL,
    resolvedModel: RESOLVED_MODEL,
    resolvedModelRevision: "2026-05-01",
    connectionConsentVersion: CONSENT_VERSION,
    transportRevision: CRITIC_TRANSPORT_REVISION,
    serializer: "cairn-critic-body/v1",
    timeoutMs: 600_000,
    maxOutputCharacters: 262_144,
    purpose: "critic-assessment",
    serverSideTools: "none",
    billingBasis: "Billed by the connected provider at its published rate; no dollar cap can be enforced.",
    ...overrides,
  };
}

export function approved(request: unknown, overrides: Record<string, unknown> = {}) {
  const authorization = composeCriticCallAuthorization(request, route(overrides));
  assert.ok(authorization, "the fixture route must authorize one call");
  return authorization;
}

/** A strict `CriticOutputV1` for the fixture's two criteria, so a test can
 * prove the transport's custody is accepted by Core downstream. */
export function criticOutputJson(request: { packet: { artifactRegistry: readonly { id: string }[] } }): string {
  void request;
  return JSON.stringify({
    version: "cairn-critic-output/v1",
    findings: [
      {
        id: "f1", criterionId: "c1", status: "met", severity: null, confidence: "high",
        failureConditionId: null, observed: "The declared artifact shows c1 holding.",
        evidenceRefs: ["artifact-output"], counterEvidenceRefs: [], selfCheck: "supported",
        rootCauseKey: null, smallestRepair: null,
      },
      {
        id: "f2", criterionId: "c2", status: "met", severity: null, confidence: "medium",
        failureConditionId: null, observed: "The supported path evidence still holds.",
        evidenceRefs: ["evidence-regression"], counterEvidenceRefs: [], selfCheck: "supported",
        rootCauseKey: null, smallestRepair: null,
      },
    ],
    unscopedFindings: [],
    comparisons: [],
    largestGapId: null,
  });
}

export function providerEnvelope(content: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "gen-inert-request-id",
    model: RESOLVED_MODEL,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1_200, completion_tokens: 340, cost: 0.0132 },
    ...overrides,
  };
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(typeof payload === "string" ? payload : JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
