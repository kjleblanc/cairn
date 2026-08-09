import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  opendirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { types as nodeTypes } from "node:util";

export const PENDING_RUN_STATE_VERSION = "cairn-pending-run-state/v1" as const;
export const PENDING_RUN_GATE_VERSION = "cairn-pending-run-gate/v1" as const;
export const PENDING_RUN_CAPSULE_VERSION = "cairn-pending-run-core-capsule/v1" as const;
export const PENDING_RUN_REVISION_VERSION = "cairn-pending-run-revision/v1" as const;
export const PENDING_RUN_HIGH_WATER_VERSION = "cairn-pending-run-high-water/v1" as const;
export const PENDING_RUN_CLOSE_VERSION = "cairn-pending-run-close/v1" as const;
export const PENDING_RUN_INVENTORY_VERSION = "cairn-pending-run-inventory/v1" as const;
export const PENDING_RUN_INVENTORY_ANCHOR_VERSION = "cairn-pending-run-inventory-anchor/v1" as const;
const PENDING_RUN_PROFILE_HIGH_WATER_VERSION = "cairn-pending-run-profile-high-water/v1" as const;

export const PENDING_RUN_LIMITS = Object.freeze({
  capsuleBytes: 4 * 1024 * 1024,
  journalBytes: 32 * 1024 * 1024,
  scannedJournalBytes: 64 * 1024 * 1024,
  projectDirectories: 128,
  runDirectories: 128,
  displayOutcomeCharacters: 500,
  routeTextCharacters: 200,
  revisions: 32,
} as const);

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const GIT_OBJECT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const REVISION_FILE = /^([0-9]{8})\.json$/;
const AUTH_KEY_BYTES = 32;
const PROFILE_AUTH_KEY_NAME = ".cairn-pending-run-main-key-v1";
const PROFILE_HIGH_WATER_NAME = ".cairn-pending-run-profile-high-water-v1";
const REVISION_DIR_NAME = "revisions";
const CAPSULE_DIR_NAME = "capsules";
const HIGH_WATER_NAME = "high-water.json";
const CLOSE_NAME = "closed.json";
const INVENTORY_NAME = "active-runs.json";
const INVENTORY_ANCHOR_NAME = "inventory-anchor.json";
const INVENTORY_STAGE_NAME = "active-runs.next.json";
const REVISION_AUTH_DOMAIN = "cairn-pending-run-revision-auth/v1";
const HIGH_WATER_AUTH_DOMAIN = "cairn-pending-run-high-water-auth/v1";
const CLOSE_AUTH_DOMAIN = "cairn-pending-run-close-auth/v1";
const INVENTORY_AUTH_DOMAIN = "cairn-pending-run-inventory-auth/v1";
const INVENTORY_ANCHOR_AUTH_DOMAIN = "cairn-pending-run-inventory-anchor-auth/v1";
const PROFILE_HIGH_WATER_AUTH_DOMAIN = "cairn-pending-run-profile-high-water-auth/v1";
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;

export type PendingRunPhaseV1 =
  | "awaiting-critic"
  | "awaiting-owner-resolution"
  | "awaiting-repair"
  | "ready-to-seal"
  | "terminal-prepared";

export type PendingRunCallCounterV1 = Readonly<{
  spent: number;
  remaining: number;
}>;

export type PendingRunCountersV1 = Readonly<{
  builder: PendingRunCallCounterV1;
  repair: PendingRunCallCounterV1;
  critic: PendingRunCallCounterV1;
  externalEvidence: PendingRunCallCounterV1;
}>;

export type PendingRunRouteReceiptV1 = Readonly<{
  adapterLabel: string;
  provider: string;
  model: string;
  receiptSha256: string;
}>;

export type PendingRunTerminalActionV1 = Readonly<{
  actionId: string;
  kind: "finalize" | "stop";
  candidateSha256: string;
  capsuleSha256: string;
}>;

export type PendingRunStateV1 = Readonly<{
  version: typeof PENDING_RUN_STATE_VERSION;
  displayOutcome: string;
  taskNumber: number;
  phase: PendingRunPhaseV1;
  criticMode: "required" | "optional" | "off";
  generation: number;
  round: 0 | 1;
  baseHead: string;
  gitStateSha256: string;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  candidateSha256: string;
  capsuleSha256: string;
  bundleSha256s: readonly string[];
  evidenceRunId: string | null;
  evidenceStateSha256: string | null;
  evidenceRevision: number;
  route: PendingRunRouteReceiptV1;
  counters: PendingRunCountersV1;
  terminalAction: PendingRunTerminalActionV1 | null;
}>;

export type PendingRunCapsuleEnvelopeV1 = Readonly<{
  version: typeof PENDING_RUN_CAPSULE_VERSION;
  byteLength: number;
  capsuleSha256: string;
}>;

export type PendingRunGateProjectionV1 = Readonly<{
  version: typeof PENDING_RUN_GATE_VERSION;
  status: "pending" | "recovery-required";
  projectHash: string;
  runId: string | null;
  revision: number | null;
  state: PendingRunStateV1 | null;
}>;

export type PendingRunBootProjectionV1 = Readonly<{
  ready: boolean;
  activeProjects: number;
  recoveryRequired: boolean;
}>;

export type PendingRunMutationResultV1 =
  | Readonly<{ ok: true; value: PendingRunGateProjectionV1 }>
  | Readonly<{ ok: false; code: string }>;

export type PendingRunAuthorityV1 = Readonly<{
  readonly kind: "cairn-pending-run-authority/v1";
}>;

export type PendingRunRecoveryInputV1 = Readonly<{
  authority: PendingRunAuthorityV1;
  projectRoot: string;
  capsule: Readonly<{
    version: typeof PENDING_RUN_CAPSULE_VERSION;
    canonicalBytes: Uint8Array;
    capsuleSha256: string;
  }>;
  projection: PendingRunGateProjectionV1;
}>;

export type PendingRunCreateInputV1 = Readonly<{
  projectRoot: string;
  runId: string;
  state: PendingRunStateV1;
  capsuleBytes: Uint8Array;
}>;

type ProjectIdentity = Readonly<{
  canonicalRoot: string;
  projectHash: string;
  deviceId: bigint;
  fileId: bigint;
}>;

type LivePendingRun = {
  identity: ProjectIdentity;
  runId: string;
  revision: number;
  state: PendingRunStateV1 | null;
  capsule: PendingRunCapsuleEnvelopeV1 | null;
  status: "pending" | "recovery-required";
  authority: PendingRunAuthorityV1;
  revisionSha256: string | null;
  directory: string | null;
  closedReceiptSha256: string | null;
  closedActionId: string | null;
  journalBytes: number;
  reservedJournalBytes: number;
};

type StoredProjectIdentityV1 = Readonly<{
  canonicalRoot: string;
  projectHash: string;
  deviceId: string;
  fileId: string;
}>;

type PendingRunRevisionRecordV1 = Readonly<{
  version: typeof PENDING_RUN_REVISION_VERSION;
  project: StoredProjectIdentityV1;
  runId: string;
  revision: number;
  previousRevisionSha256: string | null;
  state: PendingRunStateV1;
  capsule: PendingRunCapsuleEnvelopeV1;
  revisionSha256: string;
  authSha256: string;
}>;

type PendingRunHighWaterRecordV1 = Readonly<{
  version: typeof PENDING_RUN_HIGH_WATER_VERSION;
  projectHash: string;
  runId: string;
  revision: number;
  revisionSha256: string;
  authSha256: string;
}>;

type PendingRunCloseRecordV1 = Readonly<{
  version: typeof PENDING_RUN_CLOSE_VERSION;
  projectHash: string;
  runId: string;
  revision: number;
  revisionSha256: string;
  actionId: string;
  actionKind: "finalize" | "stop";
  terminalReceiptSha256: string;
  authSha256: string;
}>;

type PendingRunInventoryEntryV1 = Readonly<{
  projectHash: string;
  runId: string;
  revision: number;
  revisionSha256: string;
}>;

type PendingRunInventoryRecordV1 = Readonly<{
  version: typeof PENDING_RUN_INVENTORY_VERSION;
  generation: number;
  entries: readonly PendingRunInventoryEntryV1[];
  authSha256: string;
}>;

type PendingRunInventoryAnchorPointV1 = Readonly<{
  generation: number;
  inventorySha256: string;
}>;

type PendingRunInventoryCloseIntentV1 = Readonly<{
  projectHash: string;
  runId: string;
  revision: number;
  revisionSha256: string;
  actionId: string;
  actionKind: "finalize" | "stop";
  terminalReceiptSha256: string;
}>;

type PendingRunInventoryAnchorPendingV1 = Readonly<{
  generation: number;
  inventorySha256: string;
  close: PendingRunInventoryCloseIntentV1 | null;
}>;

type PendingRunInventoryAnchorRecordV1 = Readonly<{
  version: typeof PENDING_RUN_INVENTORY_ANCHOR_VERSION;
  committed: PendingRunInventoryAnchorPointV1;
  pending: PendingRunInventoryAnchorPendingV1 | null;
  authSha256: string;
}>;

type PendingRunProfileHighWaterRecordV1 = Readonly<{
  version: typeof PENDING_RUN_PROFILE_HIGH_WATER_VERSION;
  profileBindingSha256: string;
  committed: PendingRunInventoryAnchorPointV1;
  authSha256: string;
}>;

const liveByProjectHash = new Map<string, LivePendingRun>();
const authorityBindings = new WeakMap<object, LivePendingRun>();
let configuredProfileRoot: string | null = null;
let configuredStoreRoot: string | null = null;
let globallyUnsafe = false;
let mainAuthKey: Buffer | null = null;
let reservedJournalBytes = 0;
let interruptAfterInventoryIntentForTests = false;
let interruptAfterCloseIntentForTests = false;

function inside(parent: string, child: string): boolean {
  const value = relative(parent, child);
  return value === "" || (value !== ".." && !value.startsWith(`..\\`) && !value.startsWith("../") && !isAbsolute(value));
}

function sameIdentity(left: { dev: bigint; ino: bigint }, right: { dev: bigint; ino: bigint }): boolean {
  return left.dev > 0n && left.ino > 0n && left.dev === right.dev && left.ino === right.ino;
}

function normalizedRoot(value: string): string {
  const slashed = process.platform === "win32" ? value.replace(/\\/g, "/").toLowerCase() : value;
  return slashed;
}

function projectIdentity(projectRoot: string): ProjectIdentity | null {
  try {
    if (typeof projectRoot !== "string" || projectRoot.length === 0 || projectRoot.length > 4_096 || projectRoot.includes("\0")) return null;
    const lexical = resolve(projectRoot);
    const beforeRoot = realpathSync.native(lexical);
    const before = lstatSync(beforeRoot, { bigint: true });
    const afterRoot = realpathSync.native(lexical);
    const after = lstatSync(afterRoot, { bigint: true });
    if (!before.isDirectory() || before.isSymbolicLink() || !after.isDirectory() || after.isSymbolicLink()
      || normalizedRoot(beforeRoot) !== normalizedRoot(afterRoot) || !sameIdentity(before, after)) return null;
    const canonicalRoot = afterRoot;
    return Object.freeze({
      canonicalRoot,
      projectHash: createHash("sha256").update(normalizedRoot(canonicalRoot), "utf8").digest("hex"),
      deviceId: after.dev,
      fileId: after.ino,
    });
  } catch {
    return null;
  }
}

function configuredIdentity(projectRoot: string): ProjectIdentity | null {
  const identity = projectIdentity(projectRoot);
  if (identity === null || configuredProfileRoot === null) return null;
  const profile = configuredProfileRoot;
  const project = realpathSync.native(identity.canonicalRoot);
  return inside(profile, project) || inside(project, profile) ? null : identity;
}

function exactDataRecord(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function denseArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > cap) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== value.length + 1 || !keys.includes("length")) return null;
    const output: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function visible(value: unknown, cap: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= cap
    && value.trim().length > 0 && !FORBIDDEN_VISIBLE_CONTROLS.test(value) && !/[\r\n]/u.test(value);
}

function safeInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function counter(value: unknown, maximum: number): PendingRunCallCounterV1 | null {
  const record = exactDataRecord(value, ["spent", "remaining"]);
  if (!record || !safeInteger(record.spent, 0, maximum) || !safeInteger(record.remaining, 0, maximum)
    || record.spent + record.remaining !== maximum) return null;
  return Object.freeze({ spent: record.spent, remaining: record.remaining });
}

function parseState(value: unknown, capsuleSha256?: string): PendingRunStateV1 | null {
  const record = exactDataRecord(value, [
    "version", "displayOutcome", "taskNumber", "phase", "criticMode", "generation", "round", "baseHead", "gitStateSha256",
    "taskSpecSha256", "evidencePlanSha256", "candidateSha256", "capsuleSha256", "bundleSha256s", "evidenceRunId",
    "evidenceStateSha256", "evidenceRevision", "route", "counters", "terminalAction",
  ]);
  if (!record || record.version !== PENDING_RUN_STATE_VERSION || !visible(record.displayOutcome, PENDING_RUN_LIMITS.displayOutcomeCharacters)
    || !safeInteger(record.taskNumber, 1, 999_999)
    || !safeInteger(record.generation, 0, PENDING_RUN_LIMITS.revisions)
    || (record.round !== 0 && record.round !== 1) || typeof record.baseHead !== "string" || !GIT_OBJECT.test(record.baseHead)
    || typeof record.gitStateSha256 !== "string" || !SHA256.test(record.gitStateSha256)
    || typeof record.taskSpecSha256 !== "string" || !SHA256.test(record.taskSpecSha256)
    || typeof record.evidencePlanSha256 !== "string" || !SHA256.test(record.evidencePlanSha256)
    || typeof record.candidateSha256 !== "string" || !SHA256.test(record.candidateSha256)
    || typeof record.capsuleSha256 !== "string" || !SHA256.test(record.capsuleSha256)
    || (capsuleSha256 !== undefined && record.capsuleSha256 !== capsuleSha256)
    || !safeInteger(record.evidenceRevision, 0, PENDING_RUN_LIMITS.revisions)) return null;
  if (!["awaiting-critic", "awaiting-owner-resolution", "awaiting-repair", "ready-to-seal", "terminal-prepared"].includes(String(record.phase))) return null;
  if (record.criticMode !== "required" && record.criticMode !== "optional" && record.criticMode !== "off") return null;
  if (record.criticMode === "off" && record.phase === "awaiting-critic") return null;
  const bundles = denseArray(record.bundleSha256s, 2);
  if (!bundles || bundles.length !== Number(record.round) + 1 || bundles.some((item) => typeof item !== "string" || !SHA256.test(item))) return null;
  if (record.evidenceRunId !== null && (typeof record.evidenceRunId !== "string" || !UUID_V4.test(record.evidenceRunId))) return null;
  if (record.evidenceStateSha256 !== null && (typeof record.evidenceStateSha256 !== "string" || !SHA256.test(record.evidenceStateSha256))) return null;
  if ((record.evidenceRunId === null) !== (record.evidenceStateSha256 === null)
    || (record.evidenceRunId === null && record.evidenceRevision !== 0)) return null;
  const route = exactDataRecord(record.route, ["adapterLabel", "provider", "model", "receiptSha256"]);
  if (!route || !visible(route.adapterLabel, PENDING_RUN_LIMITS.routeTextCharacters)
    || !visible(route.provider, PENDING_RUN_LIMITS.routeTextCharacters) || !visible(route.model, PENDING_RUN_LIMITS.routeTextCharacters)
    || typeof route.receiptSha256 !== "string" || !SHA256.test(route.receiptSha256)) return null;
  const countersValue = exactDataRecord(record.counters, ["builder", "repair", "critic", "externalEvidence"]);
  if (!countersValue) return null;
  const builder = counter(countersValue.builder, 1);
  const repair = counter(countersValue.repair, 1);
  const critic = counter(countersValue.critic, 3);
  const externalEvidence = counter(countersValue.externalEvidence, 0);
  if (!builder || builder.spent !== 1 || !repair || !critic || !externalEvidence) return null;
  let terminalAction: PendingRunTerminalActionV1 | null = null;
  if (record.phase === "terminal-prepared") {
    const action = exactDataRecord(record.terminalAction, ["actionId", "kind", "candidateSha256", "capsuleSha256"]);
    if (!action || typeof action.actionId !== "string" || !UUID_V4.test(action.actionId)
      || (action.kind !== "finalize" && action.kind !== "stop") || action.candidateSha256 !== record.candidateSha256
      || typeof action.capsuleSha256 !== "string" || !SHA256.test(action.capsuleSha256)
      || action.capsuleSha256 !== record.capsuleSha256
      || (capsuleSha256 !== undefined && action.capsuleSha256 !== capsuleSha256)) return null;
    terminalAction = Object.freeze({
      actionId: action.actionId,
      kind: action.kind,
      candidateSha256: action.candidateSha256 as string,
      capsuleSha256: action.capsuleSha256,
    });
  } else if (record.terminalAction !== null) return null;
  return Object.freeze({
    version: PENDING_RUN_STATE_VERSION,
    displayOutcome: record.displayOutcome as string,
    taskNumber: record.taskNumber,
    phase: record.phase as PendingRunPhaseV1,
    criticMode: record.criticMode,
    generation: record.generation,
    round: record.round,
    baseHead: record.baseHead,
    gitStateSha256: record.gitStateSha256,
    taskSpecSha256: record.taskSpecSha256,
    evidencePlanSha256: record.evidencePlanSha256,
    candidateSha256: record.candidateSha256,
    capsuleSha256: record.capsuleSha256,
    bundleSha256s: Object.freeze(bundles as string[]),
    evidenceRunId: record.evidenceRunId as string | null,
    evidenceStateSha256: record.evidenceStateSha256 as string | null,
    evidenceRevision: record.evidenceRevision,
    route: Object.freeze({ adapterLabel: route.adapterLabel, provider: route.provider, model: route.model, receiptSha256: route.receiptSha256 }),
    counters: Object.freeze({ builder, repair, critic, externalEvidence }),
    terminalAction,
  } as PendingRunStateV1);
}

function projection(run: LivePendingRun): PendingRunGateProjectionV1 {
  return Object.freeze({
    version: PENDING_RUN_GATE_VERSION,
    status: run.status,
    projectHash: run.identity.projectHash,
    runId: run.runId || null,
    revision: run.revision > 0 ? run.revision : null,
    state: run.state,
  });
}

function mintAuthority(run: LivePendingRun): PendingRunAuthorityV1 {
  const authority = Object.freeze({ kind: "cairn-pending-run-authority/v1" as const });
  authorityBindings.set(authority, run);
  return authority;
}

function recoveryRun(identity: ProjectIdentity, runId = ""): LivePendingRun {
  const run = {
    identity, runId, revision: 0, state: null, capsule: null,
    status: "recovery-required" as const,
    authority: null as unknown as PendingRunAuthorityV1,
    revisionSha256: null,
    directory: null,
    closedReceiptSha256: null,
    closedActionId: null,
    journalBytes: 0,
    reservedJournalBytes: 0,
  };
  run.authority = mintAuthority(run);
  return run;
}

function reserveRunJournalBytes(run: LivePendingRun, nextBytes: number): boolean {
  if (!Number.isSafeInteger(nextBytes) || nextBytes < run.journalBytes
    || nextBytes > PENDING_RUN_LIMITS.journalBytes) return false;
  const nextReservation = Math.max(run.reservedJournalBytes, nextBytes);
  const added = nextReservation - run.reservedJournalBytes;
  if (reservedJournalBytes + added > PENDING_RUN_LIMITS.scannedJournalBytes) return false;
  reservedJournalBytes += added;
  run.reservedJournalBytes = nextReservation;
  return true;
}

function settleClosedRunJournalBytes(run: LivePendingRun, exactBytes: number): boolean {
  if (!Number.isSafeInteger(exactBytes) || exactBytes < run.journalBytes
    || exactBytes > run.reservedJournalBytes || exactBytes > PENDING_RUN_LIMITS.journalBytes) return false;
  reservedJournalBytes -= run.reservedJournalBytes - exactBytes;
  run.journalBytes = exactBytes;
  run.reservedJournalBytes = exactBytes;
  return reservedJournalBytes >= 0;
}

function initialRunJournalBytes(run: LivePendingRun, state: PendingRunStateV1, bytes: Buffer): number | null {
  const capsule = capsuleEnvelope(bytes);
  const record = composeRevision(run.identity, run.runId, 1, null, state, capsule);
  const staged = { ...run, revision: 1, revisionSha256: record.revisionSha256 } as LivePendingRun;
  const highWater = composeHighWater(staged, record.revisionSha256);
  const total = bytes.byteLength + encodedRecord(record).byteLength + encodedRecord(highWater).byteLength;
  return Number.isSafeInteger(total) && total <= PENDING_RUN_LIMITS.journalBytes ? total : null;
}

const CAPSULE_FILE = /^([0-9a-f]{64})\.bin$/;
const PROJECT_DIRECTORY = /^[0-9a-f]{64}$/;

type BoundFile = Readonly<{
  bytes: Buffer;
  deviceId: bigint;
  fileId: bigint;
  size: bigint;
  modifiedNs: bigint;
  changedNs: bigint;
}>;

type ScannedRun = Readonly<{
  run: LivePendingRun;
  closed: boolean;
  capsuleBytes: Buffer;
  journalBytes: number;
}>;

function failure(code: string): PendingRunMutationResultV1 {
  return Object.freeze({ ok: false, code });
}

function digest(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function encodedRecord(value: unknown): Buffer {
  return Buffer.from(`${canonicalJson(value)}\n`, "utf8");
}

function authenticated(domain: string, value: unknown): string {
  if (mainAuthKey === null) throw new Error("pending-run key unavailable");
  return createHmac("sha256", mainAuthKey).update(domain, "utf8").update("\0", "utf8")
    .update(canonicalJson(value), "utf8").digest("hex");
}

function equalDigest(left: string, right: string): boolean {
  if (!SHA256.test(left) || !SHA256.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function profileBindingSha256(): string | null {
  if (configuredProfileRoot === null) return null;
  try {
    const beforeRoot = realpathSync.native(configuredProfileRoot);
    const before = lstatSync(beforeRoot, { bigint: true });
    const afterRoot = realpathSync.native(configuredProfileRoot);
    const after = lstatSync(afterRoot, { bigint: true });
    if (!before.isDirectory() || before.isSymbolicLink() || !after.isDirectory() || after.isSymbolicLink()
      || normalizedRoot(beforeRoot) !== normalizedRoot(afterRoot) || !sameIdentity(before, after)) return null;
    return digest(`${normalizedRoot(afterRoot)}\0${after.dev.toString(10)}\0${after.ino.toString(10)}`);
  } catch {
    return null;
  }
}

function statIdentity(value: { dev: bigint; ino: bigint }): Readonly<{ dev: bigint; ino: bigint }> {
  return { dev: value.dev, ino: value.ino };
}

function readBoundFile(path: string, maximumBytes: number): BoundFile | null {
  let descriptor: number | null = null;
  try {
    const before = lstatSync(path, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size < 0n
      || before.size > BigInt(maximumBytes)) return null;
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameIdentity(statIdentity(before), statIdentity(opened))
      || opened.size !== before.size) return null;
    const bytes = readFileSync(descriptor);
    const afterRead = fstatSync(descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    if (!sameIdentity(statIdentity(opened), statIdentity(afterRead)) || !sameIdentity(statIdentity(opened), statIdentity(named))
      || afterRead.nlink !== 1n || named.nlink !== 1n || BigInt(bytes.byteLength) !== opened.size
      || afterRead.size !== opened.size || named.size !== opened.size
      || afterRead.mtimeNs !== opened.mtimeNs || afterRead.ctimeNs !== opened.ctimeNs
      || named.mtimeNs !== opened.mtimeNs || named.ctimeNs !== opened.ctimeNs) return null;
    return Object.freeze({
      bytes,
      deviceId: opened.dev,
      fileId: opened.ino,
      size: opened.size,
      modifiedNs: opened.mtimeNs,
      changedNs: opened.ctimeNs,
    });
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* read-only cleanup */ }
    }
  }
}

function safeDirectory(path: string, parent: string): boolean {
  try {
    const parentReal = realpathSync.native(parent);
    const before = lstatSync(path, { bigint: true });
    const real = realpathSync.native(path);
    const after = lstatSync(real, { bigint: true });
    return before.isDirectory() && !before.isSymbolicLink() && after.isDirectory() && !after.isSymbolicLink()
      && sameIdentity(statIdentity(before), statIdentity(after)) && inside(parentReal, real) && real !== parentReal;
  } catch {
    return false;
  }
}

function ensureDirectory(path: string, parent: string): boolean {
  try {
    if (!existsSync(path)) mkdirSync(path, { recursive: false, mode: 0o700 });
    return safeDirectory(path, parent);
  } catch {
    return false;
  }
}

function exactDirectoryNames(path: string, maximumEntries: number): readonly string[] | null {
  let directory: ReturnType<typeof opendirSync> | null = null;
  try {
    if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 0) return null;
    directory = opendirSync(path);
    const names: string[] = [];
    for (;;) {
      const entry = directory.readSync();
      if (entry === null) break;
      if (names.length >= maximumEntries) return null;
      names.push(entry.name);
    }
    return Object.freeze(names.sort((left, right) => left.localeCompare(right, "en")));
  } catch {
    return null;
  } finally {
    if (directory !== null) {
      try { directory.closeSync(); } catch { /* read-only cleanup */ }
    }
  }
}

