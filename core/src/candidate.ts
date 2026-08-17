import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { types as nodeTypes } from "node:util";
import {
  parseTaskSpecWorkerClaims,
  type TaskSpecWorkerClaims,
} from "./claims.js";
import {
  criticCallAuthorizationCoversRequest,
  criticCallAuthorizationSha256,
  criticAssessmentSha256,
  criticCompletionAuthoritySha256,
  criticPolicyDecisionSha256,
  criticPolicyDecisionCairnFailureCriterionIds,
  criticRepairAuthoritySha256,
  criticRequestSha256,
  criticPolicyDecisionAssessmentRestartCustody,
  CRITIC_COMPLETION_AUTHORITY_VERSION,
  CRITIC_REPAIR_AUTHORITY_VERSION,
  CRITIC_POLICY_DECISION_VERSION,
  isCriticCompletionAuthority,
  isCriticPolicyDecision,
  isCriticRepairAuthority,
  type CriticAssessmentRestartCustodyV1,
  type CriticAssessmentV1,
  type CriticCallAuthorizationV1,
  type CriticCompletionAuthorityV1,
  type CriticPolicyDecisionV1,
  type CriticPriorConfirmedFindingV1,
  type CriticRepairAuthorityV1,
  type CriticRequestV1,
} from "./critic.js";
import { restoreCriticAssessmentFromAuthenticatedPending } from "./critic-assessment-internal.js";
import { consumeSyntheticTaskCriticAuthorizationAfterReservation } from "./critic-call-internal.js";
import { bindCriticPriorFindingsForCurrentCandidate } from "./critic-prior-findings-internal.js";
import { restoredCriticCompletionAuthorityBrands } from "./critic-completion-internal.js";
import { registerSerialCandidatePendingSealRestorer } from "./candidate-seal-internal.js";
import {
  serialPendingRestoreAuthorityCovers,
  type SerialPendingRestoreAuthority,
} from "./pending-restore-internal.js";
import {
  evidencePlanSha256,
  isAuthorizedEvidencePlanRevision,
  taskSpecReviewView,
  taskSpecSha256,
  type EvidencePlanV1,
  type AuthorizedEvidencePlanRevisionV1,
  type EvidencePlanRevisionAuthorizationV1,
  type TaskSpecReviewV1,
  type TaskSpecV1,
} from "./quality.js";

export const SERIAL_CANDIDATE_TASK_SPEC_AUTHORITY_VERSION = "cairn-serial-candidate-task-spec-authority/v1" as const;
export const SERIAL_CANDIDATE_BUNDLE_VERSION = "cairn-serial-candidate-bundle/v1" as const;
export const SERIAL_CANDIDATE_VERSION = "cairn-serial-candidate/v1" as const;
export const SERIAL_CANDIDATE_TRANSITION_VERSION = "cairn-serial-candidate-transition/v1" as const;
export const SERIAL_REPAIR_INSTRUCTION_VERSION = "cairn-serial-repair-instruction/v1" as const;
export const SERIAL_POST_REPAIR_CANDIDATE_VERSION = "cairn-serial-post-repair-candidate/v1" as const;
export const SERIAL_CANDIDATE_IGNORED_BOUNDARY_VERSION = "cairn-serial-candidate-ignored-boundary/v1" as const;
export const SERIAL_CANDIDATE_REPAIR_ELIGIBILITY_VERSION = "cairn-serial-candidate-repair-eligibility/v1" as const;
export const SERIAL_CANDIDATE_SEAL_AUTHORIZATION_VERSION = "cairn-serial-candidate-seal-authorization/v1" as const;
export const SERIAL_CANDIDATE_TERMINAL_TOKEN_VERSION = "cairn-serial-candidate-terminal-token/v1" as const;
export const SERIAL_REPAIR_PREVIEW_VERSION = "cairn-serial-repair-preview/v1" as const;
export const SERIAL_REPAIR_AUTHORIZATION_VERSION = "cairn-serial-repair-authorization/v1" as const;
export const SERIAL_CANDIDATE_ATTEMPT_RESERVATION_VERSION = "cairn-serial-candidate-attempt-reservation/v1" as const;
export const SERIAL_OPTIONAL_CRITIC_DECLINE_AUTHORIZATION_VERSION = "cairn-serial-optional-critic-decline-authorization/v1" as const;

export const SERIAL_CANDIDATE_BUNDLE_LIMITS = Object.freeze({
  paths: 100,
  protectedPaths: 4096,
  ownedPaths: 16,
  pathCharacters: 512,
  bytesPerFile: 256 * 1024,
  totalBytes: 1024 * 1024,
} as const);

type Sha256 = string;
type CandidateRound = 0 | 1;

export type SerialCandidateTaskSpecAuthorityV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_TASK_SPEC_AUTHORITY_VERSION;
  taskSpec: TaskSpecV1;
  taskSpecSha256: Sha256;
  taskSpecReview: TaskSpecReviewV1;
  evidencePlan: EvidencePlanV1;
  evidencePlanSha256: Sha256;
}>;

export type SerialCandidateBundleEntryV1 = Readonly<{
  projectRelativePath: string;
  state: "regular-file" | "deleted";
  origin: "tracked" | "untracked";
  executable: boolean;
  byteLength: number;
  contentSha256: Sha256 | null;
  contentBase64: string | null;
  gitBlobOid: string | null;
  gitMode: "100644" | "100755" | null;
  baseBlobOid: string | null;
  baseMode: "100644" | "100755" | null;
  indexState: "present" | "absent";
  indexBlobOid: string | null;
  indexMode: "100644" | "100755" | null;
  indexRelation: "base" | "product";
}>;

export type SerialCandidateBundleV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_BUNDLE_VERSION;
  round: CandidateRound;
  baseHead: string;
  projectRootSha256: Sha256;
  taskSpecSha256: Sha256;
  evidencePlanSha256: Sha256;
  entries: readonly SerialCandidateBundleEntryV1[];
  rawByteLength: number;
  manifestSha256: Sha256;
  bundleSha256: Sha256;
}>;

export type SerialCandidateBundleFailureReasonV1 =
  | "INVALID_AUTHORITY"
  | "INVALID_CAPTURE_CONTEXT"
  | "PROJECT_UNAVAILABLE"
  | "GIT_UNAVAILABLE"
  | "PATH_SET_CHANGED"
  | "INDEX_STATE_UNSAFE"
  | "PATH_UNSAFE"
  | "PATH_SENSITIVE"
  | "PATH_IGNORED"
  | "PATH_GENERATED"
  | "PATH_LINKED"
  | "PATH_BINARY"
  | "ARTIFACT_UNBOUNDED"
  | "ARTIFACT_UNREADABLE"
  | "ARTIFACT_SENSITIVE"
  | "ARTIFACT_CHANGED";

export type SerialCandidateBundleCaptureV1 =
  | Readonly<{ eligible: true; bundle: SerialCandidateBundleV1 }>
  | Readonly<{ eligible: false; reason: SerialCandidateBundleFailureReasonV1 }>;

export type SerialCandidatePhaseV1 =
  | "awaiting-critic"
  | "awaiting-critic-result"
  | "awaiting-owner-resolution"
  | "awaiting-repair"
  | "awaiting-repair-result"
  | "ready-to-seal"
  | "done"
  | "stopped";

export type SerialCandidateTransitionDecisionV1 =
  | "optional-critic-declined"
  | "critic-clear"
  | "critic-allegation"
  | "required-check-failure-confirmed"
  | "owner-confirmed"
  | "owner-dismissed";

export type SerialCandidateTransitionV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_TRANSITION_VERSION;
  runId: string;
  generation: number;
  taskNumber: number;
  projectRootSha256: Sha256;
  round: CandidateRound;
  taskSpecSha256: Sha256;
  evidencePlanSha256: Sha256;
  candidateSha256: Sha256;
  bundleSha256: Sha256;
  evidenceStateSha256: Sha256;
  decision: SerialCandidateTransitionDecisionV1;
}>;

export type SerialCandidateImmutableLineageV1 = Readonly<{
  taskSpec: TaskSpecV1;
  taskSpecSha256: Sha256;
  evidencePlan: EvidencePlanV1;
  evidencePlanSha256: Sha256;
  initialEvidencePlan: EvidencePlanV1;
  initialEvidencePlanSha256: Sha256;
  evidencePlanRevisionAuthorization: EvidencePlanRevisionAuthorizationV1 | null;
  round0Bundle: SerialCandidateBundleV1;
  round0BundleSha256: Sha256;
  ignoredWriteEligibility: SerialCandidateRepairEligibilityV1 | null;
}>;

export type SerialCandidateIgnoredBoundaryV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_IGNORED_BOUNDARY_VERSION;
  projectRootSha256: Sha256;
  ignoredTree: "empty";
}>;

export type SerialCandidateRepairEligibilityV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_REPAIR_ELIGIBILITY_VERSION;
  projectRootSha256: Sha256;
  bundleSha256: Sha256;
  ignoredTree: "unchanged-empty";
  repairEligibilitySha256: Sha256;
}>;

export type SerialCandidateV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_VERSION;
  runId: string;
  generation: number;
  taskNumber: number;
  requestSha256: Sha256;
  projectRootSha256: Sha256;
  taskSpecSha256: Sha256;
  evidencePlanSha256: Sha256;
  lineage: SerialCandidateImmutableLineageV1;
  round: CandidateRound;
  bundle: SerialCandidateBundleV1;
  bundleSha256: Sha256;
  claims: TaskSpecWorkerClaims;
  claimsSha256: Sha256;
  candidateSha256: Sha256;
  evidenceStateSha256: Sha256;
  criticMode: "required" | "optional" | "off";
  repairEligibility: SerialCandidateRepairEligibilityV1 | null;
  repairUnavailableReason: "IGNORED_WRITE_SET_UNAVAILABLE" | "REPAIR_SPENT" | null;
  phase: SerialCandidatePhaseV1;
  pendingOwnerReason: "critic-allegation" | "cairn-failure-confirmation" | null;
  callsUsed: Readonly<{
    builder: 1;
    repair: 0 | 1;
    critic: 0 | 1 | 2 | 3;
    externalEvidence: 0;
  }>;
}>;

export type SerialRepairPreviewV1 = Readonly<{
  version: typeof SERIAL_REPAIR_PREVIEW_VERSION;
  runId: string;
  generation: number;
  taskNumber: number;
  projectRootSha256: Sha256;
  round: 0;
  taskSpecSha256: Sha256;
  evidencePlanSha256: Sha256;
  candidateSha256: Sha256;
  bundleSha256: Sha256;
  evidenceStateSha256: Sha256;
  repairAuthoritySha256: Sha256;
  instruction: SerialRepairInstructionV1;
  repairPreviewSha256: Sha256;
}>;

export type SerialRepairPreviewAuthorityRowV1 = Readonly<{
  criterionId: `c${number}`;
  promise: string;
  failureConditionId: string;
  failureCondition: string;
  source: "cairn" | "owner" | "critic";
  sourceSha256: Sha256;
  artifacts: readonly Readonly<{
    id: string;
    kind: "adapter-command-attestation" | "packet-artifact" | "owner-observation" | "comparison-capture";
  }>[];
}>;

export type SerialRepairAuthorizationV1 = Readonly<{
  version: typeof SERIAL_REPAIR_AUTHORIZATION_VERSION;
  runId: string;
  generation: number;
  candidateSha256: Sha256;
  repairAuthoritySha256: Sha256;
  repairPreviewSha256: Sha256;
  repairInstructionSha256: Sha256;
  approved: true;
  actionNonce: string;
  approvedAt: string;
  repairAuthorizationSha256: Sha256;
}>;

export type SerialCandidateAttemptReservationV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_ATTEMPT_RESERVATION_VERSION;
  kind: "repair" | "critic";
  runId: string;
  sourceGeneration: number;
  reservedGeneration: number;
  taskNumber: number;
  projectRootSha256: Sha256;
  round: CandidateRound;
  taskSpecSha256: Sha256;
  evidencePlanSha256: Sha256;
  candidateSha256: Sha256;
  bundleSha256: Sha256;
  attempt: 1 | 2 | 3;
  authorizationSha256: Sha256;
  requestSha256: Sha256 | null;
  routeRequestFingerprintSha256: Sha256 | null;
  retryOfReservationSha256: Sha256 | null;
  previewSha256: Sha256 | null;
  instructionSha256: Sha256 | null;
  reservationSha256: Sha256;
}>;

export type SerialCandidateRepairAdmissionV1 = Readonly<{
  candidate: SerialCandidateV1;
  repairAuthority: CriticRepairAuthorityV1;
}>;

export type SerialCandidateRepairReservationV1 = Readonly<{
  candidate: SerialCandidateV1;
  preview: SerialRepairPreviewV1;
  authorization: SerialRepairAuthorizationV1;
  instruction: SerialRepairInstructionV1;
  reservation: SerialCandidateAttemptReservationV1;
}>;

export type SerialCandidateCriticReservationV1 = Readonly<{
  candidate: SerialCandidateV1;
  reservation: SerialCandidateAttemptReservationV1;
}>;

export type SerialOptionalCriticDeclineAuthorizationV1 = Readonly<{
  version: typeof SERIAL_OPTIONAL_CRITIC_DECLINE_AUTHORIZATION_VERSION;
  runId: string;
  generation: number;
  candidateSha256: Sha256;
  evidenceStateSha256: Sha256;
  declined: true;
  actionNonce: string;
  decidedAt: string;
  ownerActionReceiptSha256: Sha256;
  authorizationSha256: Sha256;
}>;

export type SerialCandidateAttemptCustodyV1 = Readonly<{
  reservation: SerialCandidateAttemptReservationV1;
  status: "reserved" | "available" | "unavailable" | "completed";
  resultAuthoritySha256: Sha256 | null;
  unavailableReason: "transport-unavailable" | "malformed-output" | "process-crash" | null;
}>;

export type SerialCandidateEvidencePlanRevisionCustodyV1 = Readonly<{
  initialEvidencePlan: EvidencePlanV1;
  initialEvidencePlanSha256: Sha256;
  currentEvidencePlan: EvidencePlanV1;
  currentEvidencePlanSha256: Sha256;
  authorization: EvidencePlanRevisionAuthorizationV1;
  custodySha256: Sha256;
}>;

export type SerialCandidateQ9PendingCustodyV1 = Readonly<{
  qualityLoopAuthorityRequired: boolean;
  assessmentRestartCustody: CriticAssessmentRestartCustodyV1 | null;
  repairAuthority: CriticRepairAuthorityV1 | null;
  repairAuthoritySha256: Sha256 | null;
  policyDecision: CriticPolicyDecisionV1 | null;
  completionAuthority: CriticCompletionAuthorityV1 | null;
  attempts: readonly SerialCandidateAttemptCustodyV1[];
}>;

export type SerialRepairInstructionV1 = Readonly<{
  version: typeof SERIAL_REPAIR_INSTRUCTION_VERSION;
  runId: string;
  generation: number;
  round: 0;
  taskSpecSha256: Sha256;
  evidencePlanSha256: Sha256;
  candidateSha256: Sha256;
  bundleSha256: Sha256;
  evidenceStateSha256: Sha256;
  criterionIds: readonly `c${number}`[];
  artifactIds: readonly string[];
  instruction: string;
  repairInstructionSha256: Sha256;
}>;

export type SerialCandidatePendingRepairBlockerV1 = Readonly<{
  criterionId: `c${number}`;
  failureConditionId: string;
  artifactIds: readonly string[];
}>;

export type SerialCandidatePendingRepairLineageV1 = Readonly<{
  preRepairCandidate: SerialCandidateV1;
  postRepairCandidate: SerialCandidateV1;
  preRepairTransitionHistory: readonly SerialCandidateTransitionDecisionV1[];
  preRepairQ9Custody: SerialCandidateQ9PendingCustodyV1;
  repairInstruction: SerialRepairInstructionV1;
  blockers: readonly SerialCandidatePendingRepairBlockerV1[];
  roundOneBundle: SerialCandidateBundleV1;
  roundOneCaptureContext: Readonly<{
    round: 1;
    baseHead: string;
    taskPaths: readonly string[];
    protectedPaths: readonly string[];
    ownedPaths: readonly string[];
  }>;
}>;

export type SerialCandidateSealAuthorizationV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_SEAL_AUTHORIZATION_VERSION;
  runId: string;
  generation: number;
  taskNumber: number;
  projectRootSha256: Sha256;
  round: CandidateRound;
  taskSpecSha256: Sha256;
  evidencePlanSha256: Sha256;
  candidateSha256: Sha256;
  bundleSha256: Sha256;
  evidenceStateSha256: Sha256;
  requiredCriteriaComplete: true;
  confirmedBlockerCount: 0;
  nativeStopCount: 0;
}>;

export type SerialCandidateTerminalTokenV1 = Readonly<{
  version: typeof SERIAL_CANDIDATE_TERMINAL_TOKEN_VERSION;
  runId: string;
  generation: number;
  candidateSha256: Sha256;
  requestedDisposition: "DONE" | "STOPPED";
}>;

type InspectedRecord = Readonly<Record<string, unknown>>;

const authorityBrand = new WeakSet<object>();
const bundleBrand = new WeakSet<object>();
const candidateBrand = new WeakSet<object>();
const transitionBrand = new WeakSet<object>();
const repairInstructionBrand = new WeakSet<object>();
const ignoredBoundaryBrand = new WeakSet<object>();
const repairEligibilityBrand = new WeakSet<object>();
const sealAuthorizationBrand = new WeakSet<object>();
const terminalTokenBrand = new WeakSet<object>();
const repairPreviewBrand = new WeakSet<object>();
const repairAuthorizationBrand = new WeakSet<object>();
const attemptReservationBrand = new WeakSet<object>();
const optionalCriticDeclineAuthorizationBrand = new WeakSet<object>();
const restoredRepairAuthorityBrand = new WeakSet<object>();
const spentRepairInstructions = new WeakSet<object>();
const spentRepairAuthorizations = new WeakSet<object>();
const spentAttemptReservations = new WeakSet<object>();
const spentOptionalCriticDeclineAuthorizations = new WeakSet<object>();

type CandidateLineage = {
  identity: object;
  current: SerialCandidateV1;
  terminalReserved: boolean;
  parked: boolean;
  qualityLoopAuthorityRequired: boolean;
  transitionHistory: SerialCandidateTransitionDecisionV1[];
  repairAuthority: CriticRepairAuthorityV1 | null;
  repairAuthoritySha256: Sha256 | null;
  policyDecision: CriticPolicyDecisionV1 | null;
  assessment: CriticAssessmentV1 | null;
  assessmentRestartCustody: CriticAssessmentRestartCustodyV1 | null;
  completionAuthority: CriticCompletionAuthorityV1 | null;
  attempts: Array<{
    reservation: SerialCandidateAttemptReservationV1;
    status: "reserved" | "available" | "unavailable" | "completed";
    resultAuthoritySha256: Sha256 | null;
    unavailableReason: "transport-unavailable" | "malformed-output" | "process-crash" | null;
  }>;
  captureAuthority: SerialCandidateTaskSpecAuthorityV1;
};

const candidateBindings = new WeakMap<object, Readonly<{
  authority: SerialCandidateTaskSpecAuthorityV1;
  lineage: CandidateLineage;
}>>();
const transitionBindings = new WeakMap<object, SerialCandidateV1>();
const spentTransitions = new WeakSet<object>();
const bundleBindings = new WeakMap<object, SerialCandidateTaskSpecAuthorityV1>();
const bundleCaptureBindings = new WeakMap<object, Readonly<{
  rootReal: string;
  round: CandidateRound;
  baseHead: string;
  taskPaths: readonly string[];
  protectedPaths: readonly string[];
  ownedPaths: readonly string[];
}>>();
const ignoredBoundaryBindings = new WeakMap<object, string>();
const repairEligibilityBindings = new WeakMap<object, SerialCandidateBundleV1>();
const repairInstructionBindings = new WeakMap<object, SerialCandidateV1>();
const repairBundleBindings = new WeakMap<object, Readonly<{
  candidate: SerialCandidateV1;
  instruction: SerialRepairInstructionV1;
}>>();
const repairCaptureByInstruction = new WeakMap<object, SerialCandidateBundleV1>();
const repairBlockersByInstruction = new WeakMap<object, readonly SerialCandidatePendingRepairBlockerV1[]>();
const pendingRepairLineageByLineage = new WeakMap<object, SerialCandidatePendingRepairLineageV1>();
const sealAuthorizationBindings = new WeakMap<object, SerialCandidateV1>();
const terminalTokenBindings = new WeakMap<object, Readonly<{
  candidate: SerialCandidateV1;
  lineage: CandidateLineage;
  requestedDisposition: "DONE" | "STOPPED";
  used: { value: boolean };
}>>();
const repairByCandidate = new WeakSet<object>();
const revokedRepairCandidates = new WeakSet<object>();
const repairPreviewBindings = new WeakMap<object, Readonly<{ candidate: SerialCandidateV1; rootReal: string }>>();
const repairAuthorizationBindings = new WeakMap<object, Readonly<{
  candidate: SerialCandidateV1;
  preview: SerialRepairPreviewV1;
}>>();
const attemptReservationBindings = new WeakMap<object, Readonly<{
  lineage: CandidateLineage;
  reservedCandidate: SerialCandidateV1;
}>>();
const optionalCriticDeclineAuthorizationBindings = new WeakMap<object, SerialCandidateV1>();

const SHA_RE = /^[a-f0-9]{64}$/u;
const GIT_OID_RE = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const UUID_V4_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const MACHINE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const FORBIDDEN_TEXT_RE = /[\u0000\u202a-\u202e\u2066-\u2069]/u;
const FORBIDDEN_PATH_CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

const GENERATED_PARTS = new Set([
  ".git", ".cairn", "node_modules", "dist", "dist-unit", "out", "build", "coverage", "generated",
  "vendor", "target", "bin", "obj", "library", "temp", ".next", ".nuxt", ".svelte-kit",
  ".pnpm-store", ".yarn", ".cache", ".parcel-cache", ".venv", "venv",
]);
const CREDENTIAL_DIRS = new Set(["credential", "credentials", "secret", "secrets", "private-keys", "token", "tokens", "token-store"]);
const CREDENTIAL_NAMES = new Set([
  "credential.json", "credentials.json", "service-account.json", "service_account.json",
  "application-default-credentials.json", "application_default_credentials.json", "secret.json", "secrets.json",
  "token.json", "tokens.json", "auth.json", "netrc", "kubeconfig", "id_rsa", "id_dsa", "id_ecdsa",
  "id_ed25519", "id_rsa.pub", "id_dsa.pub", "id_ecdsa.pub", "id_ed25519.pub",
]);
const CREDENTIAL_EXTENSIONS = new Set([".key", ".pem", ".ppk", ".p12", ".pfx", ".jks", ".keystore"]);
const BINARY_EXTENSIONS = new Set([
  ".7z", ".avi", ".bmp", ".class", ".dll", ".dmg", ".doc", ".docx", ".eot", ".exe", ".gif", ".gz",
  ".ico", ".jar", ".jpeg", ".jpg", ".mov", ".mp3", ".mp4", ".otf", ".pdf", ".png", ".ppt", ".pptx",
  ".so", ".tar", ".ttf", ".db", ".db3", ".map", ".pyc", ".sqlite", ".sqlite3", ".wasm", ".wav",
  ".webm", ".webp", ".woff", ".woff2", ".xls", ".xlsx", ".zip",
]);
const WINDOWS_DEVICE_RE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function canonicalArray(values: readonly string[]): string {
  return `[${values.join(",")}]`;
}

function canonicalObject(entries: readonly (readonly [string, string])[]): string {
  return `{${entries.map(([key, value]) => `${quote(key)}:${value}`).join(",")}}`;
}

function inspectRecord(value: unknown, expected: readonly string[]): InspectedRecord | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const names = Object.getOwnPropertyNames(value);
    if (names.length !== expected.length || expected.some((key) => !names.includes(key))) return null;
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of expected) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined || descriptor.enumerable !== true) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > cap) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const names = Object.getOwnPropertyNames(value);
    if (names.length !== value.length + 1 || names.at(-1) !== "length") return null;
    const output: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (names[index] !== String(index)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined || descriptor.enumerable !== true) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function safeSha(value: unknown): string | null {
  return typeof value === "string" && SHA_RE.test(value) ? value : null;
}

function safeText(value: unknown, cap: number): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > cap || FORBIDDEN_TEXT_RE.test(value) || value.normalize("NFC") !== value) return null;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return null;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return null;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const name of Object.getOwnPropertyNames(value)) deepFreeze((value as Record<string, unknown>)[name]);
  return value;
}

