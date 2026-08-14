import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, opendirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { TaskIntent } from "./intent.js";
import type { EvidencePlanV1, TaskSpecReviewV1, TaskSpecV1 } from "./quality.js";
import type { SerialTaskPromisesV1 } from "./taskcard.js";

export interface AdapterDescriptor {
  id: string;
  label: string;
  provider: string;
  model: string;
  connected: boolean;
  capabilities: readonly string[];
  priority: number;
}

interface AdapterTaskContractCommon {
  taskNumber: number;
  /** The one Core-validated, deeply frozen request accepted for this run. */
  intent: TaskIntent;
  /** SHA-256 of Core's fixed-order canonical serialization of `intent`. */
  requestSha256: string;
  supportedOutcome: string;
  lane: "Standard";
  route: {
    adapterId: string;
    adapterLabel: string;
    provider: string;
    model: string;
    reason: string;
  };
  ownedRecords: readonly string[];
  protectedGit: {
    head: string;
    dirty: boolean;
    staged: boolean;
  };
  stopConditions: readonly string[];
}

/**
 * The live intent-only contract. Its shape and wire literal remain unchanged.
 *
 * Task 237 adds `promises`, and it is optional on purpose: a run given none is
 * byte-for-byte the run this contract has always described. When present it
 * carries the exact rows the owner was shown before dispatch, so the worker
 * answers the same promises the owner accepted — never a restatement of them.
 */
export interface LegacyAdapterTaskContractV3 extends AdapterTaskContractCommon {
  version: "cairn-serial-task/v3";
  checks: readonly string[];
  promises?: SerialTaskPromisesV1;
}

/**
 * The staged Task-Spec-bound worker contract. The review is an output-only
 * projection for the worker prompt; the branded Evidence Plan and all three
 * independently recomputed digests remain the authority. `checks` is an empty
 * compatibility slot so legacy renderers cannot accidentally pass anonymous
 * envelope checks off as Quality Plan criteria.
 */
export interface QualityBoundAdapterTaskContractV4 extends AdapterTaskContractCommon {
  version: "cairn-serial-task/v4";
  taskSpec: TaskSpecV1;
  taskSpecSha256: string;
  taskSpecReview: TaskSpecReviewV1;
  evidencePlan: EvidencePlanV1;
  evidencePlanSha256: string;
  checks: readonly [];
  envelopeChecks: readonly string[];
}

export type AdapterTaskContract = LegacyAdapterTaskContractV3 | QualityBoundAdapterTaskContractV4;

export const CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION = "cairn-evidence-command/v1" as const;
export const OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION = "opaque-provider-command/v1" as const;

export type WorkerCommandEventRepresentation =
  | typeof CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION
  | typeof OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION;

/** One reduced process event. It carries execution facts and no criterion authority. */
export interface WorkerCommandProcessEvent {
  sequence: number;
  commandSha256: string;
  exitCode: number;
}

/**
 * A bounded reduction of one adapter's real process stream. `complete: false`
 * means a malformed, dropped, oversized, or otherwise unobservable event may
 * have existed; consumers must not infer absence from the retained array.
 */
export interface WorkerProcessEventBundle {
  representation: WorkerCommandEventRepresentation;
  complete: boolean;
  events: readonly WorkerCommandProcessEvent[];
}

export const WORKER_COMMAND_PROCESS_EVENT_CAP = 64;

function plainRecord(value: unknown, expectedKeys: readonly string[]): Readonly<Record<string, unknown>> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) return null;
  const sorted = [...(keys as string[])].sort();
  const expected = [...expectedKeys].sort();
  if (sorted.length !== expected.length || sorted.some((key, index) => key !== expected[index])) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const record: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor) || !descriptor.enumerable) return null;
    record[key] = descriptor.value;
  }
  return record;
}

/** Strictly detach, bound, and freeze an adapter's reduced process events. */
export function parseWorkerProcessEventBundle(value: unknown): WorkerProcessEventBundle | null {
  try {
    const record = plainRecord(value, ["complete", "events", "representation"]);
    if (!record || typeof record.complete !== "boolean"
      || (record.representation !== CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION
        && record.representation !== OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION)
      || !Array.isArray(record.events) || record.events.length > WORKER_COMMAND_PROCESS_EVENT_CAP) return null;
    const events: WorkerCommandProcessEvent[] = [];
    for (let index = 0; index < record.events.length; index += 1) {
      const event = plainRecord(record.events[index], ["commandSha256", "exitCode", "sequence"]);
      if (!event || event.sequence !== index || typeof event.commandSha256 !== "string"
        || !/^[a-f0-9]{64}$/.test(event.commandSha256)
        || !Number.isSafeInteger(event.exitCode) || Object.is(event.exitCode, -0)
        || (event.exitCode as number) < -1 || (event.exitCode as number) > 255) return null;
      events.push(Object.freeze({
        sequence: index,
        commandSha256: event.commandSha256,
        exitCode: event.exitCode as number,
      }));
    }
    return Object.freeze({
      representation: record.representation,
      complete: record.complete,
      events: Object.freeze(events),
    });
  } catch {
    return null;
  }
}

/**
 * The one result shape every adapter returns — codex, offline demo, or a
 * future third adapter alike. `evidence` is a bounded numeric map the adapter
 * chooses; `claimsText` is the worker's final message (parsed for its
 * cairn-claims fence) or null. The serial envelope validates this exact shape
 * and never special-cases which adapter produced it.
 */
export interface LegacyWorkerRunResultV2 {
  kind: "worker-result/v2";
  taskNumber: number;
  requestSha256: string;
  status: "completed" | "failed";
  claimsText: string | null;
  evidence: Record<string, number>;
}

export interface QualityBoundWorkerRunResultV3 {
  kind: "worker-result/v3";
  taskNumber: number;
  requestSha256: string;
  taskSpecSha256: string;
  evidencePlanSha256: string;
  status: "completed" | "failed";
  claimsText: string | null;
  evidence: Record<string, number>;
  processEvents: WorkerProcessEventBundle;
}

export type WorkerRunResult = LegacyWorkerRunResultV2 | QualityBoundWorkerRunResultV3;

/** The six confirmation facts an adapter that makes a real call must disclose. */
export interface WorkerDisclosure {
  provider: string;
  model: string;
  project: string;
  task: string;
  data: string;
  quota: string;
  /** Present only for the staged Task-Spec-bound route. */
  taskSpecSha256?: string;
  /** Present only for the staged Task-Spec-bound route. */
  evidencePlanSha256?: string;
}

