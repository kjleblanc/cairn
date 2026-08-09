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