function failure(reason: SerialCandidateBundleFailureReasonV1): SerialCandidateBundleCaptureV1 {
  return Object.freeze({ eligible: false, reason });
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

const SERIAL_CANDIDATE_DENIED_GIT_ENVIRONMENT = new Set([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_SHALLOW_FILE",
  "GIT_REPLACE_REF_BASE",
  "GIT_NO_REPLACE_OBJECTS",
  "GIT_GRAFT_FILE",
  "GIT_QUARANTINE_PATH",
  "GIT_ATTR_SOURCE",
  "GIT_LITERAL_PATHSPECS",
  "GIT_GLOB_PATHSPECS",
  "GIT_NOGLOB_PATHSPECS",
  "GIT_ICASE_PATHSPECS",
  "GIT_CEILING_DIRECTORIES",
  "GIT_DISCOVERY_ACROSS_FILESYSTEM",
  "GIT_EXEC_PATH",
  "GIT_EXTERNAL_DIFF",
]);

export function serialCandidateGitEnvironmentNameDenied(name: string): boolean {
  const upper = name.toUpperCase();
  return SERIAL_CANDIDATE_DENIED_GIT_ENVIRONMENT.has(upper)
    || upper.startsWith("GIT_TRACE")
    || upper.startsWith("GIT_REDIRECT_")
    || upper === "GIT_CONFIG"
    || upper === "GIT_CONFIG_PARAMETERS"
    || upper.startsWith("GIT_CONFIG_");
}

/** One managed safe.directory triplet may be inherited by the host. It is
 * accepted only as a closed three-variable shape and is still removed from
 * every child Git process, so even `*` cannot grant or redirect authority. */
export function serialCandidateGitEnvironmentSafe(environment: NodeJS.ProcessEnv = process.env): boolean {
  const config = Object.entries(environment)
    .filter(([name]) => {
      const upper = name.toUpperCase();
      return upper === "GIT_CONFIG" || upper === "GIT_CONFIG_PARAMETERS" || upper.startsWith("GIT_CONFIG_");
    });
  if (config.length > 0) {
    const values = new Map<string, string | undefined>();
    for (const [name, value] of config) {
      const upper = name.toUpperCase();
      if (values.has(upper)) return false;
      values.set(upper, value);
    }
    if (values.size !== 3 || values.get("GIT_CONFIG_COUNT") !== "1"
      || values.get("GIT_CONFIG_KEY_0")?.toLowerCase() !== "safe.directory"
      || typeof values.get("GIT_CONFIG_VALUE_0") !== "string"
      || values.get("GIT_CONFIG_VALUE_0")!.length > 4096) return false;
  }
  return Object.keys(environment).every((name) => {
    const upper = name.toUpperCase();
    return upper === "GIT_CONFIG_COUNT" || upper === "GIT_CONFIG_KEY_0" || upper === "GIT_CONFIG_VALUE_0"
      || !serialCandidateGitEnvironmentNameDenied(name);
  });
}

function candidateGitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (serialCandidateGitEnvironmentNameDenied(name)) delete environment[name];
  }
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_NO_REPLACE_OBJECTS = "1";
  const nullConfig = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = nullConfig;
  environment.GIT_CONFIG_GLOBAL = nullConfig;
  for (const name of [
    "GIT_TRACE", "GIT_TRACE_PACK_ACCESS", "GIT_TRACE_PACKFILE", "GIT_TRACE_PACKET",
    "GIT_TRACE_PERFORMANCE", "GIT_TRACE_SETUP", "GIT_TRACE_SHALLOW", "GIT_TRACE_CURL",
    "GIT_TRACE_FSMONITOR", "GIT_TRACE2", "GIT_TRACE2_EVENT", "GIT_TRACE2_PERF",
  ]) environment[name] = "0";
  return environment;
}

const SERIAL_CANDIDATE_NEUTRAL_GIT = [
  "-c", "core.fsmonitor=false",
  "-c", "core.ignoreCase=false",
  "-c", "trace2.normalTarget=0",
  "-c", "trace2.eventTarget=0",
  "-c", "trace2.perfTarget=0",
] as const;

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", [...SERIAL_CANDIDATE_NEUTRAL_GIT, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: candidateGitEnvironment(),
    maxBuffer: 8 * 1024 * 1024,
  }).trimEnd();
}

function gitZ(root: string, args: readonly string[]): string[] {
  const output = execFileSync("git", [...SERIAL_CANDIDATE_NEUTRAL_GIT, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: candidateGitEnvironment(),
    maxBuffer: 8 * 1024 * 1024,
  });
  return output.split("\0").filter(Boolean);
}

function canonicalProjectRoot(root: string): string | null {
  try {
    const real = realpathSync.native(resolve(root));
    const top = realpathSync.native(git(root, ["rev-parse", "--show-toplevel"]));
    const same = process.platform === "win32" ? real.toLowerCase() === top.toLowerCase() : real === top;
    return same ? real : null;
  } catch {
    return null;
  }
}

function normalizedProjectPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > SERIAL_CANDIDATE_BUNDLE_LIMITS.pathCharacters
    || value.normalize("NFC") !== value || value.includes("\ufffd") || value.includes("\\") || value.startsWith("/") || isAbsolute(value)
    || /^[A-Za-z]:/u.test(value) || /^\/\//u.test(value) || FORBIDDEN_PATH_CONTROL_RE.test(value)) return null;
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes(":")
    || /[. ]$/u.test(part) || WINDOWS_DEVICE_RE.test(part))) return null;
  return parts.join("/");
}

function pathComparisonKey(path: string): string {
  // A recovery bundle chooses safety over retaining two names that alias on a
  // case-folding filesystem. Reject that ambiguity consistently even when the
  // current test filesystem happens to be case-sensitive.
  return path.toLowerCase();
}

function safePathArray(value: unknown, cap: number): readonly string[] | null {
  const array = inspectArray(value, cap);
  if (array === null) return null;
  const output: string[] = [];
  const seen = new Set<string>();
  for (const item of array) {
    const path = normalizedProjectPath(item);
    const key = path === null ? "" : pathComparisonKey(path);
    if (path === null || seen.has(key)) return null;
    seen.add(key);
    output.push(path);
  }
  const sorted = [...output].sort();
  return sameStrings(output, sorted) ? Object.freeze(output) : null;
}

/** Core-internal record classification shared with the serial candidate gate. */
export function serialCandidateReservedRecordClass(path: string): "task" | "verdict" | null {
  const normalized = path.toLowerCase();
  if (normalized.startsWith("docs/ai-work/tasks/")) return "task";
  if (normalized.startsWith("docs/ai-work/verdicts/")) return "verdict";
  return null;
}

function pathClass(path: string): "safe" | "generated" | "sensitive" | "binary" | "unsafe" {
  const parts = path.toLowerCase().split("/");
  if (serialCandidateReservedRecordClass(path) !== null) return "unsafe";
  if (parts.some((part) => GENERATED_PARTS.has(part))) return "generated";
  const name = parts.at(-1) ?? "";
  if (parts.some((part) => CREDENTIAL_DIRS.has(part)
    || /service[-_]?account/u.test(part)
    || /(?:^|[-_.])(?:secrets?|credentials?|api[-_]?(?:keys?|tokens?)|access[-_]?(?:keys?|tokens?)|refresh[-_]?tokens?|auth[-_]?tokens?|private[-_]?keys?)(?:[-_.]|$)/u.test(part))
    || name === ".env" || name.startsWith(".env.") || CREDENTIAL_NAMES.has(name)
    || CREDENTIAL_EXTENSIONS.has(extname(name)) || /(?:secret|credential|token)[-_]?(?:store|vault|backup)/u.test(name)) return "sensitive";
  if (parts.some((part) => part.startsWith("."))) return "unsafe";
  if (BINARY_EXTENSIONS.has(extname(name))) return "binary";
  return "safe";
}

function containsCredentialMaterial(text: string): boolean {
  if (/-----BEGIN (?:(?:(?:RSA|EC|OPENSSH|DSA|ENCRYPTED) )?PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/iu.test(text)) return true;
  if (/^PuTTY-User-Key-File-\d+:/imu.test(text)) return true;
  if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u.test(text)) return true;
  if (/\bsk-[A-Za-z0-9_-]{16,}\b/u.test(text)) return true;
  if (/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/u.test(text)) return true;
  if (/\bgh[opusr]_[A-Za-z0-9]{20,}\b/u.test(text)) return true;
  if (/\bglpat-[A-Za-z0-9_-]{20,}\b/u.test(text)) return true;
  if (/\bAIza[A-Za-z0-9_-]{35}\b/u.test(text)) return true;
  if (/\bGOCSPX-[A-Za-z0-9_-]{20,}\b/u.test(text)) return true;
  if (/\bnpm_[A-Za-z0-9]{20,}\b/u.test(text)) return true;
  if (/\bpypi-[A-Za-z0-9_-]{30,}\b/u.test(text)) return true;
  if (/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u.test(text)) return true;
  if (/\bBearer\s+[A-Za-z0-9._~-]{20,}\b/iu.test(text)) return true;
  if (/\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^@\s/]+@/iu.test(text)) return true;
  const field = "(?:api[_-]?key|access[_-]?(?:key|token)|refresh[_-]?token|auth[_-]?token|client[_-]?(?:secret|key[_-]?data)|private[_-]?key|aws[_-]?secret[_-]?access[_-]?key|database[_-]?url|connection[_-]?string|password|passphrase|secret|token)";
  if (new RegExp(`["']?${field}["']?\\s*[:=]\\s*["'][^"'\\r\\n]{12,}["']`, "iu").test(text)) return true;
  return new RegExp(`^\\s*${field}\\s*[:=]\\s*(?!["'{[(])(?!\\$\\{)(?!process\\.env\\b)(?![A-Za-z_$][\\w$]*\\.)([^\\s#,}\\]]{12,})\\s*(?:#.*)?$`, "imu").test(text);
}