function writeNewFile(path: string, bytes: Buffer): boolean {
  let descriptor: number | null = null;
  try {
    descriptor = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const written = fstatSync(descriptor, { bigint: true });
    if (!written.isFile() || written.nlink !== 1n || written.size !== BigInt(bytes.byteLength)) return false;
    closeSync(descriptor);
    descriptor = null;
    return readBoundFile(path, bytes.byteLength)?.bytes.equals(bytes) === true;
  } catch {
    return false;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* write cleanup */ }
    }
  }
}

function replaceFile(path: string, expected: Buffer | null, bytes: Buffer): boolean {
  const temporary = join(dirname(path), `.pending-${randomUUID()}.tmp`);
  try {
    if (!writeNewFile(temporary, bytes)) return false;
    const current = readBoundFile(path, PENDING_RUN_LIMITS.journalBytes);
    if (expected === null ? !namedPathAbsent(path) : current?.bytes.equals(expected) !== true) return false;
    renameSync(temporary, path);
    return readBoundFile(path, bytes.byteLength)?.bytes.equals(bytes) === true;
  } catch {
    return false;
  } finally {
    try { unlinkSync(temporary); } catch { /* renamed or already absent */ }
  }
}

function namedPathAbsent(path: string): boolean {
  try {
    lstatSync(path);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT";
  }
}

function safeBytes(value: unknown): Buffer | null {
  try {
    if (!(value instanceof Uint8Array) || nodeTypes.isProxy(value) || value.byteLength < 1
      || value.byteLength > PENDING_RUN_LIMITS.capsuleBytes) return null;
    return Buffer.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  } catch {
    return null;
  }
}

function storedIdentity(identity: ProjectIdentity): StoredProjectIdentityV1 {
  return Object.freeze({
    canonicalRoot: identity.canonicalRoot,
    projectHash: identity.projectHash,
    deviceId: identity.deviceId.toString(10),
    fileId: identity.fileId.toString(10),
  });
}

function parsedStoredIdentity(value: unknown, expectedProjectHash: string): ProjectIdentity | null {
  const record = exactDataRecord(value, ["canonicalRoot", "projectHash", "deviceId", "fileId"]);
  try {
    if (!record || typeof record.canonicalRoot !== "string" || record.canonicalRoot.length < 1
      || record.canonicalRoot.length > 4_096 || record.canonicalRoot.includes("\0") || !isAbsolute(record.canonicalRoot)
      || record.projectHash !== expectedProjectHash || typeof record.deviceId !== "string" || !/^[1-9][0-9]*$/.test(record.deviceId)
      || typeof record.fileId !== "string" || !/^[1-9][0-9]*$/.test(record.fileId)
      || digest(normalizedRoot(record.canonicalRoot)) !== expectedProjectHash) return null;
    return Object.freeze({
      canonicalRoot: record.canonicalRoot,
      projectHash: expectedProjectHash,
      deviceId: BigInt(record.deviceId),
      fileId: BigInt(record.fileId),
    });
  } catch {
    return null;
  }
}

function sameProjectIdentity(left: ProjectIdentity, right: ProjectIdentity): boolean {
  return normalizedRoot(left.canonicalRoot) === normalizedRoot(right.canonicalRoot)
    && left.projectHash === right.projectHash && left.deviceId === right.deviceId && left.fileId === right.fileId;
}

function capsuleEnvelope(bytes: Buffer): PendingRunCapsuleEnvelopeV1 {
  return Object.freeze({ version: PENDING_RUN_CAPSULE_VERSION, byteLength: bytes.byteLength, capsuleSha256: digest(bytes) });
}

function parseCapsuleEnvelope(value: unknown): PendingRunCapsuleEnvelopeV1 | null {
  const record = exactDataRecord(value, ["version", "byteLength", "capsuleSha256"]);
  if (!record || record.version !== PENDING_RUN_CAPSULE_VERSION
    || !safeInteger(record.byteLength, 1, PENDING_RUN_LIMITS.capsuleBytes)
    || typeof record.capsuleSha256 !== "string" || !SHA256.test(record.capsuleSha256)) return null;
  return Object.freeze({ version: PENDING_RUN_CAPSULE_VERSION, byteLength: record.byteLength, capsuleSha256: record.capsuleSha256 });
}

function revisionPayload(
  identity: ProjectIdentity,
  runId: string,
  revision: number,
  previousRevisionSha256: string | null,
  state: PendingRunStateV1,
  capsule: PendingRunCapsuleEnvelopeV1,
): Omit<PendingRunRevisionRecordV1, "revisionSha256" | "authSha256"> {
  return Object.freeze({
    version: PENDING_RUN_REVISION_VERSION,
    project: storedIdentity(identity),
    runId,
    revision,
    previousRevisionSha256,
    state,
    capsule,
  });
}

function composeRevision(
  identity: ProjectIdentity,
  runId: string,
  revision: number,
  previousRevisionSha256: string | null,
  state: PendingRunStateV1,
  capsule: PendingRunCapsuleEnvelopeV1,
): PendingRunRevisionRecordV1 {
  const payload = revisionPayload(identity, runId, revision, previousRevisionSha256, state, capsule);
  const revisionSha256 = digest(canonicalJson(payload));
  const signed = Object.freeze({ ...payload, revisionSha256 });
  return Object.freeze({ ...signed, authSha256: authenticated(REVISION_AUTH_DOMAIN, signed) });
}

function parseRevisionBytes(
  bytes: Buffer,
  expectedProjectHash: string,
  expectedRunId: string,
  expectedRevision: number,
): Readonly<{ record: PendingRunRevisionRecordV1; identity: ProjectIdentity }> | null {
  try {
    const raw: unknown = JSON.parse(bytes.toString("utf8"));
    const value = exactDataRecord(raw, [
      "version", "project", "runId", "revision", "previousRevisionSha256", "state", "capsule", "revisionSha256", "authSha256",
    ]);
    if (!value || value.version !== PENDING_RUN_REVISION_VERSION || value.runId !== expectedRunId
      || value.revision !== expectedRevision || (value.previousRevisionSha256 !== null
        && (typeof value.previousRevisionSha256 !== "string" || !SHA256.test(value.previousRevisionSha256)))
      || typeof value.revisionSha256 !== "string" || !SHA256.test(value.revisionSha256)
      || typeof value.authSha256 !== "string" || !SHA256.test(value.authSha256)) return null;
    const identity = parsedStoredIdentity(value.project, expectedProjectHash);
    const capsule = parseCapsuleEnvelope(value.capsule);
    if (identity === null || capsule === null) return null;
    const state = parseState(value.state, capsule.capsuleSha256);
    if (state === null) return null;
    const payload = revisionPayload(identity, expectedRunId, expectedRevision, value.previousRevisionSha256 as string | null, state, capsule);
    const revisionSha256 = digest(canonicalJson(payload));
    const signed = Object.freeze({ ...payload, revisionSha256 });
    const authSha256 = authenticated(REVISION_AUTH_DOMAIN, signed);
    if (!equalDigest(value.revisionSha256, revisionSha256) || !equalDigest(value.authSha256, authSha256)) return null;
    const record = Object.freeze({ ...signed, authSha256 });
    if (!encodedRecord(record).equals(bytes)) return null;
    return Object.freeze({ record, identity });
  } catch {
    return null;
  }
}

function composeHighWater(run: LivePendingRun, revisionSha256: string): PendingRunHighWaterRecordV1 {
  const payload = Object.freeze({
    version: PENDING_RUN_HIGH_WATER_VERSION,
    projectHash: run.identity.projectHash,
    runId: run.runId,
    revision: run.revision,
    revisionSha256,
  });
  return Object.freeze({ ...payload, authSha256: authenticated(HIGH_WATER_AUTH_DOMAIN, payload) });
}

function parseHighWater(bytes: Buffer, projectHash: string, runId: string): PendingRunHighWaterRecordV1 | null {
  try {
    const value = exactDataRecord(JSON.parse(bytes.toString("utf8")), [
      "version", "projectHash", "runId", "revision", "revisionSha256", "authSha256",
    ]);
    if (!value || value.version !== PENDING_RUN_HIGH_WATER_VERSION || value.projectHash !== projectHash || value.runId !== runId
      || !safeInteger(value.revision, 1, PENDING_RUN_LIMITS.revisions)
      || typeof value.revisionSha256 !== "string" || !SHA256.test(value.revisionSha256)
      || typeof value.authSha256 !== "string" || !SHA256.test(value.authSha256)) return null;
    const payload = Object.freeze({
      version: PENDING_RUN_HIGH_WATER_VERSION,
      projectHash,
      runId,
      revision: value.revision,
      revisionSha256: value.revisionSha256,
    });
    const record = Object.freeze({ ...payload, authSha256: authenticated(HIGH_WATER_AUTH_DOMAIN, payload) });
    return equalDigest(value.authSha256, record.authSha256) && encodedRecord(record).equals(bytes) ? record : null;
  } catch {
    return null;
  }
}

function composeClose(run: LivePendingRun, action: PendingRunTerminalActionV1, receipt: string): PendingRunCloseRecordV1 {
  const payload = Object.freeze({
    version: PENDING_RUN_CLOSE_VERSION,
    projectHash: run.identity.projectHash,
    runId: run.runId,
    revision: run.revision,
    revisionSha256: run.revisionSha256 as string,
    actionId: action.actionId,
    actionKind: action.kind,
    terminalReceiptSha256: receipt,
  });
  return Object.freeze({ ...payload, authSha256: authenticated(CLOSE_AUTH_DOMAIN, payload) });
}

function parseClose(bytes: Buffer, run: LivePendingRun): PendingRunCloseRecordV1 | null {
  try {
    const value = exactDataRecord(JSON.parse(bytes.toString("utf8")), [
      "version", "projectHash", "runId", "revision", "revisionSha256", "actionId", "actionKind", "terminalReceiptSha256", "authSha256",
    ]);
    if (!value || value.version !== PENDING_RUN_CLOSE_VERSION || value.projectHash !== run.identity.projectHash
      || value.runId !== run.runId || value.revision !== run.revision || value.revisionSha256 !== run.revisionSha256
      || typeof value.actionId !== "string" || !UUID_V4.test(value.actionId)
      || (value.actionKind !== "finalize" && value.actionKind !== "stop")
      || typeof value.terminalReceiptSha256 !== "string" || !SHA256.test(value.terminalReceiptSha256)
      || typeof value.authSha256 !== "string" || !SHA256.test(value.authSha256)) return null;
    const action = run.state?.terminalAction;
    if (!action || action.actionId !== value.actionId || action.kind !== value.actionKind) return null;
    const payload = Object.freeze({
      version: PENDING_RUN_CLOSE_VERSION,
      projectHash: run.identity.projectHash,
      runId: run.runId,
      revision: run.revision,
      revisionSha256: run.revisionSha256 as string,
      actionId: value.actionId,
      actionKind: value.actionKind,
      terminalReceiptSha256: value.terminalReceiptSha256,
    });
    const record = Object.freeze({ ...payload, authSha256: authenticated(CLOSE_AUTH_DOMAIN, payload) });
    return equalDigest(value.authSha256, record.authSha256) && encodedRecord(record).equals(bytes) ? record : null;
  } catch {
    return null;
  }
}

