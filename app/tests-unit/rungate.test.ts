import test from "node:test";
import assert from "node:assert/strict";
import { beginQuitDrain, isQuitDraining, isTaskRunning, markRunning, clearRunning, runningDirs, runRefusal, _resetForTests } from "../src/main/rungate.js";

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