function ignoredPaths(root: string, paths: readonly string[]): Set<string> | null {
  if (paths.length === 0) return new Set();
  const result = spawnSync("git", [...SERIAL_CANDIDATE_NEUTRAL_GIT, "check-ignore", "--no-index", "-z", "--stdin"], {
    cwd: root,
    input: `${paths.join("\0")}\0`,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    env: candidateGitEnvironment(),
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0 && result.status !== 1) return null;
  return new Set((result.stdout ?? "").split("\0").filter(Boolean));
}

function projectRootSha256(rootReal: string): string {
  return sha256(process.platform === "win32" ? rootReal.toLowerCase() : rootReal);
}

/**
 * Q6's deliberately narrow ignored-write proof. We never read ignored file
 * contents or retain ignored names: repair is eligible only when Git reports
 * that the ignored tree is empty both before and after the Builder. Nonempty
 * output, an oversized listing, or any Git error means "proof unavailable".
 */
function ignoredTreeIsEmpty(root: string): boolean | null {
  const result = spawnSync("git", [...SERIAL_CANDIDATE_NEUTRAL_GIT, "ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: candidateGitEnvironment(),
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) return null;
  return (result.stdout ?? "").length === 0;
}

export function captureSerialCandidateIgnoredBoundary(root: string): SerialCandidateIgnoredBoundaryV1 | null {
  if (typeof root !== "string" || root.length === 0 || !serialCandidateGitEnvironmentSafe()) return null;
  const rootReal = canonicalProjectRoot(root);
  if (rootReal === null || ignoredTreeIsEmpty(rootReal) !== true) return null;
  const boundary = Object.freeze({
    version: SERIAL_CANDIDATE_IGNORED_BOUNDARY_VERSION,
    projectRootSha256: projectRootSha256(rootReal),
    ignoredTree: "empty" as const,
  }) as SerialCandidateIgnoredBoundaryV1;
  ignoredBoundaryBrand.add(boundary);
  ignoredBoundaryBindings.set(boundary, rootReal);
  return boundary;
}

export function composeSerialCandidateRepairEligibility(
  root: string,
  boundary: unknown,
  bundle: unknown,
): SerialCandidateRepairEligibilityV1 | null {
  if (typeof root !== "string" || root.length === 0 || typeof boundary !== "object" || boundary === null
    || !serialCandidateGitEnvironmentSafe()
    || !ignoredBoundaryBrand.has(boundary) || !isSerialCandidateBundle(bundle)) return null;
  const rootReal = canonicalProjectRoot(root);
  const boundRoot = ignoredBoundaryBindings.get(boundary);
  if (rootReal === null || boundRoot !== rootReal || ignoredTreeIsEmpty(rootReal) !== true
    || bundle.projectRootSha256 !== projectRootSha256(rootReal)) return null;
  const withoutSha = {
    version: SERIAL_CANDIDATE_REPAIR_ELIGIBILITY_VERSION,
    projectRootSha256: bundle.projectRootSha256,
    bundleSha256: bundle.bundleSha256,
    ignoredTree: "unchanged-empty" as const,
  };
  const eligibility = Object.freeze({
    ...withoutSha,
    repairEligibilitySha256: sha256(canonicalObject([
      ["version", quote(withoutSha.version)],
      ["projectRootSha256", quote(withoutSha.projectRootSha256)],
      ["bundleSha256", quote(withoutSha.bundleSha256)],
      ["ignoredTree", quote(withoutSha.ignoredTree)],
    ])),
  }) as SerialCandidateRepairEligibilityV1;
  repairEligibilityBrand.add(eligibility);
  repairEligibilityBindings.set(eligibility, bundle);
  return eligibility;
}

function currentChangedPaths(root: string): string[] {
  return [...new Set([
    ...gitZ(root, ["diff", "--no-ext-diff", "--no-textconv", "--name-only", "-z", "--"]),
    ...gitZ(root, ["diff", "--no-ext-diff", "--no-textconv", "--cached", "--name-only", "-z", "--"]),
    ...gitZ(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"]),
  ])].sort();
}

type IndexEntry = Readonly<{ mode: string; oid: string; stage: string }>;

function indexEntry(root: string, path: string): IndexEntry | null {
  const records = gitZ(root, ["ls-files", "--stage", "-z", "--", `:(top,literal)${path}`]);
  if (records.length === 0) return null;
  if (records.length !== 1) throw new Error("ambiguous-index");
  const tab = records[0].indexOf("\t");
  if (tab < 0 || records[0].slice(tab + 1) !== path) throw new Error("invalid-index");
  const [mode, oid, stage] = records[0].slice(0, tab).split(" ");
  if (!mode || !oid || !stage) throw new Error("invalid-index");
  return Object.freeze({ mode, oid, stage });
}

function baseTreeEntry(root: string, baseHead: string, path: string): IndexEntry | null {
  const records = gitZ(root, ["ls-tree", "-z", baseHead, "--", `:(top,literal)${path}`]);
  if (records.length === 0) return null;
  if (records.length !== 1) throw new Error("ambiguous-base-tree");
  const tab = records[0].indexOf("\t");
  if (tab < 0 || records[0].slice(tab + 1) !== path) throw new Error("invalid-base-tree");
  const [mode, kind, oid] = records[0].slice(0, tab).split(" ");
  if (!mode || kind !== "blob" || !oid) throw new Error("invalid-base-tree");
  return Object.freeze({ mode, oid, stage: "0" });
}

type CandidateGitState = Readonly<{ mode: "100644" | "100755"; oid: string }> | null;

function candidateGitState(entry: IndexEntry | null): CandidateGitState | undefined {
  if (entry === null) return null;
  if (entry.stage !== "0" || (entry.mode !== "100644" && entry.mode !== "100755")
    || !GIT_OID_RE.test(entry.oid)) return undefined;
  return Object.freeze({ mode: entry.mode, oid: entry.oid });
}

function sameCandidateGitState(left: CandidateGitState, right: CandidateGitState): boolean {
  return left === null ? right === null : right !== null && left.mode === right.mode && left.oid === right.oid;
}

function candidateIndexRelation(
  index: CandidateGitState,
  base: CandidateGitState,
  product: CandidateGitState,
): "base" | "product" | null {
  if (sameCandidateGitState(index, base)) return "base";
  if (sameCandidateGitState(index, product)) return "product";
  return null;
}

function gitTracksExecutableMode(root: string): boolean | null {
  try {
    const value = git(root, ["config", "--bool", "core.filemode"]);
    return value === "true" ? true : value === "false" ? false : null;
  } catch {
    return null;
  }
}

/**
 * Bind the lossless worktree bytes to the canonical blob Git will stage while
 * refusing repository-defined external clean filters. Built-in text/eol
 * normalization remains supported (including CRLF worktrees over LF blobs),
 * but candidate capture never starts an arbitrary filter command. `-w` stores
 * only the unreachable blob object needed by the later cacheinfo transaction;
 * it changes no ref, index, worktree file, task record, or terminal state.
 */
function safeGitBlobOid(root: string, path: string, bytes: Buffer): string | null {
  try {
    // check-attr consumes pathnames (not pathspecs), so the raw path is already
    // an exact identity here and must not be slash-normalized.
    const filter = gitZ(root, ["check-attr", "-z", "filter", "--", path]);
    if (filter.length !== 3 || filter[0] !== path || filter[1] !== "filter"
      || (filter[2] !== "unspecified" && filter[2] !== "unset")) return null;
    const neutralReservedFilters = ["unspecified", "unset"].flatMap((name) => [
      "-c", `filter.${name}.clean=`,
      "-c", `filter.${name}.smudge=`,
      "-c", `filter.${name}.process=`,
      "-c", `filter.${name}.required=false`,
    ]);
    const oid = execFileSync("git", [
      ...SERIAL_CANDIDATE_NEUTRAL_GIT,
      ...neutralReservedFilters,
      "hash-object", "-w", `--path=${path}`, "--stdin",
    ], {
      cwd: root,
      input: bytes,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: candidateGitEnvironment(),
      maxBuffer: 1024 * 1024,
    }).trim();
    return GIT_OID_RE.test(oid) ? oid : null;
  } catch {
    return null;
  }
}

function containedRegularPath(rootReal: string, projectPath: string): string | null {
  try {
    const absolute = resolve(rootReal, ...projectPath.split("/"));
    const lexical = relative(rootReal, absolute);
    if (!lexical || lexical === ".." || lexical.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(lexical)) return null;
    let cursor = rootReal;
    const parts = projectPath.split("/");
    for (let index = 0; index < parts.length; index += 1) {
      cursor = join(cursor, parts[index]);
      const info = lstatSync(cursor);
      if (info.isSymbolicLink()) return null;
      if (index < parts.length - 1 && !info.isDirectory()) return null;
      if (index === parts.length - 1 && !info.isFile()) return null;
    }
    const real = realpathSync.native(cursor);
    const inside = relative(rootReal, real);
    if (!inside || inside === ".." || inside.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(inside)) return null;
    return real;
  } catch {
    return null;
  }
}

/**
 * A missing tracked leaf is a deletion only when every parent component is a
 * real directory. Walking the components with lstat prevents a dangling or
 * outside-pointing parent link from being mistaken for an ordinary deletion.
 */
function deletionParentsAreRealDirectories(rootReal: string, projectPath: string): boolean {
  try {
    let cursor = rootReal;
    const parts = projectPath.split("/");
    for (let index = 0; index < parts.length - 1; index += 1) {
      cursor = join(cursor, parts[index]);
      const info = lstatSync(cursor);
      if (info.isSymbolicLink() || !info.isDirectory()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function readExactSafeFile(rootReal: string, projectPath: string, remaining: number): { bytes: Buffer; executable: boolean } | SerialCandidateBundleFailureReasonV1 {
  const absolute = containedRegularPath(rootReal, projectPath);
  if (absolute === null) return "PATH_LINKED";
  let descriptor: number | null = null;
  try {
    descriptor = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n) return "PATH_LINKED";
    if (before.size > BigInt(SERIAL_CANDIDATE_BUNDLE_LIMITS.bytesPerFile) || before.size > BigInt(remaining)) return "ARTIFACT_UNBOUNDED";
    const revalidated = containedRegularPath(rootReal, projectPath);
    if (revalidated === null) return "PATH_LINKED";
    const named = statSync(revalidated, { bigint: true });
    if (before.dev !== named.dev || before.ino === 0n || before.ino !== named.ino || before.size !== named.size
      || named.nlink !== 1n) return "ARTIFACT_CHANGED";
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (count === 0) break;
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== bytes.length || after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
      || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs) return "ARTIFACT_CHANGED";
    const rebound = containedRegularPath(rootReal, projectPath);
    if (rebound === null) return "ARTIFACT_CHANGED";
    const afterNamed = statSync(rebound, { bigint: true });
    if (afterNamed.dev !== after.dev || afterNamed.ino !== after.ino || afterNamed.size !== after.size
      || afterNamed.mtimeNs !== after.mtimeNs || afterNamed.ctimeNs !== after.ctimeNs) return "ARTIFACT_CHANGED";
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(text)) return "PATH_BINARY";
    if (containsCredentialMaterial(text)) return "ARTIFACT_SENSITIVE";
    return { bytes, executable: (Number(before.mode) & 0o111) !== 0 };
  } catch {
    return "ARTIFACT_UNREADABLE";
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* the authorization already failed closed or detached */ }
    }
  }
}

function canonicalEntryMetadata(entry: SerialCandidateBundleEntryV1): string {
  return canonicalObject([
    ["projectRelativePath", quote(entry.projectRelativePath)],
    ["state", quote(entry.state)],
    ["origin", quote(entry.origin)],
    ["executable", String(entry.executable)],
    ["byteLength", String(entry.byteLength)],
    ["contentSha256", entry.contentSha256 === null ? "null" : quote(entry.contentSha256)],
    ["gitBlobOid", entry.gitBlobOid === null ? "null" : quote(entry.gitBlobOid)],
    ["gitMode", entry.gitMode === null ? "null" : quote(entry.gitMode)],
    ["baseBlobOid", entry.baseBlobOid === null ? "null" : quote(entry.baseBlobOid)],
    ["baseMode", entry.baseMode === null ? "null" : quote(entry.baseMode)],
    ["indexState", quote(entry.indexState)],
    ["indexBlobOid", entry.indexBlobOid === null ? "null" : quote(entry.indexBlobOid)],
    ["indexMode", entry.indexMode === null ? "null" : quote(entry.indexMode)],
    ["indexRelation", quote(entry.indexRelation)],
  ]);
}

function canonicalBundle(bundle: Omit<SerialCandidateBundleV1, "bundleSha256">): string {
  return canonicalObject([
    ["version", quote(bundle.version)],
    ["round", String(bundle.round)],
    ["baseHead", quote(bundle.baseHead)],
    ["projectRootSha256", quote(bundle.projectRootSha256)],
    ["taskSpecSha256", quote(bundle.taskSpecSha256)],
    ["evidencePlanSha256", quote(bundle.evidencePlanSha256)],
    ["entries", canonicalArray(bundle.entries.map((entry) => canonicalObject([
      ["metadata", canonicalEntryMetadata(entry)],
      ["contentBase64", entry.contentBase64 === null ? "null" : quote(entry.contentBase64)],
    ])))],
    ["rawByteLength", String(bundle.rawByteLength)],
    ["manifestSha256", quote(bundle.manifestSha256)],
  ]);
}

export function composeSerialCandidateTaskSpecAuthority(taskSpec: unknown, evidencePlan: unknown): SerialCandidateTaskSpecAuthorityV1 | null {
  try {
    const specSha = taskSpecSha256(taskSpec);
    const planSha = evidencePlanSha256(evidencePlan);
    const review = taskSpecReviewView(taskSpec);
    if (!specSha || !planSha || !review || review.taskSpecSha256 !== specSha) return null;
    const spec = taskSpec as TaskSpecV1;
    const plan = evidencePlan as EvidencePlanV1;
    if (plan.taskSpecSha256 !== specSha || plan.procedures.length !== spec.quality.acceptanceChecks.length
      || plan.procedures.some((procedure, index) => procedure.criterionId !== spec.quality.acceptanceChecks[index]?.id)) return null;
    const authority = Object.freeze({
      version: SERIAL_CANDIDATE_TASK_SPEC_AUTHORITY_VERSION,
      taskSpec: spec,
      taskSpecSha256: specSha,
      taskSpecReview: review,
      evidencePlan: plan,
      evidencePlanSha256: planSha,
    }) as SerialCandidateTaskSpecAuthorityV1;
    authorityBrand.add(authority);
    return authority;
  } catch {
    return null;
  }
}

export function isSerialCandidateTaskSpecAuthority(value: unknown): value is SerialCandidateTaskSpecAuthorityV1 {
  if (typeof value !== "object" || value === null || !authorityBrand.has(value)) return false;
  const authority = value as SerialCandidateTaskSpecAuthorityV1;
  return authority.taskSpecSha256 === taskSpecSha256(authority.taskSpec)
    && authority.evidencePlanSha256 === evidencePlanSha256(authority.evidencePlan)
    && authority.evidencePlan.taskSpecSha256 === authority.taskSpecSha256;
}

export function serialCandidateTaskSpecAuthorityHashes(value: unknown): Readonly<{
  taskSpecSha256: string;
  evidencePlanSha256: string;
}> | null {
  return isSerialCandidateTaskSpecAuthority(value)
    ? Object.freeze({ taskSpecSha256: value.taskSpecSha256, evidencePlanSha256: value.evidencePlanSha256 })
    : null;
}

export function captureSerialCandidateBundle(
  root: string,
  authority: unknown,
  rawContext: unknown,
): SerialCandidateBundleCaptureV1 {
  if (!isSerialCandidateTaskSpecAuthority(authority)) return failure("INVALID_AUTHORITY");
  if (typeof root !== "string" || root.length === 0) return failure("PROJECT_UNAVAILABLE");
  if (!serialCandidateGitEnvironmentSafe()) return failure("GIT_UNAVAILABLE");
  const context = inspectRecord(rawContext, ["round", "baseHead", "taskPaths", "protectedPaths", "ownedPaths"]);
  if (!context || Object.is(context.round, -0) || (context.round !== 0 && context.round !== 1)
    || typeof context.baseHead !== "string" || !GIT_OID_RE.test(context.baseHead)) {
    return failure("INVALID_CAPTURE_CONTEXT");
  }
  const taskPaths = safePathArray(context.taskPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.paths);
  const protectedPaths = safePathArray(context.protectedPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.protectedPaths);
  const ownedPaths = safePathArray(context.ownedPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.ownedPaths);
  if (!taskPaths || !protectedPaths || !ownedPaths) return failure("INVALID_CAPTURE_CONTEXT");
  const protectedSet = new Set(protectedPaths.map(pathComparisonKey));
  const ownedSet = new Set(ownedPaths.map(pathComparisonKey));
  if (taskPaths.some((path) => protectedSet.has(pathComparisonKey(path))
    || ownedSet.has(pathComparisonKey(path)))) return failure("INVALID_CAPTURE_CONTEXT");

  const rootReal = canonicalProjectRoot(root);
  if (rootReal === null) return failure("PROJECT_UNAVAILABLE");
  try {
    const trackedByKey = new Map<string, string>();
    for (const trackedPath of gitZ(rootReal, ["ls-files", "-z"])) {
      const key = pathComparisonKey(trackedPath);
      const previous = trackedByKey.get(key);
      if (previous !== undefined && previous !== trackedPath) return failure("PATH_UNSAFE");
      trackedByKey.set(key, trackedPath);
    }
    for (const taskPath of taskPaths) {
      const trackedPath = trackedByKey.get(pathComparisonKey(taskPath));
      if (trackedPath !== undefined && trackedPath !== taskPath) return failure("PATH_UNSAFE");
    }
    if (git(rootReal, ["rev-parse", "HEAD"]) !== context.baseHead) return failure("PATH_SET_CHANGED");
    const changed = currentChangedPaths(rootReal);
    const excluded = new Set([...protectedPaths, ...ownedPaths].map(pathComparisonKey));
    const derivedTask = changed.filter((path) => !excluded.has(pathComparisonKey(path)));
    if (!sameStrings(derivedTask, taskPaths)) return failure("PATH_SET_CHANGED");
    const ignored = ignoredPaths(rootReal, taskPaths);
    if (ignored === null) return failure("GIT_UNAVAILABLE");
    if (ignored.size > 0) return failure("PATH_IGNORED");

    const entries: SerialCandidateBundleEntryV1[] = [];
    const initialIndexes = new Map<string, IndexEntry | null>();
    const tracksExecutableMode = gitTracksExecutableMode(rootReal);
    if (tracksExecutableMode === null) return failure("GIT_UNAVAILABLE");
    let rawByteLength = 0;
    for (const path of taskPaths) {
      const classification = pathClass(path);
      if (classification === "generated") return failure("PATH_GENERATED");
      if (classification === "sensitive") return failure("PATH_SENSITIVE");
      if (classification === "binary") return failure("PATH_BINARY");
      if (classification !== "safe") return failure("PATH_UNSAFE");
      const index = indexEntry(rootReal, path);
      const base = baseTreeEntry(rootReal, context.baseHead, path);
      initialIndexes.set(path, index);
      const indexState = candidateGitState(index);
      const baseState = candidateGitState(base);
      if (indexState === undefined || baseState === undefined) return failure("PATH_LINKED");
      const absolute = resolve(rootReal, ...path.split("/"));
      if (!deletionParentsAreRealDirectories(rootReal, path)) return failure("PATH_LINKED");
      let leaf: ReturnType<typeof lstatSync> | null;
      try {
        leaf = lstatSync(absolute);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") return failure("ARTIFACT_UNREADABLE");
        leaf = null;
      }
      if (leaf?.isSymbolicLink()) return failure("PATH_LINKED");
      if (leaf === null) {
        if (!base || !GIT_OID_RE.test(base.oid)) return failure("PATH_UNSAFE");
        const indexRelation = candidateIndexRelation(indexState, baseState, null);
        if (indexRelation === null) return failure("INDEX_STATE_UNSAFE");
        entries.push(Object.freeze({
          projectRelativePath: path,
          state: "deleted",
          origin: "tracked",
          executable: base.mode === "100755",
          byteLength: 0,
          contentSha256: null,
          contentBase64: null,
          gitBlobOid: null,
          gitMode: null,
          baseBlobOid: base.oid,
          baseMode: baseState!.mode,
          indexState: indexState === null ? "absent" : "present",
          indexBlobOid: indexState?.oid ?? null,
          indexMode: indexState?.mode ?? null,
          indexRelation,
        }));
        continue;
      }
      if (!leaf.isFile()) return failure("PATH_LINKED");
      const read = readExactSafeFile(rootReal, path, SERIAL_CANDIDATE_BUNDLE_LIMITS.totalBytes - rawByteLength);
      if (typeof read === "string") return failure(read);
      const gitBlobOid = safeGitBlobOid(rootReal, path, read.bytes);
      if (gitBlobOid === null) return failure("ARTIFACT_UNREADABLE");
      rawByteLength += read.bytes.length;
      const tracked = base !== null;
      const gitMode = !tracksExecutableMode && index !== null
        ? index.mode as "100644" | "100755"
        : !tracksExecutableMode && base !== null
          ? base.mode as "100644" | "100755"
          : read.executable ? "100755" : "100644";
      const productState = Object.freeze({ mode: gitMode, oid: gitBlobOid });
      const indexRelation = candidateIndexRelation(indexState, baseState, productState);
      if (indexRelation === null) return failure("INDEX_STATE_UNSAFE");
      entries.push(Object.freeze({
        projectRelativePath: path,
        state: "regular-file",
        origin: tracked ? "tracked" : "untracked",
        executable: read.executable,
        byteLength: read.bytes.length,
        contentSha256: sha256(read.bytes),
        contentBase64: read.bytes.toString("base64"),
        gitBlobOid,
        gitMode,
        baseBlobOid: base?.oid ?? null,
        baseMode: baseState?.mode ?? null,
        indexState: indexState === null ? "absent" : "present",
        indexBlobOid: indexState?.oid ?? null,
        indexMode: indexState?.mode ?? null,
        indexRelation,
      }));
    }
    // A per-file safe read is not yet a coherent snapshot: an earlier file can
    // change while a later file is being read. Re-read every retained entry and
    // re-check its index provenance before exposing any bundle.
    for (const entry of entries) {
      const expectedIndex = initialIndexes.get(entry.projectRelativePath) ?? null;
      const currentIndex = indexEntry(rootReal, entry.projectRelativePath);
      if ((expectedIndex === null) !== (currentIndex === null)
        || (expectedIndex && currentIndex && (expectedIndex.mode !== currentIndex.mode
          || expectedIndex.oid !== currentIndex.oid || expectedIndex.stage !== currentIndex.stage))) {
        return failure("ARTIFACT_CHANGED");
      }
      const absolute = resolve(rootReal, ...entry.projectRelativePath.split("/"));
      if (entry.state === "deleted") {
        if (!deletionParentsAreRealDirectories(rootReal, entry.projectRelativePath)) return failure("ARTIFACT_CHANGED");
        try {
          lstatSync(absolute);
          return failure("ARTIFACT_CHANGED");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") return failure("ARTIFACT_CHANGED");
        }
        continue;
      }
      const reread = readExactSafeFile(rootReal, entry.projectRelativePath, SERIAL_CANDIDATE_BUNDLE_LIMITS.bytesPerFile);
      if (typeof reread === "string" || reread.bytes.length !== entry.byteLength
        || reread.executable !== entry.executable || sha256(reread.bytes) !== entry.contentSha256
        || safeGitBlobOid(rootReal, entry.projectRelativePath, reread.bytes) !== entry.gitBlobOid) {
        return failure("ARTIFACT_CHANGED");
      }
    }
    if (git(rootReal, ["rev-parse", "HEAD"]) !== context.baseHead) return failure("ARTIFACT_CHANGED");
    const changedAfter = currentChangedPaths(rootReal);
    const excludedAfter = new Set([...protectedPaths, ...ownedPaths].map(pathComparisonKey));
    const derivedAfter = changedAfter.filter((path) => !excludedAfter.has(pathComparisonKey(path)));
    if (!sameStrings(derivedAfter, taskPaths)) return failure("ARTIFACT_CHANGED");
    const ignoredAfter = ignoredPaths(rootReal, taskPaths);
    if (ignoredAfter === null || ignoredAfter.size > 0) return failure("ARTIFACT_CHANGED");
    const manifestSha256 = sha256(canonicalArray(entries.map(canonicalEntryMetadata)));
    const withoutBundleSha = deepFreeze({
      version: SERIAL_CANDIDATE_BUNDLE_VERSION,
      round: context.round as CandidateRound,
      baseHead: context.baseHead,
      projectRootSha256: projectRootSha256(rootReal),
      taskSpecSha256: authority.taskSpecSha256,
      evidencePlanSha256: authority.evidencePlanSha256,
      entries: Object.freeze(entries),
      rawByteLength,
      manifestSha256,
    });
    const bundle = deepFreeze({
      ...withoutBundleSha,
      bundleSha256: sha256(canonicalBundle(withoutBundleSha)),
    }) as SerialCandidateBundleV1;
    bundleBrand.add(bundle);
    bundleBindings.set(bundle, authority);
    bundleCaptureBindings.set(bundle, Object.freeze({
      rootReal,
      round: context.round as CandidateRound,
      baseHead: context.baseHead,
      taskPaths: Object.freeze([...taskPaths]),
      protectedPaths: Object.freeze([...protectedPaths]),
      ownedPaths: Object.freeze([...ownedPaths]),
    }));
    return Object.freeze({ eligible: true, bundle });
  } catch {
    return failure("GIT_UNAVAILABLE");
  }
}

export function isSerialCandidateBundle(value: unknown): value is SerialCandidateBundleV1 {
  if (typeof value !== "object" || value === null || !bundleBrand.has(value)) return false;
  const bundle = value as SerialCandidateBundleV1;
  const binding = bundleBindings.get(bundle);
  if (!binding || !isSerialCandidateTaskSpecAuthority(binding) || bundle.taskSpecSha256 !== binding.taskSpecSha256
    || bundle.evidencePlanSha256 !== binding.evidencePlanSha256) return false;
  const { bundleSha256: ignored, ...withoutSha } = bundle;
  void ignored;
  return bundle.bundleSha256 === sha256(canonicalBundle(withoutSha));
}

export function serialCandidateBundleSha256(value: unknown): string | null {
  return isSerialCandidateBundle(value) ? value.bundleSha256 : null;
}

/**
 * Core-internal restart helper. This is deliberately not root-exported: it
 * restores only a canonically authenticated pending bundle and cannot capture
 * or bless new caller-selected workspace bytes.
 */
export function restoreSerialCandidateBundleForPending(
  root: string,
  authorityValue: unknown,
  rawBundle: unknown,
  rawContext: unknown,
): SerialCandidateBundleV1 | null {
  try {
    if (!isSerialCandidateTaskSpecAuthority(authorityValue)
      || typeof root !== "string" || root.length === 0
      || !serialCandidateGitEnvironmentSafe()) return null;
    const authority = authorityValue;
    const bundleRecord = inspectRecord(rawBundle, [
      "version", "round", "baseHead", "projectRootSha256", "taskSpecSha256", "evidencePlanSha256",
      "entries", "rawByteLength", "manifestSha256", "bundleSha256",
    ]);
    const context = inspectRecord(rawContext, ["round", "baseHead", "taskPaths", "protectedPaths", "ownedPaths"]);
    if (!bundleRecord || !context || bundleRecord.version !== SERIAL_CANDIDATE_BUNDLE_VERSION
      || (bundleRecord.round !== 0 && bundleRecord.round !== 1)
      || context.round !== bundleRecord.round
      || typeof bundleRecord.baseHead !== "string" || !GIT_OID_RE.test(bundleRecord.baseHead)
      || context.baseHead !== bundleRecord.baseHead
      || bundleRecord.taskSpecSha256 !== authority.taskSpecSha256
      || bundleRecord.evidencePlanSha256 !== authority.evidencePlanSha256
      || safeSha(bundleRecord.projectRootSha256) === null
      || safeSha(bundleRecord.manifestSha256) === null
      || safeSha(bundleRecord.bundleSha256) === null
      || !Number.isSafeInteger(bundleRecord.rawByteLength) || Object.is(bundleRecord.rawByteLength, -0)
      || (bundleRecord.rawByteLength as number) < 0
      || (bundleRecord.rawByteLength as number) > SERIAL_CANDIDATE_BUNDLE_LIMITS.totalBytes) return null;
    const rootReal = canonicalProjectRoot(root);
    if (!rootReal || bundleRecord.projectRootSha256 !== projectRootSha256(rootReal)) return null;
    const taskPaths = safePathArray(context.taskPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.paths);
    const protectedPaths = safePathArray(context.protectedPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.protectedPaths);
    const ownedPaths = safePathArray(context.ownedPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.ownedPaths);
    if (!taskPaths || !protectedPaths || !ownedPaths) return null;
    const protectedSet = new Set(protectedPaths.map(pathComparisonKey));
    const ownedSet = new Set(ownedPaths.map(pathComparisonKey));
    if (taskPaths.some((path) => protectedSet.has(pathComparisonKey(path))
      || ownedSet.has(pathComparisonKey(path)))) return null;

    const rawEntries = inspectArray(bundleRecord.entries, SERIAL_CANDIDATE_BUNDLE_LIMITS.paths);
    if (!rawEntries || rawEntries.length !== taskPaths.length) return null;
    const entries: SerialCandidateBundleEntryV1[] = [];
    let rawByteLength = 0;
    for (let index = 0; index < rawEntries.length; index += 1) {
      const record = inspectRecord(rawEntries[index], [
        "projectRelativePath", "state", "origin", "executable", "byteLength", "contentSha256",
        "contentBase64", "gitBlobOid", "gitMode", "baseBlobOid", "baseMode", "indexState",
        "indexBlobOid", "indexMode", "indexRelation",
      ]);
      const projectRelativePath = record ? normalizedProjectPath(record.projectRelativePath) : null;
      if (!record || !projectRelativePath || projectRelativePath !== taskPaths[index]
        || (record.state !== "regular-file" && record.state !== "deleted")
        || (record.origin !== "tracked" && record.origin !== "untracked")
        || typeof record.executable !== "boolean"
        || !Number.isSafeInteger(record.byteLength) || Object.is(record.byteLength, -0)
        || (record.byteLength as number) < 0
        || (record.byteLength as number) > SERIAL_CANDIDATE_BUNDLE_LIMITS.bytesPerFile
        || (record.indexState !== "present" && record.indexState !== "absent")
        || (record.indexRelation !== "base" && record.indexRelation !== "product")) return null;
      const gitMode = record.gitMode === "100644" || record.gitMode === "100755" ? record.gitMode : null;
      const baseMode = record.baseMode === "100644" || record.baseMode === "100755" ? record.baseMode : null;
      const indexMode = record.indexMode === "100644" || record.indexMode === "100755" ? record.indexMode : null;
      const gitBlobOid = typeof record.gitBlobOid === "string" && GIT_OID_RE.test(record.gitBlobOid)
        ? record.gitBlobOid : null;
      const baseBlobOid = typeof record.baseBlobOid === "string" && GIT_OID_RE.test(record.baseBlobOid)
        ? record.baseBlobOid : null;
      const indexBlobOid = typeof record.indexBlobOid === "string" && GIT_OID_RE.test(record.indexBlobOid)
        ? record.indexBlobOid : null;
      if ((record.baseBlobOid === null) !== (record.baseMode === null)
        || (record.baseBlobOid !== null && (!baseBlobOid || !baseMode))
        || (record.indexBlobOid === null) !== (record.indexMode === null)
        || (record.indexState === "absent" && (record.indexBlobOid !== null || record.indexMode !== null))
        || (record.indexState === "present" && (!indexBlobOid || !indexMode))) return null;
      if (record.state === "deleted") {
        if (record.origin !== "tracked" || record.byteLength !== 0
          || record.contentSha256 !== null || record.contentBase64 !== null
          || record.gitBlobOid !== null || record.gitMode !== null
          || !baseBlobOid || !baseMode) return null;
      } else {
        if (record.origin === "tracked" ? (!baseBlobOid || !baseMode) : (record.baseBlobOid !== null || record.baseMode !== null)
          || typeof record.contentBase64 !== "string" || safeSha(record.contentSha256) === null
          || !gitBlobOid || !gitMode) return null;
        const contentBase64 = record.contentBase64 as string;
        const bytes = Buffer.from(contentBase64, "base64");
        if (bytes.toString("base64") !== contentBase64
          || bytes.length !== record.byteLength || sha256(bytes) !== record.contentSha256) return null;
        rawByteLength += bytes.length;
        if (rawByteLength > SERIAL_CANDIDATE_BUNDLE_LIMITS.totalBytes) return null;
      }
      entries.push(deepFreeze({
        projectRelativePath,
        state: record.state,
        origin: record.origin,
        executable: record.executable,
        byteLength: record.byteLength,
        contentSha256: record.contentSha256,
        contentBase64: record.contentBase64,
        gitBlobOid: record.gitBlobOid,
        gitMode: record.gitMode,
        baseBlobOid: record.baseBlobOid,
        baseMode: record.baseMode,
        indexState: record.indexState,
        indexBlobOid: record.indexBlobOid,
        indexMode: record.indexMode,
        indexRelation: record.indexRelation,
      }) as SerialCandidateBundleEntryV1);
    }
    if (rawByteLength !== bundleRecord.rawByteLength) return null;
    const manifestSha256 = sha256(canonicalArray(entries.map(canonicalEntryMetadata)));
    const withoutBundleSha = deepFreeze({
      version: SERIAL_CANDIDATE_BUNDLE_VERSION,
      round: bundleRecord.round as CandidateRound,
      baseHead: bundleRecord.baseHead,
      projectRootSha256: bundleRecord.projectRootSha256,
      taskSpecSha256: bundleRecord.taskSpecSha256,
      evidencePlanSha256: bundleRecord.evidencePlanSha256,
      entries: Object.freeze(entries),
      rawByteLength,
      manifestSha256,
    });
    if (manifestSha256 !== bundleRecord.manifestSha256
      || sha256(canonicalBundle(withoutBundleSha)) !== bundleRecord.bundleSha256) return null;
    const bundle = deepFreeze({
      ...withoutBundleSha,
      bundleSha256: bundleRecord.bundleSha256,
    }) as SerialCandidateBundleV1;
    bundleBrand.add(bundle);
    bundleBindings.set(bundle, authority);
    bundleCaptureBindings.set(bundle, Object.freeze({
      rootReal,
      round: bundle.round,
      baseHead: bundle.baseHead,
      taskPaths,
      protectedPaths,
      ownedPaths,
    }));
    return bundle;
  } catch {
    return null;
  }
}

/** Core-internal companion for authenticated pending-candidate restoration. */
export function restoreSerialCandidateRepairEligibilityForPending(
  bundleValue: unknown,
  rawEligibility: unknown,
): SerialCandidateRepairEligibilityV1 | null {
  if (!isSerialCandidateBundle(bundleValue)) return null;
  const record = inspectRecord(rawEligibility, [
    "version", "projectRootSha256", "bundleSha256", "ignoredTree", "repairEligibilitySha256",
  ]);
  if (!record || record.version !== SERIAL_CANDIDATE_REPAIR_ELIGIBILITY_VERSION
    || record.projectRootSha256 !== bundleValue.projectRootSha256
    || record.bundleSha256 !== bundleValue.bundleSha256
    || record.ignoredTree !== "unchanged-empty" || safeSha(record.repairEligibilitySha256) === null) return null;
  const expectedSha = sha256(canonicalObject([
    ["version", quote(SERIAL_CANDIDATE_REPAIR_ELIGIBILITY_VERSION)],
    ["projectRootSha256", quote(bundleValue.projectRootSha256)],
    ["bundleSha256", quote(bundleValue.bundleSha256)],
    ["ignoredTree", quote("unchanged-empty")],
  ]));
  if (record.repairEligibilitySha256 !== expectedSha) return null;
  const eligibility = Object.freeze({
    version: SERIAL_CANDIDATE_REPAIR_ELIGIBILITY_VERSION,
    projectRootSha256: bundleValue.projectRootSha256,
    bundleSha256: bundleValue.bundleSha256,
    ignoredTree: "unchanged-empty" as const,
    repairEligibilitySha256: expectedSha,
  }) as SerialCandidateRepairEligibilityV1;
  repairEligibilityBrand.add(eligibility);
  repairEligibilityBindings.set(eligibility, bundleValue);
  return eligibility;
}

/**
 * Re-capture the exact current product set from the private context that
 * created its bundle. This is the freshness check used immediately before a
 * repair instruction or terminal write; callers cannot redefine protected or
 * Cairn-owned paths. Repair authorization adds the separate fresh ignored-tree
 * check below; ordinary sealing does not turn that deliberately narrow repair
 * proof into a universal DONE gate on real projects with dependency trees.
 */
export function serialCandidateWorkspaceStillExact(root: string, candidate: unknown): boolean {
  if (typeof root !== "string" || root.length === 0 || !serialCandidateGitEnvironmentSafe()
    || !isCurrentSerialCandidate(candidate)) return false;
  const context = bundleCaptureBindings.get(candidate.bundle);
  const rootReal = canonicalProjectRoot(root);
  if (!context || rootReal === null || context.rootReal !== rootReal
    || candidate.projectRootSha256 !== projectRootSha256(rootReal)) return false;
  const currentAuthority = candidateBindings.get(candidate)?.authority;
  const captureAuthority = bundleBindings.get(candidate.bundle);
  if (!currentAuthority || !captureAuthority
    || captureAuthority.taskSpecSha256 !== currentAuthority.taskSpecSha256
    || candidate.bundle.evidencePlanSha256 !== captureAuthority.evidencePlanSha256) return false;
  const captured = captureSerialCandidateBundle(rootReal, captureAuthority, {
    round: candidate.round,
    baseHead: context.baseHead,
    taskPaths: context.taskPaths,
    protectedPaths: context.protectedPaths,
    ownedPaths: context.ownedPaths,
  });
  return captured.eligible && captured.bundle.bundleSha256 === candidate.bundleSha256;
}

function serialCandidateRepairWorkspaceStillExact(root: string, candidate: unknown): boolean {
  if (!isCurrentSerialCandidate(candidate) || revokedRepairCandidates.has(candidate) || candidate.repairEligibility === null
    || !repairEligibilityBrand.has(candidate.repairEligibility)
    || repairEligibilityBindings.get(candidate.repairEligibility) !== candidate.bundle) return false;
  const rootReal = canonicalProjectRoot(root);
  if (rootReal === null || ignoredTreeIsEmpty(rootReal) !== true) {
    revokedRepairCandidates.add(candidate);
    return false;
  }
  return serialCandidateWorkspaceStillExact(rootReal, candidate);
}

function canonicalClaims(value: TaskSpecWorkerClaims): string {
  return canonicalObject([
    ["version", quote(value.version)],
    ["taskSpecSha256", quote(value.taskSpecSha256)],
    ["disposition", quote(value.disposition)],
    ["summary", quote(value.summary)],
    ["changes", canonicalArray(value.changes.map(quote))],
    ["criteria", canonicalArray(value.criteria.map((row) => canonicalObject([["id", quote(row.id)], ["result", quote(row.result)]])))],
    ["preferences", canonicalArray(value.preferences.map((row) => canonicalObject([["id", quote(row.id)], ["result", quote(row.result)]])))],
    ["howToTry", quote(value.howToTry)],
    ["limitations", quote(value.limitations)],
    ["milestone", quote(value.milestone)],
  ]);
}

function canonicalRepairInstruction(value: Omit<SerialRepairInstructionV1, "repairInstructionSha256">): string {
  return canonicalObject([
    ["version", quote(value.version)],
    ["runId", quote(value.runId)],
    ["generation", String(value.generation)],
    ["round", String(value.round)],
    ["taskSpecSha256", quote(value.taskSpecSha256)],
    ["evidencePlanSha256", quote(value.evidencePlanSha256)],
    ["candidateSha256", quote(value.candidateSha256)],
    ["bundleSha256", quote(value.bundleSha256)],
    ["evidenceStateSha256", quote(value.evidenceStateSha256)],
    ["criterionIds", canonicalArray(value.criterionIds.map(quote))],
    ["artifactIds", canonicalArray(value.artifactIds.map(quote))],
    ["instruction", quote(value.instruction)],
  ]);
}

function mintCandidate(
  authority: SerialCandidateTaskSpecAuthorityV1,
  lineage: CandidateLineage | null,
  values: Omit<SerialCandidateV1, "version">,
): SerialCandidateV1 {
  const candidate = deepFreeze({ version: SERIAL_CANDIDATE_VERSION, ...values }) as SerialCandidateV1;
  const actualLineage = lineage ?? {
    identity: Object.freeze(Object.create(null)) as object,
    current: candidate,
    terminalReserved: false,
    parked: false,
    qualityLoopAuthorityRequired: false,
    transitionHistory: [],
    repairAuthority: null,
    repairAuthoritySha256: null,
    policyDecision: null,
    assessment: null,
    assessmentRestartCustody: null,
    completionAuthority: null,
    attempts: [],
    captureAuthority: authority,
  };
  actualLineage.current = candidate;
  candidateBrand.add(candidate);
  candidateBindings.set(candidate, Object.freeze({ authority, lineage: actualLineage }));
  return candidate;
}

export function composeSerialCandidate(authority: unknown, raw: unknown): SerialCandidateV1 | null {
  if (!isSerialCandidateTaskSpecAuthority(authority)) return null;
  const record = inspectRecord(raw, ["version", "runId", "taskNumber", "requestSha256", "claimsText", "bundle", "repairEligibility"]);
  if (!record || record.version !== SERIAL_CANDIDATE_VERSION || typeof record.runId !== "string" || !UUID_V4_RE.test(record.runId)
    || !Number.isSafeInteger(record.taskNumber) || Object.is(record.taskNumber, -0) || (record.taskNumber as number) < 1
    || safeSha(record.requestSha256) === null || typeof record.claimsText !== "string" || !isSerialCandidateBundle(record.bundle)) return null;
  const bundle = record.bundle;
  if (bundleBindings.get(bundle) !== authority || bundle.round !== 0) return null;
  const repairEligibility = record.repairEligibility;
  if (repairEligibility !== null && (typeof repairEligibility !== "object"
    || !repairEligibilityBrand.has(repairEligibility)
    || repairEligibilityBindings.get(repairEligibility) !== bundle)) return null;
  const claims = parseTaskSpecWorkerClaims(record.claimsText, {
    taskSpecSha256: authority.taskSpecSha256,
    criterionIds: authority.taskSpec.quality.acceptanceChecks.map((row) => row.id),
    preferenceIds: authority.taskSpec.quality.qualityPreferences.map((row) => row.id),
  });
  if (!claims || claims.disposition !== "DONE") return null;
  const claimsSha256 = sha256(canonicalClaims(claims));
  const candidateSha256 = sha256(canonicalObject([
    ["round", "0"],
    ["taskSpecSha256", quote(authority.taskSpecSha256)],
    ["evidencePlanSha256", quote(authority.evidencePlanSha256)],
    ["bundleSha256", quote(bundle.bundleSha256)],
    ["claimsSha256", quote(claimsSha256)],
    ["repairEligibilitySha256", repairEligibility === null
      ? "null"
      : quote((repairEligibility as SerialCandidateRepairEligibilityV1).repairEligibilitySha256)],
  ]));
  const evidenceStateSha256 = sha256(canonicalObject([
    ["candidateSha256", quote(candidateSha256)],
    ["evidencePlanSha256", quote(authority.evidencePlanSha256)],
    ["claimsSha256", quote(claimsSha256)],
  ]));
  const phase: SerialCandidatePhaseV1 = authority.taskSpec.quality.critic.mode === "off" ? "ready-to-seal" : "awaiting-critic";
  const lineage = deepFreeze({
    taskSpec: authority.taskSpec,
    taskSpecSha256: authority.taskSpecSha256,
    evidencePlan: authority.evidencePlan,
    evidencePlanSha256: authority.evidencePlanSha256,
    initialEvidencePlan: authority.evidencePlan,
    initialEvidencePlanSha256: authority.evidencePlanSha256,
    evidencePlanRevisionAuthorization: null,
    round0Bundle: bundle,
    round0BundleSha256: bundle.bundleSha256,
    ignoredWriteEligibility: repairEligibility as SerialCandidateRepairEligibilityV1 | null,
  }) as SerialCandidateImmutableLineageV1;
  return mintCandidate(authority, null, {
    runId: record.runId,
    generation: 0,
    taskNumber: record.taskNumber as number,
    requestSha256: record.requestSha256 as string,
    projectRootSha256: bundle.projectRootSha256,
    taskSpecSha256: authority.taskSpecSha256,
    evidencePlanSha256: authority.evidencePlanSha256,
    lineage,
    round: 0,
    bundle,
    bundleSha256: bundle.bundleSha256,
    claims,
    claimsSha256,
    candidateSha256,
    evidenceStateSha256,
    criticMode: authority.taskSpec.quality.critic.mode,
    repairEligibility: repairEligibility as SerialCandidateRepairEligibilityV1 | null,
    repairUnavailableReason: repairEligibility === null ? "IGNORED_WRITE_SET_UNAVAILABLE" : null,
    phase,
    pendingOwnerReason: null,
    callsUsed: Object.freeze({ builder: 1, repair: 0, critic: 0, externalEvidence: 0 }),
  });
}

export function isCurrentSerialCandidate(value: unknown): value is SerialCandidateV1 {
  if (typeof value !== "object" || value === null || !candidateBrand.has(value)) return false;
  const binding = candidateBindings.get(value);
  const candidate = value as SerialCandidateV1;
  return binding !== undefined && binding.lineage.current === value && !binding.lineage.terminalReserved
    && !binding.lineage.parked
    && isSerialCandidateTaskSpecAuthority(binding.authority) && isSerialCandidateBundle(candidate.bundle)
    && candidate.lineage.taskSpec === binding.authority.taskSpec
    && candidate.lineage.taskSpecSha256 === binding.authority.taskSpecSha256
    && candidate.lineage.evidencePlan === binding.authority.evidencePlan
    && candidate.lineage.evidencePlanSha256 === binding.authority.evidencePlanSha256
    && candidate.lineage.initialEvidencePlan.taskSpecSha256 === binding.authority.taskSpecSha256
    && candidate.lineage.initialEvidencePlanSha256 === evidencePlanSha256(candidate.lineage.initialEvidencePlan)
    && (candidate.lineage.evidencePlanRevisionAuthorization === null
      ? candidate.lineage.evidencePlan.revision === 0
      : candidate.lineage.evidencePlan.revision === 1
        && candidate.lineage.evidencePlan.previousPlanSha256 === candidate.lineage.initialEvidencePlanSha256)
    && candidate.lineage.round0Bundle.round === 0
    && candidate.lineage.round0BundleSha256 === candidate.lineage.round0Bundle.bundleSha256
    && bundleBindings.get(candidate.lineage.round0Bundle) === binding.lineage.captureAuthority
    && (candidate.lineage.ignoredWriteEligibility === null
      || repairEligibilityBrand.has(candidate.lineage.ignoredWriteEligibility)
        && repairEligibilityBindings.get(candidate.lineage.ignoredWriteEligibility) === candidate.lineage.round0Bundle)
    && (candidate.repairEligibility === null
      ? candidate.repairUnavailableReason === "IGNORED_WRITE_SET_UNAVAILABLE" || candidate.repairUnavailableReason === "REPAIR_SPENT"
      : candidate.repairUnavailableReason === null && repairEligibilityBrand.has(candidate.repairEligibility)
        && repairEligibilityBindings.get(candidate.repairEligibility) === candidate.lineage.round0Bundle);
}

/** One-way admission into the Q9 authority kernel. The product candidate bytes
 * and counters do not change; only the live lineage loses access to legacy
 * caller-structured transition and repair paths. The mode is authenticated in
 * pending-candidate custody and cannot be cleared by resume. */
export function activateSerialCandidateQualityLoop(value: unknown): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(value)) return null;
  const lineage = candidateBindings.get(value)!.lineage;
  if (!lineage.qualityLoopAuthorityRequired && (lineage.transitionHistory.length !== 0
    || lineage.repairAuthority !== null || lineage.policyDecision !== null
    || lineage.assessment !== null || lineage.assessmentRestartCustody !== null
    || lineage.completionAuthority !== null || lineage.attempts.length !== 0)) return null;
  lineage.qualityLoopAuthorityRequired = true;
  return value;
}