function inventoryPayload(
  generation: number,
  entries: readonly PendingRunInventoryEntryV1[],
): Omit<PendingRunInventoryRecordV1, "authSha256"> {
  return Object.freeze({
    version: PENDING_RUN_INVENTORY_VERSION,
    generation,
    entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))),
  });
}

function composeInventory(
  generation: number,
  entries: readonly PendingRunInventoryEntryV1[],
): PendingRunInventoryRecordV1 {
  const ordered = entries.slice().sort((left, right) => left.projectHash.localeCompare(right.projectHash)
    || left.runId.localeCompare(right.runId));
  const payload = inventoryPayload(generation, ordered);
  return Object.freeze({ ...payload, authSha256: authenticated(INVENTORY_AUTH_DOMAIN, payload) });
}

function parseInventory(bytes: Buffer): PendingRunInventoryRecordV1 | null {
  try {
    const value = exactDataRecord(JSON.parse(bytes.toString("utf8")), ["version", "generation", "entries", "authSha256"]);
    if (!value || value.version !== PENDING_RUN_INVENTORY_VERSION || !safeInteger(value.generation, 0, 1_000_000_000)
      || typeof value.authSha256 !== "string" || !SHA256.test(value.authSha256)) return null;
    const rawEntries = denseArray(value.entries, PENDING_RUN_LIMITS.projectDirectories);
    if (!rawEntries) return null;
    const entries: PendingRunInventoryEntryV1[] = [];
    let previous = "";
    for (const raw of rawEntries) {
      const entry = exactDataRecord(raw, ["projectHash", "runId", "revision", "revisionSha256"]);
      if (!entry || typeof entry.projectHash !== "string" || !PROJECT_DIRECTORY.test(entry.projectHash)
        || typeof entry.runId !== "string" || !UUID_V4.test(entry.runId)
        || !safeInteger(entry.revision, 1, PENDING_RUN_LIMITS.revisions)
        || typeof entry.revisionSha256 !== "string" || !SHA256.test(entry.revisionSha256)) return null;
      const key = `${entry.projectHash}/${entry.runId}`;
      if (key <= previous) return null;
      previous = key;
      entries.push(Object.freeze({
        projectHash: entry.projectHash,
        runId: entry.runId,
        revision: entry.revision,
        revisionSha256: entry.revisionSha256,
      }));
    }
    const payload = inventoryPayload(value.generation, entries);
    const record = Object.freeze({ ...payload, authSha256: authenticated(INVENTORY_AUTH_DOMAIN, payload) });
    return equalDigest(value.authSha256, record.authSha256) && encodedRecord(record).equals(bytes) ? record : null;
  } catch {
    return null;
  }
}

function inventoryPoint(record: PendingRunInventoryRecordV1, bytes: Buffer): PendingRunInventoryAnchorPointV1 {
  return Object.freeze({ generation: record.generation, inventorySha256: digest(bytes) });
}

function sameInventoryPoint(left: PendingRunInventoryAnchorPointV1, right: PendingRunInventoryAnchorPointV1): boolean {
  return left.generation === right.generation && equalDigest(left.inventorySha256, right.inventorySha256);
}

function composeProfileHighWater(
  committed: PendingRunInventoryAnchorPointV1,
): PendingRunProfileHighWaterRecordV1 | null {
  const profileBinding = profileBindingSha256();
  if (profileBinding === null) return null;
  const payload = Object.freeze({
    version: PENDING_RUN_PROFILE_HIGH_WATER_VERSION,
    profileBindingSha256: profileBinding,
    committed: Object.freeze({ generation: committed.generation, inventorySha256: committed.inventorySha256 }),
  });
  return Object.freeze({ ...payload, authSha256: authenticated(PROFILE_HIGH_WATER_AUTH_DOMAIN, payload) });
}

function parseProfileHighWater(bytes: Buffer): PendingRunProfileHighWaterRecordV1 | null {
  try {
    const value = exactDataRecord(JSON.parse(bytes.toString("utf8")), [
      "version", "profileBindingSha256", "committed", "authSha256",
    ]);
    const point = exactDataRecord(value?.committed, ["generation", "inventorySha256"]);
    const binding = profileBindingSha256();
    if (!value || value.version !== PENDING_RUN_PROFILE_HIGH_WATER_VERSION || binding === null
      || value.profileBindingSha256 !== binding
      || typeof value.authSha256 !== "string" || !SHA256.test(value.authSha256)
      || !point || !safeInteger(point.generation, 0, 1_000_000_000)
      || typeof point.inventorySha256 !== "string" || !SHA256.test(point.inventorySha256)) return null;
    const committed = Object.freeze({
      generation: point.generation,
      inventorySha256: point.inventorySha256,
    });
    const payload = Object.freeze({
      version: PENDING_RUN_PROFILE_HIGH_WATER_VERSION,
      profileBindingSha256: binding,
      committed,
    });
    const record = Object.freeze({ ...payload, authSha256: authenticated(PROFILE_HIGH_WATER_AUTH_DOMAIN, payload) });
    return equalDigest(value.authSha256, record.authSha256) && encodedRecord(record).equals(bytes) ? record : null;
  } catch {
    return null;
  }
}

function composeInventoryAnchor(
  committed: PendingRunInventoryAnchorPointV1,
  pending: PendingRunInventoryAnchorPendingV1 | null,
): PendingRunInventoryAnchorRecordV1 {
  const payload = Object.freeze({
    version: PENDING_RUN_INVENTORY_ANCHOR_VERSION,
    committed: Object.freeze({ generation: committed.generation, inventorySha256: committed.inventorySha256 }),
    pending: pending === null ? null : Object.freeze({
      generation: pending.generation,
      inventorySha256: pending.inventorySha256,
      close: pending.close === null ? null : Object.freeze({ ...pending.close }),
    }),
  });
  return Object.freeze({ ...payload, authSha256: authenticated(INVENTORY_ANCHOR_AUTH_DOMAIN, payload) });
}

function parseInventoryAnchor(bytes: Buffer): PendingRunInventoryAnchorRecordV1 | null {
  try {
    const value = exactDataRecord(JSON.parse(bytes.toString("utf8")), ["version", "committed", "pending", "authSha256"]);
    const parsePoint = (raw: unknown): PendingRunInventoryAnchorPointV1 | null => {
      const point = exactDataRecord(raw, ["generation", "inventorySha256"]);
      return point && safeInteger(point.generation, 0, 1_000_000_000)
        && typeof point.inventorySha256 === "string" && SHA256.test(point.inventorySha256)
        ? Object.freeze({ generation: point.generation, inventorySha256: point.inventorySha256 })
        : null;
    };
    if (!value || value.version !== PENDING_RUN_INVENTORY_ANCHOR_VERSION
      || typeof value.authSha256 !== "string" || !SHA256.test(value.authSha256)) return null;
    const committed = parsePoint(value.committed);
    let pending: PendingRunInventoryAnchorPendingV1 | null = null;
    if (value.pending !== null) {
      const rawPending = exactDataRecord(value.pending, ["generation", "inventorySha256", "close"]);
      const close = rawPending?.close === null ? null : exactDataRecord(rawPending?.close, [
        "projectHash", "runId", "revision", "revisionSha256", "actionId", "actionKind", "terminalReceiptSha256",
      ]);
      if (!rawPending || !safeInteger(rawPending.generation, 0, 1_000_000_000)
        || typeof rawPending.inventorySha256 !== "string" || !SHA256.test(rawPending.inventorySha256)
        || (rawPending.close !== null && (!close || typeof close.projectHash !== "string" || !PROJECT_DIRECTORY.test(close.projectHash)
          || typeof close.runId !== "string" || !UUID_V4.test(close.runId)
          || !safeInteger(close.revision, 1, PENDING_RUN_LIMITS.revisions)
          || typeof close.revisionSha256 !== "string" || !SHA256.test(close.revisionSha256)
          || typeof close.actionId !== "string" || !UUID_V4.test(close.actionId)
          || (close.actionKind !== "finalize" && close.actionKind !== "stop")
          || typeof close.terminalReceiptSha256 !== "string" || !SHA256.test(close.terminalReceiptSha256)))) return null;
      pending = Object.freeze({
        generation: rawPending.generation,
        inventorySha256: rawPending.inventorySha256,
        close: close === null ? null : Object.freeze({
          projectHash: close.projectHash as string,
          runId: close.runId as string,
          revision: close.revision as number,
          revisionSha256: close.revisionSha256 as string,
          actionId: close.actionId as string,
          actionKind: close.actionKind as "finalize" | "stop",
          terminalReceiptSha256: close.terminalReceiptSha256 as string,
        }),
      });
    }
    if (!committed || (value.pending !== null && !pending)
      || (pending !== null && pending.generation !== committed.generation + 1)) return null;
    const payload = Object.freeze({ version: PENDING_RUN_INVENTORY_ANCHOR_VERSION, committed, pending });
    const record = Object.freeze({ ...payload, authSha256: authenticated(INVENTORY_ANCHOR_AUTH_DOMAIN, payload) });
    return equalDigest(value.authSha256, record.authSha256) && encodedRecord(record).equals(bytes) ? record : null;
  } catch {
    return null;
  }
}

type AnchoredInventory = Readonly<{
  record: PendingRunInventoryRecordV1;
  bytes: Buffer;
  anchor: PendingRunInventoryAnchorRecordV1;
  anchorBytes: Buffer;
}>;

function ensurePendingInventoryClose(intent: PendingRunInventoryCloseIntentV1): boolean {
  if (!configuredStoreRoot) return false;
  const directory = join(configuredStoreRoot, intent.projectHash, intent.runId);
  let scanned = scanRun(directory, intent.projectHash, intent.runId);
  if (!scanned || scanned.run.revision !== intent.revision || scanned.run.revisionSha256 !== intent.revisionSha256
    || scanned.run.state?.phase !== "terminal-prepared" || !scanned.run.state.terminalAction
    || scanned.run.state.terminalAction.actionId !== intent.actionId
    || scanned.run.state.terminalAction.kind !== intent.actionKind) return false;
  if (!scanned.closed) {
    const close = composeClose(scanned.run, scanned.run.state.terminalAction, intent.terminalReceiptSha256);
    if (!writeNewFile(join(directory, CLOSE_NAME), encodedRecord(close))) return false;
    scanned = scanRun(directory, intent.projectHash, intent.runId);
  }
  return scanned?.closed === true && scanned.run.closedActionId === intent.actionId
    && scanned.run.closedReceiptSha256 === intent.terminalReceiptSha256;
}

