import test from "node:test";
import assert from "node:assert/strict";
import { runtimeWorkerIdentity } from "../src/main/workeridentity.js";

test("runtime worker identity comes from the routed adapter, never a request confirmation", () => {
  const offline = runtimeWorkerIdentity({
    descriptor: { id: "cairn-offline-demo" },
  });
  assert.deepEqual(offline, { adapterId: "cairn-offline-demo", worker: false });

  const codex = runtimeWorkerIdentity({
    descriptor: { id: "codex-exec" },
    disclosure: () => ({ provider: "OpenAI" }),
  });
  assert.deepEqual(codex, { adapterId: "codex-exec", worker: true });

  assert.deepEqual(runtimeWorkerIdentity(undefined), { adapterId: null, worker: false });
});