export function serialCandidateQualityLoopAuthorityRequired(value: unknown): boolean {
  return isCurrentSerialCandidate(value)
    && candidateBindings.get(value)!.lineage.qualityLoopAuthorityRequired;
}

/** Internal persistence boundary: bytes restored through the public pending
 * API never regain caller-structured legacy authority, even when they use the
 * historical pre-Q9 wire shape. The pending token proves that Serial parsed
 * and joined this exact candidate/capsule; it does not claim that an unkeyed
 * self-hash can attest which historical writer produced those bytes. */
export function activateSerialCandidateAfterPendingRestore(
  value: unknown,
  pendingRestoreAuthority: SerialPendingRestoreAuthority,
  capsuleSha256: string,
): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(value)
    || !serialPendingRestoreAuthorityCovers(pendingRestoreAuthority, {
      capsuleSha256,
      projectRootSha256: value.projectRootSha256,
      runId: value.runId,
      candidateSha256: value.candidateSha256,
    })) return null;
  candidateBindings.get(value)!.lineage.qualityLoopAuthorityRequired = true;
  return value;
}

function canonicalOptionalCriticDeclineAuthorization(
  value: Omit<SerialOptionalCriticDeclineAuthorizationV1, "authorizationSha256">,
): string {
  return canonicalObject([
    ["version", quote(value.version)], ["runId", quote(value.runId)],
    ["generation", String(value.generation)], ["candidateSha256", quote(value.candidateSha256)],
    ["evidenceStateSha256", quote(value.evidenceStateSha256)], ["declined", "true"],
    ["actionNonce", quote(value.actionNonce)], ["decidedAt", quote(value.decidedAt)],
    ["ownerActionReceiptSha256", quote(value.ownerActionReceiptSha256)],
  ]);
}

/** Mint the one-use owner decision that replaces Q7's structural
 * `optional-critic-declined` transition after Q9 activation. Main supplies the
 * authenticated durable owner-action receipt hash; Core binds it to the exact
 * live candidate before any state transition can occur. */
export function authorizeSerialCandidateOptionalCriticDecline(
  candidate: unknown,
  raw: unknown,
): SerialOptionalCriticDeclineAuthorizationV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.criticMode !== "optional"
    || candidate.phase !== "awaiting-critic"
    || !candidateBindings.get(candidate)!.lineage.qualityLoopAuthorityRequired) return null;
  const record = inspectRecord(raw, ["declined", "actionNonce", "decidedAt", "ownerActionReceiptSha256"]);
  if (!record || record.declined !== true || typeof record.actionNonce !== "string"
    || !MACHINE_ID_RE.test(record.actionNonce) || typeof record.decidedAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(record.decidedAt)
    || !Number.isFinite(Date.parse(record.decidedAt)) || safeSha(record.ownerActionReceiptSha256) === null) return null;
  const withoutSha = deepFreeze({
    version: SERIAL_OPTIONAL_CRITIC_DECLINE_AUTHORIZATION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    candidateSha256: candidate.candidateSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    declined: true as const,
    actionNonce: record.actionNonce,
    decidedAt: record.decidedAt,
    ownerActionReceiptSha256: record.ownerActionReceiptSha256,
  }) as Omit<SerialOptionalCriticDeclineAuthorizationV1, "authorizationSha256">;
  const authorization = deepFreeze({
    ...withoutSha,
    authorizationSha256: sha256(canonicalOptionalCriticDeclineAuthorization(withoutSha)),
  }) as SerialOptionalCriticDeclineAuthorizationV1;
  optionalCriticDeclineAuthorizationBrand.add(authorization);
  optionalCriticDeclineAuthorizationBindings.set(authorization, candidate);
  return authorization;
}

export function settleSerialCandidateOptionalCriticDecline(
  candidate: unknown,
  authorization: unknown,
): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.criticMode !== "optional"
    || candidate.phase !== "awaiting-critic" || typeof authorization !== "object" || authorization === null
    || !optionalCriticDeclineAuthorizationBrand.has(authorization)
    || spentOptionalCriticDeclineAuthorizations.has(authorization)
    || optionalCriticDeclineAuthorizationBindings.get(authorization) !== candidate) return null;
  const typed = authorization as SerialOptionalCriticDeclineAuthorizationV1;
  if (typed.runId !== candidate.runId || typed.generation !== candidate.generation
    || typed.candidateSha256 !== candidate.candidateSha256
    || typed.evidenceStateSha256 !== candidate.evidenceStateSha256
    || sha256(canonicalOptionalCriticDeclineAuthorization(typed)) !== typed.authorizationSha256) return null;
  const binding = candidateBindings.get(candidate)!;
  const next = mintCandidate(binding.authority, binding.lineage, {
    ...candidate,
    generation: candidate.generation + 1,
    phase: "ready-to-seal",
    pendingOwnerReason: null,
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(candidate.evidenceStateSha256)],
      ["optionalCriticDeclineAuthorizationSha256", quote(typed.authorizationSha256)],
    ])),
  });
  spentOptionalCriticDeclineAuthorizations.add(authorization);
  optionalCriticDeclineAuthorizationBindings.delete(authorization);
  return next;
}

export function serialCandidateSha256(value: unknown): string | null {
  return typeof value === "object" && value !== null && candidateBrand.has(value)
    ? (value as SerialCandidateV1).candidateSha256
    : null;
}

/** Canonical state identity for Main disclosures and ledgers. This avoids
 * reserializing a branded object and makes phase/counter changes visible even
 * though the immutable product candidate hash remains stable. */
export function serialCandidateCurrentIdentity(value: unknown): Readonly<{
  candidateSha256: string;
  generation: number;
  round: CandidateRound;
  phase: SerialCandidatePhaseV1;
  repairCallsUsed: 0 | 1;
  criticCallsUsed: 0 | 1 | 2 | 3;
}> | null {
  if (!isCurrentSerialCandidate(value)) return null;
  return Object.freeze({
    candidateSha256: value.candidateSha256,
    generation: value.generation,
    round: value.round,
    phase: value.phase,
    repairCallsUsed: value.callsUsed.repair,
    criticCallsUsed: value.callsUsed.critic,
  });
}

/** Adopt quality.ts's one already-authorized mechanical harness revision
 * without changing TaskSpec, product bytes, call budgets, or repair policy. */
export function adoptSerialCandidateEvidencePlanRevision(
  candidate: unknown,
  authorizedRevision: unknown,
): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.round !== 0 || candidate.callsUsed.repair !== 0
    || candidate.callsUsed.critic !== 0 || (candidate.phase !== "awaiting-critic" && candidate.phase !== "ready-to-seal")
    || candidate.lineage.evidencePlan.revision !== 0
    || candidate.lineage.evidencePlanRevisionAuthorization !== null) return null;
  if (!isAuthorizedEvidencePlanRevision(authorizedRevision)) return null;
  const record = authorizedRevision;
  const planSha = evidencePlanSha256(record.plan);
  const authorization = record.authorization;
  if (planSha === null || authorization.runId !== candidate.runId
    || authorization.taskSpecSha256 !== candidate.taskSpecSha256
    || authorization.fromPlanSha256 !== candidate.evidencePlanSha256
    || authorization.toPlanSha256 !== planSha
    || record.plan.revision !== 1
    || record.plan.previousPlanSha256 !== candidate.evidencePlanSha256
    || record.plan.taskSpecSha256 !== candidate.taskSpecSha256) return null;
  const currentAuthority = candidateBindings.get(candidate)!.authority;
  const revisedAuthority = composeSerialCandidateTaskSpecAuthority(currentAuthority.taskSpec, record.plan);
  if (!revisedAuthority) return null;
  const revisionAuthorization = record.authorization;
  const lineage = deepFreeze({
    ...candidate.lineage,
    evidencePlan: revisedAuthority.evidencePlan,
    evidencePlanSha256: revisedAuthority.evidencePlanSha256,
    evidencePlanRevisionAuthorization: revisionAuthorization,
  }) as SerialCandidateImmutableLineageV1;
  const candidateSha256 = sha256(canonicalObject([
    ["version", quote(SERIAL_CANDIDATE_VERSION)], ["previousCandidateSha256", quote(candidate.candidateSha256)],
    ["taskSpecSha256", quote(candidate.taskSpecSha256)], ["initialEvidencePlanSha256", quote(candidate.evidencePlanSha256)],
    ["revisedEvidencePlanSha256", quote(planSha)], ["bundleSha256", quote(candidate.bundleSha256)],
    ["claimsSha256", quote(candidate.claimsSha256)],
  ]));
  const binding = candidateBindings.get(candidate)!;
  binding.lineage.qualityLoopAuthorityRequired = true;
  binding.lineage.repairAuthority = null;
  binding.lineage.repairAuthoritySha256 = null;
  binding.lineage.policyDecision = null;
  binding.lineage.assessment = null;
  binding.lineage.assessmentRestartCustody = null;
  binding.lineage.completionAuthority = null;
  return mintCandidate(revisedAuthority, binding.lineage, {
    ...candidate,
    generation: candidate.generation + 1,
    taskSpecSha256: revisedAuthority.taskSpecSha256,
    evidencePlanSha256: planSha,
    lineage,
    candidateSha256,
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(candidate.evidenceStateSha256)], ["candidateSha256", quote(candidateSha256)],
      ["evidencePlanSha256", quote(planSha)], ["revisionAuthorizationSha256", quote(sha256(JSON.stringify(revisionAuthorization)))],
    ])),
  });
}

export function serialCandidateEvidencePlanRevisionCustody(
  value: unknown,
): SerialCandidateEvidencePlanRevisionCustodyV1 | null {
  if (!isCurrentSerialCandidate(value) || value.lineage.evidencePlanRevisionAuthorization === null) return null;
  const authorization = value.lineage.evidencePlanRevisionAuthorization;
  const custodySha256 = sha256(canonicalObject([
    ["initialEvidencePlanSha256", quote(value.lineage.initialEvidencePlanSha256)],
    ["currentEvidencePlanSha256", quote(value.lineage.evidencePlanSha256)],
    ["authorizationSha256", quote(sha256(JSON.stringify(authorization)))],
  ]));
  return Object.freeze({
    initialEvidencePlan: value.lineage.initialEvidencePlan,
    initialEvidencePlanSha256: value.lineage.initialEvidencePlanSha256,
    currentEvidencePlan: value.lineage.evidencePlan,
    currentEvidencePlanSha256: value.lineage.evidencePlanSha256,
    authorization,
    custodySha256,
  });
}

export function serialCandidateRepairAvailability(
  value: unknown,
): "available" | "spent" | "unavailable" | null {
  if (typeof value !== "object" || value === null || !candidateBrand.has(value)) return null;
  const candidate = value as SerialCandidateV1;
  if (candidate.callsUsed.repair === 1 || candidate.repairUnavailableReason === "REPAIR_SPENT") return "spent";
  if (candidate.repairEligibility === null || revokedRepairCandidates.has(value)) return "unavailable";
  return repairEligibilityBrand.has(candidate.repairEligibility)
    && repairEligibilityBindings.get(candidate.repairEligibility) === candidate.bundle
    ? "available"
    : null;
}

/** Opaque creation identity: stable across legitimate generations, unique to
 * each independently composed candidate, and unavailable to structural clones. */
export function serialCandidateLineageIdentity(value: unknown): object | null {
  if (typeof value !== "object" || value === null || !candidateBrand.has(value)) return null;
  return candidateBindings.get(value)?.lineage.identity ?? null;
}

/** Core-internal suspension seam. It irrevocably invalidates this live lineage. */
export function parkCurrentSerialCandidate(value: unknown): boolean {
  if (!isCurrentSerialCandidate(value)) return false;
  const binding = candidateBindings.get(value)!;
  binding.lineage.parked = true;
  return true;
}

/** Core-internal replay input; never a brand mint and deliberately not root-exported. */
export function serialCandidatePendingTransitionHistory(
  value: unknown,
): readonly SerialCandidateTransitionDecisionV1[] | null {
  if (!isCurrentSerialCandidate(value)) return null;
  const history = candidateBindings.get(value)!.lineage.transitionHistory;
  return Object.freeze([...history]);
}

export function serialCandidateTaskSpecAuthority(value: unknown): SerialCandidateTaskSpecAuthorityV1 | null {
  if (isSerialCandidateTaskSpecAuthority(value)) return value;
  if (typeof value !== "object" || value === null || !candidateBrand.has(value)) return null;
  return candidateBindings.get(value)?.authority ?? null;
}

function transitionBinding(record: InspectedRecord, candidate: SerialCandidateV1): boolean {
  return record.version === SERIAL_CANDIDATE_TRANSITION_VERSION && record.runId === candidate.runId
    && Object.is(record.generation, candidate.generation) && Object.is(record.taskNumber, candidate.taskNumber)
    && record.projectRootSha256 === candidate.projectRootSha256 && Object.is(record.round, candidate.round)
    && record.taskSpecSha256 === candidate.taskSpecSha256 && record.evidencePlanSha256 === candidate.evidencePlanSha256
    && record.candidateSha256 === candidate.candidateSha256 && record.bundleSha256 === candidate.bundleSha256
    && record.evidenceStateSha256 === candidate.evidenceStateSha256;
}

function isTransitionDecision(value: unknown): value is SerialCandidateTransitionDecisionV1 {
  return value === "optional-critic-declined" || value === "critic-clear" || value === "critic-allegation"
    || value === "required-check-failure-confirmed" || value === "owner-confirmed" || value === "owner-dismissed";
}

export function composeSerialCandidateTransition(candidate: unknown, raw: unknown): SerialCandidateTransitionV1 | null {
  if (!isCurrentSerialCandidate(candidate)) return null;
  if (candidateBindings.get(candidate)!.lineage.qualityLoopAuthorityRequired) return null;
  const record = inspectRecord(raw, [
    "version", "runId", "generation", "taskNumber", "projectRootSha256", "round", "taskSpecSha256",
    "evidencePlanSha256", "candidateSha256", "bundleSha256", "evidenceStateSha256", "decision",
  ]);
  if (!record || !transitionBinding(record, candidate) || !isTransitionDecision(record.decision)) return null;
  const transition = Object.freeze({
    version: SERIAL_CANDIDATE_TRANSITION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    taskNumber: candidate.taskNumber,
    projectRootSha256: candidate.projectRootSha256,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    decision: record.decision,
  }) as SerialCandidateTransitionV1;
  transitionBrand.add(transition);
  transitionBindings.set(transition, candidate);
  return transition;
}

export function advanceSerialCandidate(candidate: unknown, raw: unknown): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(candidate)) return null;
  if (candidateBindings.get(candidate)!.lineage.qualityLoopAuthorityRequired) return null;
  if (typeof raw !== "object" || raw === null || !transitionBrand.has(raw) || spentTransitions.has(raw)
    || transitionBindings.get(raw) !== candidate) return null;
  const record = raw as SerialCandidateTransitionV1;
  if (!transitionBinding(record, candidate)) return null;
  let phase: SerialCandidatePhaseV1 | null = null;
  let pendingOwnerReason: SerialCandidateV1["pendingOwnerReason"] = null;
  let consumesCriticAttempt = false;
  if (record.decision === "optional-critic-declined" && candidate.phase === "awaiting-critic" && candidate.criticMode === "optional") {
    phase = "ready-to-seal";
  } else if (record.decision === "critic-clear" && candidate.phase === "awaiting-critic" && candidate.criticMode !== "off"
    && candidate.callsUsed.critic < 3) {
    phase = "ready-to-seal";
    consumesCriticAttempt = true;
  } else if (record.decision === "critic-allegation" && candidate.phase === "awaiting-critic" && candidate.criticMode !== "off"
    && candidate.callsUsed.critic < 3) {
    phase = "awaiting-owner-resolution";
    pendingOwnerReason = "critic-allegation";
    consumesCriticAttempt = true;
  } else if (record.decision === "required-check-failure-confirmed"
    && (candidate.phase === "awaiting-critic" || candidate.phase === "ready-to-seal")
    && candidate.round === 0 && candidate.callsUsed.repair === 0 && candidate.repairEligibility !== null
    && !revokedRepairCandidates.has(candidate)) {
    // This staged event is minted only after Main authenticates a deterministic
    // Cairn/owner cN failure. It consumes no critic call and works in every
    // critic mode; the repair instruction still performs a fresh workspace and
    // ignored-tree recheck before any future Q9 provider call can begin.
    phase = "awaiting-repair";
  } else if (record.decision === "owner-confirmed" && candidate.phase === "awaiting-owner-resolution"
    && candidate.pendingOwnerReason === "critic-allegation" && candidate.round === 0 && candidate.callsUsed.repair === 0
    && candidate.repairEligibility !== null && !revokedRepairCandidates.has(candidate)) {
    phase = "awaiting-repair";
  } else if (record.decision === "owner-dismissed" && candidate.phase === "awaiting-owner-resolution"
    && candidate.pendingOwnerReason === "critic-allegation") {
    phase = "ready-to-seal";
  }
  if (phase === null) return null;
  const binding = candidateBindings.get(candidate)!;
  const generation = candidate.generation + 1;
  const evidenceStateSha256 = sha256(canonicalObject([
    ["previous", quote(candidate.evidenceStateSha256)],
    ["decision", quote(record.decision)],
    ["generation", String(generation)],
  ]));
  const criticCalls = consumesCriticAttempt
    ? (candidate.callsUsed.critic + 1) as 1 | 2 | 3
    : candidate.callsUsed.critic;
  const next = mintCandidate(binding.authority, binding.lineage, {
    ...candidate,
    generation,
    evidenceStateSha256,
    phase,
    pendingOwnerReason,
    callsUsed: Object.freeze({ ...candidate.callsUsed, critic: criticCalls }),
  });
  binding.lineage.transitionHistory.push(record.decision);
  spentTransitions.add(raw);
  transitionBindings.delete(raw);
  return next;
}

