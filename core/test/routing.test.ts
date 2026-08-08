import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  createOfflineDemoAdapter,
  OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION,
  parseWorkerProcessEventBundle,
  routeTask,
  type TaskAdapter,
} from "../src/routing.js";
import { createDirectTaskIntent, type TaskIntent } from "../src/intent.js";
import { previewSerialRoute } from "../src/serial.js";

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

test("the explicit offline adapter remains an honest non-model demonstration", async () => {
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

test("serial route preview accepts only a Core-validated intent and routes from its interpretation", () => {
  const intent = createDirectTaskIntent(
    "  Show the exact raw result  ",
    "00000000-0000-4000-8000-000000000077",
  );
  assert.ok(intent);
  const result = previewSerialRoute(intent, [adapter("ready", true, ["serial-task"])]);
  assert.equal(result.status, "ready");

  let getterCalls = 0;
  const hostile = new Proxy({}, {
    get() { getterCalls += 1; throw new Error("must not read"); },
  }) as TaskIntent;
  assert.throws(() => previewSerialRoute(hostile, [adapter("ready", true, ["serial-task"])]), /INVALID_TASK_INTENT/);
  assert.equal(getterCalls, 0);
});

test("quality routing uses internal exact-command support without widening descriptors", () => {
  const exact = adapter("exact", true, ["serial-task"], 5);
  exact.qualitySupport = {
    commandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  };
  const opaque = adapter("opaque", true, ["serial-task"], 50);
  opaque.qualitySupport = {
    commandEventRepresentation: OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION,
  };
  const absent = adapter("absent", true, ["serial-task"], 100);
  const legacy = routeTask({ outcome: "Show it", capability: "serial-task" }, [absent, opaque, exact]);
  assert.equal(legacy.status, "ready");
  if (legacy.status === "ready") assert.equal(legacy.recommended.id, "absent", "legacy priority remains unchanged");

  const quality = routeTask({
    outcome: "Show it",
    capability: "serial-task",
    requiredCommandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  }, [absent, opaque, exact]);
  assert.equal(quality.status, "ready");
  if (quality.status !== "ready") return;
  assert.equal(quality.recommended.id, "exact");
  assert.deepEqual(quality.candidates.map((candidate) => candidate.id), ["exact"]);
  assert.equal(Object.hasOwn(quality.recommended, "qualitySupport"), false, "internal support never enters descriptor output");
});

test("a route requiring exact command events fails closed for opaque or absent support", () => {
  const opaque = adapter("opaque", true, ["serial-task"]);
  opaque.qualitySupport = { commandEventRepresentation: OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION };
  const result = routeTask({
    outcome: "Show it",
    capability: "serial-task",
    requiredCommandEventRepresentation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
  }, [opaque, adapter("absent", true, ["serial-task"])]);
  assert.equal(result.status, "connection-required");
  assert.throws(() => routeTask({
    outcome: "Show it",
    capability: "serial-task",
    requiredCommandEventRepresentation: "invented" as never,
  }, [opaque]), /INVALID_COMMAND_EVENT_REPRESENTATION/);
});

test("process-event bundles accept only bounded contiguous execution facts", () => {
  const good = {
    representation: CANONICAL_EVIDENCE_COMMAND_EVENT_REPRESENTATION,
    complete: true,
    events: [
      { sequence: 0, commandSha256: "a".repeat(64), exitCode: 0 },
      { sequence: 1, commandSha256: "b".repeat(64), exitCode: 1 },
    ],
  };
  const parsed = parseWorkerProcessEventBundle(good);
  assert.deepEqual(parsed, good);
  assert.ok(parsed && Object.isFrozen(parsed) && Object.isFrozen(parsed.events) && parsed.events.every(Object.isFrozen));
  assert.equal(parseWorkerProcessEventBundle({ ...good, extra: true }), null);
  assert.equal(parseWorkerProcessEventBundle({ ...good, events: [{ ...good.events[0], sequence: 1 }] }), null);
  assert.equal(parseWorkerProcessEventBundle({ ...good, events: [{ ...good.events[0], commandSha256: "A".repeat(64) }] }), null);
  assert.equal(parseWorkerProcessEventBundle({ ...good, events: [{ ...good.events[0], criterionId: "c1" }] }), null);
  assert.equal(parseWorkerProcessEventBundle({ ...good, events: Array.from({ length: 65 }, (_, sequence) => ({
    sequence, commandSha256: "a".repeat(64), exitCode: 0,
  })) }), null);
});