/** An adapter stopped at its own real-call boundary before doing paid work. */
export class WorkerBoundaryError extends Error {
  readonly boundary = "real-call" as const;
}

export type WorkerFailureKind = "process" | "timeout" | "cancelled";

/**
 * The worker process did not return a verified result. `failure` tells the
 * envelope how to close: `timeout` → ADAPTER_TIMED_OUT, `cancelled` →
 * CANCELLED_BY_OWNER, `process` → ADAPTER_FAILED. `code` and `debugPath` are
 * the adapter's own precise diagnostics. `killConfirmed` is false only when a
 * timeout/cancel kill was issued but the child never closed (a live orphan may
 * still be writing the workspace); it is true for every path where nothing can
 * still be running — a confirmed close, a spawn/stdin process failure, or a
 * pre-spawn cancel. The envelope uses it to decide whether releasing the run
 * lock is safe.
 */
export class WorkerProcessError extends Error {
  constructor(
    readonly failure: WorkerFailureKind,
    readonly code: string,
    readonly debugPath: string | null,
    readonly killConfirmed: boolean = true,
  ) {
    super(`${code}: the worker process did not return a verified result.`);
  }
}

/**
 * The only execution seam in the serial foundation. An adapter receives a
 * bounded value object: never a root, path resolver, file handle, shell,
 * process, Git handle, network client, credential, tool, or delegation hook.
 */
export interface TaskAdapter {
  descriptor: AdapterDescriptor;
  /** Main-internal routing fact. It is never copied into AdapterDescriptor. */
  qualitySupport?: TaskAdapterQualitySupport;
  /**
   * Internal candidate eligibility fact. Production adapters omit it. The
   * non-sandbox value exists only for Core's source-level state harness and is
   * never eligible for the public candidate route.
   */
  candidateWriterSupport?: TaskAdapterCandidateWriterSupport;
  run(contract: AdapterTaskContract, signal?: AbortSignal): Promise<WorkerRunResult>;
  /** The disclosure the owner reads and byte-confirms for this whole intent. */
  disclosure?(intent: TaskIntent, quality?: AdapterTaskQualityBinding): WorkerDisclosure;
}

export interface TaskAdapterQualitySupport {
  commandEventRepresentation: WorkerCommandEventRepresentation;
}

export const TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION =
  "cairn-task-adapter-candidate-writer-support/v1" as const;

export type TaskAdapterCandidateWriterSupport =
  | Readonly<{
      version: typeof TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION;
      scope: "node-test-only";
      enforcement: "not-a-sandbox";
    }>
  | Readonly<{
      version: typeof TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION;
      scope: "node-test-only";
      enforcement: "node-v24-permission-model";
    }>
  | Readonly<{
      version: typeof TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION;
      scope: "q9-electron-e2e-only";
      enforcement: "in-process-preregistered-fixture";
    }>;

export const NODE_PERMISSION_MODEL_CANDIDATE_TEST_PROGRAM_VERSION =
  "cairn-node-permission-candidate-test-program/v1" as const;

export type NodePermissionModelCandidateOperationV1 =
  | Readonly<{
      kind: "write" | "append";
      path: string;
      contents: string;
      expect: "allowed" | "denied";
    }>
  | Readonly<{
      kind: "truncate" | "unlink" | "remove" | "mkdir";
      path: string;
      expect: "allowed" | "denied";
    }>
  | Readonly<{
      kind: "hard-link" | "rename" | "symbolic-link";
      source: string;
      destination: string;
      expect: "allowed" | "denied";
    }>;

export type NodePermissionModelCandidateTestProgramV1 = Readonly<{
  version: typeof NODE_PERMISSION_MODEL_CANDIDATE_TEST_PROGRAM_VERSION;
  operations: readonly NodePermissionModelCandidateOperationV1[];
  result: Readonly<{
    status: "completed" | "failed";
    claimsText: string | null;
    evidence: Readonly<Record<string, number>>;
  }>;
}>;

export type NodePermissionModelCandidateTestAdapterInputV1 = Readonly<{
  descriptor: AdapterDescriptor;
  projectRoot: string;
  excludedUserDataRoot: string;
  program: NodePermissionModelCandidateTestProgramV1;
}>;

export type Q9E2eFakeCandidateAdapterInputV1 = Readonly<{
  fixtureId: string;
  descriptor: AdapterDescriptor;
  projectRoot: string;
  excludedUserDataRoot: string;
  program: NodePermissionModelCandidateTestProgramV1;
}>;

const candidateWriterTestSupportBrand = new WeakSet<object>();
const candidateWriterQ9E2eSupportBrand = new WeakSet<object>();
type PermissionCandidateBinding = Readonly<{
  adapter: TaskAdapter;
  run: TaskAdapter["run"];
  projectRootReal: string;
  excludedUserDataRootReal: string;
  fixtureId?: string;
}>;
const candidateWriterPermissionSupportBindings = new WeakMap<object, PermissionCandidateBinding>();
const candidateWriterQ9E2eSupportBindings = new WeakMap<object, PermissionCandidateBinding>();
const q9E2eAuthorizedContracts = new WeakMap<object, TaskAdapter>();
const q9E2eHarnessFailureResults = new WeakMap<object, Readonly<{
  adapter: TaskAdapter;
  fixtureId: string;
  commandSha256: string;
}>>();
const q9E2eCairnBlockerResults = new WeakMap<object, Readonly<{
  adapter: TaskAdapter;
  fixtureId: "q9-cairn-blocker-confirmation";
  commandSha256: string;
}>>();

export const Q9_E2E_HARNESS_FAILURE_VERSION = "cairn-q9-e2e-harness-failure/v1" as const;
export type Q9E2eHarnessFailureResultV1 = Readonly<{
  version: typeof Q9_E2E_HARNESS_FAILURE_VERSION;
  code: "TIMED_OUT_BEFORE_ASSERTION";
  commandSha256: string;
  exitCode: 124;
  boundedOutput: "The injected Q9 harness timed out before reaching its preregistered assertion.";
  outputSha256: string;
}>;

export const Q9_E2E_CAIRN_BLOCKER_RESULT_VERSION = "cairn-q9-e2e-cairn-blocker/v1" as const;
export type Q9E2eCairnBlockerResultV1 = Readonly<{
  version: typeof Q9_E2E_CAIRN_BLOCKER_RESULT_VERSION;
  code: "CRITERION_NOT_MET";
  commandSha256: string;
  exitCode: 1;
}>;

