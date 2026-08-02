import test from "node:test";
import assert from "node:assert/strict";
import type { RunSessionSnapshot } from "../src/shared/ipc.js";
import {
  deriveTownModel,
  MAX_VISIBLE_WORKERS,
  townModelFromRuntime,
  workerFromSession,
  type TownWorkerInput,
} from "../src/renderer/town/model.js";

function session(overrides: Partial<RunSessionSnapshot> = {}): RunSessionSnapshot {
  return {
    dir: "C:\\project",
    outcome: "Make the visible result honest",
    adapterId: "codex-exec",
    conversationId: "conversation-1",
    worker: true,
    startedAt: "2026-07-27T12:00:00.000Z",
    activities: [{ stage: "Run", state: "working", detail: "Worker process active" }],
    phase: "running",
    result: null,
    error: null,
    ...overrides,
  };
}

test("idle and thinking towns contain only Cairn with a textual state", () => {
  const idle = deriveTownModel({ streamActive: false, taskActive: false, workers: [] });
  assert.deepEqual(idle.entities, [{ id: "cairn", kind: "cairn", name: "Cairn", state: "ready" }]);
  assert.deepEqual(idle.relationships, []);

  const thinking = deriveTownModel({ streamActive: true, taskActive: false, workers: [] });
  assert.equal(thinking.entities[0]?.state, "thinking");
});

test("offline-demo and closed sessions never become worker villagers", () => {
  assert.equal(workerFromSession(session({ worker: false })), null);
  assert.equal(workerFromSession(session({ phase: "closed" })), null);
  assert.equal(workerFromSession(session({ adapterId: null })), null);

  const offline = townModelFromRuntime(session({ worker: false }), null);
  assert.equal(offline.entities[0]?.state, "working");
  assert.equal(offline.entities.filter((entity) => entity.kind === "worker").length, 0);
  assert.equal(offline.relationships.length, 0);
});

test("a real session is not a worker villager until Run actually starts", () => {
  assert.equal(workerFromSession(session({ activities: [] })), null);
  assert.equal(workerFromSession(session({
    activities: [{ stage: "Route", state: "done", detail: "The approved route is ready" }],
  })), null);
  assert.notEqual(workerFromSession(session({
    activities: [
      { stage: "Route", state: "done", detail: "The approved route is ready" },
      { stage: "Run", state: "working", detail: "The worker process is active" },
    ],
  })), null);
});

test("a real running session creates one truthful worker and one live task thread", () => {
  const model = townModelFromRuntime(session(), null);
  assert.equal(model.entities[0]?.state, "working");
  assert.deepEqual(model.entities[1], {
    id: "worker:codex-exec",
    kind: "worker",
    name: "Codex Exec worker",
    role: "codex-exec",
    state: "working",
    currentTask: "Make the visible result honest",
    latestActivity: "Run: Worker process active",
  });
  assert.deepEqual(model.relationships, [{
    id: "thread:worker:codex-exec",
    kind: "task",
    from: "cairn",
    to: "worker:codex-exec",
    task: "Make the visible result honest",
    summary: "Codex Exec worker is working on Make the visible result honest",
  }]);
});

test("duplicate current-era ids do not overclaim concurrency", () => {
  const worker: TownWorkerInput = {
    id: "worker:codex-exec",
    name: "Codex Exec worker",
    role: "codex-exec",
    state: "working",
    currentTask: "One",
    latestActivity: "Running",
  };
  const model = deriveTownModel({ streamActive: false, taskActive: true, workers: [worker, { ...worker, currentTask: "Two" }] });
  assert.equal(model.entities.filter((entity) => entity.kind === "worker").length, 1);
  assert.equal(model.relationships.length, 1);
  assert.equal(model.relationships[0]?.task, "One");
});

test("a worker result is named returned while Cairn checks it", () => {
  const model = townModelFromRuntime(session({
    activities: [
      { stage: "Run", state: "working", detail: "Worker process active" },
      { stage: "Run", state: "done", detail: "Worker returned evidence" },
      { stage: "Check", state: "working", detail: "Cairn is checking" },
    ],
  }), null);
  const worker = model.entities.find((entity) => entity.kind === "worker");
  assert.equal(worker?.state, "returned");
  assert.equal(model.relationships[0]?.summary, "Codex Exec worker returned a result to Cairn for checking");
});

test("intermediate Run and Check stops remove the worker immediately", () => {
  const runStopped = workerFromSession(session({
    activities: [
      { stage: "Run", state: "working", detail: "Worker process active" },
      { stage: "Run", state: "stopped", detail: "Worker stopped safely" },
    ],
  }));
  assert.equal(runStopped, null);

  const checkStopped = workerFromSession(session({
    activities: [
      { stage: "Run", state: "working", detail: "Worker process active" },
      { stage: "Run", state: "done", detail: "Worker returned evidence" },
      { stage: "Check", state: "working", detail: "Cairn is checking" },
      { stage: "Check", state: "stopped", detail: "Evidence could not be verified" },
    ],
  }));
  assert.equal(checkStopped, null);
});

test("the visible ring is capped and excess real workers form a counted landmark", () => {
  const workers = Array.from({ length: MAX_VISIBLE_WORKERS + 3 }, (_, index): TownWorkerInput => ({
    id: `worker:run-${index}`,
    name: `Worker ${index}`,
    role: "future worker",
    state: "working",
    currentTask: `Task ${index}`,
    latestActivity: "Working",
  }));
  const model = deriveTownModel({ streamActive: false, taskActive: true, workers });
  assert.equal(model.entities.filter((entity) => entity.kind === "worker").length, MAX_VISIBLE_WORKERS);
  const overflow = model.entities.find((entity) => entity.kind === "overflow");
  assert.equal(overflow?.count, 3);
  assert.equal(overflow?.name, "3 more workers");
  assert.equal(model.relationships.length, MAX_VISIBLE_WORKERS);
});