function canonicalAttemptReservationWithoutSha(
  value: Omit<SerialCandidateAttemptReservationV1, "reservationSha256">,
): string {
  return canonicalObject([
    ["version", quote(value.version)], ["kind", quote(value.kind)], ["runId", quote(value.runId)],
    ["sourceGeneration", String(value.sourceGeneration)], ["reservedGeneration", String(value.reservedGeneration)],
    ["taskNumber", String(value.taskNumber)], ["projectRootSha256", quote(value.projectRootSha256)],
    ["round", String(value.round)], ["taskSpecSha256", quote(value.taskSpecSha256)],
    ["evidencePlanSha256", quote(value.evidencePlanSha256)], ["candidateSha256", quote(value.candidateSha256)],
    ["bundleSha256", quote(value.bundleSha256)], ["attempt", String(value.attempt)],
    ["authorizationSha256", quote(value.authorizationSha256)],
    ["requestSha256", value.requestSha256 === null ? "null" : quote(value.requestSha256)],
    ["routeRequestFingerprintSha256", value.routeRequestFingerprintSha256 === null
      ? "null" : quote(value.routeRequestFingerprintSha256)],
    ["retryOfReservationSha256", value.retryOfReservationSha256 === null
      ? "null" : quote(value.retryOfReservationSha256)],
    ["previewSha256", value.previewSha256 === null ? "null" : quote(value.previewSha256)],
    ["instructionSha256", value.instructionSha256 === null ? "null" : quote(value.instructionSha256)],
  ]);
}

function mintAttemptReservation(
  candidate: SerialCandidateV1,
  values: Readonly<{
    kind: "repair" | "critic";
    attempt: 1 | 2 | 3;
    authorizationSha256: string;
    requestSha256: string | null;
    routeRequestFingerprintSha256: string | null;
    retryOfReservationSha256: string | null;
    previewSha256: string | null;
    instructionSha256: string | null;
  }>,
): SerialCandidateAttemptReservationV1 {
  const withoutSha = deepFreeze({
    version: SERIAL_CANDIDATE_ATTEMPT_RESERVATION_VERSION,
    kind: values.kind,
    runId: candidate.runId,
    sourceGeneration: candidate.generation,
    reservedGeneration: candidate.generation + 1,
    taskNumber: candidate.taskNumber,
    projectRootSha256: candidate.projectRootSha256,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    attempt: values.attempt,
    authorizationSha256: values.authorizationSha256,
    requestSha256: values.requestSha256,
    routeRequestFingerprintSha256: values.routeRequestFingerprintSha256,
    retryOfReservationSha256: values.retryOfReservationSha256,
    previewSha256: values.previewSha256,
    instructionSha256: values.instructionSha256,
  }) as Omit<SerialCandidateAttemptReservationV1, "reservationSha256">;
  return deepFreeze({
    ...withoutSha,
    reservationSha256: sha256(canonicalAttemptReservationWithoutSha(withoutSha)),
  }) as SerialCandidateAttemptReservationV1;
}

export function serialCandidateAttemptReservationSha256(value: unknown): string | null {
  return typeof value === "object" && value !== null && attemptReservationBrand.has(value)
    ? (value as SerialCandidateAttemptReservationV1).reservationSha256
    : null;
}

/** Internal cross-module proof for the repair process boundary. Approval and
 * request composition may happen before the counter spend, but no runner may
 * consume them until this exact candidate/reservation pair is current. */
export function serialCandidateRepairReservationCovers(
  candidate: unknown,
  reservation: unknown,
  authorization: unknown,
  preview: unknown,
): boolean {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-repair-result"
    || typeof reservation !== "object" || reservation === null || !attemptReservationBrand.has(reservation)
    || typeof authorization !== "object" || authorization === null || !repairAuthorizationBrand.has(authorization)
    || typeof preview !== "object" || preview === null || !repairPreviewBrand.has(preview)) return false;
  const typedReservation = reservation as SerialCandidateAttemptReservationV1;
  const typedAuthorization = authorization as SerialRepairAuthorizationV1;
  const typedPreview = preview as SerialRepairPreviewV1;
  const reservationBinding = attemptReservationBindings.get(reservation);
  const candidateBinding = candidateBindings.get(candidate);
  const authorizationBinding = repairAuthorizationBindings.get(authorization);
  const attempt = candidateBinding?.lineage.attempts.find((item) => item.reservation === reservation);
  return reservationBinding?.reservedCandidate === candidate
    && reservationBinding.lineage === candidateBinding?.lineage
    && attempt?.status === "reserved"
    && !spentAttemptReservations.has(reservation)
    && authorizationBinding?.preview === preview
    && typedReservation.kind === "repair"
    && typedReservation.runId === candidate.runId
    && typedReservation.reservedGeneration === candidate.generation
    && typedReservation.candidateSha256 === candidate.candidateSha256
    && typedReservation.authorizationSha256 === typedAuthorization.repairAuthorizationSha256
    && typedReservation.previewSha256 === typedPreview.repairPreviewSha256
    && typedReservation.instructionSha256 === typedPreview.instruction.repairInstructionSha256;
}

export function serialRepairInstructionSha256(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  if (repairInstructionBrand.has(value)) return (value as SerialRepairInstructionV1).repairInstructionSha256;
  return null;
}

/** Admit only the prose-free authority derived by critic.ts. This is the Q9
 * replacement for a caller manufacturing raw transition fields and blocker
 * rows. */
export function admitSerialCandidateRepair(
  candidate: unknown,
  repairAuthority: unknown,
): SerialCandidateRepairAdmissionV1 | null {
  if (!isCurrentSerialCandidate(candidate) || !isCriticRepairAuthority(repairAuthority)
    || candidate.round !== 0 || candidate.callsUsed.repair !== 0 || candidate.repairEligibility === null
    || revokedRepairCandidates.has(candidate)
    || (candidate.phase !== "awaiting-critic" && candidate.phase !== "ready-to-seal"
    )) return null;
  const authoritySha = criticRepairAuthoritySha256(repairAuthority);
  if (authoritySha === null || repairAuthority.runId !== candidate.runId
    || repairAuthority.projectHash !== candidate.projectRootSha256
    || repairAuthority.taskSpecSha256 !== candidate.taskSpecSha256
    || repairAuthority.evidencePlanSha256 !== candidate.evidencePlanSha256
    || repairAuthority.candidateSha256 !== candidate.candidateSha256) return null;
  if (activateSerialCandidateQualityLoop(candidate) === null) return null;
  const binding = candidateBindings.get(candidate)!;
  const generation = candidate.generation + 1;
  const next = mintCandidate(binding.authority, binding.lineage, {
    ...candidate,
    generation,
    phase: "awaiting-repair",
    pendingOwnerReason: null,
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(candidate.evidenceStateSha256)],
      ["repairAuthoritySha256", quote(authoritySha)],
      ["generation", String(generation)],
    ])),
  });
  binding.lineage.repairAuthority = repairAuthority;
  binding.lineage.repairAuthoritySha256 = authoritySha;
  return Object.freeze({ candidate: next, repairAuthority });
}

function canonicalRepairPreviewWithoutSha(value: Omit<SerialRepairPreviewV1, "repairPreviewSha256">): string {
  return canonicalObject([
    ["version", quote(value.version)], ["runId", quote(value.runId)], ["generation", String(value.generation)],
    ["taskNumber", String(value.taskNumber)], ["projectRootSha256", quote(value.projectRootSha256)],
    ["round", "0"], ["taskSpecSha256", quote(value.taskSpecSha256)],
    ["evidencePlanSha256", quote(value.evidencePlanSha256)], ["candidateSha256", quote(value.candidateSha256)],
    ["bundleSha256", quote(value.bundleSha256)], ["evidenceStateSha256", quote(value.evidenceStateSha256)],
    ["repairAuthoritySha256", quote(value.repairAuthoritySha256)],
    ["instruction", canonicalRepairInstruction(value.instruction)],
  ]);
}

export function serialRepairPreviewSha256(value: unknown): string | null {
  return typeof value === "object" && value !== null && repairPreviewBrand.has(value)
    ? (value as SerialRepairPreviewV1).repairPreviewSha256
    : null;
}

/** Safe card projection. App need not parse Builder prose or reopen critic
 * findings to render the exact frozen repair boundary. */
export function serialRepairPreviewAuthorityRows(
  value: unknown,
): readonly SerialRepairPreviewAuthorityRowV1[] | null {
  if (typeof value !== "object" || value === null || !repairPreviewBrand.has(value)) return null;
  const previewBinding = repairPreviewBindings.get(value);
  const candidate = previewBinding?.candidate;
  if (!candidate) return null;
  const binding = candidateBindings.get(candidate);
  const repairAuthority = binding?.lineage.repairAuthority;
  if (!binding || !repairAuthority || candidateRepairAuthoritySha256(repairAuthority)
    !== (value as SerialRepairPreviewV1).repairAuthoritySha256) return null;
  const rows: SerialRepairPreviewAuthorityRowV1[] = [];
  for (const authorityRow of repairAuthority.rows) {
    const criterion = binding.authority.taskSpec.quality.acceptanceChecks
      .find((item) => item.id === authorityRow.criterionId);
    const procedure = binding.authority.evidencePlan.procedures
      .find((item) => item.criterionId === authorityRow.criterionId);
    if (!criterion || !procedure) return null;
    rows.push(deepFreeze({
      criterionId: criterion.id,
      promise: criterion.promise,
      failureConditionId: criterion.failureCondition.id,
      failureCondition: criterion.failureCondition.statement,
      source: authorityRow.source,
      sourceSha256: authorityRow.sourceSha256,
      artifacts: authorityRow.artifactIds.map((id) => ({ id, kind: procedure.kind })),
    }) as SerialRepairPreviewAuthorityRowV1);
  }
  return Object.freeze(rows);
}

/** Non-spending and deterministic. Repeated calls while the same candidate is
 * current return equivalent bytes and do not consume repair authority. */
export function composeSerialRepairPreview(root: string, candidate: unknown): SerialRepairPreviewV1 | null {
  if (!serialCandidateGitEnvironmentSafe() || !serialCandidateRepairWorkspaceStillExact(root, candidate)
    || !isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-repair" || candidate.round !== 0
    || candidate.callsUsed.repair !== 0 || candidate.repairEligibility === null) return null;
  const binding = candidateBindings.get(candidate)!;
  const authority = binding.lineage.repairAuthority;
  const authoritySha = binding.lineage.repairAuthoritySha256;
  if (authority === null || authoritySha === null || authority.candidateSha256 !== candidate.candidateSha256) return null;
  const blockers = Object.freeze(authority.rows.map((row) => Object.freeze({
    criterionId: row.criterionId,
    failureConditionId: row.failureConditionId,
    artifactIds: Object.freeze([...row.artifactIds]),
  })));
  const instruction = mintSerialRepairInstruction(candidate, blockers);
  const withoutSha = deepFreeze({
    version: SERIAL_REPAIR_PREVIEW_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    taskNumber: candidate.taskNumber,
    projectRootSha256: candidate.projectRootSha256,
    round: 0 as const,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    repairAuthoritySha256: authoritySha,
    instruction,
  }) as Omit<SerialRepairPreviewV1, "repairPreviewSha256">;
  const preview = deepFreeze({
    ...withoutSha,
    repairPreviewSha256: sha256(canonicalRepairPreviewWithoutSha(withoutSha)),
  }) as SerialRepairPreviewV1;
  repairPreviewBrand.add(preview);
  const rootReal = canonicalProjectRoot(root);
  if (rootReal === null) return null;
  repairPreviewBindings.set(preview, Object.freeze({ candidate, rootReal }));
  return preview;
}

export function serialRepairPreviewCoversWorkspace(root: string, value: unknown): boolean {
  if (typeof value !== "object" || value === null || !repairPreviewBrand.has(value)) return false;
  const rootReal = canonicalProjectRoot(root);
  return rootReal !== null && repairPreviewBindings.get(value)?.rootReal === rootReal;
}

/** Core-internal binding used by the repair-only Codex request composer. */
export function serialRepairPreviewTaskSpecAuthority(
  value: unknown,
): SerialCandidateTaskSpecAuthorityV1 | null {
  if (typeof value !== "object" || value === null || !repairPreviewBrand.has(value)) return null;
  const candidate = repairPreviewBindings.get(value)?.candidate;
  return candidate ? candidateBindings.get(candidate)?.authority ?? null : null;
}

function canonicalRepairAuthorizationWithoutSha(
  value: Omit<SerialRepairAuthorizationV1, "repairAuthorizationSha256">,
): string {
  return canonicalObject([
    ["version", quote(value.version)], ["runId", quote(value.runId)], ["generation", String(value.generation)],
    ["candidateSha256", quote(value.candidateSha256)], ["repairAuthoritySha256", quote(value.repairAuthoritySha256)],
    ["repairPreviewSha256", quote(value.repairPreviewSha256)],
    ["repairInstructionSha256", quote(value.repairInstructionSha256)], ["approved", "true"],
    ["actionNonce", quote(value.actionNonce)], ["approvedAt", quote(value.approvedAt)],
  ]);
}

export function serialRepairAuthorizationSha256(value: unknown): string | null {
  return typeof value === "object" && value !== null && repairAuthorizationBrand.has(value)
    && !spentRepairAuthorizations.has(value)
    ? (value as SerialRepairAuthorizationV1).repairAuthorizationSha256
    : null;
}

export function authorizeSerialRepairPreview(
  candidate: unknown,
  preview: unknown,
  rawApproval: unknown,
): SerialRepairAuthorizationV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-repair"
    || typeof preview !== "object" || preview === null || !repairPreviewBrand.has(preview)
    || repairPreviewBindings.get(preview)?.candidate !== candidate) return null;
  const record = inspectRecord(rawApproval, ["approved", "actionNonce", "approvedAt"]);
  if (!record || record.approved !== true || typeof record.actionNonce !== "string"
    || !MACHINE_ID_RE.test(record.actionNonce) || typeof record.approvedAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(record.approvedAt)
    || !Number.isFinite(Date.parse(record.approvedAt))) return null;
  const typed = preview as SerialRepairPreviewV1;
  const withoutSha = deepFreeze({
    version: SERIAL_REPAIR_AUTHORIZATION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    candidateSha256: candidate.candidateSha256,
    repairAuthoritySha256: typed.repairAuthoritySha256,
    repairPreviewSha256: typed.repairPreviewSha256,
    repairInstructionSha256: typed.instruction.repairInstructionSha256,
    approved: true as const,
    actionNonce: record.actionNonce,
    approvedAt: record.approvedAt,
  }) as Omit<SerialRepairAuthorizationV1, "repairAuthorizationSha256">;
  const authorization = deepFreeze({
    ...withoutSha,
    repairAuthorizationSha256: sha256(canonicalRepairAuthorizationWithoutSha(withoutSha)),
  }) as SerialRepairAuthorizationV1;
  repairAuthorizationBrand.add(authorization);
  repairAuthorizationBindings.set(authorization, Object.freeze({ candidate, preview: typed }));
  return authorization;
}

export function reserveSerialCandidateRepair(
  root: string,
  candidate: unknown,
  preview: unknown,
  authorization: unknown,
): SerialCandidateRepairReservationV1 | null {
  if (!serialCandidateGitEnvironmentSafe() || !serialCandidateRepairWorkspaceStillExact(root, candidate)
    || !isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-repair" || candidate.round !== 0
    || candidate.callsUsed.repair !== 0 || candidate.repairEligibility === null
    || typeof preview !== "object" || preview === null || !repairPreviewBrand.has(preview)
    || repairPreviewBindings.get(preview)?.candidate !== candidate
    || typeof authorization !== "object" || authorization === null || !repairAuthorizationBrand.has(authorization)
    || spentRepairAuthorizations.has(authorization)) return null;
  const authBinding = repairAuthorizationBindings.get(authorization);
  if (!authBinding || authBinding.candidate !== candidate || authBinding.preview !== preview) return null;
  const typedPreview = preview as SerialRepairPreviewV1;
  const typedAuthorization = authorization as SerialRepairAuthorizationV1;
  const reservation = mintAttemptReservation(candidate, {
    kind: "repair",
    attempt: 1,
    authorizationSha256: typedAuthorization.repairAuthorizationSha256,
    requestSha256: null,
    routeRequestFingerprintSha256: null,
    retryOfReservationSha256: null,
    previewSha256: typedPreview.repairPreviewSha256,
    instructionSha256: typedPreview.instruction.repairInstructionSha256,
  });
  const binding = candidateBindings.get(candidate)!;
  const next = mintCandidate(binding.authority, binding.lineage, {
    ...candidate,
    generation: candidate.generation + 1,
    phase: "awaiting-repair-result",
    pendingOwnerReason: null,
    callsUsed: Object.freeze({ ...candidate.callsUsed, repair: 1 as const }),
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(candidate.evidenceStateSha256)],
      ["reservationSha256", quote(reservation.reservationSha256)],
    ])),
  });
  attemptReservationBrand.add(reservation);
  attemptReservationBindings.set(reservation, Object.freeze({ lineage: binding.lineage, reservedCandidate: next }));
  binding.lineage.attempts.push({
    reservation,
    status: "reserved",
    resultAuthoritySha256: null,
    unavailableReason: null,
  });
  spentRepairAuthorizations.add(authorization);
  const instruction = typedPreview.instruction;
  repairInstructionBrand.add(instruction);
  repairInstructionBindings.set(instruction, next);
  repairBlockersByInstruction.set(instruction, Object.freeze(instruction.criterionIds.map((criterionId) => {
    const row = binding.lineage.repairAuthority!.rows.find((item) => item.criterionId === criterionId)!;
    return Object.freeze({ criterionId, failureConditionId: row.failureConditionId, artifactIds: row.artifactIds });
  })));
  return Object.freeze({ candidate: next, preview: typedPreview, authorization: typedAuthorization, instruction, reservation });
}

export function reserveSerialCandidateCritic(
  candidate: unknown,
  callAuthorization: unknown,
  retryOfReservation?: unknown,
): SerialCandidateCriticReservationV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-critic" || candidate.criticMode === "off"
    || candidate.callsUsed.critic >= 3 || typeof callAuthorization !== "object" || callAuthorization === null) return null;
  const authorizationSha256 = criticCallAuthorizationSha256(callAuthorization);
  if (authorizationSha256 === null) return null;
  const authorization = callAuthorization as CriticCallAuthorizationV1;
  const binding = candidateBindings.get(candidate)!;
  const retryUsedCount = binding.lineage.attempts.filter((item) => item.reservation.kind === "critic"
    && item.reservation.retryOfReservationSha256 !== null).length;
  const latestCurrentRoundCritic = [...binding.lineage.attempts].reverse().find((item) => item.reservation.kind === "critic"
    && item.reservation.round === candidate.round && item.reservation.candidateSha256 === candidate.candidateSha256) ?? null;
  if (retryUsedCount > 1 || authorization.runId !== candidate.runId || authorization.candidateRound !== candidate.round
    || authorization.callAttempt !== candidate.callsUsed.critic + 1
    || authorization.taskSpecSha256 !== candidate.taskSpecSha256
    || authorization.evidencePlanSha256 !== candidate.evidencePlanSha256
    || authorization.candidateSha256 !== candidate.candidateSha256) return null;
  const attempt = authorization.callAttempt;
  const priorUnavailable = latestCurrentRoundCritic?.status === "unavailable" ? latestCurrentRoundCritic : null;
  if ((attempt === 1 && retryOfReservation !== undefined && retryOfReservation !== null)
    || (priorUnavailable === null && retryOfReservation !== undefined && retryOfReservation !== null)
    || (priorUnavailable !== null && (retryUsedCount >= 1
      || retryOfReservation !== priorUnavailable.reservation
      || !spentAttemptReservations.has(priorUnavailable.reservation)))) return null;
  if (activateSerialCandidateQualityLoop(candidate) === null) return null;
  const reservation = mintAttemptReservation(candidate, {
    kind: "critic",
    attempt,
    authorizationSha256,
    requestSha256: authorization.requestSha256,
    routeRequestFingerprintSha256: authorization.routeRequestFingerprintSha256,
    retryOfReservationSha256: priorUnavailable && retryOfReservation === priorUnavailable.reservation
      ? priorUnavailable.reservation.reservationSha256 : null,
    previewSha256: null,
    instructionSha256: null,
  });
  const next = mintCandidate(binding.authority, binding.lineage, {
    ...candidate,
    generation: candidate.generation + 1,
    phase: "awaiting-critic-result",
    pendingOwnerReason: null,
    callsUsed: Object.freeze({ ...candidate.callsUsed, critic: attempt }),
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(candidate.evidenceStateSha256)],
      ["reservationSha256", quote(reservation.reservationSha256)],
    ])),
  });
  attemptReservationBrand.add(reservation);
  attemptReservationBindings.set(reservation, Object.freeze({ lineage: binding.lineage, reservedCandidate: next }));
  binding.lineage.attempts.push({ reservation, status: "reserved", resultAuthoritySha256: null, unavailableReason: null });
  return Object.freeze({ candidate: next, reservation });
}

/** Spend a guarded synthetic-task critic authorization only after the exact
 * current candidate has durably reserved that same request/attempt. Tracked
 * and calibration calls keep their established transport seam; q9-task calls
 * cannot use it to send before the candidate counter is spent. */
export function consumeSyntheticTaskCriticCallAuthorization(
  callAuthorization: unknown,
  request: unknown,
  candidate: unknown,
  reservation: unknown,
): boolean {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-critic-result"
    || typeof callAuthorization !== "object" || callAuthorization === null
    || typeof request !== "object" || request === null
    || typeof reservation !== "object" || reservation === null
    || !attemptReservationBrand.has(reservation) || spentAttemptReservations.has(reservation)
    || !criticCallAuthorizationCoversRequest(callAuthorization, request)) return false;
  const authorizationSha256 = criticCallAuthorizationSha256(callAuthorization);
  const requestSha256 = criticRequestSha256(request);
  const typedAuthorization = callAuthorization as CriticCallAuthorizationV1;
  const typedReservation = reservation as SerialCandidateAttemptReservationV1;
  const candidateBinding = candidateBindings.get(candidate)!;
  const reservationBinding = attemptReservationBindings.get(reservation);
  const attempt = candidateBinding.lineage.attempts.find((item) => item.reservation === reservation);
  if (authorizationSha256 === null || requestSha256 === null || !reservationBinding
    || reservationBinding.lineage !== candidateBinding.lineage
    || reservationBinding.reservedCandidate !== candidate || attempt?.status !== "reserved"
    || typedReservation.kind !== "critic" || typedReservation.runId !== candidate.runId
    || typedReservation.reservedGeneration !== candidate.generation
    || typedReservation.round !== candidate.round || typedReservation.candidateSha256 !== candidate.candidateSha256
    || typedReservation.attempt !== typedAuthorization.callAttempt
    || typedReservation.authorizationSha256 !== authorizationSha256
    || typedReservation.requestSha256 !== requestSha256
    || typedReservation.routeRequestFingerprintSha256 !== typedAuthorization.routeRequestFingerprintSha256) return false;
  return consumeSyntheticTaskCriticAuthorizationAfterReservation(callAuthorization, request);
}

