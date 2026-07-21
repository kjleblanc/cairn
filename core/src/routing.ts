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
  version: "cairn-serial-task/v1";
  taskNumber: number;
  requestedOutcome: string;
  requestedOutcomeSha256: string;
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

export interface OfflineDemoResult {
  kind: "offline-demo-result";
  taskNumber: number;
  requestedOutcomeSha256: string;
  statement: "The offline route completed without attempting the requested product change.";
}

export interface CodexExecResult {
  kind: "codex-exec-result";
  taskNumber: number;
  requestedOutcomeSha256: string;
  processCount: 1;
  exitCode: number;
  terminalEvent: "turn.completed" | "turn.failed" | "error" | "missing";
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  statement: "One Codex Exec process returned bounded completion evidence.";
}

export type TaskAdapterResult = OfflineDemoResult | CodexExecResult;

/**
 * The only execution seam in the serial foundation. An adapter receives a
 * bounded value object: never a root, path resolver, file handle, shell,
 * process, Git handle, network client, credential, tool, or delegation hook.
 */
export interface TaskAdapter {
  kind: "offline-demo" | "codex-exec";
  descriptor: AdapterDescriptor;
  run(contract: AdapterTaskContract): Promise<TaskAdapterResult>;
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
    kind: "offline-demo",
    descriptor: {
      id: "cairn-offline-demo",
      label: "Cairn offline demonstration",
      provider: "none",
      model: "none",
      connected: true,
      capabilities: ["serial-task", "offline-demo"],
      priority: 0,
    },
    async run(contract) {
      return {
        kind: "offline-demo-result",
        taskNumber: contract.taskNumber,
        requestedOutcomeSha256: contract.requestedOutcomeSha256,
        statement: "The offline route completed without attempting the requested product change.",
      };
    },
  };
}
