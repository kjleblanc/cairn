import test from "node:test";
import assert from "node:assert/strict";

test("the journal publishes the complete finite transition set", async () => {
  const moduleName = "../src/concurrent-state.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  const transitions = candidate.CONCURRENT_TRANSITIONS;
  assert.ok(Array.isArray(transitions));
  assert.equal(new Set(transitions as string[]).size, 17);
  assert.deepEqual(transitions, [
    "admission", "worktree-root", "task-worktree", "approval-freeze",
    "call-consume", "broker-result", "result-apply", "task-commit",
    "integration-lease", "integration-candidate", "candidate-checks",
    "evidence-finalize", "main-fast-forward", "task-cleanup",
    "integration-cleanup", "process-cleanup", "run-cleanup",
  ]);
});

test("the journal has strict parse and write-ahead transition APIs", async () => {
  const moduleName = "../src/concurrent-state.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.parseConcurrentState, "function");
  assert.equal(typeof candidate.beginConcurrentTransition, "function");
  assert.equal(typeof candidate.completeConcurrentTransition, "function");
});
