import test from "node:test";
import assert from "node:assert/strict";
import { schedulerStatusLines } from "../src/flows/status.js";

test("CLI status shows scheduler phases and plain waiting or attention reasons read-only", () => {
  const lines = schedulerStatusLines({
    scheduler: {
      enabled: true,
      runId: "offline-cli",
      currentMain: "abc",
      activeEngines: 0,
      maximumActiveEngines: 2,
      sessionCount: 4,
      integrationActive: null,
      tasks: [
        { taskNumber: 1, outcome: "first", phase: "Done", waitingReason: "", attention: "", branch: "", worktree: "", sessions: 2, implementationPaths: ["one.txt"], testPaths: ["one.test.mjs"] },
        { taskNumber: 2, outcome: "second", phase: "Waiting", waitingReason: "Declared paths overlap the earlier task.", attention: "", branch: "cairn/task-002", worktree: "C:/Temp/task-002", sessions: 1, implementationPaths: ["shared.txt"], testPaths: ["shared.test.mjs"] },
      ],
    },
  });
  assert.match(lines.join("\n"), /Task 001 · Done/);
  assert.match(lines.join("\n"), /Task 002 · Waiting — Declared paths overlap/);
  assert.match(lines.join("\n"), /maximum active engines: 2/);
});

test("CLI scheduler status is absent when no Task 028 state exists", () => {
  assert.deepEqual(schedulerStatusLines({ scheduler: null }), []);
  assert.deepEqual(schedulerStatusLines({}), []);
});