export function settleSerialCandidateCritic(
  candidate: unknown,
  reservation: unknown,
  policyDecision: unknown,
  unavailableReasonOrRepairAuthority?: "transport-unavailable" | "malformed-output" | "process-crash" | CriticRepairAuthorityV1,
): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-critic-result"
    || typeof reservation !== "object" || reservation === null || !attemptReservationBrand.has(reservation)
    || spentAttemptReservations.has(reservation)) return null;
  const reservationBinding = attemptReservationBindings.get(reservation);
  const candidateBinding = candidateBindings.get(candidate)!;
  if (!reservationBinding || reservationBinding.lineage !== candidateBinding.lineage
    || reservationBinding.reservedCandidate !== candidate || (reservation as SerialCandidateAttemptReservationV1).kind !== "critic") return null;
  const attempt = candidateBinding.lineage.attempts.find((item) => item.reservation === reservation);
  if (!attempt || attempt.status !== "reserved") return null;
  let phase: SerialCandidatePhaseV1;
  let pendingOwnerReason: SerialCandidateV1["pendingOwnerReason"] = null;
  let resultSha: string | null = null;
  let settledStatus: CandidateLineage["attempts"][number]["status"];
  let settledUnavailableReason: CandidateLineage["attempts"][number]["unavailableReason"] = null;
  let settledPolicyDecision: CriticPolicyDecisionV1 | null = null;
  let settledAssessment: CriticAssessmentV1 | null = null;
  let settledAssessmentRestartCustody: CriticAssessmentRestartCustodyV1 | null = null;
  let settledRepairAuthority: CriticRepairAuthorityV1 | null = null;
  let settledRepairAuthoritySha256: string | null = null;
  if (policyDecision === null) {
    if (unavailableReasonOrRepairAuthority !== "transport-unavailable"
      && unavailableReasonOrRepairAuthority !== "malformed-output"
      && unavailableReasonOrRepairAuthority !== "process-crash") return null;
    phase = "awaiting-critic";
    settledStatus = "unavailable";
    settledUnavailableReason = unavailableReasonOrRepairAuthority;
  } else {
    if (!isCriticPolicyDecision(policyDecision)) return null;
    const decision = policyDecision as CriticPolicyDecisionV1;
    resultSha = criticPolicyDecisionSha256(decision);
    if (resultSha === null || decision.runId !== candidate.runId
      || decision.projectHash !== candidate.projectRootSha256
      || decision.taskSpecSha256 !== candidate.taskSpecSha256
      || decision.evidencePlanSha256 !== candidate.evidencePlanSha256
      || decision.candidateSha256 !== candidate.candidateSha256
      || decision.assessmentSha256 === null
      || decision.candidateRound !== candidate.round
      || decision.callAttempt !== (reservation as SerialCandidateAttemptReservationV1).attempt
      || decision.requestSha256 !== (reservation as SerialCandidateAttemptReservationV1).requestSha256
      || decision.routeRequestFingerprintSha256
        !== (reservation as SerialCandidateAttemptReservationV1).routeRequestFingerprintSha256) return null;
    settledStatus = "available";
    settledPolicyDecision = decision;
    settledAssessmentRestartCustody = criticPolicyDecisionAssessmentRestartCustody(decision);
    if (!settledAssessmentRestartCustody
      || settledAssessmentRestartCustody.assessmentSha256 !== decision.assessmentSha256) return null;
    settledAssessment = settledAssessmentRestartCustody.assessment;
    if (decision.state === "clear") phase = "ready-to-seal";
    else if (decision.state === "waiting-owner") {
      phase = "awaiting-owner-resolution";
      pendingOwnerReason = "critic-allegation";
    } else if (decision.state === "blocked") {
      if (isCriticRepairAuthority(unavailableReasonOrRepairAuthority)) {
        const repair = unavailableReasonOrRepairAuthority;
        const repairSha = criticRepairAuthoritySha256(repair);
        if (repairSha === null || repair.runId !== candidate.runId
          || repair.projectHash !== candidate.projectRootSha256
          || repair.taskSpecSha256 !== candidate.taskSpecSha256
          || repair.evidencePlanSha256 !== candidate.evidencePlanSha256
          || repair.candidateSha256 !== candidate.candidateSha256
          || repair.policyContextSha256 !== decision.policyContextSha256) return null;
        settledRepairAuthority = repair;
        settledRepairAuthoritySha256 = repairSha;
        phase = "awaiting-repair";
      } else if (candidate.round === 0 && candidate.callsUsed.repair === 0
        && candidate.repairEligibility !== null
        && (criticPolicyDecisionCairnFailureCriterionIds(decision)?.length ?? 0) > 0) {
        phase = "awaiting-owner-resolution";
        pendingOwnerReason = "cairn-failure-confirmation";
      } else if (candidate.round === 0 && candidate.callsUsed.repair === 0) {
        return null;
      } else {
        phase = "awaiting-repair";
      }
    } else {
      phase = "awaiting-owner-resolution";
    }
  }
  const next = mintCandidate(candidateBinding.authority, candidateBinding.lineage, {
    ...candidate,
    generation: candidate.generation + 1,
    phase,
    pendingOwnerReason,
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(candidate.evidenceStateSha256)],
      ["settledReservationSha256", quote((reservation as SerialCandidateAttemptReservationV1).reservationSha256)],
      ["resultAuthoritySha256", resultSha === null ? "null" : quote(resultSha)],
      ["unavailableReason", typeof unavailableReasonOrRepairAuthority === "string"
        ? quote(unavailableReasonOrRepairAuthority) : "null"],
    ])),
  });
  attempt.status = settledStatus;
  attempt.resultAuthoritySha256 = resultSha;
  attempt.unavailableReason = settledUnavailableReason;
  candidateBinding.lineage.policyDecision = settledPolicyDecision;
  candidateBinding.lineage.assessment = settledAssessment;
  candidateBinding.lineage.assessmentRestartCustody = settledAssessmentRestartCustody;
  if (settledRepairAuthority !== null) {
    candidateBinding.lineage.repairAuthority = settledRepairAuthority;
    candidateBinding.lineage.repairAuthoritySha256 = settledRepairAuthoritySha256;
  }
  spentAttemptReservations.add(reservation);
  return next;
}

/** Apply a freshly derived, branded policy after the owner resolved the exact
 * allegation surface. A cant-tell decision derives `waiting-owner` and stays
 * waiting; it is never equivalent to dismissal. */
export function settleSerialCandidateOwnerResolution(
  candidate: unknown,
  policyDecision: unknown,
  repairAuthority?: unknown,
): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "awaiting-owner-resolution"
    || !isCriticPolicyDecision(policyDecision)) return null;
  const decision = policyDecision as CriticPolicyDecisionV1;
  const decisionSha = criticPolicyDecisionSha256(decision);
  const binding = candidateBindings.get(candidate)!;
  const waitingDecision = binding.lineage.policyDecision;
  const assessmentRestartCustody = criticPolicyDecisionAssessmentRestartCustody(decision);
  if (decisionSha === null || decision.runId !== candidate.runId
    || decision.projectHash !== candidate.projectRootSha256
    || decision.taskSpecSha256 !== candidate.taskSpecSha256
    || decision.evidencePlanSha256 !== candidate.evidencePlanSha256
    || decision.candidateSha256 !== candidate.candidateSha256
    || waitingDecision === null
    || (waitingDecision.state !== "waiting-owner"
      && !(waitingDecision.state === "blocked"
        && candidate.pendingOwnerReason === "cairn-failure-confirmation"))
    || waitingDecision.assessmentSha256 === null
    || decision.assessmentSha256 !== waitingDecision.assessmentSha256
    || decision.candidateRound !== waitingDecision.candidateRound
    || decision.callAttempt !== waitingDecision.callAttempt
    || decision.requestSha256 !== waitingDecision.requestSha256
    || decision.routeRequestFingerprintSha256 !== waitingDecision.routeRequestFingerprintSha256
    || !assessmentRestartCustody
    || assessmentRestartCustody.assessmentSha256 !== decision.assessmentSha256) return null;
  let phase: SerialCandidatePhaseV1;
  let pendingOwnerReason: SerialCandidateV1["pendingOwnerReason"] = null;
  if (decision.state === "clear") {
    phase = "ready-to-seal";
  } else if (decision.state === "waiting-owner") {
    phase = "awaiting-owner-resolution";
    pendingOwnerReason = "critic-allegation";
  } else if (decision.state === "blocked") {
    if (!isCriticRepairAuthority(repairAuthority)) {
      // The mixed case first waits for every critic allegation. A dismissal
      // may expose an already-authenticated Cairn verifier failure; persist
      // that distinct confirmation wait before Main can mint repair authority.
      // Once already in that wait, absence or a structural clone of repair
      // authority cannot advance or refresh the candidate.
      if (candidate.pendingOwnerReason !== "critic-allegation"
        || candidate.round !== 0 || candidate.callsUsed.repair !== 0 || candidate.repairEligibility === null
        || (criticPolicyDecisionCairnFailureCriterionIds(decision)?.length ?? 0) === 0) return null;
      binding.lineage.policyDecision = decision;
      binding.lineage.assessment = assessmentRestartCustody.assessment;
      binding.lineage.assessmentRestartCustody = assessmentRestartCustody;
      return mintCandidate(binding.authority, binding.lineage, {
        ...candidate,
        generation: candidate.generation + 1,
        phase: "awaiting-owner-resolution",
        pendingOwnerReason: "cairn-failure-confirmation",
        evidenceStateSha256: sha256(canonicalObject([
          ["previous", quote(candidate.evidenceStateSha256)],
          ["ownerPolicyDecisionSha256", quote(decisionSha)],
          ["state", quote(decision.state)],
          ["pendingOwnerReason", quote("cairn-failure-confirmation")],
        ])),
      });
    }
    const repair = repairAuthority as CriticRepairAuthorityV1;
    if (candidate.round !== 0 || candidate.callsUsed.repair !== 0 || candidate.repairEligibility === null
      || criticRepairAuthoritySha256(repair) === null || repair.runId !== candidate.runId
      || repair.projectHash !== candidate.projectRootSha256 || repair.taskSpecSha256 !== candidate.taskSpecSha256
      || repair.evidencePlanSha256 !== candidate.evidencePlanSha256
      || repair.candidateSha256 !== candidate.candidateSha256
      || repair.policyContextSha256 !== decision.policyContextSha256) return null;
    binding.lineage.repairAuthority = repair;
    binding.lineage.repairAuthoritySha256 = criticRepairAuthoritySha256(repair);
    phase = "awaiting-repair";
  } else {
    // Native stop authority remains explicit and can only proceed through the
    // normal prepared STOP transaction.
    phase = "awaiting-owner-resolution";
  }
  binding.lineage.policyDecision = decision;
  binding.lineage.assessment = assessmentRestartCustody.assessment;
  binding.lineage.assessmentRestartCustody = assessmentRestartCustody;
  return mintCandidate(binding.authority, binding.lineage, {
    ...candidate,
    generation: candidate.generation + 1,
    phase,
    pendingOwnerReason,
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(candidate.evidenceStateSha256)],
      ["ownerPolicyDecisionSha256", quote(decisionSha)],
      ["state", quote(decision.state)],
    ])),
  });
}

export function serialCandidateAttemptCustody(value: unknown): readonly SerialCandidateAttemptCustodyV1[] | null {
  if (!isCurrentSerialCandidate(value)) return null;
  return Object.freeze(candidateBindings.get(value)!.lineage.attempts.map((item) => Object.freeze({
    reservation: item.reservation,
    status: item.status,
    resultAuthoritySha256: item.resultAuthoritySha256,
    unavailableReason: item.unavailableReason,
  })));
}

/** Core-internal persistence projection. Serial wraps these bytes in the exact
 * pending capsule; package consumers do not receive this accessor. */
export function serialCandidateQ9PendingCustody(value: unknown): SerialCandidateQ9PendingCustodyV1 | null {
  if (!isCurrentSerialCandidate(value)) return null;
  const lineage = candidateBindings.get(value)!.lineage;
  const attempts = serialCandidateAttemptCustody(value);
  if (attempts === null) return null;
  return Object.freeze({
    qualityLoopAuthorityRequired: lineage.qualityLoopAuthorityRequired,
    assessmentRestartCustody: lineage.assessmentRestartCustody,
    repairAuthority: lineage.repairAuthority,
    repairAuthoritySha256: lineage.repairAuthoritySha256,
    policyDecision: lineage.policyDecision,
    completionAuthority: lineage.completionAuthority,
    attempts,
  });
}

/** Safe restart accessor for the exact AVAILABLE assessment that settled the
 * current candidate. It remains needed after owner confirmation/dismissal so
 * Main can rederive the same repair or completion policy after a hard cut.
 * Historical round-zero assessments are deliberately hidden once the product
 * advances to round one. Orphan/unavailable assessments never enter lineage
 * custody, and pending restore additionally joins this value to the exact
 * AVAILABLE reservation. */
export function serialCandidateCurrentAvailableAssessment(value: unknown): CriticAssessmentV1 | null {
  if (!isCurrentSerialCandidate(value)
    || (value.phase !== "awaiting-owner-resolution" && value.phase !== "awaiting-repair"
      && value.phase !== "awaiting-repair-result" && value.phase !== "ready-to-seal")) return null;
  const lineage = candidateBindings.get(value)!.lineage;
  const assessment = lineage.assessment;
  return assessment !== null
    && lineage.policyDecision?.assessmentStatus === "available"
    && lineage.policyDecision.candidateSha256 === value.candidateSha256
    && lineage.policyDecision.candidateRound === value.round
    && lineage.policyDecision.assessmentSha256 === criticAssessmentSha256(assessment)
    ? assessment
    : null;
}

/** Exact round-zero confirmed critic findings for the final round-one packet.
 * The returned rows carry an opaque Core binding to this run/current
 * candidate; clones and cross-run reuse are rejected by critic packet mints. */
export function serialCandidatePriorConfirmedFindings(
  value: unknown,
): readonly CriticPriorConfirmedFindingV1[] | null {
  if (!isCurrentSerialCandidate(value) || value.round !== 1) return null;
  const lineage = candidateBindings.get(value)!.lineage;
  const decision = lineage.policyDecision;
  if (!decision) {
    return lineage.repairAuthority !== null && lineage.repairAuthority.rows.length > 0
      && lineage.repairAuthority.rows.every((row) => row.source === "cairn" || row.source === "owner")
      ? Object.freeze([])
      : null;
  }
  if (decision.state !== "blocked" || decision.assessmentStatus !== "available") return null;
  return bindCriticPriorFindingsForCurrentCandidate(decision, {
    runId: value.runId,
    taskSpecSha256: value.taskSpecSha256,
    evidencePlanSha256: value.evidencePlanSha256,
    candidateSha256: value.candidateSha256,
    candidateRound: value.round,
  }) as readonly CriticPriorConfirmedFindingV1[] | null;
}

/** Backward-compatible name used by Main's owner-review restart path. */
export function serialCandidatePendingOwnerAssessment(value: unknown): CriticAssessmentV1 | null {
  return serialCandidateCurrentAvailableAssessment(value);
}

function persistedCandidateAuthorityShaAllowed(candidate: SerialCandidateV1, candidateSha256: unknown): boolean {
  if (candidateSha256 === candidate.candidateSha256) return true;
  const repairLineage = pendingRepairLineageByLineage.get(candidateBindings.get(candidate)!.lineage);
  return candidate.round === 1 && repairLineage !== undefined
    && candidateSha256 === repairLineage.preRepairCandidate.candidateSha256;
}

function persistedPolicyDecision(candidate: SerialCandidateV1, raw: unknown): CriticPolicyDecisionV1 | null {
  if (raw === null) return null;
  const record = inspectRecord(raw, [
    "version", "projectHash", "runId", "taskSpecSha256", "evidencePlanSha256", "candidateSha256",
    "assessmentSha256", "candidateRound", "callAttempt", "requestSha256", "routeRequestFingerprintSha256",
    "policyContextSha256", "state", "assessmentStatus", "blockerCount", "waitingOwnerCount",
    "nativeStopCount", "stopReason", "policyDecisionSha256",
  ]);
  if (!record || record.version !== CRITIC_POLICY_DECISION_VERSION
    || record.projectHash !== candidate.projectRootSha256 || record.runId !== candidate.runId
    || record.taskSpecSha256 !== candidate.taskSpecSha256 || record.evidencePlanSha256 !== candidate.evidencePlanSha256
    || !persistedCandidateAuthorityShaAllowed(candidate, record.candidateSha256)
    || (record.assessmentSha256 !== null && safeSha(record.assessmentSha256) === null)
    || (record.candidateRound !== null && record.candidateRound !== 0 && record.candidateRound !== 1)
    || (record.callAttempt !== null && record.callAttempt !== 1 && record.callAttempt !== 2 && record.callAttempt !== 3)
    || (record.requestSha256 !== null && safeSha(record.requestSha256) === null)
    || (record.routeRequestFingerprintSha256 !== null && safeSha(record.routeRequestFingerprintSha256) === null)
    || safeSha(record.policyContextSha256) === null || safeSha(record.policyDecisionSha256) === null
    || (record.state !== "clear" && record.state !== "blocked" && record.state !== "waiting-owner"
      && record.state !== "stopped")
    || (record.assessmentStatus !== "available" && record.assessmentStatus !== "not-requested")
    || !Number.isSafeInteger(record.blockerCount) || (record.blockerCount as number) < 0
    || !Number.isSafeInteger(record.waitingOwnerCount) || (record.waitingOwnerCount as number) < 0
    || !Number.isSafeInteger(record.nativeStopCount) || (record.nativeStopCount as number) < 0
    || (record.stopReason !== null && typeof record.stopReason !== "string")) return null;
  const canonical = canonicalObject([
    ["version", quote(record.version)], ["projectHash", quote(record.projectHash as string)],
    ["runId", quote(record.runId as string)], ["taskSpecSha256", quote(record.taskSpecSha256 as string)],
    ["evidencePlanSha256", quote(record.evidencePlanSha256 as string)],
    ["candidateSha256", quote(record.candidateSha256 as string)],
    ["assessmentSha256", record.assessmentSha256 === null ? "null" : quote(record.assessmentSha256 as string)],
    ["candidateRound", record.candidateRound === null ? "null" : String(record.candidateRound)],
    ["callAttempt", record.callAttempt === null ? "null" : String(record.callAttempt)],
    ["requestSha256", record.requestSha256 === null ? "null" : quote(record.requestSha256 as string)],
    ["routeRequestFingerprintSha256", record.routeRequestFingerprintSha256 === null
      ? "null" : quote(record.routeRequestFingerprintSha256 as string)],
    ["policyContextSha256", quote(record.policyContextSha256 as string)], ["state", quote(record.state as string)],
    ["assessmentStatus", quote(record.assessmentStatus as string)], ["blockerCount", String(record.blockerCount)],
    ["waitingOwnerCount", String(record.waitingOwnerCount)], ["nativeStopCount", String(record.nativeStopCount)],
    ["stopReason", record.stopReason === null ? "null" : quote(record.stopReason as string)],
  ]);
  if (sha256(canonical) !== record.policyDecisionSha256) return null;
  return deepFreeze(record) as unknown as CriticPolicyDecisionV1;
}

function persistedPolicyDecisionForCandidate(
  candidate: SerialCandidateV1,
  raw: unknown,
): CriticPolicyDecisionV1 | null {
  const direct = persistedPolicyDecision(candidate, raw);
  if (direct !== null || raw === null || candidate.round !== 1) return direct;
  const repairLineage = pendingRepairLineageByLineage.get(candidateBindings.get(candidate)!.lineage);
  if (!repairLineage) return null;
  return persistedPolicyDecision(repairLineage.preRepairCandidate, raw);
}

function persistedRepairAuthority(
  candidate: SerialCandidateV1,
  raw: unknown,
  expectedSha: unknown,
): CriticRepairAuthorityV1 | null {
  if (raw === null) return expectedSha === null ? null : null;
  const record = inspectRecord(raw, [
    "version", "projectHash", "runId", "taskSpecSha256", "evidencePlanSha256", "candidateSha256",
    "assessmentSha256", "policySha256", "policyContextSha256", "rows", "repairAuthoritySha256",
  ]);
  if (!record || record.version !== CRITIC_REPAIR_AUTHORITY_VERSION || record.projectHash !== candidate.projectRootSha256
    || record.runId !== candidate.runId || record.taskSpecSha256 !== candidate.taskSpecSha256
    || record.evidencePlanSha256 !== candidate.evidencePlanSha256
    || !persistedCandidateAuthorityShaAllowed(candidate, record.candidateSha256)
    || safeSha(record.policySha256) === null || safeSha(record.policyContextSha256) === null
    || safeSha(record.repairAuthoritySha256) === null || record.repairAuthoritySha256 !== expectedSha
    || (record.assessmentSha256 !== null && safeSha(record.assessmentSha256) === null)) return null;
  const input = inspectArray(record.rows, candidateBindings.get(candidate)!.authority.taskSpec.quality.acceptanceChecks.length);
  if (!input || input.length === 0) return null;
  const rows: CriticRepairAuthorityV1["rows"][number][] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const row = inspectRecord(item, ["criterionId", "failureConditionId", "artifactIds", "source", "sourceSha256"]);
    if (!row || typeof row.criterionId !== "string" || seen.has(row.criterionId)
      || typeof row.failureConditionId !== "string" || (row.source !== "cairn" && row.source !== "owner" && row.source !== "critic")
      || safeSha(row.sourceSha256) === null) return null;
    const criterion = candidateBindings.get(candidate)!.authority.taskSpec.quality.acceptanceChecks
      .find((entry) => entry.id === row.criterionId);
    const artifacts = inspectArray(row.artifactIds, 8);
    if (!criterion || criterion.failureCondition.id !== row.failureConditionId || !artifacts || artifacts.length === 0
      || artifacts.some((artifact) => typeof artifact !== "string"
        || !criterion.failureCondition.allowedArtifactIds.includes(artifact))) return null;
    seen.add(row.criterionId);
    rows.push(Object.freeze({
      criterionId: criterion.id,
      failureConditionId: criterion.failureCondition.id,
      artifactIds: Object.freeze(artifacts as string[]),
      source: row.source,
      sourceSha256: row.sourceSha256 as string,
    }));
  }
  const canonicalWithoutSha = canonicalObject([
    ["version", quote(CRITIC_REPAIR_AUTHORITY_VERSION)], ["projectHash", quote(record.projectHash as string)],
    ["runId", quote(record.runId as string)], ["taskSpecSha256", quote(record.taskSpecSha256 as string)],
    ["evidencePlanSha256", quote(record.evidencePlanSha256 as string)], ["candidateSha256", quote(record.candidateSha256 as string)],
    ["assessmentSha256", record.assessmentSha256 === null ? "null" : quote(record.assessmentSha256 as string)],
    ["policySha256", quote(record.policySha256 as string)], ["policyContextSha256", quote(record.policyContextSha256 as string)],
    ["rows", canonicalArray(rows.map((row) => canonicalObject([
      ["criterionId", quote(row.criterionId)], ["failureConditionId", quote(row.failureConditionId)],
      ["artifactIds", canonicalArray(row.artifactIds.map(quote))], ["source", quote(row.source)],
      ["sourceSha256", quote(row.sourceSha256)],
    ])))],
  ]);
  if (sha256(canonicalWithoutSha) !== record.repairAuthoritySha256) return null;
  const restored = deepFreeze({
    version: CRITIC_REPAIR_AUTHORITY_VERSION,
    projectHash: record.projectHash,
    runId: record.runId,
    taskSpecSha256: record.taskSpecSha256,
    evidencePlanSha256: record.evidencePlanSha256,
    candidateSha256: record.candidateSha256,
    assessmentSha256: record.assessmentSha256,
    policySha256: record.policySha256,
    policyContextSha256: record.policyContextSha256,
    rows,
    repairAuthoritySha256: record.repairAuthoritySha256,
  }) as CriticRepairAuthorityV1;
  restoredRepairAuthorityBrand.add(restored);
  return restored;
}

function persistedRepairAuthorityForCandidate(
  candidate: SerialCandidateV1,
  raw: unknown,
  expectedSha: unknown,
): CriticRepairAuthorityV1 | null {
  const direct = persistedRepairAuthority(candidate, raw, expectedSha);
  if (direct !== null || raw === null || candidate.round !== 1) return direct;
  const repairLineage = pendingRepairLineageByLineage.get(candidateBindings.get(candidate)!.lineage);
  if (!repairLineage) return null;
  return persistedRepairAuthority(repairLineage.preRepairCandidate, raw, expectedSha);
}

function candidateRepairAuthoritySha256(value: CriticRepairAuthorityV1): string | null {
  const liveSha = criticRepairAuthoritySha256(value);
  if (liveSha !== null) return liveSha;
  return restoredRepairAuthorityBrand.has(value) && safeSha(value.repairAuthoritySha256) !== null
    ? value.repairAuthoritySha256
    : null;
}

function canonicalPersistedCompletionAuthority(
  value: Omit<CriticCompletionAuthorityV1, "completionAuthoritySha256">,
): string {
  return canonicalObject([
    ["version", quote(value.version)], ["projectHash", quote(value.projectHash)], ["runId", quote(value.runId)],
    ["taskSpecSha256", quote(value.taskSpecSha256)], ["evidencePlanSha256", quote(value.evidencePlanSha256)],
    ["candidateSha256", quote(value.candidateSha256)],
    ["assessmentSha256", value.assessmentSha256 === null ? "null" : quote(value.assessmentSha256)],
    ["policyContextSha256", quote(value.policyContextSha256)],
    ["criteria", canonicalArray(value.criteria.map((row) => canonicalObject([
      ["criterionId", quote(row.criterionId)], ["judge", quote(row.judge)],
      ["sourceSha256", quote(row.sourceSha256)],
    ])))],
  ]);
}

function restoreCriticCompletionAuthorityForPending(
  taskSpec: TaskSpecV1,
  evidencePlan: EvidencePlanV1,
  raw: unknown,
  expected: Readonly<{ projectHash: string; runId: string; candidateSha256: string }>,
): CriticCompletionAuthorityV1 | null {
  const taskSha = taskSpecSha256(taskSpec);
  const planSha = evidencePlanSha256(evidencePlan);
  const record = inspectRecord(raw, [
    "version", "projectHash", "runId", "taskSpecSha256", "evidencePlanSha256", "candidateSha256",
    "assessmentSha256", "policyContextSha256", "criteria", "completionAuthoritySha256",
  ]);
  if (!taskSha || !planSha || !record || record.version !== CRITIC_COMPLETION_AUTHORITY_VERSION
    || record.projectHash !== expected.projectHash || record.runId !== expected.runId
    || record.taskSpecSha256 !== taskSha || record.evidencePlanSha256 !== planSha
    || record.candidateSha256 !== expected.candidateSha256
    || (record.assessmentSha256 !== null && safeSha(record.assessmentSha256) === null)
    || safeSha(record.policyContextSha256) === null
    || safeSha(record.completionAuthoritySha256) === null) return null;
  const rawCriteria = inspectArray(record.criteria, taskSpec.quality.acceptanceChecks.length);
  if (!rawCriteria || rawCriteria.length !== taskSpec.quality.acceptanceChecks.length) return null;
  const criteria: Array<CriticCompletionAuthorityV1["criteria"][number]> = [];
  for (let index = 0; index < rawCriteria.length; index += 1) {
    const row = inspectRecord(rawCriteria[index], ["criterionId", "judge", "sourceSha256"]);
    const declared = taskSpec.quality.acceptanceChecks[index];
    if (!row || !declared || row.criterionId !== declared.id || row.judge !== declared.judge
      || safeSha(row.sourceSha256) === null) return null;
    criteria.push(Object.freeze({
      criterionId: declared.id,
      judge: declared.judge,
      sourceSha256: row.sourceSha256 as string,
    }));
  }
  const withoutSha = deepFreeze({
    version: CRITIC_COMPLETION_AUTHORITY_VERSION,
    projectHash: record.projectHash,
    runId: record.runId,
    taskSpecSha256: record.taskSpecSha256,
    evidencePlanSha256: record.evidencePlanSha256,
    candidateSha256: record.candidateSha256,
    assessmentSha256: record.assessmentSha256,
    policyContextSha256: record.policyContextSha256,
    criteria,
  }) as Omit<CriticCompletionAuthorityV1, "completionAuthoritySha256">;
  if (sha256(canonicalPersistedCompletionAuthority(withoutSha)) !== record.completionAuthoritySha256) return null;
  const restored = deepFreeze({
    ...withoutSha,
    completionAuthoritySha256: record.completionAuthoritySha256,
  }) as CriticCompletionAuthorityV1;
  restoredCriticCompletionAuthorityBrands.add(restored);
  return restored;
}

