import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TRANSITION_DRIVER_CASES } from "./concurrent-run-transition-driver.js";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

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
  assert.equal(typeof candidate.stopConcurrentTransition, "function");
});

test("all 30 transition instances have independent before/after external cases", () => {
  assert.equal(TRANSITION_DRIVER_CASES.length, 60);
  assert.equal(new Set(TRANSITION_DRIVER_CASES.map((item) => `${item.name}:${item.task}:${item.side}`)).size, 60);
  const source = readFileSync(join(sourceRoot, "concurrent-run.ts"), "utf8");
  assert.match(source, /"approval-freeze"/);
  assert.match(source, /"task-commit"/);
  assert.doesNotMatch(source, /state\.journal\.pending\s*=\s*null/);
});
