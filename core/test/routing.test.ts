import test from "node:test";
import assert from "node:assert/strict";
import {
  createOfflineDemoAdapter,
  routeTask,
  type TaskAdapter,
} from "../src/routing.js";

function adapter(id: string, connected: boolean, capabilities: string[], priority = 0): TaskAdapter {
  return {
    descriptor: {
      id,
      label: id,
      provider: `${id}-provider`,
      model: `${id}-model`,
      connected,
      capabilities,
      priority,
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

test("routing recommends one connected compatible adapter deterministically", () => {
  const result = routeTask(
    { outcome: "Show a useful result", capability: "serial-task" },
    [adapter("zeta", true, ["serial-task"], 10), adapter("alpha", true, ["serial-task"], 10)],
  );
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.recommended.id, "alpha");
  assert.deepEqual(result.candidates.map((item) => item.id), ["alpha", "zeta"]);
  assert.match(result.reason, /connected/i);
});

test("routing excludes disconnected and incompatible adapters", () => {
  const result = routeTask(
    { outcome: "Show a useful result", capability: "serial-task" },
    [adapter("offline", false, ["serial-task"]), adapter("wrong", true, ["image-task"])],
  );
  assert.deepEqual(result, {
    status: "connection-required",
    candidates: [],
    reason: "No connected adapter can run this serial task.",
  });
});

test("an override is accepted only for another connected compatible candidate", () => {
  const adapters = [
    adapter("first", true, ["serial-task"], 20),
    adapter("second", true, ["serial-task"], 10),
    adapter("offline", false, ["serial-task"], 30),
  ];
  const selected = routeTask({ outcome: "Show it", capability: "serial-task" }, adapters, "second");
  assert.equal(selected.status, "ready");
  if (selected.status === "ready") assert.equal(selected.recommended.id, "second");
  assert.throws(
    () => routeTask({ outcome: "Show it", capability: "serial-task" }, adapters, "offline"),
    /ROUTE_OVERRIDE_UNAVAILABLE/,
  );
});

test("the only built-in adapter is an explicit non-model offline demonstration", async () => {
  const demo = createOfflineDemoAdapter();
  assert.deepEqual(demo.descriptor, {
    id: "cairn-offline-demo",
    label: "Cairn offline demonstration",
    provider: "none",
    model: "none",
    connected: true,
    capabilities: ["serial-task", "offline-demo"],
    priority: 0,
  });
});