function currentInventory(): AnchoredInventory | null {
  if (!configuredStoreRoot || !configuredProfileRoot) return null;
  const inventoryPath = join(configuredStoreRoot, INVENTORY_NAME);
  const anchorPath = join(configuredStoreRoot, INVENTORY_ANCHOR_NAME);
  const stagePath = join(configuredStoreRoot, INVENTORY_STAGE_NAME);
  const profileHighWaterPath = join(configuredProfileRoot, PROFILE_HIGH_WATER_NAME);
  let inventoryFile = readBoundFile(inventoryPath, 256 * 1024);
  let anchorFile = readBoundFile(anchorPath, 32 * 1024);
  let profileHighWaterFile = readBoundFile(profileHighWaterPath, 32 * 1024);
  let record = inventoryFile && parseInventory(inventoryFile.bytes);
  const anchor = anchorFile && parseInventoryAnchor(anchorFile.bytes);
  let profileHighWater = profileHighWaterFile && parseProfileHighWater(profileHighWaterFile.bytes);
  if (!inventoryFile || !record || !anchorFile || !anchor || !profileHighWaterFile || !profileHighWater) return null;
  let point = inventoryPoint(record, inventoryFile.bytes);
  const stageAbsent = namedPathAbsent(stagePath);
  const stageFile = stageAbsent ? null : readBoundFile(stagePath, 256 * 1024);
  const stageRecord = stageFile && parseInventory(stageFile.bytes);
  const removeExactStage = (expected: Buffer): boolean => {
    const current = readBoundFile(stagePath, expected.byteLength);
    if (!current?.bytes.equals(expected)) return false;
    try {
      unlinkSync(stagePath);
      return namedPathAbsent(stagePath);
    } catch {
      return false;
    }
  };
  if (anchor.pending === null) {
    if (!sameInventoryPoint(point, anchor.committed)
      || !sameInventoryPoint(profileHighWater.committed, anchor.committed)) return null;
    if (!stageAbsent && (!stageFile || !stageRecord || !sameInventoryPoint(inventoryPoint(stageRecord, stageFile.bytes), anchor.committed)
      || !removeExactStage(stageFile.bytes))) return null;
    return Object.freeze({ record, bytes: inventoryFile.bytes, anchor, anchorBytes: anchorFile.bytes });
  }
  if (!sameInventoryPoint(profileHighWater.committed, anchor.committed)
    && !sameInventoryPoint(profileHighWater.committed, anchor.pending)) return null;
  if (!stageFile || !stageRecord || !sameInventoryPoint(inventoryPoint(stageRecord, stageFile.bytes), anchor.pending)) return null;
  if (anchor.pending.close !== null && !ensurePendingInventoryClose(anchor.pending.close)) return null;
  if (sameInventoryPoint(point, anchor.committed)) {
    if (!replaceFile(inventoryPath, inventoryFile.bytes, stageFile.bytes)) return null;
    inventoryFile = readBoundFile(inventoryPath, 256 * 1024);
    record = inventoryFile && parseInventory(inventoryFile.bytes);
    if (!inventoryFile || !record) return null;
    point = inventoryPoint(record, inventoryFile.bytes);
  }
  if (!sameInventoryPoint(point, anchor.pending)) return null;
  if (sameInventoryPoint(profileHighWater.committed, anchor.committed)) {
    const advanced = composeProfileHighWater(anchor.pending);
    if (!advanced || !replaceFile(profileHighWaterPath, profileHighWaterFile.bytes, encodedRecord(advanced))) return null;
    profileHighWaterFile = readBoundFile(profileHighWaterPath, 32 * 1024);
    profileHighWater = profileHighWaterFile && parseProfileHighWater(profileHighWaterFile.bytes);
  }
  if (!profileHighWaterFile || !profileHighWater
    || !sameInventoryPoint(profileHighWater.committed, anchor.pending)) return null;
  const settled = composeInventoryAnchor(anchor.pending, null);
  if (!replaceFile(anchorPath, anchorFile.bytes, encodedRecord(settled))) return null;
  anchorFile = readBoundFile(anchorPath, 32 * 1024);
  const settledFile = anchorFile;
  const settledRecord = settledFile && parseInventoryAnchor(settledFile.bytes);
  return settledFile && settledRecord && settledRecord.pending === null && sameInventoryPoint(point, settledRecord.committed)
    && removeExactStage(stageFile.bytes)
    ? Object.freeze({ record, bytes: inventoryFile.bytes, anchor: settledRecord, anchorBytes: settledFile.bytes })
    : null;
}

type PendingInventoryUpdate = Readonly<{
  generation: number;
  bytes: Buffer;
}>;

function prepareInventoryUpdate(
  transform: (entries: readonly PendingRunInventoryEntryV1[]) => readonly PendingRunInventoryEntryV1[] | null,
  close: PendingRunInventoryCloseIntentV1 | null = null,
): PendingInventoryUpdate | null {
  if (!configuredStoreRoot) return null;
  const current = currentInventory();
  if (!current) return null;
  const nextEntries = transform(current.record.entries);
  if (!nextEntries || nextEntries.length > PENDING_RUN_LIMITS.projectDirectories
    || current.record.generation >= 1_000_000_000) return null;
  const next = composeInventory(current.record.generation + 1, nextEntries);
  const nextBytes = encodedRecord(next);
  const stagePath = join(configuredStoreRoot, INVENTORY_STAGE_NAME);
  if (!namedPathAbsent(stagePath) || !writeNewFile(stagePath, nextBytes)) return null;
  const point = inventoryPoint(next, nextBytes);
  const pendingAnchor = composeInventoryAnchor(current.anchor.committed, Object.freeze({ ...point, close }));
  if (!replaceFile(join(configuredStoreRoot, INVENTORY_ANCHOR_NAME), current.anchorBytes, encodedRecord(pendingAnchor))) {
    const staged = readBoundFile(stagePath, nextBytes.byteLength);
    if (staged?.bytes.equals(nextBytes)) {
      try { unlinkSync(stagePath); } catch { /* a preplant or race stays fail-closed */ }
    }
    return null;
  }
  return Object.freeze({ generation: next.generation, bytes: nextBytes });
}

function finishInventoryUpdate(update: PendingInventoryUpdate): boolean {
  const settled = currentInventory();
  return settled !== null && settled.record.generation === update.generation && settled.bytes.equals(update.bytes);
}

function updateInventory(
  transform: (entries: readonly PendingRunInventoryEntryV1[]) => readonly PendingRunInventoryEntryV1[] | null,
): boolean {
  const update = prepareInventoryUpdate(transform);
  return update !== null && finishInventoryUpdate(update);
}

function capsulePath(directory: string, capsuleSha256: string): string {
  return join(directory, CAPSULE_DIR_NAME, `${capsuleSha256}.bin`);
}

function revisionPath(directory: string, revision: number): string {
  return join(directory, REVISION_DIR_NAME, `${String(revision).padStart(8, "0")}.json`);
}

function scanRun(
  directory: string,
  projectHash: string,
  runId: string,
  maximumJournalBytes = PENDING_RUN_LIMITS.journalBytes,
): ScannedRun | null {
  if (configuredStoreRoot === null || !safeDirectory(directory, dirname(directory))) return null;
  if (!Number.isSafeInteger(maximumJournalBytes) || maximumJournalBytes < 1) return null;
  const scanLimit = Math.min(maximumJournalBytes, PENDING_RUN_LIMITS.journalBytes);
  const names = exactDirectoryNames(directory, 4);
  if (!names || names.some((name) => ![CAPSULE_DIR_NAME, REVISION_DIR_NAME, HIGH_WATER_NAME, CLOSE_NAME].includes(name))
    || !names.includes(CAPSULE_DIR_NAME) || !names.includes(REVISION_DIR_NAME) || !names.includes(HIGH_WATER_NAME)
    || !safeDirectory(join(directory, CAPSULE_DIR_NAME), directory) || !safeDirectory(join(directory, REVISION_DIR_NAME), directory)) return null;
  let totalBytes = 0;
  const readJournalFile = (path: string, fileLimit: number): BoundFile | null => {
    const remaining = scanLimit - totalBytes;
    if (remaining < 1) return null;
    const file = readBoundFile(path, Math.min(fileLimit, remaining));
    if (!file) return null;
    totalBytes += file.bytes.byteLength;
    return file;
  };
  const highWaterFile = readJournalFile(join(directory, HIGH_WATER_NAME), 32 * 1024);
  if (!highWaterFile) return null;
  const highWater = parseHighWater(highWaterFile.bytes, projectHash, runId);
  if (!highWater) return null;
  const revisionNames = exactDirectoryNames(join(directory, REVISION_DIR_NAME), PENDING_RUN_LIMITS.revisions);
  if (!revisionNames || revisionNames.length !== highWater.revision || revisionNames.length > PENDING_RUN_LIMITS.revisions) return null;
  let previousSha256: string | null = null;
  let identity: ProjectIdentity | null = null;
  let current: PendingRunRevisionRecordV1 | null = null;
  const expectedCapsules = new Map<string, PendingRunCapsuleEnvelopeV1>();
  for (let revision = 1; revision <= highWater.revision; revision += 1) {
    const expectedName = `${String(revision).padStart(8, "0")}.json`;
    if (revisionNames[revision - 1] !== expectedName || !REVISION_FILE.test(expectedName)) return null;
    const file = readJournalFile(revisionPath(directory, revision), 512 * 1024);
    if (!file) return null;
    const parsed = parseRevisionBytes(file.bytes, projectHash, runId, revision);
    if (!parsed || parsed.record.previousRevisionSha256 !== previousSha256
      || (identity !== null && !sameProjectIdentity(identity, parsed.identity))) return null;
    identity = parsed.identity;
    current = parsed.record;
    previousSha256 = current.revisionSha256;
    expectedCapsules.set(current.capsule.capsuleSha256, current.capsule);
  }
  if (!identity || !current || highWater.revisionSha256 !== current.revisionSha256) return null;
  const capsuleNames = exactDirectoryNames(join(directory, CAPSULE_DIR_NAME), PENDING_RUN_LIMITS.revisions);
  const expectedCapsuleNames = [...expectedCapsules.keys()].sort().map((sha) => `${sha}.bin`);
  if (!capsuleNames || capsuleNames.length !== expectedCapsuleNames.length
    || capsuleNames.some((name, index) => name !== expectedCapsuleNames[index] || !CAPSULE_FILE.test(name))) return null;
  let currentCapsuleBytes: Buffer | null = null;
  for (const [sha256, envelope] of expectedCapsules) {
    const file = readJournalFile(capsulePath(directory, sha256), envelope.byteLength);
    if (!file || file.bytes.byteLength !== envelope.byteLength || !equalDigest(digest(file.bytes), sha256)) return null;
    if (sha256 === current.capsule.capsuleSha256) currentCapsuleBytes = file.bytes;
  }
  if (!currentCapsuleBytes || totalBytes > PENDING_RUN_LIMITS.journalBytes) return null;
  const actualIdentity = projectIdentity(identity.canonicalRoot);
  const status: LivePendingRun["status"] = current.state.phase === "terminal-prepared"
    || actualIdentity === null || !sameProjectIdentity(identity, actualIdentity) ? "recovery-required" : "pending";
  const run: LivePendingRun = {
    identity,
    runId,
    revision: current.revision,
    state: current.state,
    capsule: current.capsule,
    status,
    authority: null as unknown as PendingRunAuthorityV1,
    revisionSha256: current.revisionSha256,
    directory,
    closedReceiptSha256: null,
    closedActionId: null,
    journalBytes: 0,
    reservedJournalBytes: 0,
  };
  run.authority = mintAuthority(run);
  let closed = false;
  if (names.includes(CLOSE_NAME)) {
    const closeFile = readJournalFile(join(directory, CLOSE_NAME), 32 * 1024);
    const close = closeFile && parseClose(closeFile.bytes, run);
    if (!close) return null;
    if (totalBytes > PENDING_RUN_LIMITS.journalBytes) return null;
    run.closedReceiptSha256 = close.terminalReceiptSha256;
    run.closedActionId = close.actionId;
    closed = true;
  }
  if (totalBytes > maximumJournalBytes) return null;
  run.journalBytes = totalBytes;
  run.reservedJournalBytes = totalBytes;
  return Object.freeze({ run, closed, capsuleBytes: currentCapsuleBytes, journalBytes: totalBytes });
}

function storeKey(initializing: boolean): Buffer | null {
  if (configuredProfileRoot === null) return null;
  const keyPath = join(configuredProfileRoot, PROFILE_AUTH_KEY_NAME);
  if (namedPathAbsent(keyPath)) {
    if (!initializing || !writeNewFile(keyPath, randomBytes(AUTH_KEY_BYTES))) return null;
  }
  const file = readBoundFile(keyPath, AUTH_KEY_BYTES);
  return file && file.bytes.byteLength === AUTH_KEY_BYTES ? Buffer.from(file.bytes) : null;
}

