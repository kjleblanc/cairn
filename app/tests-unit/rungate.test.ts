import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  beginQuitDrain,
  isQuitDraining,
  isTaskRunning,
  markRunning,
  clearRunning,
  pendingTaskStartRefusal,
  pendingVerdictCopyRefusal,
  runningDirs,
  runRefusal,
  _resetForTests,
} from "../src/main/rungate.js";
import { _resetPendingRunsForTests, installPendingRunStore } from "../src/main/pendingrun.js";

test("the running set and the quit drain gate one refusal decision", () => {
  _resetForTests();
  markRunning("C:/p");
  assert.equal(isTaskRunning("C:/p"), true);
  assert.deepEqual(runningDirs(), ["C:/p"]);
  clearRunning("C:/p");
  assert.equal(runRefusal(false, false), null);
  assert.match(runRefusal(true, false) ?? "", /SERIAL_RUN_ACTIVE/);
  beginQuitDrain();
  assert.equal(isQuitDraining(), true);
  assert.match(runRefusal(false, true) ?? "", /QUIT_IN_PROGRESS/);
});

test("task start and both verdict-copy boundaries read the same Main-owned pending refusal", () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-rungate-project-"));
  _resetPendingRunsForTests();
  try {
    assert.equal(pendingTaskStartRefusal(project), null);
    assert.equal(pendingVerdictCopyRefusal(project, "write"), null);
    assert.equal(pendingVerdictCopyRefusal(project, "commit"), null);

    // A store that cannot be authenticated at boot is deliberately fail
    // closed. It gives this integration test a genuine canonical Main gate
    // without minting or clearing pending-run authority through rungate.
    const boot = installPendingRunStore(join(project, "missing-profile"));
    assert.equal(boot.recoveryRequired, true);

    const taskRefusal = pendingTaskStartRefusal(project);
    assert.match(taskRefusal ?? "", /^PENDING_RUN_ACTIVE:/);
    assert.equal(pendingVerdictCopyRefusal(project, "write"), taskRefusal);
    assert.equal(pendingVerdictCopyRefusal(project, "commit"), taskRefusal);
  } finally {
    _resetPendingRunsForTests();
  }
});
