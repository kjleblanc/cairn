import type { TaskIntent } from "./intent.js";

export interface AdapterDescriptor {
  id: string;
  label: string;
  provider: string;
  model: string;
  connected: boolean;
  capabilities: readonly string[];
  priority: number;
}

export interface AdapterTaskContract {
  version: "cairn-serial-task/v3";
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
  checks: readonly string[];
  stopConditions: readonly string[];
}

/**
 * The one result shape every adapter returns — codex, offline demo, or a
 * future third adapter alike. `evidence` is a bounded numeric map the adapter
 * chooses; `claimsText` is the worker's final message (parsed for its
 * cairn-claims fence) or null. The serial envelope validates this exact shape
 * and never special-cases which adapter produced it.
 */
export interface WorkerRunResult {
  kind: "worker-result/v2";
  taskNumber: number;
  requestSha256: string;
  status: "completed" | "failed";
  claimsText: string | null;
  evidence: Record<string, number>;
}

/** The six confirmation facts an adapter that makes a real call must disclose. */
export interface WorkerDisclosure {
  provider: string;
  model: string;
  project: string;
  task: string;
  data: string;
  quota: string;
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
  run(contract: AdapterTaskContract, signal?: AbortSignal): Promise<WorkerRunResult>;
  /** The disclosure the owner reads and byte-confirms for this whole intent. */
  disclosure?(intent: TaskIntent): WorkerDisclosure;
}

export interface RouteRequest {
  outcome: string;
  capability: "serial-task";
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
  const ids = new Set<string>();
  for (const adapter of adapters) {
    validDescriptor(adapter.descriptor);
    if (ids.has(adapter.descriptor.id)) throw new Error("DUPLICATE_ADAPTER_ID");
    ids.add(adapter.descriptor.id);
  }
  const candidates = adapters
    .map((adapter) => adapter.descriptor)
    .filter((item) => item.connected && item.capabilities.includes(request.capability))
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