function ensureInventoryFile(initializing: boolean): boolean {
  if (!configuredStoreRoot || !configuredProfileRoot || !mainAuthKey) return false;
  const inventoryPath = join(configuredStoreRoot, INVENTORY_NAME);
  const anchorPath = join(configuredStoreRoot, INVENTORY_ANCHOR_NAME);
  const profileHighWaterPath = join(configuredProfileRoot, PROFILE_HIGH_WATER_NAME);
  const names = exactDirectoryNames(configuredStoreRoot, PENDING_RUN_LIMITS.projectDirectories + 3);
  if (!names) return false;
  if (initializing) {
    if (names.length !== 0 || !namedPathAbsent(profileHighWaterPath)) return false;
    const inventory = composeInventory(0, []);
    const inventoryBytes = encodedRecord(inventory);
    const point = inventoryPoint(inventory, inventoryBytes);
    const profileHighWater = composeProfileHighWater(point);
    if (!writeNewFile(inventoryPath, inventoryBytes)
      || !writeNewFile(anchorPath, encodedRecord(composeInventoryAnchor(point, null)))
      || !profileHighWater || !writeNewFile(profileHighWaterPath, encodedRecord(profileHighWater))) return false;
  } else if (!names.includes(INVENTORY_NAME) || !names.includes(INVENTORY_ANCHOR_NAME)) {
    return false;
  }
  return currentInventory() !== null;
}

type StoreTopology = Readonly<{
  projects: readonly Readonly<{
    projectHash: string;
    directory: string;
    runIds: readonly string[];
  }>[];
  runDirectories: number;
}>;

function boundedStoreTopology(): StoreTopology | null {
  if (configuredStoreRoot === null) return null;
  const storeNames = exactDirectoryNames(
    configuredStoreRoot,
    PENDING_RUN_LIMITS.projectDirectories + 2,
  );
  if (!storeNames || !storeNames.includes(INVENTORY_NAME) || !storeNames.includes(INVENTORY_ANCHOR_NAME)
    || storeNames.includes(INVENTORY_STAGE_NAME)) return null;
  const projects: Array<StoreTopology["projects"][number]> = [];
  let runDirectories = 0;
  for (const projectHash of storeNames) {
    if (projectHash === INVENTORY_NAME || projectHash === INVENTORY_ANCHOR_NAME) continue;
    if (!PROJECT_DIRECTORY.test(projectHash)) return null;
    const directory = join(configuredStoreRoot, projectHash);
    if (!safeDirectory(directory, configuredStoreRoot)) return null;
    const runIds = exactDirectoryNames(directory, PENDING_RUN_LIMITS.runDirectories);
    if (!runIds || runIds.length === 0 || runIds.some((runId) => !UUID_V4.test(runId))) return null;
    runDirectories += runIds.length;
    if (runDirectories > PENDING_RUN_LIMITS.runDirectories) return null;
    projects.push(Object.freeze({ projectHash, directory, runIds }));
  }
  if (projects.length > PENDING_RUN_LIMITS.projectDirectories) return null;
  return Object.freeze({ projects: Object.freeze(projects), runDirectories });
}

function installScannedRuns(): Map<string, LivePendingRun> | null {
  if (configuredStoreRoot === null) return null;
  const inventory = currentInventory();
  const topology = boundedStoreTopology();
  if (!inventory || !topology) return null;
  const scannedRuns = new Map<string, LivePendingRun>();
  const scannedByKey = new Map<string, ScannedRun>();
  const activeEntries: PendingRunInventoryEntryV1[] = [];
  let scannedBytes = 0;
  for (const project of topology.projects) {
    let active: LivePendingRun | null = null;
    for (const runId of project.runIds) {
      const remainingBytes = PENDING_RUN_LIMITS.scannedJournalBytes - scannedBytes;
      const scanned = scanRun(join(project.directory, runId), project.projectHash, runId, remainingBytes);
      if (!scanned) return null;
      scannedBytes += scanned.journalBytes;
      if (scannedBytes > PENDING_RUN_LIMITS.scannedJournalBytes) return null;
      scannedByKey.set(`${project.projectHash}/${runId}`, scanned);
      if (!scanned.closed) {
        if (active !== null) return null;
        active = scanned.run;
        activeEntries.push(Object.freeze({
          projectHash: project.projectHash,
          runId,
          revision: scanned.run.revision,
          revisionSha256: scanned.run.revisionSha256 as string,
        }));
      }
    }
    if (active !== null) scannedRuns.set(project.projectHash, active);
  }
  const closedInventoryKeys = new Set<string>();
  for (const entry of inventory.record.entries) {
    const key = `${entry.projectHash}/${entry.runId}`;
    const scanned = scannedByKey.get(key);
    if (!scanned || scanned.run.revision !== entry.revision || scanned.run.revisionSha256 !== entry.revisionSha256) return null;
    if (scanned.closed) closedInventoryKeys.add(key);
  }
  const expectedActive = composeInventory(inventory.record.generation, activeEntries).entries;
  const inventoryActive = inventory.record.entries.filter((entry) => !closedInventoryKeys.has(`${entry.projectHash}/${entry.runId}`));
  if (canonicalJson(expectedActive) !== canonicalJson(inventoryActive)) return null;
  if (closedInventoryKeys.size > 0 && !updateInventory((entries) => entries.filter(
    (entry) => !closedInventoryKeys.has(`${entry.projectHash}/${entry.runId}`),
  ))) return null;
  let bootReservation = scannedBytes;
  for (const run of scannedRuns.values()) {
    const added = PENDING_RUN_LIMITS.journalBytes - run.journalBytes;
    if (added < 0 || bootReservation + added > PENDING_RUN_LIMITS.scannedJournalBytes) return null;
    bootReservation += added;
    run.reservedJournalBytes = PENDING_RUN_LIMITS.journalBytes;
  }
  reservedJournalBytes = bootReservation;
  return scannedRuns;
}

function boundAuthority(value: unknown, includeClosed = false): LivePendingRun | null {
  if (value === null || typeof value !== "object" || nodeTypes.isProxy(value)) return null;
  const run = authorityBindings.get(value);
  if (!run) return null;
  if (includeClosed && run.closedReceiptSha256 !== null) return run;
  return liveByProjectHash.get(run.identity.projectHash) === run && run.closedReceiptSha256 === null ? run : null;
}

function writeCapsule(directory: string, bytes: Buffer): PendingRunCapsuleEnvelopeV1 | null {
  const envelope = capsuleEnvelope(bytes);
  const path = capsulePath(directory, envelope.capsuleSha256);
  const existing = readBoundFile(path, envelope.byteLength);
  if (existing ? !existing.bytes.equals(bytes) : !writeNewFile(path, bytes)) return null;
  return envelope;
}

function currentHighWaterBytes(run: LivePendingRun): Buffer | null {
  if (!run.directory || run.revision === 0) return null;
  const file = readBoundFile(join(run.directory, HIGH_WATER_NAME), 32 * 1024);
  const parsed = file && parseHighWater(file.bytes, run.identity.projectHash, run.runId);
  return parsed && parsed.revision === run.revision && parsed.revisionSha256 === run.revisionSha256 ? file.bytes : null;
}

type InstallVerifiedRevisionResult = "installed" | "capacity" | "failed";

function installVerifiedRevision(
  run: LivePendingRun,
  state: PendingRunStateV1,
  bytes: Buffer,
): InstallVerifiedRevisionResult {
  if (!run.directory || run.revision >= PENDING_RUN_LIMITS.revisions) return "failed";
  const actualIdentity = projectIdentity(run.identity.canonicalRoot);
  if (!actualIdentity || !sameProjectIdentity(run.identity, actualIdentity)
    || (run.revision > 0 && run.status !== "pending")) return "failed";
  const expectedHighWater = run.revision === 0 ? null : currentHighWaterBytes(run);
  if (run.revision !== 0 && expectedHighWater === null) return "failed";
  const capsule = capsuleEnvelope(bytes);
  if (capsule.capsuleSha256 !== state.capsuleSha256) return "failed";
  const nextRevision = run.revision + 1;
  const record = composeRevision(run.identity, run.runId, nextRevision, run.revisionSha256, state, capsule);
  const recordBytes = encodedRecord(record);
  const existingCapsule = readBoundFile(capsulePath(run.directory, capsule.capsuleSha256), capsule.byteLength);
  if (existingCapsule ? !existingCapsule.bytes.equals(bytes) : !namedPathAbsent(capsulePath(run.directory, capsule.capsuleSha256))) {
    return "failed";
  }
  const stagedRun = { ...run, revision: nextRevision, revisionSha256: record.revisionSha256 } as LivePendingRun;
  const highWater = composeHighWater(stagedRun, record.revisionSha256);
  const highWaterBytes = encodedRecord(highWater);
  const nextJournalBytes = run.journalBytes + recordBytes.byteLength + highWaterBytes.byteLength
    - (expectedHighWater?.byteLength ?? 0) + (existingCapsule ? 0 : bytes.byteLength);
  if (!reserveRunJournalBytes(run, nextJournalBytes)) return "capacity";
  const inventoryUpdate = prepareInventoryUpdate((entries) => {
    const index = entries.findIndex((entry) => entry.projectHash === run.identity.projectHash && entry.runId === run.runId);
    if (run.revision === 0) {
      if (index !== -1) return null;
      return [...entries, Object.freeze({
        projectHash: run.identity.projectHash,
        runId: run.runId,
        revision: nextRevision,
        revisionSha256: record.revisionSha256,
      })];
    }
    const previous = index >= 0 ? entries[index] : null;
    if (!previous || previous.revision !== run.revision || previous.revisionSha256 !== run.revisionSha256) return null;
    return entries.map((entry, position) => position === index ? Object.freeze({
      projectHash: run.identity.projectHash,
      runId: run.runId,
      revision: nextRevision,
      revisionSha256: record.revisionSha256,
    }) : entry);
  });
  if (!inventoryUpdate) return "failed";
  if (interruptAfterInventoryIntentForTests) {
    interruptAfterInventoryIntentForTests = false;
    return "failed";
  }
  const storedCapsule = writeCapsule(run.directory, bytes);
  if (!storedCapsule || storedCapsule.capsuleSha256 !== capsule.capsuleSha256) return "failed";
  if (!writeNewFile(revisionPath(run.directory, nextRevision), recordBytes)) return "failed";
  if (!replaceFile(join(run.directory, HIGH_WATER_NAME), expectedHighWater, highWaterBytes)) return "failed";
  const scanned = scanRun(run.directory, run.identity.projectHash, run.runId);
  if (!scanned || scanned.closed || scanned.run.revision !== nextRevision || scanned.run.revisionSha256 !== record.revisionSha256
    || scanned.run.state?.capsuleSha256 !== state.capsuleSha256 || !scanned.capsuleBytes.equals(bytes)) return "failed";
  if (!reserveRunJournalBytes(run, scanned.journalBytes)) return "failed";
  run.journalBytes = scanned.journalBytes;
  if (!finishInventoryUpdate(inventoryUpdate)) return "failed";
  run.revision = nextRevision;
  run.state = scanned.run.state;
  run.capsule = scanned.run.capsule;
  run.revisionSha256 = scanned.run.revisionSha256;
  run.status = scanned.run.status;
  return "installed";
}