/** Internal restart mint used only after serial.ts authenticated the pending
 * capsule and rebuilt the immutable TaskSpec/bundle brands. It restores spent
 * reservations without replaying a provider call or rolling a counter back. */
export function restoreSerialCandidateQ9ForPending(
  baseValue: unknown,
  rawTarget: unknown,
  rawCustody: unknown,
  pendingRestoreAuthority: SerialPendingRestoreAuthority,
  capsuleSha256: string,
): SerialCandidateV1 | null {
  const invalid = (_stage: string): null => null;
  if (!isCurrentSerialCandidate(baseValue)) return null;
  const base = baseValue;
  const target = inspectRecord(rawTarget, [
    "version", "runId", "generation", "taskNumber", "requestSha256", "projectRootSha256",
    "taskSpecSha256", "evidencePlanSha256", "round", "bundleSha256", "claims", "claimsSha256",
    "candidateSha256", "evidenceStateSha256", "criticMode", "repairEligibility", "repairUnavailableReason",
    "phase", "pendingOwnerReason", "callsUsed",
  ]);
  const custody = inspectRecord(rawCustody, [
    "qualityLoopAuthorityRequired", "assessmentRestartCustody", "repairAuthority", "repairAuthoritySha256",
    "policyDecision", "completionAuthority", "attempts",
  ]);
  if (!target || !custody
    || custody.qualityLoopAuthorityRequired !== true
    || target.version !== SERIAL_CANDIDATE_VERSION || target.runId !== base.runId
    || target.taskNumber !== base.taskNumber || target.requestSha256 !== base.requestSha256
    || target.projectRootSha256 !== base.projectRootSha256 || target.taskSpecSha256 !== base.taskSpecSha256
    || target.evidencePlanSha256 !== base.evidencePlanSha256 || target.round !== base.round
    || target.bundleSha256 !== base.bundleSha256 || target.claimsSha256 !== base.claimsSha256
    || target.candidateSha256 !== base.candidateSha256 || JSON.stringify(target.claims) !== JSON.stringify(base.claims)
    || !Number.isSafeInteger(target.generation) || (target.generation as number) < base.generation
    || safeSha(target.evidenceStateSha256) === null
    || (target.phase !== "awaiting-critic" && target.phase !== "awaiting-critic-result"
      && target.phase !== "awaiting-owner-resolution" && target.phase !== "awaiting-repair"
      && target.phase !== "awaiting-repair-result" && target.phase !== "ready-to-seal")
    || (target.pendingOwnerReason !== null && target.pendingOwnerReason !== "critic-allegation"
      && target.pendingOwnerReason !== "cairn-failure-confirmation")) {
    return null;
  }
  if (!serialPendingRestoreAuthorityCovers(pendingRestoreAuthority, {
    capsuleSha256,
    projectRootSha256: target.projectRootSha256 as string,
    runId: target.runId as string,
    candidateSha256: target.candidateSha256 as string,
  })) return null;
  const calls = inspectRecord(target.callsUsed, ["builder", "repair", "critic", "externalEvidence"]);
  if (!calls || calls.builder !== 1 || (calls.repair !== 0 && calls.repair !== 1)
    || !Number.isSafeInteger(calls.critic) || (calls.critic as number) < 0 || (calls.critic as number) > 3
    || calls.externalEvidence !== 0) {
    return null;
  }
  const repairAuthority = persistedRepairAuthorityForCandidate(base, custody.repairAuthority, custody.repairAuthoritySha256);
  if ((custody.repairAuthority === null) !== (repairAuthority === null)) {
    return invalid("repair-authority");
  }
  const policyDecision = persistedPolicyDecisionForCandidate(base, custody.policyDecision);
  if ((custody.policyDecision === null) !== (policyDecision === null)) {
    return invalid("policy-decision");
  }
  const assessmentRestartCustody = custody.assessmentRestartCustody ?? null;
  const assessmentAuthority = policyDecision !== null && base.round === 1
    && policyDecision.candidateRound === 0
    ? pendingRepairLineageByLineage.get(candidateBindings.get(base)!.lineage)?.preRepairCandidate ?? base
    : base;
  const assessment = assessmentRestartCustody === null || policyDecision === null
    ? null
    : restoreCriticAssessmentFromAuthenticatedPending(
        candidateBindings.get(assessmentAuthority)!.authority.taskSpec,
        candidateBindings.get(assessmentAuthority)!.authority.evidencePlan,
        assessmentRestartCustody,
        {
          projectHash: policyDecision.projectHash,
          runId: policyDecision.runId,
          candidateRound: policyDecision.candidateRound,
          callAttempt: policyDecision.callAttempt,
          candidateSha256: policyDecision.candidateSha256,
          requestSha256: policyDecision.requestSha256,
          routeRequestFingerprintSha256: policyDecision.routeRequestFingerprintSha256,
          assessmentSha256: policyDecision.assessmentSha256,
        },
        pendingRestoreAuthority,
        capsuleSha256,
        {
          projectRootSha256: target.projectRootSha256,
          runId: target.runId,
          candidateSha256: target.candidateSha256,
        },
      ) as CriticAssessmentV1 | null;
  if ((assessmentRestartCustody === null) !== (assessment === null)
    || (policyDecision?.assessmentSha256 !== null
      && policyDecision?.assessmentStatus === "available" && assessment === null)) {
    return invalid("assessment");
  }
  if (target.phase === "awaiting-repair" && repairAuthority === null) return invalid("repair-phase-authority");
  if (target.pendingOwnerReason === "critic-allegation"
    && (target.phase !== "awaiting-owner-resolution" || repairAuthority !== null
      || policyDecision?.state !== "waiting-owner" || policyDecision.waitingOwnerCount < 1)) {
    return invalid("critic-owner-wait");
  }
  if (target.pendingOwnerReason === "cairn-failure-confirmation"
    && (target.phase !== "awaiting-owner-resolution" || target.round !== 0 || calls.repair !== 0
      || repairAuthority !== null || policyDecision?.state !== "blocked"
      || policyDecision.blockerCount < 1 || policyDecision.waitingOwnerCount !== 0
      || policyDecision.assessmentStatus !== "available" || assessment === null)) {
    return invalid("cairn-owner-wait");
  }
  const attemptInput = inspectArray(custody.attempts, 4);
  if (!attemptInput) {
    return invalid("attempts");
  }
  const restoredAttempts: CandidateLineage["attempts"] = [];
  for (const item of attemptInput) {
    const entry = inspectRecord(item, ["reservation", "status", "resultAuthoritySha256", "unavailableReason"]);
    if (!entry || (entry.status !== "reserved" && entry.status !== "available"
      && entry.status !== "unavailable" && entry.status !== "completed")
      || (entry.resultAuthoritySha256 !== null && safeSha(entry.resultAuthoritySha256) === null)
      || (entry.unavailableReason !== null && entry.unavailableReason !== "transport-unavailable"
        && entry.unavailableReason !== "malformed-output" && entry.unavailableReason !== "process-crash")) {
      return null;
    }
    const reservationRecord = inspectRecord(entry.reservation, [
      "version", "kind", "runId", "sourceGeneration", "reservedGeneration", "taskNumber", "projectRootSha256",
      "round", "taskSpecSha256", "evidencePlanSha256", "candidateSha256", "bundleSha256", "attempt",
      "authorizationSha256", "requestSha256", "routeRequestFingerprintSha256", "retryOfReservationSha256",
      "previewSha256", "instructionSha256", "reservationSha256",
    ]);
    if (!reservationRecord || reservationRecord.version !== SERIAL_CANDIDATE_ATTEMPT_RESERVATION_VERSION
      || (reservationRecord.kind !== "repair" && reservationRecord.kind !== "critic")
      || reservationRecord.runId !== base.runId || reservationRecord.taskNumber !== base.taskNumber
      || reservationRecord.projectRootSha256 !== base.projectRootSha256
      || (reservationRecord.round !== 0 && reservationRecord.round !== 1)
      || (reservationRecord.round === 1 && base.round !== 1)
      || reservationRecord.taskSpecSha256 !== base.taskSpecSha256 || reservationRecord.evidencePlanSha256 !== base.evidencePlanSha256
      || safeSha(reservationRecord.candidateSha256) === null || safeSha(reservationRecord.bundleSha256) === null
      || (reservationRecord.round === 0 && reservationRecord.bundleSha256 !== base.lineage.round0BundleSha256)
      || (reservationRecord.round === 1
        && (reservationRecord.candidateSha256 !== base.candidateSha256
          || reservationRecord.bundleSha256 !== base.bundleSha256))
      || !Number.isSafeInteger(reservationRecord.sourceGeneration) || !Number.isSafeInteger(reservationRecord.reservedGeneration)
      || reservationRecord.reservedGeneration !== (reservationRecord.sourceGeneration as number) + 1
      || !Number.isSafeInteger(reservationRecord.attempt) || (reservationRecord.attempt as number) < 1
      || (reservationRecord.attempt as number) > 3 || safeSha(reservationRecord.authorizationSha256) === null
      || (reservationRecord.requestSha256 !== null && safeSha(reservationRecord.requestSha256) === null)
      || (reservationRecord.routeRequestFingerprintSha256 !== null
        && safeSha(reservationRecord.routeRequestFingerprintSha256) === null)
      || (reservationRecord.retryOfReservationSha256 !== null && safeSha(reservationRecord.retryOfReservationSha256) === null)
      || (reservationRecord.previewSha256 !== null && safeSha(reservationRecord.previewSha256) === null)
      || (reservationRecord.instructionSha256 !== null && safeSha(reservationRecord.instructionSha256) === null)
      || safeSha(reservationRecord.reservationSha256) === null) {
      return null;
    }
    const withoutSha = {
      version: SERIAL_CANDIDATE_ATTEMPT_RESERVATION_VERSION,
      kind: reservationRecord.kind,
      runId: reservationRecord.runId,
      sourceGeneration: reservationRecord.sourceGeneration,
      reservedGeneration: reservationRecord.reservedGeneration,
      taskNumber: reservationRecord.taskNumber,
      projectRootSha256: reservationRecord.projectRootSha256,
      round: reservationRecord.round,
      taskSpecSha256: reservationRecord.taskSpecSha256,
      evidencePlanSha256: reservationRecord.evidencePlanSha256,
      candidateSha256: reservationRecord.candidateSha256,
      bundleSha256: reservationRecord.bundleSha256,
      attempt: reservationRecord.attempt,
      authorizationSha256: reservationRecord.authorizationSha256,
      requestSha256: reservationRecord.requestSha256,
      routeRequestFingerprintSha256: reservationRecord.routeRequestFingerprintSha256,
      retryOfReservationSha256: reservationRecord.retryOfReservationSha256,
      previewSha256: reservationRecord.previewSha256,
      instructionSha256: reservationRecord.instructionSha256,
    } as Omit<SerialCandidateAttemptReservationV1, "reservationSha256">;
    if (sha256(canonicalAttemptReservationWithoutSha(withoutSha)) !== reservationRecord.reservationSha256) {
      return null;
    }
    const reservation = deepFreeze({ ...withoutSha, reservationSha256: reservationRecord.reservationSha256 }) as SerialCandidateAttemptReservationV1;
    attemptReservationBrand.add(reservation);
    restoredAttempts.push({
      reservation,
      status: entry.status,
      resultAuthoritySha256: entry.resultAuthoritySha256 as string | null,
      unavailableReason: entry.unavailableReason as CandidateLineage["attempts"][number]["unavailableReason"],
    });
  }
  const attemptKeys = restoredAttempts.map((item) => `${item.reservation.kind}:${item.reservation.attempt}`);
  const criticAttempts = restoredAttempts.filter((item) => item.reservation.kind === "critic");
  const retryLineageExact = criticAttempts.every((item, index) => {
    const previousSameRound = criticAttempts.slice(0, index).reverse().find((prior) =>
      prior.reservation.round === item.reservation.round
      && prior.reservation.candidateSha256 === item.reservation.candidateSha256) ?? null;
    const retrySha = item.reservation.retryOfReservationSha256;
    return previousSameRound?.status === "unavailable"
      ? retrySha === previousSameRound.reservation.reservationSha256
      : retrySha === null;
  });
  const retryCount = criticAttempts.filter((item) => item.reservation.retryOfReservationSha256 !== null).length;
  const repairAttempt = restoredAttempts.some((item) => item.reservation.kind === "repair") ? 1 : 0;
  const criticAttempt = restoredAttempts.reduce((highest, item) => item.reservation.kind === "critic"
    ? Math.max(highest, item.reservation.attempt) : highest, 0);
  const criticAttemptNumbers = criticAttempts.map((item) => item.reservation.attempt);
  // An assessment carried by a pending capsule is usable only when the same
  // capsule also proves that Core settled the exact critic reservation as
  // AVAILABLE.  This deliberately excludes the crash cut where Main durably
  // appended a parsed assessment but the send operation/candidate settlement
  // never completed: that orphan must not reappear as owner or repair
  // authority after restart.  An owner-resolution policy may have a different
  // policy-decision digest from the original waiting-owner decision, so the
  // immutable call/assessment identities — not the later policy digest — are
  // the exact lineage join here.
  const assessmentAttemptExact = assessment === null && assessmentRestartCustody === null
    ? policyDecision?.assessmentStatus !== "available"
    : policyDecision !== null && policyDecision.assessmentStatus === "available"
      && policyDecision.assessmentSha256 !== null
      && restoredAttempts.some((item) => item.reservation.kind === "critic"
        && item.status === "available"
        && item.resultAuthoritySha256 !== null
        && item.reservation.round === policyDecision.candidateRound
        && item.reservation.attempt === policyDecision.callAttempt
        && item.reservation.requestSha256 === policyDecision.requestSha256
        && item.reservation.routeRequestFingerprintSha256
          === policyDecision.routeRequestFingerprintSha256);
  if (new Set(attemptKeys).size !== attemptKeys.length || !retryLineageExact || retryCount > 1
    || criticAttemptNumbers.some((attempt, index) => attempt !== index + 1)
    || !assessmentAttemptExact
    || Math.max(base.callsUsed.repair, repairAttempt) !== calls.repair
    || Math.max(base.callsUsed.critic, criticAttempt) !== calls.critic
    || (target.phase === "awaiting-repair-result" && !restoredAttempts.some((item) => item.reservation.kind === "repair" && item.status === "reserved"))
    || (target.phase === "awaiting-critic-result" && !restoredAttempts.some((item) => item.reservation.kind === "critic" && item.status === "reserved"))) {
    return invalid("attempt-lineage");
  }
  const binding = candidateBindings.get(base)!;
  const completionAuthority = custody.completionAuthority === null
    ? null
    : restoreCriticCompletionAuthorityForPending(
        binding.authority.taskSpec,
        binding.authority.evidencePlan,
        custody.completionAuthority,
        { projectHash: base.projectRootSha256, runId: base.runId, candidateSha256: base.candidateSha256 },
      );
  if ((custody.completionAuthority === null) !== (completionAuthority === null)) return invalid("completion");
  binding.lineage.repairAuthority = repairAuthority;
  binding.lineage.repairAuthoritySha256 = repairAuthority ? custody.repairAuthoritySha256 as string : null;
  binding.lineage.policyDecision = policyDecision;
  binding.lineage.assessment = assessment;
  binding.lineage.assessmentRestartCustody = assessmentRestartCustody as CriticAssessmentRestartCustodyV1 | null;
  binding.lineage.completionAuthority = completionAuthority;
  binding.lineage.attempts = restoredAttempts;
  binding.lineage.qualityLoopAuthorityRequired = true;
  const restored = mintCandidate(binding.authority, binding.lineage, {
    ...base,
    generation: target.generation as number,
    evidenceStateSha256: target.evidenceStateSha256 as string,
    phase: target.phase as SerialCandidatePhaseV1,
    pendingOwnerReason: target.pendingOwnerReason as SerialCandidateV1["pendingOwnerReason"],
    callsUsed: Object.freeze({
      builder: 1 as const,
      repair: calls.repair as 0 | 1,
      critic: calls.critic as 0 | 1 | 2 | 3,
      externalEvidence: 0 as const,
    }),
  });
  for (const item of restoredAttempts) {
    attemptReservationBindings.set(item.reservation, Object.freeze({ lineage: binding.lineage, reservedCandidate: restored }));
    if (item.status !== "reserved") spentAttemptReservations.add(item.reservation);
  }
  return restored;
}

function completionAuthorityCoversCandidate(
  candidate: SerialCandidateV1,
  completionAuthority: unknown,
): completionAuthority is CriticCompletionAuthorityV1 {
  if (!isCriticCompletionAuthority(completionAuthority)) return false;
  const completion = completionAuthority as CriticCompletionAuthorityV1;
  const completionSha = criticCompletionAuthoritySha256(completion);
  const binding = candidateBindings.get(candidate)!;
  return completionSha !== null
    && completion.runId === candidate.runId
    && completion.projectHash === candidate.projectRootSha256
    && completion.taskSpecSha256 === candidate.taskSpecSha256
    && completion.evidencePlanSha256 === candidate.evidencePlanSha256
    && completion.candidateSha256 === candidate.candidateSha256
    && completion.criteria.length === binding.authority.taskSpec.quality.acceptanceChecks.length
    && completion.criteria.every((row, index) => {
      const criterion = binding.authority.taskSpec.quality.acceptanceChecks[index]!;
      return row.criterionId === criterion.id && row.judge === criterion.judge;
    });
}

function mintSerialCandidateSealAuthorization(
  candidate: SerialCandidateV1,
): SerialCandidateSealAuthorizationV1 {
  const authorization = deepFreeze({
    version: SERIAL_CANDIDATE_SEAL_AUTHORIZATION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    taskNumber: candidate.taskNumber,
    projectRootSha256: candidate.projectRootSha256,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    requiredCriteriaComplete: true as const,
    confirmedBlockerCount: 0 as const,
    nativeStopCount: 0 as const,
  }) as SerialCandidateSealAuthorizationV1;
  sealAuthorizationBrand.add(authorization);
  sealAuthorizationBindings.set(authorization, candidate);
  return authorization;
}

export function authorizeSerialCandidateSealFromCompletion(
  candidate: unknown,
  completionAuthority: unknown,
): SerialCandidateSealAuthorizationV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "ready-to-seal"
    || !completionAuthorityCoversCandidate(candidate, completionAuthority)) return null;
  candidateBindings.get(candidate)!.lineage.completionAuthority = completionAuthority;
  return mintSerialCandidateSealAuthorization(candidate);
}

/** Core-internal record-authoring join. Only the exact current candidate that
 * consumed a live/restored completion authority exposes it. */
export function serialCandidateCompletionAuthority(value: unknown): CriticCompletionAuthorityV1 | null {
  if (!isCurrentSerialCandidate(value)) return null;
  const authority = candidateBindings.get(value)!.lineage.completionAuthority;
  return authority && criticCompletionAuthoritySha256(authority) !== null ? authority : null;
}

function parseBlockers(
  value: unknown,
  candidate: SerialCandidateV1,
): readonly SerialCandidatePendingRepairBlockerV1[] | null {
  const rows = inspectArray(value, candidateBrand.has(candidate) ? candidateBindings.get(candidate)!.authority.taskSpec.quality.acceptanceChecks.length : 0);
  if (!rows || rows.length === 0) return null;
  const authority = candidateBindings.get(candidate)!.authority;
  const output: SerialCandidatePendingRepairBlockerV1[] = [];
  const seen = new Set<string>();
  for (const item of rows) {
    const row = inspectRecord(item, ["criterionId", "failureConditionId", "artifactIds"]);
    if (!row || typeof row.criterionId !== "string" || seen.has(row.criterionId)
      || typeof row.failureConditionId !== "string") return null;
    const criterion = authority.taskSpec.quality.acceptanceChecks.find((entry) => entry.id === row.criterionId);
    const artifactValues = inspectArray(row.artifactIds, 8);
    if (!criterion || row.failureConditionId !== criterion.failureCondition.id || !artifactValues || artifactValues.length === 0) return null;
    const suppliedArtifacts = new Set<string>();
    const artifactSeen = new Set<string>();
    for (const artifact of artifactValues) {
      if (typeof artifact !== "string" || !MACHINE_ID_RE.test(artifact) || artifactSeen.has(artifact)
        || !criterion.failureCondition.allowedArtifactIds.includes(artifact)) return null;
      artifactSeen.add(artifact);
      suppliedArtifacts.add(artifact);
    }
    const artifacts = criterion.failureCondition.allowedArtifactIds.filter((artifact) => suppliedArtifacts.has(artifact));
    seen.add(row.criterionId);
    output.push(Object.freeze({ criterionId: criterion.id, failureConditionId: criterion.failureCondition.id, artifactIds: Object.freeze(artifacts) }));
  }
  const order = new Map(authority.taskSpec.quality.acceptanceChecks.map((criterion, index) => [criterion.id, index]));
  return Object.freeze(output.sort((left, right) => order.get(left.criterionId)! - order.get(right.criterionId)!));
}

function mintSerialRepairInstruction(
  candidate: SerialCandidateV1,
  blockers: readonly SerialCandidatePendingRepairBlockerV1[],
): SerialRepairInstructionV1 {
  const authority = candidateBindings.get(candidate)!.authority;
  const lines: string[] = [];
  for (const blocker of blockers) {
    const criterion = authority.taskSpec.quality.acceptanceChecks.find((entry) => entry.id === blocker.criterionId)!;
    lines.push(
      `${criterion.id} required promise: ${criterion.promise}`,
      `${criterion.id} frozen failure condition (${criterion.failureCondition.id}): ${criterion.failureCondition.statement}`,
      `${criterion.id} permitted evidence artifact ids: ${blocker.artifactIds.join(", ")}`,
    );
  }
  const artifactIds = Object.freeze([...new Set(blockers.flatMap((row) => row.artifactIds))]);
  const withoutSha = deepFreeze({
    version: SERIAL_REPAIR_INSTRUCTION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    round: 0 as const,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    criterionIds: Object.freeze(blockers.map((row) => row.criterionId)),
    artifactIds,
    instruction: lines.join("\n"),
  }) as Omit<SerialRepairInstructionV1, "repairInstructionSha256">;
  return deepFreeze({
    ...withoutSha,
    repairInstructionSha256: sha256(canonicalRepairInstruction(withoutSha)),
  }) as SerialRepairInstructionV1;
}

function sameRepairInstruction(left: SerialRepairInstructionV1, right: unknown): boolean {
  const record = inspectRecord(right, [
    "version", "runId", "generation", "round", "taskSpecSha256", "evidencePlanSha256",
    "candidateSha256", "bundleSha256", "evidenceStateSha256", "criterionIds", "artifactIds",
    "instruction", "repairInstructionSha256",
  ]);
  if (!record) return false;
  const criterionIds = inspectArray(record.criterionIds, 100);
  const artifactIds = inspectArray(record.artifactIds, 800);
  return record.version === left.version
    && record.runId === left.runId
    && Object.is(record.generation, left.generation)
    && record.round === left.round
    && record.taskSpecSha256 === left.taskSpecSha256
    && record.evidencePlanSha256 === left.evidencePlanSha256
    && record.candidateSha256 === left.candidateSha256
    && record.bundleSha256 === left.bundleSha256
    && record.evidenceStateSha256 === left.evidenceStateSha256
    && criterionIds !== null && criterionIds.every((value) => typeof value === "string")
    && sameStrings(criterionIds as string[], left.criterionIds)
    && artifactIds !== null && artifactIds.every((value) => typeof value === "string")
    && sameStrings(artifactIds as string[], left.artifactIds)
    && record.instruction === left.instruction
    && record.repairInstructionSha256 === left.repairInstructionSha256;
}

export function composeSerialRepairInstruction(root: string, candidate: unknown, raw: unknown): SerialRepairInstructionV1 | null {
  if (!serialCandidateGitEnvironmentSafe() || !serialCandidateRepairWorkspaceStillExact(root, candidate)
    || !isCurrentSerialCandidate(candidate)
    || candidateBindings.get(candidate)!.lineage.qualityLoopAuthorityRequired
    || candidate.phase !== "awaiting-repair" || candidate.round !== 0
    || candidate.callsUsed.repair !== 0 || candidate.repairEligibility === null || repairByCandidate.has(candidate)) return null;
  const record = inspectRecord(raw, [
    "version", "runId", "generation", "taskNumber", "projectRootSha256", "round", "taskSpecSha256",
    "evidencePlanSha256", "candidateSha256", "bundleSha256", "evidenceStateSha256", "blockers",
  ]);
  if (!record || record.version !== SERIAL_REPAIR_INSTRUCTION_VERSION || !transitionBinding({ ...record, version: SERIAL_CANDIDATE_TRANSITION_VERSION }, candidate)) return null;
  const blockers = parseBlockers(record.blockers, candidate);
  if (!blockers) return null;
  const instruction = mintSerialRepairInstruction(candidate, blockers);
  repairByCandidate.add(candidate);
  repairInstructionBrand.add(instruction);
  repairInstructionBindings.set(instruction, candidate);
  repairBlockersByInstruction.set(instruction, blockers);
  return instruction;
}

