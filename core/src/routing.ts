import type { TaskIntent } from "./intent.js";
import type { EvidencePlanV1, TaskSpecReviewV1, TaskSpecV1 } from "./quality.js";

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

/** The live intent-only contract. Its shape and wire literal remain unchanged. */
export interface LegacyAdapterTaskContractV3 extends AdapterTaskContractCommon {
  version: "cairn-serial-task/v3";
  checks: readonly string[];
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
  run(contract: AdapterTaskContract, signal?: AbortSignal): Promise<WorkerRunResult>;
  /** The disclosure the owner reads and byte-confirms for this whole intent. */
  disclosure?(intent: TaskIntent, quality?: AdapterTaskQualityBinding): WorkerDisclosure;
}

export interface TaskAdapterQualitySupport {
  commandEventRepresentation: WorkerCommandEventRepresentation;
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