export const Q9_E2E_REVISED_EVIDENCE_VERSION = "cairn-q9-e2e-revised-evidence/v1" as const;
export type Q9E2eRevisedEvidenceV1 = Readonly<{
  version: typeof Q9_E2E_REVISED_EVIDENCE_VERSION;
  criterionId: `c${number}`;
  commandSha256: string;
  exitCode: 0;
  boundedOutput: "The injected Q9 harness reached its preregistered assertion after the authorized timeout correction.";
  outputSha256: string;
}>;
const q9E2eRevisedEvidenceBrand = new WeakSet<object>();

const PERMISSION_CANDIDATE_MAX_ENTRIES = 32_768;
const PERMISSION_CANDIDATE_MAX_OPERATIONS = 32;
const PERMISSION_CANDIDATE_MAX_INPUT_BYTES = 4 * 1024 * 1024;
const PERMISSION_CANDIDATE_MAX_OUTPUT_BYTES = 1024 * 1024;
const PERMISSION_CANDIDATE_TIMEOUT_MS = 30_000;

function canonicalCandidateTestDirectory(value: unknown): string | null {
  try {
    if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return null;
    const absolute = resolve(value);
    const input = lstatSync(absolute);
    if (!input.isDirectory() || input.isSymbolicLink()) return null;
    const real = resolve(realpathSync.native(absolute));
    const actual = lstatSync(real);
    return actual.isDirectory() && !actual.isSymbolicLink() ? real : null;
  } catch {
    return null;
  }
}

