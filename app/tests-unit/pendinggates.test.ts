import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (...parts: string[]): string =>
  readFileSync(join(__dirname, "..", "..", "src", ...parts), "utf8");

const tasks = source("main", "tasks.ts");
const rungate = source("main", "rungate.ts");
const push = source("main", "push.ts");
const ipc = source("main", "ipc.ts");
const shared = source("shared", "ipc.ts");
const preload = source("preload.ts");

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `missing start marker ${start}`);
  assert.notEqual(to, -1, `missing end marker ${end}`);
  return text.slice(from, to);
}

function indexesOf(text: string, needle: string): number[] {
  const found: number[] = [];
  let from = 0;
  while (true) {
    const index = text.indexOf(needle, from);
    if (index === -1) return found;
    found.push(index);
    from = index + needle.length;
  }
}

test("route and run ask the canonical gate before authority is created and again after detection", () => {
  const route = between(tasks, 'ipcMain.handle("task:route"', 'ipcMain.handle("task:review-action"');
  const routeGates = indexesOf(route, "pendingTaskStartRefusal(dir)");
  assert.equal(routeGates.length, 2);
  assert.ok(routeGates[0] > route.indexOf("runRefusal("), "legacy quit/serial refusal keeps precedence");
  assert.ok(routeGates[0] < route.indexOf("const generation = nextGeneration(key)"));
  assert.ok(routeGates[0] < route.indexOf("await detectedAdapters"));
  assert.ok(routeGates[1] > route.indexOf("await detectedAdapters"));
  assert.ok(routeGates[1] < route.indexOf("previews.set(key, pending)"));
  const routePostGate = route.slice(routeGates[1], route.indexOf("if (routeGenerations.get(key) !== generation)"));
  assert.match(routePostGate, /nextGeneration\(key\)/, "a gate raised during detection retires that route generation");

  const run = between(tasks, 'ipcMain.handle("task:run"', 'ipcMain.handle("task:cancel"');
  const runGates = indexesOf(run, "pendingTaskStartRefusal(dir)");
  assert.equal(runGates.length, 2);
  assert.ok(runGates[0] > run.indexOf("runRefusal("), "legacy quit/serial refusal keeps precedence");
  assert.ok(runGates[0] < run.indexOf("starting.add(key)"));
  assert.ok(runGates[1] > run.indexOf("detected = await detectedAdapters"));
  assert.ok(runGates[1] < run.indexOf("consumeCurrentTaskProposal"));
  assert.match(run.slice(runGates[1], run.indexOf("consumeCurrentTaskProposal")), /refuseBeforeAcceptance\(postDetectionPendingRefusal\)/);
});

test("synthetic calibration and ordinary tasks remain mutually exclusive across awaits", () => {
  const taskActivity = between(tasks, "function anyTaskRunningOrStarting", "function clearSyntheticCalibrationDisclosure");
  assert.match(taskActivity, /runningDirs\(\)\.length > 0 \|\| starting\.size > 0/,
    "calibration observes ordinary task activity across every canonical project");

  const route = between(tasks, 'ipcMain.handle("task:route"', 'ipcMain.handle("task:review-action"');
  const routeCalibrationGates = indexesOf(route, "criticCalibration?.hasActive()");
  assert.equal(routeCalibrationGates.length, 2, "route checks the app-wide calibration lifecycle twice");
  assert.ok(routeCalibrationGates[0] < route.indexOf("const generation = nextGeneration(key)"));
  assert.ok(routeCalibrationGates[0] < route.indexOf("await detectedAdapters"));
  assert.ok(routeCalibrationGates[1] > route.indexOf("await detectedAdapters"));
  assert.ok(routeCalibrationGates[1] < route.indexOf("previews.set(key, pending)"));
  assert.match(
    route.slice(routeCalibrationGates[1], route.indexOf("const postDetectionPendingRefusal")),
    /nextGeneration\(key\)/,
    "a calibration opened during detection retires that route generation",
  );

  const run = between(tasks, 'ipcMain.handle("task:run"', 'ipcMain.handle("task:cancel"');
  const runCalibrationGates = indexesOf(run, "criticCalibration?.hasActive()");
  assert.equal(runCalibrationGates.length, 2, "run checks the app-wide calibration lifecycle twice");
  assert.ok(runCalibrationGates[0] < run.indexOf("starting.add(key)"));
  assert.ok(runCalibrationGates[0] < run.indexOf("detected = await detectedAdapters"));
  assert.ok(runCalibrationGates[1] > run.indexOf("detected = await detectedAdapters"));
  assert.match(
    run.slice(runCalibrationGates[1], run.indexOf("if (previews.get(key) !== pending")),
    /refuseBeforeAcceptance\(CRITIC_CALIBRATION_ACTIVE\)/,
    "a calibration appearing during detection retires the reviewed task authority without starting it",
  );

  const decide = between(tasks, 'ipcMain.handle("critic:call-decide"', 'ipcMain.handle("critic:calibration-open"');
  const calibrationBranch = decide.indexOf("if (criticCalibration?.hasPending(key))");
  const taskGate = decide.indexOf("anyTaskRunningOrStarting()", calibrationBranch);
  const send = decide.indexOf("await criticCalibration.decide(request)", calibrationBranch);
  assert.ok(calibrationBranch >= 0 && taskGate > calibrationBranch && taskGate < send,
    "a calibration approval cannot be consumed while any ordinary task is running or starting");
  assert.ok(decide.indexOf("clearSyntheticCalibrationDisclosure(key)", send) > send,
    "the mirrored disclosure clears after a terminal calibration decision");

  const open = between(tasks, 'ipcMain.handle("critic:calibration-open"', 'ipcMain.handle("critic:calibration-current"');
  assert.ok(open.indexOf("anyTaskRunningOrStarting()") < open.indexOf("criticCalibration.open(request)"));
  assert.match(open, /const session = sessions\.get\(key\);[\s\S]*session\.criticCall = opened\.value\.disclosure/,
    "an existing canonical run snapshot mirrors the synthetic disclosure");

  const cancel = between(tasks, 'ipcMain.handle("critic:calibration-cancel"', 'ipcMain.handle("task:preview-discard"');
  assert.ok(cancel.indexOf("const key = canonicalProjectKey(dir)") < cancel.indexOf("criticCalibration.cancel(dir)"));
  assert.ok(cancel.indexOf("clearSyntheticCalibrationDisclosure(key)") > cancel.indexOf("criticCalibration.cancel(dir)"));
  const failedCancel = cancel.slice(cancel.indexOf("if (!cancelled.ok)"), cancel.indexOf("return { ok: true"));
  assert.match(failedCancel, /if \(!criticCalibration\.hasActive\(key\)\)[\s\S]*clearSyntheticCalibrationDisclosure\(key\)/,
    "a persistence failure that consumed cancellation must not leave a stale mirrored card");

  const clearProjection = between(tasks, "function clearSyntheticCalibrationDisclosure", "function sameDisclosure");
  assert.match(clearProjection, /criticCall\?\.callKind === "synthetic-calibration"/,
    "a late calibration terminal callback cannot erase a newer provider disclosure");
});