function stateSuccessor(previous: PendingRunStateV1, next: PendingRunStateV1): boolean {
  if (next.phase === "terminal-prepared" || next.terminalAction !== null
    || next.displayOutcome !== previous.displayOutcome || next.taskNumber !== previous.taskNumber
    || next.baseHead !== previous.baseHead || next.taskSpecSha256 !== previous.taskSpecSha256
    || next.evidencePlanSha256 !== previous.evidencePlanSha256
    || next.criticMode !== previous.criticMode
    || canonicalJson(next.route) !== canonicalJson(previous.route)
    || next.counters.builder.spent !== previous.counters.builder.spent
    || next.counters.externalEvidence.spent !== previous.counters.externalEvidence.spent) return false;
  const generationDelta = next.generation - previous.generation;
  const roundDelta = next.round - previous.round;
  const repairDelta = next.counters.repair.spent - previous.counters.repair.spent;
  const criticDelta = next.counters.critic.spent - previous.counters.critic.spent;
  const evidenceDelta = next.evidenceRevision - previous.evidenceRevision;
  if ((generationDelta !== 0 && generationDelta !== 1) || (roundDelta !== 0 && roundDelta !== 1)
    || (repairDelta !== 0 && repairDelta !== 1) || (criticDelta !== 0 && criticDelta !== 1)
    || (evidenceDelta !== 0 && evidenceDelta !== 1) || (repairDelta === 1 && criticDelta === 1)
    || (previous.evidenceRunId !== null && next.evidenceRunId !== previous.evidenceRunId)) return false;

  const candidateChanged = next.candidateSha256 !== previous.candidateSha256;
  const capsuleChanged = next.capsuleSha256 !== previous.capsuleSha256;
  const gitStateChanged = next.gitStateSha256 !== previous.gitStateSha256;
  // Core phase transitions mint a new candidate generation and evidence-state
  // digest while deliberately retaining the product candidate digest. Only a
  // successful repair replacement (round 0 -> 1) changes candidateSha256.
  if ((generationDelta === 1) !== capsuleChanged || (generationDelta === 1) !== gitStateChanged
    || (roundDelta === 1) !== candidateChanged) return false;
  if (roundDelta !== repairDelta || (roundDelta === 1
    ? next.bundleSha256s.length !== previous.bundleSha256s.length + 1
    : canonicalJson(next.bundleSha256s) !== canonicalJson(previous.bundleSha256s))) return false;
  if (previous.bundleSha256s.some((sha, index) => next.bundleSha256s[index] !== sha)) return false;

  const attachedEvidence = previous.evidenceRunId === null && next.evidenceRunId !== null;
  const evidenceChanged = next.evidenceStateSha256 !== previous.evidenceStateSha256;
  if (attachedEvidence) {
    if (!evidenceChanged || evidenceDelta !== 0) return false;
  } else if ((evidenceDelta === 1) !== evidenceChanged) return false;

  if (previous.phase === next.phase) {
    if (generationDelta === 0) return (attachedEvidence || evidenceDelta === 1) && repairDelta === 0 && criticDelta === 0;
    return previous.phase === "awaiting-critic" && criticDelta === 1 && repairDelta === 0
      && previous.criticMode !== "off";
  }
  if (generationDelta !== 1) return false;
  switch (previous.phase) {
    case "awaiting-critic":
      if (next.phase === "ready-to-seal") {
        return repairDelta === 0 && (criticDelta === 1 || (criticDelta === 0 && previous.criticMode === "optional"));
      }
      if (next.phase === "awaiting-owner-resolution") return criticDelta === 1 && repairDelta === 0;
      if (next.phase === "awaiting-repair") return repairDelta === 0 && criticDelta <= 1;
      return false;
    case "awaiting-owner-resolution":
      return (next.phase === "ready-to-seal" || next.phase === "awaiting-repair")
        && criticDelta === 0 && repairDelta === 0;
    case "awaiting-repair":
      return repairDelta === 1 && criticDelta === 0
        && (previous.criticMode === "off" ? next.phase === "ready-to-seal" : next.phase === "awaiting-critic");
    case "ready-to-seal":
      return next.phase === "awaiting-repair" && repairDelta === 0 && criticDelta === 0;
    default:
      return false;
  }
}

function exactCurrentRun(run: LivePendingRun, allowPrepared = false): ScannedRun | null {
  if (!run.directory) return null;
  const actualIdentity = projectIdentity(run.identity.canonicalRoot);
  const scanned = scanRun(run.directory, run.identity.projectHash, run.runId);
  const inventory = currentInventory();
  const inventoryEntry = inventory?.record.entries.find((entry) => entry.projectHash === run.identity.projectHash && entry.runId === run.runId);
  if (!actualIdentity || !sameProjectIdentity(run.identity, actualIdentity) || !scanned || scanned.closed
    || scanned.run.revision !== run.revision || inventoryEntry?.revision !== run.revision
    || inventoryEntry.revisionSha256 !== run.revisionSha256
    || scanned.run.revisionSha256 !== run.revisionSha256 || scanned.run.state?.capsuleSha256 !== run.state?.capsuleSha256) return null;
  if (allowPrepared) {
    if (run.state?.phase !== "terminal-prepared" || scanned.run.state?.phase !== "terminal-prepared") return null;
  } else if (run.status !== "pending" || scanned.run.status !== "pending") return null;
  return scanned;
}

function markRecovery(run: LivePendingRun): void {
  run.status = "recovery-required";
}

export function parsePendingRunState(value: unknown, capsuleSha256?: string): PendingRunStateV1 | null {
  return parseState(value, capsuleSha256);
}

export function projectPendingRunHash(projectRoot: string): string | null {
  return projectIdentity(projectRoot)?.projectHash ?? null;
}

export function installPendingRunStore(userDataRoot: string): PendingRunBootProjectionV1 {
  if (globallyUnsafe) {
    return Object.freeze({ ready: false, activeProjects: liveByProjectHash.size, recoveryRequired: true });
  }
  try {
    if (typeof userDataRoot !== "string" || userDataRoot.length === 0 || userDataRoot.includes("\0")) throw new Error("invalid");
    const lexical = resolve(userDataRoot);
    const before = lstatSync(lexical, { bigint: true });
    const real = realpathSync.native(lexical);
    const after = lstatSync(real, { bigint: true });
    if (!before.isDirectory() || before.isSymbolicLink() || !after.isDirectory() || after.isSymbolicLink()
      || !sameIdentity(statIdentity(before), statIdentity(after))) throw new Error("unsafe");
    if (configuredProfileRoot !== null) {
      if (normalizedRoot(configuredProfileRoot) !== normalizedRoot(real)) throw new Error("already-installed");
      return Object.freeze({
        ready: !globallyUnsafe,
        activeProjects: liveByProjectHash.size,
        recoveryRequired: globallyUnsafe || liveByProjectHash.size > 0,
      });
    }
    configuredProfileRoot = real;
    configuredStoreRoot = resolve(real, "pending-runs");
    const keyWasPresent = !namedPathAbsent(join(real, PROFILE_AUTH_KEY_NAME));
    const profileHighWaterWasPresent = !namedPathAbsent(join(real, PROFILE_HIGH_WATER_NAME));
    const storeWasPresent = !namedPathAbsent(configuredStoreRoot);
    if (keyWasPresent !== storeWasPresent || keyWasPresent !== profileHighWaterWasPresent) throw new Error("store-anchor");
    const initializing = !keyWasPresent && !storeWasPresent && !profileHighWaterWasPresent;
    if (!ensureDirectory(configuredStoreRoot, real)) throw new Error("store");
    mainAuthKey = storeKey(initializing);
    if (mainAuthKey === null || !ensureInventoryFile(initializing)) throw new Error("key");
    const scanned = installScannedRuns();
    if (scanned === null) throw new Error("scan");
    for (const [projectHash, run] of scanned) liveByProjectHash.set(projectHash, run);
    const recoveryRequired = liveByProjectHash.size > 0;
    return Object.freeze({ ready: true, activeProjects: liveByProjectHash.size, recoveryRequired });
  } catch {
    globallyUnsafe = true;
    for (const run of liveByProjectHash.values()) markRecovery(run);
    return Object.freeze({ ready: false, activeProjects: liveByProjectHash.size, recoveryRequired: true });
  }
}

export function pendingRunGate(projectRoot: string): PendingRunGateProjectionV1 | null {
  const identity = configuredIdentity(projectRoot);
  // Identity is how this gate knows which project it is answering for. A root
  // that will not canonicalize — an ejected volume, a dropped share, a sharing
  // violation — cannot be matched against the live journal, and answering "not
  // pending" would be a guess in the only direction that opens a mutation
  // boundary. Refuse while anything is pending; with an empty store there is
  // nothing to protect and legacy behavior is untouched.
  if (identity === null) return globallyUnsafe || liveByProjectHash.size > 0
    ? Object.freeze({ version: PENDING_RUN_GATE_VERSION, status: "recovery-required", projectHash: "0".repeat(64), runId: null, revision: null, state: null })
    : null;
  const current = liveByProjectHash.get(identity.projectHash)
    ?? [...liveByProjectHash.values()].find((run) => run.identity.deviceId === identity.deviceId && run.identity.fileId === identity.fileId);
  if (current) {
    if (globallyUnsafe || !sameProjectIdentity(current.identity, identity)) markRecovery(current);
    return projection(current);
  }
  return globallyUnsafe ? projection(recoveryRun(identity)) : null;
}

export function pendingRunRefusal(projectRoot: string): string | null {
  return pendingRunGate(projectRoot) === null
    ? null
    : "PENDING_RUN_ACTIVE: Cairn is still holding a verified result for this project. Finish or stop that result before starting, judging, or publishing other work.";
}

export function createPendingRun(value: unknown): PendingRunMutationResultV1 {
  if (globallyUnsafe || configuredStoreRoot === null || mainAuthKey === null) return failure("PENDING_RUN_STORE_UNAVAILABLE");
  const input = exactDataRecord(value, ["projectRoot", "runId", "state", "capsuleBytes"]);
  const identity = input && typeof input.projectRoot === "string" ? configuredIdentity(input.projectRoot) : null;
  if (!input || identity === null || typeof input.runId !== "string" || !UUID_V4.test(input.runId)) return failure("PENDING_RUN_INPUT_INVALID");
  if (liveByProjectHash.has(identity.projectHash)) return failure("PENDING_RUN_ALREADY_EXISTS");
  const inventory = currentInventory();
  if (!inventory) return failure("PENDING_RUN_STORE_UNAVAILABLE");
  const topology = boundedStoreTopology();
  if (!topology) return failure("PENDING_RUN_STORE_UNAVAILABLE");
  const projectAlreadyExists = topology.projects.some((project) => project.projectHash === identity.projectHash);
  if (inventory.record.entries.length >= PENDING_RUN_LIMITS.projectDirectories
    || topology.runDirectories >= PENDING_RUN_LIMITS.runDirectories
    || (!projectAlreadyExists && topology.projects.length >= PENDING_RUN_LIMITS.projectDirectories)) {
    return failure("PENDING_RUN_CAPACITY_REACHED");
  }
  const run = recoveryRun(identity, input.runId);
  const bytes = safeBytes(input.capsuleBytes);
  const state = bytes && parseState(input.state, digest(bytes));
  if (!bytes || !state || state.phase === "terminal-prepared") {
    liveByProjectHash.set(identity.projectHash, run);
    return failure("PENDING_RUN_STATE_INVALID");
  }
  const initialBytes = initialRunJournalBytes(run, state, bytes);
  if (initialBytes === null || !reserveRunJournalBytes(run, PENDING_RUN_LIMITS.journalBytes)) {
    return failure("PENDING_RUN_CAPACITY_REACHED");
  }
  liveByProjectHash.set(identity.projectHash, run); // mutation gate precedes every durable write
  try {
    const projectDirectory = join(configuredStoreRoot, identity.projectHash);
    const runDirectory = join(projectDirectory, input.runId);
    if (!ensureDirectory(projectDirectory, configuredStoreRoot) || existsSync(runDirectory)
      || !ensureDirectory(runDirectory, projectDirectory)
      || !ensureDirectory(join(runDirectory, CAPSULE_DIR_NAME), runDirectory)
      || !ensureDirectory(join(runDirectory, REVISION_DIR_NAME), runDirectory)) return failure("PENDING_RUN_PERSIST_FAILED");
    run.directory = runDirectory;
    const installed = installVerifiedRevision(run, state, bytes);
    if (installed !== "installed") {
      return failure(installed === "capacity" ? "PENDING_RUN_CAPACITY_REACHED" : "PENDING_RUN_PERSIST_FAILED");
    }
    run.status = "pending";
    return Object.freeze({ ok: true, value: projection(run) });
  } catch {
    return failure("PENDING_RUN_PERSIST_FAILED");
  }
}

export function pendingRunAuthority(projectRoot: string): PendingRunAuthorityV1 | null {
  if (globallyUnsafe) return null;
  const identity = configuredIdentity(projectRoot);
  if (!identity) return null;
  const run = liveByProjectHash.get(identity.projectHash);
  return run && sameProjectIdentity(run.identity, identity) ? run.authority : null;
}

/** Main-only fail-closed transition used when Core or evidence recovery does
 * not reproduce the authenticated journal. It never clears or rewrites the
 * durable gate. */
export function markPendingRunRecoveryRequired(authority: unknown): PendingRunGateProjectionV1 | null {
  const run = boundAuthority(authority);
  if (!run) return null;
  markRecovery(run);
  return projection(run);
}