function candidateTestRootContains(parent: string, child: string): boolean {
  const relation = relative(parent, child);
  return relation === "" || (!isAbsolute(relation) && relation !== ".."
    && !relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`));
}

/**
 * Node documents that its Permission Model follows pre-existing symbolic
 * links. The fake launcher therefore refuses any writable tree containing a
 * link/reparse point or a multiply-linked file before it grants that tree.
 */
function permissionCandidateWritableTreeSafe(rootReal: string): boolean {
  try {
    const pending = [rootReal];
    let seen = 0;
    while (pending.length > 0) {
      const directory = pending.pop();
      if (!directory) return false;
      const handle = opendirSync(directory);
      try {
        for (;;) {
          const entry = handle.readSync();
          if (!entry) break;
          seen += 1;
          if (seen > PERMISSION_CANDIDATE_MAX_ENTRIES) return false;
          const path = resolve(directory, entry.name);
          if (!candidateTestRootContains(rootReal, path)) return false;
          const stat = lstatSync(path);
          if (stat.isSymbolicLink()) return false;
          if (stat.isDirectory()) pending.push(path);
          else if (!stat.isFile() || stat.nlink !== 1) return false;
        }
      } finally {
        handle.closeSync();
      }
    }
    return true;
  } catch {
    return false;
  }
}

function nodeTestAuthorityPresent(): boolean {
  return process.versions.electron === undefined
    && process.env.NODE_TEST_CONTEXT === "child-v8";
}

function q9ElectronE2eAuthorityPresent(): boolean {
  return (typeof process.versions.electron === "string" && process.versions.electron.length > 0
      || process.env.NODE_TEST_CONTEXT === "child-v8")
    && process.env.CAIRN_E2E === "1"
    && process.env.CAIRN_MOCK === "1"
    && process.env.CAIRN_TEST_Q9 === "1";
}

/**
 * Test-harness-only mint. It deliberately says that it is not a sandbox: the
 * in-process fake exercises custody/restart logic but proves no OS writer
 * boundary. Production candidate routing therefore stays dark until a real
 * launcher can mint a separate enforced support fact.
 */
export function composeTaskAdapterCandidateWriterSupportForTest(): TaskAdapterCandidateWriterSupport | null {
  if (!nodeTestAuthorityPresent()) return null;
  const support = Object.freeze({
    version: TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION,
    scope: "node-test-only" as const,
    enforcement: "not-a-sandbox" as const,
  });
  candidateWriterTestSupportBrand.add(support);
  return support;
}

/** Core-state-test brand check. This value is never a Q7 writer authority. */
export function isTaskAdapterCandidateStateTestSupport(value: unknown): boolean {
  if (typeof value !== "object" || value === null
    || (value as TaskAdapterCandidateWriterSupport).version !== TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION) return false;
  return nodeTestAuthorityPresent() && candidateWriterTestSupportBrand.has(value)
    && (value as TaskAdapterCandidateWriterSupport).scope === "node-test-only"
    && (value as TaskAdapterCandidateWriterSupport).enforcement === "not-a-sandbox"
    || q9ElectronE2eAuthorityPresent() && candidateWriterQ9E2eSupportBrand.has(value)
      && (value as TaskAdapterCandidateWriterSupport).scope === "q9-electron-e2e-only"
      && (value as TaskAdapterCandidateWriterSupport).enforcement === "in-process-preregistered-fixture";
}

/** Public candidate support check; structural or non-sandbox values fail. */
export function isTaskAdapterCandidateWriterSupport(
  value: unknown,
): value is TaskAdapterCandidateWriterSupport {
  return nodeTestAuthorityPresent() && typeof value === "object" && value !== null
    && candidateWriterPermissionSupportBindings.has(value)
    && (value as TaskAdapterCandidateWriterSupport).version === TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION
    && (value as TaskAdapterCandidateWriterSupport).scope === "node-test-only"
    && (value as TaskAdapterCandidateWriterSupport).enforcement === "node-v24-permission-model";
}

function strictCandidateStringArray(value: unknown, cap: number): readonly string[] | null {
  if (!Array.isArray(value) || value.length > cap) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== value.length + 1 || ownKeys.some((key) => {
    if (key === "length") return false;
    if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) return true;
    const index = Number(key);
    return !Number.isSafeInteger(index) || index < 0 || index >= value.length;
  })) return null;
  const values: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor)
      || typeof descriptor.value !== "string" || descriptor.value.length === 0) return null;
    values.push(descriptor.value);
  }
  return Object.freeze(values);
}

function detachCandidateTestDescriptor(value: unknown): AdapterDescriptor | null {
  const record = plainRecord(value, ["capabilities", "connected", "id", "label", "model", "priority", "provider"]);
  if (!record || typeof record.id !== "string" || record.id.length === 0
    || typeof record.label !== "string" || record.label.length === 0
    || typeof record.provider !== "string" || record.provider.length === 0
    || typeof record.model !== "string" || record.model.length === 0
    || record.connected !== true || !Number.isSafeInteger(record.priority)) return null;
  const capabilities = strictCandidateStringArray(record.capabilities, 16);
  if (!capabilities || !capabilities.includes("serial-task")
    || !capabilities.includes("serial-task-candidate")) return null;
  return Object.freeze({
    id: record.id,
    label: record.label,
    provider: record.provider,
    model: record.model,
    connected: true,
    capabilities,
    priority: record.priority as number,
  });
}

function detachCandidateTestEvidence(value: unknown): Readonly<Record<string, number>> | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(value);
    if (keys.length > 32 || keys.some((key) => typeof key !== "string")) return null;
    const result: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor)
        || key.length === 0 || key.length > 100 || key === "__proto__"
        || !Number.isFinite(descriptor.value) || descriptor.value < 0) return null;
      result[key] = descriptor.value as number;
    }
    return Object.freeze(result);
  } catch {
    return null;
  }
}

function detachCandidateTestOperation(value: unknown): NodePermissionModelCandidateOperationV1 | null {
  const kindDescriptor = value && typeof value === "object"
    ? Object.getOwnPropertyDescriptor(value, "kind")
    : undefined;
  if (!kindDescriptor || kindDescriptor.get || kindDescriptor.set || !("value" in kindDescriptor)) return null;
  const kind = kindDescriptor.value;
  if (kind === "write" || kind === "append") {
    const record = plainRecord(value, ["contents", "expect", "kind", "path"]);
    if (!record || typeof record.path !== "string" || record.path.length === 0 || record.path.includes("\0")
      || typeof record.contents !== "string" || Buffer.byteLength(record.contents, "utf8") > 1024 * 1024
      || (record.expect !== "allowed" && record.expect !== "denied")) return null;
    return Object.freeze({ kind, path: record.path, contents: record.contents, expect: record.expect });
  }
  if (kind === "truncate" || kind === "unlink" || kind === "remove" || kind === "mkdir") {
    const record = plainRecord(value, ["expect", "kind", "path"]);
    if (!record || typeof record.path !== "string" || record.path.length === 0 || record.path.includes("\0")
      || (record.expect !== "allowed" && record.expect !== "denied")) return null;
    return Object.freeze({ kind, path: record.path, expect: record.expect });
  }
  if (kind === "hard-link" || kind === "rename" || kind === "symbolic-link") {
    const record = plainRecord(value, ["destination", "expect", "kind", "source"]);
    if (!record || typeof record.source !== "string" || record.source.length === 0 || record.source.includes("\0")
      || typeof record.destination !== "string" || record.destination.length === 0 || record.destination.includes("\0")
      || (record.expect !== "allowed" && record.expect !== "denied")) return null;
    return Object.freeze({ kind, source: record.source, destination: record.destination, expect: record.expect });
  }
  return null;
}

function detachCandidateTestProgram(value: unknown): NodePermissionModelCandidateTestProgramV1 | null {
  try {
    const record = plainRecord(value, ["operations", "result", "version"]);
    if (!record || record.version !== NODE_PERMISSION_MODEL_CANDIDATE_TEST_PROGRAM_VERSION
      || !Array.isArray(record.operations) || record.operations.length > PERMISSION_CANDIDATE_MAX_OPERATIONS) return null;
    const rawOperations = record.operations;
    const operationKeys = Reflect.ownKeys(rawOperations);
    if (operationKeys.length !== rawOperations.length + 1 || operationKeys.some((key) => {
      if (key === "length") return false;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) return true;
      const index = Number(key);
      return !Number.isSafeInteger(index) || index < 0 || index >= rawOperations.length;
    })) return null;
    const operations: NodePermissionModelCandidateOperationV1[] = [];
    let operationBytes = 0;
    for (let index = 0; index < rawOperations.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(rawOperations, String(index));
      const operation = descriptor && !descriptor.get && !descriptor.set && "value" in descriptor
        ? detachCandidateTestOperation(descriptor.value)
        : null;
      if (!operation) return null;
      operations.push(operation);
      operationBytes += Buffer.byteLength(JSON.stringify(operation), "utf8");
      if (operationBytes > 1024 * 1024) return null;
    }
    const result = plainRecord(record.result, ["claimsText", "evidence", "status"]);
    const evidence = result ? detachCandidateTestEvidence(result.evidence) : null;
    if (!result || (result.status !== "completed" && result.status !== "failed")
      || (result.claimsText !== null && (typeof result.claimsText !== "string"
        || Buffer.byteLength(result.claimsText, "utf8") > 256 * 1024)) || !evidence) return null;
    return Object.freeze({
      version: NODE_PERMISSION_MODEL_CANDIDATE_TEST_PROGRAM_VERSION,
      operations: Object.freeze(operations),
      result: Object.freeze({ status: result.status, claimsText: result.claimsText, evidence }),
    });
  } catch {
    return null;
  }
}

const NODE_PERMISSION_CANDIDATE_WORKER_SOURCE = String.raw`
import * as fs from "node:fs";
const chunks = [];
let length = 0;
for await (const chunk of process.stdin) {
  length += chunk.length;
  if (length > ${PERMISSION_CANDIDATE_MAX_INPUT_BYTES}) throw new Error("INPUT_TOO_LARGE");
  chunks.push(chunk);
}
const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const permission = process.permission;
if (!permission || !permission.has("fs.write", input.projectRoot)
  || permission.has("fs.write", input.excludedUserDataRoot)
  || permission.has("child") || permission.has("worker") || permission.has("addon") || permission.has("wasi")) {
  throw new Error("INVALID_PERMISSION_BOUNDARY");
}
const denied = new Set(["ERR_ACCESS_DENIED", "EACCES", "EPERM"]);
for (const operation of input.program.operations) {
  let error = null;
  try {
    if (operation.kind === "write") fs.writeFileSync(operation.path, operation.contents, "utf8");
    else if (operation.kind === "append") fs.appendFileSync(operation.path, operation.contents, "utf8");
    else if (operation.kind === "truncate") fs.truncateSync(operation.path, 0);
    else if (operation.kind === "unlink") fs.unlinkSync(operation.path);
    else if (operation.kind === "remove") fs.rmSync(operation.path, { recursive: true, force: true });
    else if (operation.kind === "mkdir") fs.mkdirSync(operation.path);
    else if (operation.kind === "hard-link") fs.linkSync(operation.source, operation.destination);
    else if (operation.kind === "rename") fs.renameSync(operation.source, operation.destination);
    else if (operation.kind === "symbolic-link") fs.symlinkSync(operation.source, operation.destination);
    else throw new Error("UNKNOWN_OPERATION");
  } catch (caught) {
    error = caught;
  }
  const wasDenied = !!error && denied.has(error.code);
  if ((operation.expect === "allowed" && error) || (operation.expect === "denied" && !wasDenied)) {
    throw new Error("OPERATION_EXPECTATION_MISMATCH:" + operation.kind + ":" + (error?.code ?? "ALLOWED"));
  }
}
const contract = input.contract;
if (!contract || contract.version !== "cairn-serial-task/v4") throw new Error("INVALID_CONTRACT");
const events = [];
for (const procedure of contract.evidencePlan.procedures) {
  if (procedure.command) events.push({
    sequence: events.length,
    commandSha256: procedure.command.sha256,
    exitCode: 0,
  });
}
process.stdout.write(JSON.stringify({
  kind: "worker-result/v3",
  taskNumber: contract.taskNumber,
  requestSha256: contract.requestSha256,
  taskSpecSha256: contract.taskSpecSha256,
  evidencePlanSha256: contract.evidencePlanSha256,
  status: input.program.result.status,
  claimsText: input.program.result.claimsText,
  evidence: input.program.result.evidence,
  processEvents: {
    representation: "cairn-evidence-command/v1",
    complete: true,
    events,
  },
}));
`;

function permissionCandidateEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const name of ["SystemRoot", "WINDIR", "TEMP", "TMP"] as const) {
    const value = process.env[name];
    if (typeof value === "string" && value.length > 0) environment[name] = value;
  }
  return environment;
}

function launchPermissionCandidate(
  binding: Omit<PermissionCandidateBinding, "adapter" | "run">,
  program: NodePermissionModelCandidateTestProgramV1,
  contract: AdapterTaskContract,
  signal?: AbortSignal,
): Promise<WorkerRunResult> {
  return new Promise((resolveResult, rejectResult) => {
    let input: string;
    try {
      input = JSON.stringify({
        projectRoot: binding.projectRootReal,
        excludedUserDataRoot: binding.excludedUserDataRootReal,
        program,
        contract,
      });
      if (Buffer.byteLength(input, "utf8") > PERMISSION_CANDIDATE_MAX_INPUT_BYTES) {
        rejectResult(new WorkerProcessError("process", "CANDIDATE_PERMISSION_INPUT_TOO_LARGE", null));
        return;
      }
    } catch {
      rejectResult(new WorkerProcessError("process", "CANDIDATE_PERMISSION_INPUT_INVALID", null));
      return;
    }
    if (signal?.aborted) {
      rejectResult(new WorkerProcessError("cancelled", "CANDIDATE_PERMISSION_CANCELLED", null));
      return;
    }
    const child = spawn(process.execPath, [
      "--permission",
      `--allow-fs-read=${binding.projectRootReal}`,
      `--allow-fs-write=${binding.projectRootReal}`,
      "--input-type=module",
      "--eval",
      NODE_PERMISSION_CANDIDATE_WORKER_SOURCE,
    ], {
      cwd: binding.projectRootReal,
      env: permissionCandidateEnvironment(),
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let forcedCode: string | null = null;
    let cancelled = false;
    const stop = (code: string): void => {
      if (forcedCode === null) forcedCode = code;
      child.kill();
    };
    const abort = (): void => {
      cancelled = true;
      stop("CANDIDATE_PERMISSION_CANCELLED");
    };
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => stop("CANDIDATE_PERMISSION_TIMED_OUT"), PERMISSION_CANDIDATE_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > PERMISSION_CANDIDATE_MAX_OUTPUT_BYTES) stop("CANDIDATE_PERMISSION_OUTPUT_TOO_LARGE");
      else stdout.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > PERMISSION_CANDIDATE_MAX_OUTPUT_BYTES) stop("CANDIDATE_PERMISSION_STDERR_TOO_LARGE");
      else stderr.push(Buffer.from(chunk));
    });
    child.once("error", () => stop("CANDIDATE_PERMISSION_SPAWN_FAILED"));
    child.once("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (cancelled) {
        rejectResult(new WorkerProcessError("cancelled", "CANDIDATE_PERMISSION_CANCELLED", null));
        return;
      }
      if (forcedCode || code !== 0) {
        const suffix = stderr.length > 0
          ? `_${Buffer.concat(stderr).toString("utf8").slice(0, 80).replace(/[^A-Za-z0-9]+/gu, "_")}`
          : "";
        rejectResult(new WorkerProcessError(
          forcedCode === "CANDIDATE_PERMISSION_TIMED_OUT" ? "timeout" : "process",
          `${forcedCode ?? "CANDIDATE_PERMISSION_WORKER_FAILED"}${suffix}`.slice(0, 160),
          null,
        ));
        return;
      }
      try {
        resolveResult(JSON.parse(Buffer.concat(stdout).toString("utf8")) as WorkerRunResult);
      } catch {
        rejectResult(new WorkerProcessError("process", "CANDIDATE_PERMISSION_RESULT_INVALID", null));
      }
    });
    child.stdin.on("error", () => stop("CANDIDATE_PERMISSION_STDIN_FAILED"));
    child.stdin.end(input, "utf8");
  });
}

/**
 * Compose the only Q7-eligible fake adapter. Its exact immutable `run`
 * function always launches a separate Node v24 process under an fs-write
 * allowlist containing only the canonical project root.
 */
export function composeNodePermissionModelCandidateAdapterForTest(
  value: NodePermissionModelCandidateTestAdapterInputV1,
): TaskAdapter | null {
  try {
    if (!nodeTestAuthorityPresent() || Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10) < 24) return null;
    const record = plainRecord(value, ["descriptor", "excludedUserDataRoot", "program", "projectRoot"]);
    if (!record) return null;
    const descriptor = detachCandidateTestDescriptor(record.descriptor);
    const program = detachCandidateTestProgram(record.program);
    const projectRootReal = canonicalCandidateTestDirectory(record.projectRoot);
    const excludedUserDataRootReal = canonicalCandidateTestDirectory(record.excludedUserDataRoot);
    if (!descriptor || !program || !projectRootReal || !excludedUserDataRootReal
      || candidateTestRootContains(projectRootReal, excludedUserDataRootReal)
      || candidateTestRootContains(excludedUserDataRootReal, projectRootReal)
      || !permissionCandidateWritableTreeSafe(projectRootReal)) return null;
    const roots = Object.freeze({ projectRootReal, excludedUserDataRootReal });
    const run: TaskAdapter["run"] = (contract, signal) => launchPermissionCandidate(roots, program, contract, signal);
    const support = Object.freeze({
      version: TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION,
      scope: "node-test-only" as const,
      enforcement: "node-v24-permission-model" as const,
    });
    const adapter = {
      descriptor,
      qualitySupport: Object.freeze({
        commandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
      }),
      candidateWriterSupport: support,
      run,
    } as TaskAdapter;
    Object.freeze(adapter);
    candidateWriterPermissionSupportBindings.set(support, Object.freeze({
      adapter,
      run,
      projectRootReal,
      excludedUserDataRootReal,
    }));
    return adapter;
  } catch {
    return null;
  }
}

/** Electron-only Q9 fixture adapter. Its writes are a preregistered, bounded
 * fixture program and its run method remains dark until serial.ts marks the
 * exact frozen contract while executing the guarded state-test runner. */
export function composeQ9E2eFakeCandidateAdapter(
  value: Q9E2eFakeCandidateAdapterInputV1,
): TaskAdapter | null {
  try {
    if (!q9ElectronE2eAuthorityPresent()) return null;
    const record = plainRecord(value, ["descriptor", "excludedUserDataRoot", "fixtureId", "program", "projectRoot"]);
    if (!record || typeof record.fixtureId !== "string" || !/^q9-[a-z0-9][a-z0-9-]{0,62}$/u.test(record.fixtureId)) return null;
    const descriptor = detachCandidateTestDescriptor(record.descriptor);
    const program = detachCandidateTestProgram(record.program);
    const projectRootReal = canonicalCandidateTestDirectory(record.projectRoot);
    const excludedUserDataRootReal = canonicalCandidateTestDirectory(record.excludedUserDataRoot);
    const expectedId = `cairn-q9-e2e-${record.fixtureId}`;
    if (!descriptor || descriptor.id !== expectedId || descriptor.provider !== "Cairn E2E Fixture"
      || descriptor.model !== `synthetic-q9/${record.fixtureId}` || descriptor.capabilities.length !== 3
      || !descriptor.capabilities.includes("serial-task")
      || !descriptor.capabilities.includes("serial-task-candidate")
      || !descriptor.capabilities.includes("offline-demo")
      || !program || !projectRootReal || !excludedUserDataRootReal
      || candidateTestRootContains(projectRootReal, excludedUserDataRootReal)
      || candidateTestRootContains(excludedUserDataRootReal, projectRootReal)
      || !permissionCandidateWritableTreeSafe(projectRootReal)) return null;
    const detachedOperations: Array<Readonly<{ path: string; contents: string }>> = [];
    for (const operation of program.operations) {
      if (operation.kind !== "write" || operation.expect !== "allowed") return null;
      const target = resolve(projectRootReal, operation.path);
      const relativeTarget = relative(projectRootReal, target).replace(/\\/gu, "/");
      const parts = relativeTarget.toLowerCase().split("/");
      const parent = canonicalCandidateTestDirectory(dirname(target));
      if (!relativeTarget || isAbsolute(relativeTarget) || relativeTarget === ".." || relativeTarget.startsWith("../")
        || parts.includes(".git") || parts.includes(".cairn") || parts.includes("node_modules")
        || relativeTarget.toLowerCase().startsWith("docs/ai-work/")
        || !parent || !candidateTestRootContains(projectRootReal, parent)) return null;
      try {
        const current = lstatSync(target);
        if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1) return null;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT")) return null;
      }
      detachedOperations.push(Object.freeze({ path: target, contents: operation.contents }));
    }
    const roots = Object.freeze({ projectRootReal, excludedUserDataRootReal });
    let adapter!: TaskAdapter;
    const run: TaskAdapter["run"] = async (contract, signal) => {
      if (!q9ElectronE2eAuthorityPresent() || q9E2eAuthorizedContracts.get(contract) !== adapter) {
        throw new WorkerBoundaryError("Q9_E2E_FAKE_WRITER_NOT_AUTHORIZED");
      }
      q9E2eAuthorizedContracts.delete(contract);
      if (signal?.aborted) throw new WorkerProcessError("cancelled", "Q9_E2E_FAKE_WRITER_CANCELLED", null);
      if (contract.version !== "cairn-serial-task/v4" || !permissionCandidateWritableTreeSafe(projectRootReal)) {
        throw new WorkerBoundaryError("Q9_E2E_FAKE_WRITER_CONTRACT_INVALID");
      }
      for (const operation of detachedOperations) {
        const parent = canonicalCandidateTestDirectory(dirname(operation.path));
        if (!parent || !candidateTestRootContains(projectRootReal, parent)) {
          throw new WorkerBoundaryError("Q9_E2E_FAKE_WRITER_PATH_CHANGED");
        }
        let before: ReturnType<typeof lstatSync> | null = null;
        try {
          before = lstatSync(operation.path);
          if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
            throw new WorkerBoundaryError("Q9_E2E_FAKE_WRITER_TARGET_CHANGED");
          }
        } catch (error) {
          if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT")) throw error;
        }
        let descriptor: number | null = null;
        try {
          descriptor = openSync(
            operation.path,
            constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW ?? 0)
              | (before === null ? constants.O_EXCL : 0),
            0o600,
          );
          const opened = fstatSync(descriptor);
          if (!opened.isFile() || opened.nlink !== 1
            || (before !== null && (opened.dev !== before.dev || opened.ino !== before.ino))) {
            throw new WorkerBoundaryError("Q9_E2E_FAKE_WRITER_TARGET_CHANGED");
          }
          writeFileSync(descriptor, operation.contents, { encoding: "utf8" });
        } finally {
          if (descriptor !== null) closeSync(descriptor);
        }
      }
      const harnessFailure = record.fixtureId === "q9-harness-revision" || record.fixtureId === "q9-harness-refusal";
      const cairnBlocker = record.fixtureId === "q9-cairn-blocker-confirmation";
      const result = Object.freeze({
        kind: "worker-result/v3" as const,
        taskNumber: contract.taskNumber,
        requestSha256: contract.requestSha256,
        taskSpecSha256: contract.taskSpecSha256,
        evidencePlanSha256: contract.evidencePlanSha256,
        status: program.result.status,
        claimsText: program.result.claimsText,
        evidence: program.result.evidence,
        processEvents: Object.freeze({
          representation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
          complete: true as const,
          events: Object.freeze(contract.evidencePlan.procedures
            .filter((procedure) => procedure.command !== null)
            .map((procedure, sequence) => Object.freeze({
              sequence,
              commandSha256: procedure.command!.sha256,
              exitCode: sequence === 0 && harnessFailure ? 124 : sequence === 0 && cairnBlocker ? 1 : 0,
            }))),
        }),
      });
      if (harnessFailure) {
        const commandSha256 = result.processEvents.events[0]?.commandSha256;
        if (!commandSha256) throw new WorkerBoundaryError("Q9_E2E_HARNESS_COMMAND_MISSING");
        q9E2eHarnessFailureResults.set(result, Object.freeze({
          adapter, fixtureId: record.fixtureId as string, commandSha256,
        }));
      } else if (cairnBlocker) {
        const commandSha256 = result.processEvents.events[0]?.commandSha256;
        if (!commandSha256) throw new WorkerBoundaryError("Q9_E2E_CAIRN_BLOCKER_COMMAND_MISSING");
        q9E2eCairnBlockerResults.set(result, Object.freeze({
          adapter, fixtureId: "q9-cairn-blocker-confirmation", commandSha256,
        }));
      }
      return result;
    };
    const support = Object.freeze({
      version: TASK_ADAPTER_CANDIDATE_WRITER_SUPPORT_VERSION,
      scope: "q9-electron-e2e-only" as const,
      enforcement: "in-process-preregistered-fixture" as const,
    });
    adapter = Object.freeze({
      descriptor,
      qualitySupport: Object.freeze({ commandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION }),
      candidateWriterSupport: support,
      run,
    });
    candidateWriterQ9E2eSupportBrand.add(support);
    candidateWriterQ9E2eSupportBindings.set(support, Object.freeze({
      adapter, run, projectRootReal, excludedUserDataRootReal, fixtureId: record.fixtureId,
    }));
    return adapter;
  } catch {
    return null;
  }
}

/** Read the one preregistered Q9 pre-assertion failure directly from the
 * adapter result object. Ordinary, cloned, and non-harness results stay dark. */
export function taskAdapterQ9E2eHarnessFailureResult(
  adapter: unknown,
  result: unknown,
): Q9E2eHarnessFailureResultV1 | null {
  if (!q9ElectronE2eAuthorityPresent() || typeof adapter !== "object" || adapter === null
    || typeof result !== "object" || result === null) return null;
  const binding = q9E2eHarnessFailureResults.get(result);
  if (!binding || binding.adapter !== adapter) return null;
  const boundedOutput = "The injected Q9 harness timed out before reaching its preregistered assertion." as const;
  return Object.freeze({
    version: Q9_E2E_HARNESS_FAILURE_VERSION,
    code: "TIMED_OUT_BEFORE_ASSERTION",
    commandSha256: binding.commandSha256,
    exitCode: 124,
    boundedOutput,
    outputSha256: createHash("sha256").update(Buffer.from(boundedOutput, "utf8")).digest("hex"),
  });
}

/** Read the sole preregistered Q9 Cairn-failure result. It permits serial to
 * retain a pre-seal candidate with one genuine non-zero verifier attestation;
 * ordinary, cloned, and non-Q9 adapter results remain invalid. */
export function taskAdapterQ9E2eCairnBlockerResult(
  adapter: unknown,
  result: unknown,
): Q9E2eCairnBlockerResultV1 | null {
  if (!q9ElectronE2eAuthorityPresent() || typeof adapter !== "object" || adapter === null
    || typeof result !== "object" || result === null) return null;
  const binding = q9E2eCairnBlockerResults.get(result);
  if (!binding || binding.adapter !== adapter) return null;
  return Object.freeze({
    version: Q9_E2E_CAIRN_BLOCKER_RESULT_VERSION,
    code: "CRITERION_NOT_MET",
    commandSha256: binding.commandSha256,
    exitCode: 1,
  });
}

/** Execute the only corrected Q9 harness procedure. This is an injected local
 * fact, not an adapter/provider call: it has no writer, network, key, or billing
 * capability and accepts only the exact harness fixture plus revision-one
 * timeout command selected by Core. */
export async function runTaskAdapterQ9E2eRevisedEvidence(
  adapter: unknown,
  contract: unknown,
  criterionId: unknown,
  signal?: AbortSignal,
): Promise<Q9E2eRevisedEvidenceV1 | null> {
  if (!q9ElectronE2eAuthorityPresent() || typeof adapter !== "object" || adapter === null
    || typeof contract !== "object" || contract === null || !Object.isFrozen(contract)
    || typeof criterionId !== "string" || !/^c(?:[1-9]|1[0-2])$/u.test(criterionId)) return null;
  const support = Object.getOwnPropertyDescriptor(adapter, "candidateWriterSupport")?.value;
  const binding = support && candidateWriterQ9E2eSupportBindings.get(support);
  if (!binding || binding.adapter !== adapter
    || (binding.fixtureId !== "q9-harness-revision" && binding.fixtureId !== "q9-harness-refusal")) return null;
  const typed = contract as QualityBoundAdapterTaskContractV4;
  if (typed.version !== "cairn-serial-task/v4" || typed.evidencePlan.revision !== 1
    || signal?.aborted) return null;
  const procedure = typed.evidencePlan.procedures.find((row) => row.criterionId === criterionId);
  if (!procedure || procedure.kind !== "adapter-command-attestation" || !procedure.command
    || procedure.command.timeoutMs < 60_000 || !procedure.command.expectedExitCodes.includes(0)) return null;
  await Promise.resolve();
  if (signal?.aborted || !q9ElectronE2eAuthorityPresent()) return null;
  const boundedOutput = "The injected Q9 harness reached its preregistered assertion after the authorized timeout correction." as const;
  const receipt = Object.freeze({
    version: Q9_E2E_REVISED_EVIDENCE_VERSION,
    criterionId: criterionId as `c${number}`,
    commandSha256: procedure.command.sha256,
    exitCode: 0 as const,
    boundedOutput,
    outputSha256: createHash("sha256").update(Buffer.from(boundedOutput, "utf8")).digest("hex"),
  });
  q9E2eRevisedEvidenceBrand.add(receipt);
  return receipt;
}

export function isTaskAdapterQ9E2eRevisedEvidence(value: unknown): value is Q9E2eRevisedEvidenceV1 {
  return typeof value === "object" && value !== null && q9E2eRevisedEvidenceBrand.has(value);
}

export function taskAdapterQ9E2eFakeCandidateBoundTo(
  adapter: unknown,
  projectRootReal: string,
  excludedUserDataRootReal: string,
): adapter is TaskAdapter {
  if (!q9ElectronE2eAuthorityPresent() || typeof adapter !== "object" || adapter === null) return false;
  const support = Object.getOwnPropertyDescriptor(adapter, "candidateWriterSupport")?.value;
  const binding = support && candidateWriterQ9E2eSupportBindings.get(support);
  return !!binding && binding.adapter === adapter
    && binding.projectRootReal === projectRootReal
    && binding.excludedUserDataRootReal === excludedUserDataRootReal
    && permissionCandidateWritableTreeSafe(projectRootReal);
}

export function authorizeTaskAdapterQ9E2eCandidateRun(
  adapter: unknown,
  contract: unknown,
  projectRootReal: string,
  excludedUserDataRootReal: string,
): boolean {
  if (!taskAdapterQ9E2eFakeCandidateBoundTo(adapter, projectRootReal, excludedUserDataRootReal)
    || typeof contract !== "object" || contract === null || !Object.isFrozen(contract)) return false;
  q9E2eAuthorizedContracts.set(contract, adapter);
  return true;
}

/** Serial's exact adapter/launcher/root-pair check. */
export function taskAdapterCandidateWriterSupportBoundTo(
  adapter: unknown,
  projectRootReal: string,
  excludedUserDataRootReal: string,
): adapter is TaskAdapter {
  try {
    if (!nodeTestAuthorityPresent() || typeof adapter !== "object" || adapter === null
      || Object.getPrototypeOf(adapter) !== Object.prototype || !Object.isFrozen(adapter)) return false;
    const supportDescriptor = Object.getOwnPropertyDescriptor(adapter, "candidateWriterSupport");
    const runDescriptor = Object.getOwnPropertyDescriptor(adapter, "run");
    if (!supportDescriptor || supportDescriptor.get || supportDescriptor.set || !("value" in supportDescriptor)
      || !runDescriptor || runDescriptor.get || runDescriptor.set || !("value" in runDescriptor)
      || !isTaskAdapterCandidateWriterSupport(supportDescriptor.value)) return false;
    const binding = candidateWriterPermissionSupportBindings.get(supportDescriptor.value);
    return !!binding && binding.adapter === adapter && binding.run === runDescriptor.value
      && binding.projectRootReal === projectRootReal
      && binding.excludedUserDataRootReal === excludedUserDataRootReal
      && canonicalCandidateTestDirectory(projectRootReal) === projectRootReal
      && canonicalCandidateTestDirectory(excludedUserDataRootReal) === excludedUserDataRootReal
      && !candidateTestRootContains(projectRootReal, excludedUserDataRootReal)
      && !candidateTestRootContains(excludedUserDataRootReal, projectRootReal)
      && permissionCandidateWritableTreeSafe(projectRootReal);
  } catch {
    return false;
  }
}

/** The pre-task quality identity available when Main composes disclosure/auth. */
export interface AdapterTaskQualityBinding {
  taskSpec: TaskSpecV1;
  taskSpecSha256: string;
  taskSpecReview: TaskSpecReviewV1;
  evidencePlan: EvidencePlanV1;
  evidencePlanSha256: string;
}

export interface RouteRequest {
  outcome: string;
  capability: "serial-task";
  /** Optional and internal: absent keeps legacy routing byte-for-byte. */
  requiredCommandEventRepresentation?: WorkerCommandEventRepresentation;
}

export type RouteResult =
  | {
      status: "ready";
      recommended: AdapterDescriptor;
      candidates: AdapterDescriptor[];
      reason: string;
    }
  | {
      status: "connection-required";
      candidates: [];
      reason: string;
    };

function validDescriptor(value: AdapterDescriptor): void {
  if (!value.id.trim() || !value.label.trim()) throw new Error("INVALID_ADAPTER_DESCRIPTOR");
  if (!Number.isFinite(value.priority)) throw new Error("INVALID_ADAPTER_DESCRIPTOR");
  if (!Array.isArray(value.capabilities) || value.capabilities.some((item) => typeof item !== "string")) {
    throw new Error("INVALID_ADAPTER_DESCRIPTOR");
  }
}

/** Pick from connected compatible adapters only; priority and id make ties stable. */
export function routeTask(request: RouteRequest, adapters: readonly TaskAdapter[], overrideAdapterId?: string): RouteResult {
  if (!request.outcome.trim()) throw new Error("INVALID_TASK_OUTCOME");
  if (request.requiredCommandEventRepresentation !== undefined
    && request.requiredCommandEventRepresentation !== CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION
    && request.requiredCommandEventRepresentation !== OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION) {
    throw new Error("INVALID_COMMAND_EVENT_REPRESENTATION");
  }
  const ids = new Set<string>();
  for (const adapter of adapters) {
    validDescriptor(adapter.descriptor);
    if (ids.has(adapter.descriptor.id)) throw new Error("DUPLICATE_ADAPTER_ID");
    ids.add(adapter.descriptor.id);
  }
  const candidates = adapters
    .filter((adapter) => adapter.descriptor.connected && adapter.descriptor.capabilities.includes(request.capability))
    .filter((adapter) => request.requiredCommandEventRepresentation === undefined
      || adapter.qualitySupport?.commandEventRepresentation === request.requiredCommandEventRepresentation)
    .map((adapter) => adapter.descriptor)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  if (candidates.length === 0) {
    if (overrideAdapterId) throw new Error("ROUTE_OVERRIDE_UNAVAILABLE");
    return {
      status: "connection-required",
      candidates: [],
      reason: "No connected adapter can run this serial task.",
    };
  }
  const recommended = overrideAdapterId
    ? candidates.find((item) => item.id === overrideAdapterId)
    : candidates[0];
  if (!recommended) throw new Error("ROUTE_OVERRIDE_UNAVAILABLE");
  return {
    status: "ready",
    recommended,
    candidates,
    reason: `${recommended.label} is connected and supports serial tasks.`,
  };
}

/** Explicit demo-only transport. It is deterministic and is not a local model. */
export function createOfflineDemoAdapter(): TaskAdapter {
  return {
    descriptor: {
      id: "cairn-offline-demo",
      label: "Cairn offline demonstration",
      provider: "none",
      model: "none",
      connected: true,
      capabilities: ["serial-task", "offline-demo"],
      priority: 0,
    },
    async run(contract): Promise<WorkerRunResult> {
      return {
        kind: "worker-result/v2",
        taskNumber: contract.taskNumber,
        requestSha256: contract.requestSha256,
        status: "completed",
        claimsText: null,
        evidence: {},
      };
    },
  };
}
