import type { ConductorStreamSnapshot, RunSessionSnapshot } from "../../shared/ipc.js";

export const MAX_VISIBLE_WORKERS = 8;

export type CairnTownState = "ready" | "thinking" | "working";

export type TownCairnEntity = {
  id: "cairn";
  kind: "cairn";
  name: "Cairn";
  state: CairnTownState;
};

export type TownWorkerEntity = {
  id: string;
  kind: "worker";
  name: string;
  role: string;
  state: "working" | "returned";
  currentTask: string;
  latestActivity: string;
};

export type TownOverflowEntity = {
  id: "worker-overflow";
  kind: "overflow";
  name: string;
  state: "more";
  count: number;
  workers: TownWorkerEntity[];
};

export type TownEntity = TownCairnEntity | TownWorkerEntity | TownOverflowEntity;

export type TownRelationship = {
  id: string;
  kind: "task";
  from: "cairn";
  to: string;
  task: string;
  summary: string;
};

export type TownWorkerInput = Omit<TownWorkerEntity, "kind">;

export type TownModel = {
  entities: TownEntity[];
  relationships: TownRelationship[];
};

export type TownModelInput = {
  streamActive: boolean;
  taskActive: boolean;
  workers: TownWorkerInput[];
};

function adapterName(adapterId: string): string {
  if (adapterId === "codex-exec") return "Codex Exec worker";
  return `${adapterId.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} worker`;
}

/** A villager represents a real model-backed process, never an installed
 * adapter, an offline demo, or a retained closed result. */
export function workerFromSession(session: RunSessionSnapshot | null): TownWorkerInput | null {
  if (!session || session.phase !== "running" || !session.worker || !session.adapterId) return null;
  if (session.activities.some((activity) =>
    activity.state === "stopped" && (activity.stage === "Run" || activity.stage === "Check" || activity.stage === "Result"))) return null;
  // Main creates the session before it has finished the run-time route and
  // disclosure gates. A villager appears only once the serial envelope emits
  // the real Run/working activity — never from session existence alone.
  if (!session.activities.some((activity) => activity.stage === "Run" && activity.state === "working")) return null;
  const latest = session.activities.at(-1);
  const returned = session.activities.some((activity) =>
    (activity.stage === "Run" && activity.state === "done") || activity.stage === "Check");
  return {
    id: `worker:${session.adapterId}`,
    name: adapterName(session.adapterId),
    role: session.adapterId,
    state: returned ? "returned" : "working",
    currentTask: session.outcome,
    latestActivity: latest ? `${latest.stage}: ${latest.detail}` : "Starting the approved worker run",
  };
}

export function deriveTownModel(input: TownModelInput): TownModel {
  const state: CairnTownState = input.taskActive ? "working" : input.streamActive ? "thinking" : "ready";
  const cairn: TownCairnEntity = { id: "cairn", kind: "cairn", name: "Cairn", state };

  // Duplicate ids cannot honestly describe distinct current-era run instances.
  // Keep the first until a future concurrency design introduces real run ids.
  const seen = new Set<string>();
  const uniqueWorkers = input.workers.filter((worker) => {
    if (seen.has(worker.id)) return false;
    seen.add(worker.id);
    return true;
  })
    .map<TownWorkerEntity>((worker) => ({ ...worker, kind: "worker" }));
  const visibleWorkers = uniqueWorkers.slice(0, MAX_VISIBLE_WORKERS);
  const hiddenWorkers = uniqueWorkers.slice(MAX_VISIBLE_WORKERS);
  const entities: TownEntity[] = [cairn, ...visibleWorkers];

  if (hiddenWorkers.length > 0) {
    entities.push({
      id: "worker-overflow",
      kind: "overflow",
      name: `${hiddenWorkers.length} more ${hiddenWorkers.length === 1 ? "worker" : "workers"}`,
      state: "more",
      count: hiddenWorkers.length,
      workers: hiddenWorkers,
    });
  }

  return {
    entities,
    relationships: visibleWorkers.map((worker) => ({
      id: `thread:${worker.id}`,
      kind: "task",
      from: "cairn",
      to: worker.id,
      task: worker.currentTask,
      summary: worker.state === "returned"
        ? `${worker.name} returned a result to Cairn for checking`
        : `${worker.name} is working on ${worker.currentTask}`,
    })),
  };
}

export function townModelFromRuntime(
  task: RunSessionSnapshot | null,
  stream: ConductorStreamSnapshot | null,
): TownModel {
  const worker = workerFromSession(task);
  return deriveTownModel({
    streamActive: stream !== null,
    taskActive: task?.phase === "running",
    workers: worker ? [worker] : [],
  });
}