export function isSerialRepairInstruction(value: unknown): value is SerialRepairInstructionV1 {
  return typeof value === "object" && value !== null && repairInstructionBrand.has(value)
    && repairInstructionBindings.has(value) && !spentRepairInstructions.has(value);
}

function q9RepairReservationFor(
  candidate: SerialCandidateV1,
  instruction: unknown,
): { reservation: SerialCandidateAttemptReservationV1; attempt: CandidateLineage["attempts"][number] } | null {
  if (candidate.phase !== "awaiting-repair-result" || candidate.callsUsed.repair !== 1
    || typeof instruction !== "object" || instruction === null
    || repairInstructionBindings.get(instruction) !== candidate) return null;
  const lineage = candidateBindings.get(candidate)!.lineage;
  const attempt = lineage.attempts.find((item) => item.reservation.kind === "repair"
    && item.reservation.reservedGeneration === candidate.generation
    && item.reservation.instructionSha256 === (instruction as SerialRepairInstructionV1).repairInstructionSha256);
  return attempt && attempt.status === "reserved" ? { reservation: attempt.reservation, attempt } : null;
}

/**
 * Capture the only round-1 bundle that can replace this exact repair candidate.
 * The generic bundle capture remains useful for immutable round comparison,
 * but carries no repair-transition authority. This mint starts no worker and
 * does not spend the instruction; a failed capture can be retried, while one
 * successful capture closes the instruction's snapshot choice.
 */
export function captureSerialCandidateBundleAfterRepair(
  root: string,
  candidate: unknown,
  repairInstruction: unknown,
  rawContext: unknown,
): SerialCandidateBundleCaptureV1 {
  if (!serialCandidateGitEnvironmentSafe()
    || !isCurrentSerialCandidate(candidate) || candidate.round !== 0
    || !isSerialRepairInstruction(repairInstruction)
    || repairInstructionBindings.get(repairInstruction) !== candidate
    || repairCaptureByInstruction.has(repairInstruction) || revokedRepairCandidates.has(candidate)) return failure("INVALID_CAPTURE_CONTEXT");
  const q9Reservation = q9RepairReservationFor(candidate, repairInstruction);
  const qualityLoopRequired = candidateBindings.get(candidate)!.lineage.qualityLoopAuthorityRequired;
  if (!(q9Reservation !== null || (!qualityLoopRequired
    && candidate.phase === "awaiting-repair" && candidate.callsUsed.repair === 0))) {
    return failure("INVALID_CAPTURE_CONTEXT");
  }
  const context = inspectRecord(rawContext, ["baseHead", "taskPaths", "protectedPaths", "ownedPaths"]);
  if (!context || context.baseHead !== candidate.lineage.round0Bundle.baseHead) return failure("INVALID_CAPTURE_CONTEXT");
  const authority = candidateBindings.get(candidate)!.authority;
  const rootReal = canonicalProjectRoot(root);
  const round0Context = bundleCaptureBindings.get(candidate.lineage.round0Bundle);
  const suppliedProtected = safePathArray(context.protectedPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.protectedPaths);
  const suppliedOwned = safePathArray(context.ownedPaths, SERIAL_CANDIDATE_BUNDLE_LIMITS.ownedPaths);
  if (rootReal === null || !round0Context || round0Context.rootReal !== rootReal
    || !suppliedProtected || !suppliedOwned
    || !sameStrings(suppliedProtected, round0Context.protectedPaths)
    || !sameStrings(suppliedOwned, round0Context.ownedPaths)) return failure("INVALID_CAPTURE_CONTEXT");
  if (ignoredTreeIsEmpty(rootReal) !== true) {
    revokedRepairCandidates.add(candidate);
    return failure("INVALID_CAPTURE_CONTEXT");
  }
  const captured = captureSerialCandidateBundle(root, authority, {
    round: 1,
    baseHead: context.baseHead,
    taskPaths: context.taskPaths,
    protectedPaths: context.protectedPaths,
    ownedPaths: context.ownedPaths,
  });
  if (!captured.eligible) return captured;
  if (captured.bundle.projectRootSha256 !== candidate.projectRootSha256
    || captured.bundle.baseHead !== candidate.lineage.round0Bundle.baseHead
    || bundleBindings.get(captured.bundle) !== authority) return failure("INVALID_CAPTURE_CONTEXT");
  if (ignoredTreeIsEmpty(rootReal) !== true) {
    revokedRepairCandidates.add(candidate);
    return failure("INVALID_CAPTURE_CONTEXT");
  }
  repairBundleBindings.set(captured.bundle, Object.freeze({ candidate, instruction: repairInstruction }));
  repairCaptureByInstruction.set(repairInstruction, captured.bundle);
  return captured;
}

/**
 * Replace one current round-0 candidate after the separately authorized repair
 * has finished and Main has captured a complete round-1 bundle. This function
 * starts no process and trusts no repair prose: the one-use instruction and
 * both bundles must already carry this module's exact brands and bindings.
 */
export function replaceSerialCandidateAfterRepair(
  candidate: unknown,
  repairInstruction: unknown,
  roundOneBundle: unknown,
  claimsText: unknown,
): SerialCandidateV1 | null {
  if (!isCurrentSerialCandidate(candidate) || revokedRepairCandidates.has(candidate)
    || candidate.round !== 0 || !isSerialRepairInstruction(repairInstruction)
    || repairInstructionBindings.get(repairInstruction) !== candidate
    || !isSerialCandidateBundle(roundOneBundle) || roundOneBundle.round !== 1
    || typeof claimsText !== "string") return null;
  const q9Reservation = q9RepairReservationFor(candidate, repairInstruction);
  const qualityLoopRequired = candidateBindings.get(candidate)!.lineage.qualityLoopAuthorityRequired;
  if (!(q9Reservation !== null || (!qualityLoopRequired
    && candidate.phase === "awaiting-repair" && candidate.callsUsed.repair === 0))) return null;
  const repairBundleBinding = repairBundleBindings.get(roundOneBundle);
  const repairBlockers = repairBlockersByInstruction.get(repairInstruction as object);
  const roundOneCapture = bundleCaptureBindings.get(roundOneBundle as object);
  if (!repairBundleBinding || repairBundleBinding.candidate !== candidate
    || repairBundleBinding.instruction !== repairInstruction
    || repairCaptureByInstruction.get(repairInstruction) !== roundOneBundle
    || !repairBlockers || !roundOneCapture || roundOneCapture.round !== 1) return null;
  const binding = candidateBindings.get(candidate)!;
  const authority = binding.authority;
  const preRepairQ9Custody = Object.freeze({
    qualityLoopAuthorityRequired: binding.lineage.qualityLoopAuthorityRequired,
    assessmentRestartCustody: binding.lineage.assessmentRestartCustody,
    repairAuthority: binding.lineage.repairAuthority,
    repairAuthoritySha256: binding.lineage.repairAuthoritySha256,
    policyDecision: binding.lineage.policyDecision,
    completionAuthority: binding.lineage.completionAuthority,
    attempts: Object.freeze(binding.lineage.attempts.map((item) => Object.freeze({
      reservation: item.reservation,
      status: item.status,
      resultAuthoritySha256: item.resultAuthoritySha256,
      unavailableReason: item.unavailableReason,
    }))),
  }) as SerialCandidateQ9PendingCustodyV1;
  if (bundleBindings.get(roundOneBundle) !== authority
    || roundOneBundle.projectRootSha256 !== candidate.projectRootSha256
    || roundOneBundle.baseHead !== candidate.lineage.round0Bundle.baseHead
    || roundOneBundle.taskSpecSha256 !== candidate.taskSpecSha256
    || roundOneBundle.evidencePlanSha256 !== candidate.evidencePlanSha256
    || candidate.bundle !== candidate.lineage.round0Bundle
    || candidate.bundleSha256 !== candidate.lineage.round0BundleSha256
    || repairInstruction.runId !== candidate.runId
    || repairInstruction.generation !== (q9Reservation === null ? candidate.generation : candidate.generation - 1)
    || repairInstruction.taskSpecSha256 !== candidate.taskSpecSha256
    || repairInstruction.evidencePlanSha256 !== candidate.evidencePlanSha256
    || repairInstruction.candidateSha256 !== candidate.candidateSha256
    || repairInstruction.bundleSha256 !== candidate.bundleSha256
    || (q9Reservation === null && repairInstruction.evidenceStateSha256 !== candidate.evidenceStateSha256)
    || (q9Reservation !== null
      && q9Reservation.reservation.instructionSha256 !== repairInstruction.repairInstructionSha256)) return null;
  const claims = parseTaskSpecWorkerClaims(claimsText, {
    taskSpecSha256: authority.taskSpecSha256,
    criterionIds: authority.taskSpec.quality.acceptanceChecks.map((row) => row.id),
    preferenceIds: authority.taskSpec.quality.qualityPreferences.map((row) => row.id),
  });
  if (!claims || claims.disposition !== "DONE") return null;
  const claimsSha256 = sha256(canonicalClaims(claims));
  const generation = candidate.generation + 1;
  const candidateSha256 = sha256(canonicalObject([
    ["version", quote(SERIAL_POST_REPAIR_CANDIDATE_VERSION)],
    ["runId", quote(candidate.runId)],
    ["generation", String(generation)],
    ["round", "1"],
    ["previousCandidateSha256", quote(candidate.candidateSha256)],
    ["taskSpecSha256", quote(candidate.taskSpecSha256)],
    ["evidencePlanSha256", quote(candidate.evidencePlanSha256)],
    ["round0BundleSha256", quote(candidate.lineage.round0BundleSha256)],
    ["round1BundleSha256", quote(roundOneBundle.bundleSha256)],
    ["repairInstructionSha256", quote(repairInstruction.repairInstructionSha256)],
    ["claimsSha256", quote(claimsSha256)],
    ["repairAvailability", quote("REPAIR_SPENT")],
  ]));
  const evidenceStateSha256 = sha256(canonicalObject([
    ["version", quote(SERIAL_POST_REPAIR_CANDIDATE_VERSION)],
    ["previousEvidenceStateSha256", quote(candidate.evidenceStateSha256)],
    ["candidateSha256", quote(candidateSha256)],
    ["evidencePlanSha256", quote(candidate.evidencePlanSha256)],
    ["round1BundleSha256", quote(roundOneBundle.bundleSha256)],
    ["claimsSha256", quote(claimsSha256)],
  ]));
  const phase: SerialCandidatePhaseV1 = candidate.criticMode === "off" ? "ready-to-seal" : "awaiting-critic";
  const replacement = mintCandidate(authority, binding.lineage, {
    ...candidate,
    generation,
    lineage: candidate.lineage,
    round: 1,
    bundle: roundOneBundle,
    bundleSha256: roundOneBundle.bundleSha256,
    claims,
    claimsSha256,
    candidateSha256,
    evidenceStateSha256,
    repairEligibility: null,
    repairUnavailableReason: "REPAIR_SPENT",
    phase,
    pendingOwnerReason: null,
    callsUsed: Object.freeze({ builder: 1, repair: 1, critic: candidate.callsUsed.critic, externalEvidence: 0 }),
  });
  const roundOneCaptureContext = deepFreeze({
    round: 1 as const,
    baseHead: roundOneCapture.baseHead,
    taskPaths: Object.freeze([...roundOneCapture.taskPaths]),
    protectedPaths: Object.freeze([...roundOneCapture.protectedPaths]),
    ownedPaths: Object.freeze([...roundOneCapture.ownedPaths]),
  });
  pendingRepairLineageByLineage.set(binding.lineage, Object.freeze({
    preRepairCandidate: candidate,
    postRepairCandidate: replacement,
    preRepairTransitionHistory: Object.freeze([...binding.lineage.transitionHistory]),
    preRepairQ9Custody,
    repairInstruction,
    blockers: repairBlockers,
    roundOneBundle,
    roundOneCaptureContext,
  }));
  if (q9Reservation !== null) {
    q9Reservation.attempt.status = "completed";
    q9Reservation.attempt.resultAuthoritySha256 = roundOneBundle.bundleSha256;
    spentAttemptReservations.add(q9Reservation.reservation);
  }
  spentRepairInstructions.add(repairInstruction);
  repairInstructionBindings.delete(repairInstruction);
  repairBundleBindings.delete(roundOneBundle);
  repairCaptureByInstruction.delete(repairInstruction);
  return replacement;
}

/** Core-internal restart projection. It exposes only process-branded repair
 * custody already bound to this exact lineage and is deliberately not
 * exported from the package root. */
export function serialCandidatePendingRepairLineage(
  value: unknown,
): SerialCandidatePendingRepairLineageV1 | null {
  if (!isCurrentSerialCandidate(value) || value.round !== 1 || value.callsUsed.repair !== 1) return null;
  const binding = candidateBindings.get(value)!;
  const repair = pendingRepairLineageByLineage.get(binding.lineage);
  if (!repair || repair.preRepairCandidate.runId !== value.runId
    || repair.preRepairCandidate.round !== 0
    || (repair.preRepairCandidate.callsUsed.repair !== 0 && repair.preRepairCandidate.callsUsed.repair !== 1)
    || repair.postRepairCandidate.round !== 1 || repair.postRepairCandidate.callsUsed.repair !== 1
    || repair.roundOneBundle !== repair.postRepairCandidate.bundle
    || repair.repairInstruction.candidateSha256 !== repair.preRepairCandidate.candidateSha256
    || repair.repairInstruction.repairInstructionSha256.length !== 64) return null;
  return repair;
}

/** Core-internal restart mint. The live repair authorization path intentionally
 * requires round-zero workspace bytes; restart cannot, because the workspace
 * now contains the already-captured round-one bytes. This helper instead
 * recomputes the exact instruction from frozen cN authority, restores the
 * canonical bundle under its original root/path context, and lets the normal
 * one-use replacement mint re-derive every candidate hash and counter. */
export function restoreSerialCandidateAfterRepairForPending(
  root: string,
  preRepairCandidateValue: unknown,
  raw: unknown,
): SerialCandidateV1 | null {
  try {
    if (!isCurrentSerialCandidate(preRepairCandidateValue)
      || preRepairCandidateValue.round !== 0
      || !((preRepairCandidateValue.callsUsed.repair === 0 && preRepairCandidateValue.phase === "awaiting-repair")
        || (preRepairCandidateValue.callsUsed.repair === 1 && preRepairCandidateValue.phase === "awaiting-repair-result"))) return null;
    const candidate = preRepairCandidateValue;
    const record = inspectRecord(raw, [
      "repairInstruction", "blockers", "roundOneBundle", "roundOneCaptureContext", "claimsText",
    ]);
    if (!record || typeof record.claimsText !== "string" || record.claimsText.length > 262_144) return null;
    const blockers = parseBlockers(record.blockers, candidate);
    if (!blockers) return null;
    let instruction: SerialRepairInstructionV1;
    if (candidate.callsUsed.repair === 0) {
      instruction = mintSerialRepairInstruction(candidate, blockers);
      if (!sameRepairInstruction(instruction, record.repairInstruction)) return null;
    } else {
      const persisted = inspectRecord(record.repairInstruction, [
        "version", "runId", "generation", "round", "taskSpecSha256", "evidencePlanSha256",
        "candidateSha256", "bundleSha256", "evidenceStateSha256", "criterionIds", "artifactIds",
        "instruction", "repairInstructionSha256",
      ]);
      const reservationAttempt = candidateBindings.get(candidate)!.lineage.attempts.find((item) =>
        item.reservation.kind === "repair" && item.reservation.reservedGeneration === candidate.generation);
      if (!persisted || persisted.version !== SERIAL_REPAIR_INSTRUCTION_VERSION || persisted.runId !== candidate.runId
        || persisted.generation !== candidate.generation - 1 || persisted.round !== 0
        || persisted.taskSpecSha256 !== candidate.taskSpecSha256 || persisted.evidencePlanSha256 !== candidate.evidencePlanSha256
        || persisted.candidateSha256 !== candidate.candidateSha256 || persisted.bundleSha256 !== candidate.bundleSha256
        || safeSha(persisted.evidenceStateSha256) === null || typeof persisted.instruction !== "string"
        || safeSha(persisted.repairInstructionSha256) === null || !reservationAttempt
        || reservationAttempt.status !== "reserved"
        || reservationAttempt.reservation.instructionSha256 !== persisted.repairInstructionSha256) return null;
      const criterionIds = inspectArray(persisted.criterionIds, 100);
      const artifactIds = inspectArray(persisted.artifactIds, 800);
      const expectedText = mintSerialRepairInstruction(candidate, blockers).instruction;
      const expectedCriteria = blockers.map((item) => item.criterionId);
      const expectedArtifacts = [...new Set(blockers.flatMap((item) => item.artifactIds))];
      if (!criterionIds || !artifactIds || persisted.instruction !== expectedText
        || !criterionIds.every((value) => typeof value === "string")
        || !artifactIds.every((value) => typeof value === "string")
        || !sameStrings(criterionIds as string[], expectedCriteria)
        || !sameStrings(artifactIds as string[], expectedArtifacts)) return null;
      const withoutSha = deepFreeze({
        version: SERIAL_REPAIR_INSTRUCTION_VERSION,
        runId: candidate.runId,
        generation: candidate.generation - 1,
        round: 0 as const,
        taskSpecSha256: candidate.taskSpecSha256,
        evidencePlanSha256: candidate.evidencePlanSha256,
        candidateSha256: candidate.candidateSha256,
        bundleSha256: candidate.bundleSha256,
        evidenceStateSha256: persisted.evidenceStateSha256 as string,
        criterionIds: Object.freeze(expectedCriteria),
        artifactIds: Object.freeze(expectedArtifacts),
        instruction: expectedText,
      }) as Omit<SerialRepairInstructionV1, "repairInstructionSha256">;
      if (sha256(canonicalRepairInstruction(withoutSha)) !== persisted.repairInstructionSha256) return null;
      instruction = deepFreeze({
        ...withoutSha,
        repairInstructionSha256: persisted.repairInstructionSha256,
      }) as SerialRepairInstructionV1;
    }
    const capture = inspectRecord(record.roundOneCaptureContext, [
      "round", "baseHead", "taskPaths", "protectedPaths", "ownedPaths",
    ]);
    const roundZeroCapture = bundleCaptureBindings.get(candidate.lineage.round0Bundle);
    if (!capture || capture.round !== 1 || !roundZeroCapture
      || capture.baseHead !== roundZeroCapture.baseHead) return null;
    const roundOneBundle = restoreSerialCandidateBundleForPending(
      root,
      candidateBindings.get(candidate)!.authority,
      record.roundOneBundle,
      capture,
    );
    const restoredCapture = roundOneBundle ? bundleCaptureBindings.get(roundOneBundle) : null;
    if (!roundOneBundle || !restoredCapture || restoredCapture.round !== 1
      || restoredCapture.rootReal !== roundZeroCapture.rootReal
      || !sameStrings(restoredCapture.protectedPaths, roundZeroCapture.protectedPaths)
      || !sameStrings(restoredCapture.ownedPaths, roundZeroCapture.ownedPaths)) return null;
    repairByCandidate.add(candidate);
    repairInstructionBrand.add(instruction);
    repairInstructionBindings.set(instruction, candidate);
    repairBlockersByInstruction.set(instruction, blockers);
    repairBundleBindings.set(roundOneBundle, Object.freeze({ candidate, instruction }));
    repairCaptureByInstruction.set(instruction, roundOneBundle);
    return replaceSerialCandidateAfterRepair(
      candidate,
      instruction,
      roundOneBundle,
      record.claimsText,
    );
  } catch {
    return null;
  }
}

/**
 * Main's staged Q6 seal gate. This mint authenticates one exact, current
 * candidate and records the closed completeness predicate; it does not derive
 * that predicate from worker prose or from CriticPolicyResultV1. Activated Q9
 * candidates categorically refuse this legacy structural mint and must consume
 * an exact branded completion authority instead. No renderer or adapter
 * receives the internal pending-capsule restoration seam.
 */
function sealAuthorizationRecordMatchesCandidate(
  candidate: SerialCandidateV1,
  raw: unknown,
): boolean {
  const record = inspectRecord(raw, [
    "version", "runId", "generation", "taskNumber", "projectRootSha256", "round", "taskSpecSha256",
    "evidencePlanSha256", "candidateSha256", "bundleSha256", "evidenceStateSha256",
    "requiredCriteriaComplete", "confirmedBlockerCount", "nativeStopCount",
  ]);
  if (!record) return false;
  return record.version === SERIAL_CANDIDATE_SEAL_AUTHORIZATION_VERSION
    && transitionBinding({ ...record, version: SERIAL_CANDIDATE_TRANSITION_VERSION }, candidate)
    && record.requiredCriteriaComplete === true
    && Object.is(record.confirmedBlockerCount, 0)
    && Object.is(record.nativeStopCount, 0);
}

export function composeSerialCandidateSealAuthorization(candidate: unknown, raw: unknown): SerialCandidateSealAuthorizationV1 | null {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "ready-to-seal") return null;
  const lineage = candidateBindings.get(candidate)!.lineage;
  if (lineage.qualityLoopAuthorityRequired || !sealAuthorizationRecordMatchesCandidate(candidate, raw)) return null;
  return mintSerialCandidateSealAuthorization(candidate);
}

registerSerialCandidatePendingSealRestorer((
  candidate,
  raw,
  pendingRestoreAuthority,
  capsuleSha256,
) => {
  if (!isCurrentSerialCandidate(candidate) || candidate.phase !== "ready-to-seal") return null;
  const binding = candidateBindings.get(candidate)!;
  if (!binding.lineage.qualityLoopAuthorityRequired
    || !serialPendingRestoreAuthorityCovers(pendingRestoreAuthority, {
      capsuleSha256,
      projectRootSha256: candidate.projectRootSha256,
      runId: candidate.runId,
      candidateSha256: candidate.candidateSha256,
    })
    || !completionAuthorityCoversCandidate(candidate, binding.lineage.completionAuthority)
    || !sealAuthorizationRecordMatchesCandidate(candidate, raw)) return null;
  return mintSerialCandidateSealAuthorization(candidate);
});

export function isSerialCandidateSealAuthorization(value: unknown, candidate?: unknown): value is SerialCandidateSealAuthorizationV1 {
  if (typeof value !== "object" || value === null || !sealAuthorizationBrand.has(value)) return false;
  const bound = sealAuthorizationBindings.get(value);
  return bound !== undefined && (candidate === undefined || bound === candidate);
}

export function beginSerialCandidateTerminal(
  candidate: unknown,
  disposition: "DONE",
  sealAuthorization: unknown,
): SerialCandidateTerminalTokenV1 | null;
export function beginSerialCandidateTerminal(
  candidate: unknown,
  disposition: "STOPPED",
  sealAuthorization?: undefined,
): SerialCandidateTerminalTokenV1 | null;
export function beginSerialCandidateTerminal(
  candidate: unknown,
  disposition: "DONE" | "STOPPED",
  sealAuthorization?: unknown,
): SerialCandidateTerminalTokenV1 | null {
  if (!isCurrentSerialCandidate(candidate) || (disposition !== "DONE" && disposition !== "STOPPED")) return null;
  if (candidate.phase === "done" || candidate.phase === "stopped") return null;
  if (disposition === "DONE" && (candidate.phase !== "ready-to-seal" || !isSerialCandidateSealAuthorization(sealAuthorization, candidate))) return null;
  if (disposition === "STOPPED" && sealAuthorization !== undefined) return null;
  const binding = candidateBindings.get(candidate)!;
  binding.lineage.terminalReserved = true;
  const token = Object.freeze({
    version: SERIAL_CANDIDATE_TERMINAL_TOKEN_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    candidateSha256: candidate.candidateSha256,
    requestedDisposition: disposition,
  }) as SerialCandidateTerminalTokenV1;
  const used = { value: false };
  terminalTokenBrand.add(token);
  terminalTokenBindings.set(token, Object.freeze({ candidate, lineage: binding.lineage, requestedDisposition: disposition, used }));
  return token;
}

export function completeSerialCandidateTerminal(
  token: unknown,
  outcome?: "DONE" | "STOPPED",
): SerialCandidateV1 | null {
  if (typeof token !== "object" || token === null || !terminalTokenBrand.has(token)) return null;
  const binding = terminalTokenBindings.get(token);
  if (!binding || binding.used.value || !binding.lineage.terminalReserved || binding.lineage.current !== binding.candidate) return null;
  const actual = outcome ?? binding.requestedDisposition;
  if ((actual !== "DONE" && actual !== "STOPPED") || (binding.requestedDisposition === "STOPPED" && actual !== "STOPPED")) return null;
  binding.used.value = true;
  const candidateBinding = candidateBindings.get(binding.candidate)!;
  const terminal = mintCandidate(candidateBinding.authority, binding.lineage, {
    ...binding.candidate,
    generation: binding.candidate.generation + 1,
    phase: actual === "DONE" ? "done" : "stopped",
    pendingOwnerReason: null,
    evidenceStateSha256: sha256(canonicalObject([
      ["previous", quote(binding.candidate.evidenceStateSha256)],
      ["terminal", quote(actual)],
    ])),
  });
  binding.lineage.terminalReserved = false;
  return terminal;
}
