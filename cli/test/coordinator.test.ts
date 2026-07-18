import test from "node:test";
import assert from "node:assert/strict";
import { parallelStatusLines } from "../src/flows/status.js";
import { parallelTaskRefusal } from "../src/flows/task.js";

test("legacy CLI behavior is unchanged without the Draft flag", () => {
  const previous = process.env.CAIRN_PARALLEL_DRAFT;
  delete process.env.CAIRN_PARALLEL_DRAFT;
  try {
    assert.equal(parallelTaskRefusal(process.cwd()), null);
    assert.deepEqual(parallelStatusLines({ parallel: undefined } as never), []);
  } finally {
    if (previous === undefined) delete process.env.CAIRN_PARALLEL_DRAFT;
    else process.env.CAIRN_PARALLEL_DRAFT = previous;
  }
});

test("status names every active coordinator task while the task flow refuses bypass", () => {
  const previous = process.env.CAIRN_PARALLEL_DRAFT;
  process.env.CAIRN_PARALLEL_DRAFT = "1";
  assert.match(parallelTaskRefusal(process.cwd()) ?? "", /will not bypass/);
  if (previous === undefined) delete process.env.CAIRN_PARALLEL_DRAFT;
  else process.env.CAIRN_PARALLEL_DRAFT = previous;
  const lines = parallelStatusLines({
    parallel: {
      enabled: true,
      label: "Parallel Draft — not active by default",
      projectRoot: "C:/temp/demo",
      integratedMain: "abc",
      integrationQueue: [],
      integrationActive: null,
      tasks: [
        { taskNumber: 1, phase: "building", waitingReason: "", branch: "cairn/task-001", worktree: "C:/temp/w1" },
        { taskNumber: 2, phase: "waiting", waitingReason: "SCOPE_WAIT", branch: "cairn/task-002", worktree: "C:/temp/w2" },
      ],
    },
  } as never);
  assert.equal(lines.length, 3);
  assert.match(lines.join("\n"), /Task 001.*cairn\/task-001/);
  assert.match(lines.join("\n"), /Task 002.*SCOPE_WAIT/);
});