test("task runtime maps and alias-facing handlers use the canonical project key", () => {
  assert.doesNotMatch(tasks, /(?:controllers|settlements)\.(?:get|set|delete)\(dir\)/,
    "controller and settlement maps must never use a renderer-supplied path spelling");
  assert.doesNotMatch(tasks, /(?:markRunning|clearRunning|isTaskRunning)\(dir\)/,
    "task runtime gates must use the already-derived canonical key");

  const run = between(tasks, 'ipcMain.handle("task:run"', 'ipcMain.handle("task:cancel"');
  for (const expected of [
    "markRunning(key)",
    "controllers.set(key, controller)",
    "settlements.set(key, run)",
    "clearRunning(key)",
    "controllers.delete(key)",
    "settlements.delete(key)",
  ]) {
    assert.ok(run.includes(expected), `accepted task runtime must use ${expected}`);
  }

  const cancel = between(tasks, 'ipcMain.handle("task:cancel"', 'ipcMain.handle("task:current"');
  assert.match(cancel, /controllers\.get\(canonicalProjectKey\(dir\)\)/,
    "an alias cancellation must reach the canonical controller");
  const acknowledge = between(tasks, 'ipcMain.handle("task:acknowledge"', 'ipcMain.handle("evidence:album"');
  assert.match(acknowledge, /const key = canonicalProjectKey\(dir\)/);
  assert.match(acknowledge, /!isTaskRunning\(key\)/,
    "acknowledgement must consult the same canonical running identity as the session map");
});

test("preview, IPC execute, and direct execute all refuse before their first git boundary", () => {
  const preview = between(push, "export function pushPreview", "export function remoteIsConfigured");
  assert.ok(preview.indexOf("pendingPushRefusal(dir)") < preview.indexOf('exec(["rev-parse"'));

  const execute = push.slice(push.indexOf("export function pushExecute"));
  assert.ok(execute.indexOf("pendingPushRefusal(dir)") < execute.indexOf('exec(["push"'));

  const handler = between(ipc, 'ipcMain.handle("push:execute"', "/** Registered separately");
  assert.ok(handler.indexOf("pendingPushRefusal(dir)") < handler.indexOf("pushRefusal(dir, preview)"));
  assert.ok(handler.indexOf("pushRefusal(dir, preview)") < handler.indexOf("pushExecute(dir, preview)"));
});

test("renderer inputs cannot assert pending authority and verdict-copy remains Main-only", () => {
  const routeRequest = between(shared, "export type TaskRouteRequest", "export type TaskRoutePreview");
  const runRequest = between(shared, "export type TaskRunRequest", "export type RunSessionSnapshot");
  assert.doesNotMatch(routeRequest, /pending\s*(?:run|result|gate)/i);
  assert.doesNotMatch(runRequest, /pending\s*(?:run|result|gate)/i);

  assert.match(rungate, /pendingVerdictCopyRefusal/);
  assert.match(rungate, /_boundary:\s*"write"\s*\|\s*"commit"/);
  assert.equal(indexesOf(rungate, "return pendingRunRefusal(projectRoot);").length, 2);

  const integrationGates = `${rungate}\n${push}`;
  assert.doesNotMatch(integrationGates, /pendingRunGate|pendingRunAuthority|createPendingRun|closePendingRun/);

  const rendererReachable = `${shared}\n${preload}\n${ipc}`;
  assert.doesNotMatch(rendererReachable, /pendingVerdictCopyRefusal|verdict-copy/);
  assert.doesNotMatch(rendererReachable, /pendingRunGate|pendingRunAuthority|createPendingRun|closePendingRun/);
});