export function pendingRunRecoveryInputs(): readonly PendingRunRecoveryInputV1[] {
  if (globallyUnsafe) return Object.freeze([]);
  const output: PendingRunRecoveryInputV1[] = [];
  for (const run of liveByProjectHash.values()) {
    const state = run.state;
    if (run.status !== "pending" || !state || state.phase === "terminal-prepared") continue;
    const current = exactCurrentRun(run);
    const actualIdentity = projectIdentity(run.identity.canonicalRoot);
    if (!current || !actualIdentity || !sameProjectIdentity(run.identity, actualIdentity)) {
      markRecovery(run);
      continue;
    }
    output.push(Object.freeze({
      authority: run.authority,
      projectRoot: run.identity.canonicalRoot,
      capsule: Object.freeze({
        version: PENDING_RUN_CAPSULE_VERSION,
        canonicalBytes: new Uint8Array(current.capsuleBytes),
        capsuleSha256: state.capsuleSha256,
      }),
      projection: projection(run),
    }));
  }
  return Object.freeze(output);
}

/** Exact terminal preparations are a separate recovery class: Main may only
 * hand them to Core's terminal reconciler, never to ordinary candidate
 * resume. */
export function pendingRunPreparedTerminalInputs(): readonly PendingRunRecoveryInputV1[] {
  if (globallyUnsafe) return Object.freeze([]);
  const output: PendingRunRecoveryInputV1[] = [];
  for (const run of liveByProjectHash.values()) {
    const state = run.state;
    if (!state || state.phase !== "terminal-prepared" || !state.terminalAction) continue;
    const current = exactCurrentRun(run, true);
    const actualIdentity = projectIdentity(run.identity.canonicalRoot);
    if (!current || !actualIdentity || !sameProjectIdentity(run.identity, actualIdentity)) {
      markRecovery(run);
      continue;
    }
    output.push(Object.freeze({
      authority: run.authority,
      projectRoot: run.identity.canonicalRoot,
      capsule: Object.freeze({
        version: PENDING_RUN_CAPSULE_VERSION,
        canonicalBytes: new Uint8Array(current.capsuleBytes),
        capsuleSha256: state.capsuleSha256,
      }),
      projection: projection(run),
    }));
  }
  return Object.freeze(output);
}

export function appendPendingRunRevision(
  authority: unknown,
  expectedRevision: number,
  stateValue: unknown,
  capsuleBytes: Uint8Array,
): PendingRunMutationResultV1 {
  if (globallyUnsafe) return failure("PENDING_RUN_STORE_UNAVAILABLE");
  const run = boundAuthority(authority);
  if (!run || run.status !== "pending" || run.revision !== expectedRevision || !run.state
    || run.state.phase === "terminal-prepared") return failure("PENDING_RUN_AUTHORITY_STALE");
  const current = exactCurrentRun(run);
  if (!current) {
    markRecovery(run);
    return failure("PENDING_RUN_JOURNAL_CHANGED");
  }
  const bytes = safeBytes(capsuleBytes);
  const state = bytes && parseState(stateValue, digest(bytes));
  if (!bytes || !state || !stateSuccessor(run.state, state)) return failure("PENDING_RUN_STATE_INVALID");
  const installed = installVerifiedRevision(run, state, bytes);
  if (installed !== "installed") {
    if (installed === "capacity") return failure("PENDING_RUN_CAPACITY_REACHED");
    markRecovery(run);
    return failure("PENDING_RUN_PERSIST_FAILED");
  }
  return Object.freeze({ ok: true, value: projection(run) });
}

export function preparePendingRunTerminal(
  authority: unknown,
  expectedRevision: number,
  actionValue: unknown,
  capsuleBytes: Uint8Array,
): PendingRunMutationResultV1 {
  if (globallyUnsafe) return failure("PENDING_RUN_STORE_UNAVAILABLE");
  const run = boundAuthority(authority);
  const actionInput = exactDataRecord(actionValue, ["actionId", "kind", "candidateSha256", "capsuleSha256"]);
  const bytes = safeBytes(capsuleBytes);
  const capsuleSha256 = bytes ? digest(bytes) : null;
  if (!run || run.status !== "pending" || run.revision !== expectedRevision || !run.state || !run.capsule
    || run.state.phase === "terminal-prepared" || !actionInput || !bytes || capsuleSha256 === null
    || typeof actionInput.actionId !== "string" || !UUID_V4.test(actionInput.actionId)
    || (actionInput.kind !== "finalize" && actionInput.kind !== "stop")
    || actionInput.candidateSha256 !== run.state.candidateSha256
    || actionInput.capsuleSha256 !== capsuleSha256
    || (actionInput.kind === "finalize" && run.state.phase !== "ready-to-seal")) return failure("PENDING_RUN_AUTHORITY_STALE");
  const current = exactCurrentRun(run);
  if (!current) {
    markRecovery(run);
    return failure("PENDING_RUN_JOURNAL_CHANGED");
  }
  const action = Object.freeze({
    actionId: actionInput.actionId,
    kind: actionInput.kind,
    candidateSha256: run.state.candidateSha256,
    capsuleSha256,
  });
  const prepared = parseState({
    ...run.state,
    phase: "terminal-prepared",
    capsuleSha256,
    terminalAction: action,
  }, capsuleSha256);
  if (!prepared) {
    markRecovery(run);
    return failure("PENDING_RUN_PERSIST_FAILED");
  }
  const installed = installVerifiedRevision(run, prepared, bytes);
  if (installed !== "installed") {
    if (installed === "capacity") return failure("PENDING_RUN_CAPACITY_REACHED");
    markRecovery(run);
    return failure("PENDING_RUN_PERSIST_FAILED");
  }
  run.status = "recovery-required"; // a crash after preparation is never replayed automatically
  return Object.freeze({ ok: true, value: projection(run) });
}

export function closePendingRun(
  authority: unknown,
  expectedRevision: number,
  actionId: string,
  terminalReceiptSha256: string,
): PendingRunMutationResultV1 {
  if (globallyUnsafe) return failure("PENDING_RUN_STORE_UNAVAILABLE");
  const existing = boundAuthority(authority, true);
  if (existing?.closedReceiptSha256 !== null && existing?.closedReceiptSha256 !== undefined) {
    return existing.closedActionId === actionId && existing.closedReceiptSha256 === terminalReceiptSha256
      ? Object.freeze({ ok: true, value: projection(existing) })
      : failure("PENDING_RUN_CLOSE_MISMATCH");
  }
  const run = existing;
  if (!run || run.revision !== expectedRevision || !run.state || run.state.phase !== "terminal-prepared"
    || !run.state.terminalAction || run.state.terminalAction.actionId !== actionId
    || typeof terminalReceiptSha256 !== "string" || !SHA256.test(terminalReceiptSha256)
    || !run.directory) return failure("PENDING_RUN_AUTHORITY_STALE");
  let scanned = scanRun(run.directory, run.identity.projectHash, run.runId);
  if (!scanned) return failure("PENDING_RUN_AUTHORITY_STALE");
  const inventoryBefore = currentInventory();
  if (!inventoryBefore) return failure("PENDING_RUN_CLOSE_FAILED");
  scanned = scanRun(run.directory, run.identity.projectHash, run.runId);
  if (!scanned) return failure("PENDING_RUN_CLOSE_FAILED");
  if (!scanned.closed && !exactCurrentRun(run, true)) return failure("PENDING_RUN_AUTHORITY_STALE");
  if (scanned.closed && (scanned.run.closedReceiptSha256 !== terminalReceiptSha256
    || scanned.run.closedActionId !== actionId)) return failure("PENDING_RUN_CLOSE_FAILED");
  if (!reserveRunJournalBytes(run, scanned.journalBytes)) return failure("PENDING_RUN_CAPACITY_REACHED");
  run.journalBytes = scanned.journalBytes;
  const closeIntent = Object.freeze({
    projectHash: run.identity.projectHash,
    runId: run.runId,
    revision: run.revision,
    revisionSha256: run.revisionSha256,
    actionId,
    actionKind: run.state.terminalAction.kind,
    terminalReceiptSha256,
  }) as PendingRunInventoryCloseIntentV1;
  if (scanned.closed && (scanned.run.closedReceiptSha256 !== terminalReceiptSha256
    || scanned.run.closedActionId !== actionId)) return failure("PENDING_RUN_CLOSE_FAILED");
  const matchingBefore = inventoryBefore.record.entries.filter(
    (entry) => entry.projectHash === run.identity.projectHash && entry.runId === run.runId,
  );
  let inventoryUpdate: PendingInventoryUpdate | null = null;
  if (matchingBefore.length === 1) {
    if (matchingBefore[0]?.revision !== run.revision || matchingBefore[0]?.revisionSha256 !== run.revisionSha256) {
      return failure("PENDING_RUN_CLOSE_FAILED");
    }
    const closeBytes = encodedRecord(composeClose(run, run.state.terminalAction, terminalReceiptSha256));
    if (!reserveRunJournalBytes(run, scanned.journalBytes + closeBytes.byteLength)) {
      return failure("PENDING_RUN_CAPACITY_REACHED");
    }
    inventoryUpdate = prepareInventoryUpdate((entries) => {
    const matching = entries.filter((entry) => entry.projectHash === run.identity.projectHash && entry.runId === run.runId);
    if (matching.length !== 1 || matching[0]?.revision !== run.revision
      || matching[0]?.revisionSha256 !== run.revisionSha256) return null;
    return entries.filter((entry) => entry !== matching[0]);
    }, closeIntent);
    if (interruptAfterCloseIntentForTests) {
      interruptAfterCloseIntentForTests = false;
      return failure("PENDING_RUN_CLOSE_FAILED");
    }
    if (!inventoryUpdate || !ensurePendingInventoryClose(closeIntent)) {
      return failure("PENDING_RUN_CLOSE_FAILED");
    }
    const closedScan = scanRun(run.directory, run.identity.projectHash, run.runId);
    if (!closedScan?.closed || !reserveRunJournalBytes(run, closedScan.journalBytes)) {
      return failure("PENDING_RUN_CLOSE_FAILED");
    }
    run.journalBytes = closedScan.journalBytes;
    if (!finishInventoryUpdate(inventoryUpdate)) return failure("PENDING_RUN_CLOSE_FAILED");
  } else if (matchingBefore.length !== 0 || !scanned.closed) {
    return failure("PENDING_RUN_CLOSE_FAILED");
  }
  scanned = scanRun(run.directory, run.identity.projectHash, run.runId);
  if (!scanned?.closed || scanned.run.closedReceiptSha256 !== terminalReceiptSha256
    || scanned.run.closedActionId !== actionId) return failure("PENDING_RUN_CLOSE_FAILED");
  if (!settleClosedRunJournalBytes(run, scanned.journalBytes)) return failure("PENDING_RUN_CLOSE_FAILED");
  run.closedReceiptSha256 = terminalReceiptSha256;
  run.closedActionId = actionId;
  if (liveByProjectHash.get(run.identity.projectHash) === run) liveByProjectHash.delete(run.identity.projectHash);
  return Object.freeze({ ok: true, value: projection(run) });
}

export function _resetPendingRunsForTests(): void {
  if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== "test") return;
  liveByProjectHash.clear();
  configuredProfileRoot = null;
  configuredStoreRoot = null;
  globallyUnsafe = false;
  mainAuthKey = null;
  reservedJournalBytes = 0;
  interruptAfterInventoryIntentForTests = false;
  interruptAfterCloseIntentForTests = false;
}

/** Deterministic crash-cut seam. It is inert outside Node's test runner and
 * interrupts the next revision after its monotonic inventory intent is
 * durable but before any run topology is written. */
export function _interruptPendingRunAfterInventoryIntentForTests(): boolean {
  if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== "test") return false;
  interruptAfterInventoryIntentForTests = true;
  return true;
}

/** Deterministic close cut after the monotonic receipt/inventory intent but
 * before closed.json. Restart must finish that exact action forward. */
export function _interruptPendingRunAfterCloseIntentForTests(): boolean {
  if (!process.env.NODE_TEST_CONTEXT && process.env.NODE_ENV !== "test") return false;
  interruptAfterCloseIntentForTests = true;
  return true;
}
