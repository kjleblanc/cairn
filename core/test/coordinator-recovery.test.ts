import test from "node:test";
import assert from "node:assert/strict";

test("the Final exposes an offline recovery entry point before new admission", async () => {
  const moduleName = "../src/concurrent-run.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.recoverConcurrentRun, "function");
  assert.equal(typeof candidate.inspectConcurrentCleanup, "function");
});
