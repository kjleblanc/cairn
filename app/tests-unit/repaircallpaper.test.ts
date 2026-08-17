import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (...parts: string[]) => readFileSync(join(__dirname, "..", "..", ...parts), "utf8");

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `could not bound ${start}`);
  return text.slice(from, to);
}

test("repair call paper: the renderer shows every required identity and returns only routing key, id, action, and echo", () => {
  const card = source("src", "renderer", "components", "RepairCall.tsx");
  for (const label of [
    "Provider", "Model", "Task", "Candidate round", "Frozen promise", "Frozen failure condition",
    "Confirmed by", "Permitted typed evidence artifact IDs", "Task Spec SHA-256", "Evidence Plan SHA-256", "Candidate SHA-256",
    "Repair instruction SHA-256", "Repair preview SHA-256", "Blocker authority SHA-256", "Route receipt SHA-256",
    "Route fingerprint SHA-256", "Data:", "Quota:", "Limit:", "Billing:",
  ]) assert.match(card, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.match(card, /"Approve this repair call"/u);
  assert.match(card, /"Stop this task"/u);
  assert.match(card, /dir,[\s\S]*approvalId:\s*call\.approvalId[\s\S]*action,[\s\S]*disclosure:\s*call/u);
  assert.doesNotMatch(card, /from\s+["'][^"']*main\//u);
  assert.doesNotMatch(card, /\b(?:fetch|spawn|exec|instruction)\s*\(/u);
});

test("repair call paper: shared output has no project, instruction bytes, command, or authority field", () => {
  const shared = source("src", "shared", "repair-call.ts");

  // REPAIRED by Task 263 (Slice 6) while this file was open. Both slices were
  // taken from bare `indexOf` results, and the `disclosure` half carries only
  // `doesNotMatch` assertions — so a renamed or deleted marker yields an empty
  // string that satisfies every one of them, and the custody guard that
  // matters most here would pass while reading nothing at all.
  const disclosureAt = shared.indexOf("export type RepairCallDisclosureV1");
  const requestAt = shared.indexOf("export type RepairCallDecisionRequest");
  const decisionAt = shared.indexOf("export type RepairCallDecisionV1");
  assert.notEqual(disclosureAt, -1, "RepairCallDisclosureV1 is gone; the custody slice reads nothing");
  assert.notEqual(requestAt, -1, "RepairCallDecisionRequest is gone; the custody slice reads nothing");
  assert.notEqual(decisionAt, -1, "RepairCallDecisionV1 is gone; the custody slice reads nothing");
  assert.ok(requestAt > disclosureAt && decisionAt > requestAt,
    "the three shared types are no longer in the order these slices assume");

  const disclosure = shared.slice(disclosureAt, requestAt);
  const decision = shared.slice(requestAt, decisionAt);
  // The positive control: the disclosure really does carry its own fields, so
  // the absence checks below are absences in something rather than in nothing.
  assert.match(disclosure, /^\s*approvalId:/mu, "the disclosure slice is empty or has no fields");
  assert.doesNotMatch(disclosure, /^\s*(?:dir|projectPath|instruction|command|authorization):/mu);
  assert.doesNotMatch(decision, /^\s*(?:projectPath|instruction|command|authorization):/mu);
  assert.match(decision, /^\s*dir:/mu);
  assert.match(decision, /^\s*approvalId:/mu);
  assert.match(decision, /^\s*action:/mu);
  assert.match(decision, /^\s*disclosure:/mu);
});

test("repair call paper: Main owns only an inert approval lifecycle", () => {
  const main = source("src", "main", "repairapproval.ts");
  assert.match(main, /new WeakMap/u);
  assert.match(main, /new WeakSet/u);
  assert.match(main, /serialRepairPreviewSha256/u);
  assert.match(main, /serialRepairPreviewAuthorityRows/u);
  assert.match(main, /codexRepairDisclosureCoversPreview/u);
  assert.match(main, /codexRepairRouteReceiptSha256/u);
  assert.match(main, /isCurrentRepairCallApproval/u);
  assert.match(main, /clearRepairCallApprovalIfCurrent/u);
  assert.doesNotMatch(main, /node:child_process|Electron|\bfetch\b|\bspawn\b|\bexec(?:File)?\b/u);
});

test("repair call paper: shared IPC and preload expose one decision-only repair channel", () => {
  const ipc = source("src", "shared", "ipc.ts");
  const preload = source("src", "preload.ts");
  const session = between(ipc, "export type RunSessionSnapshot = {", "/** Main creates evidence run IDs");
  const api = between(ipc, "export interface CairnApi", "export interface TaskBlockConcern");

  assert.match(session, /repairCall\?: RepairCallDisclosureV1;/u);
  assert.match(api, /repairCallDecide\(request: RepairCallDecisionRequest\): Promise<Result<RepairCallDecisionV1>>/u);
  assert.match(preload, /repairCallDecide: \(request\) => ipcRenderer\.invoke\("repair:call-decide", request\)/u);
  assert.equal(preload.match(/repair:call-decide/gu)?.length, 1, "one preload route, with no transport or alternate decision path");
  assert.doesNotMatch(session, /repairAuthorization|repairInstruction:|command:/u);
});

test("repair call paper: both running-session surfaces echo, retain refusals, and refresh after success", () => {
  const taskRun = source("src", "renderer", "screens", "TaskRun.tsx");
  const chat = source("src", "renderer", "screens", "Chat.tsx");
  for (const [name, screen, refreshName] of [
    ["TaskRun", taskRun, "refresh"],
    ["Chat", chat, "refreshSession"],
  ] as const) {
    assert.match(screen, /import \{ RepairCallCard \}/u, `${name} imports the exact card`);
    assert.match(screen, /<RepairCallCard/u, `${name} renders the exact card`);
    assert.match(screen, /onDecide=\{\(request\) => void decideRepairCall\(request\)\}/u,
      `${name} returns the card-built canonical echo without reconstructing it`);
    const decider = between(screen, "async function decideRepairCall", "\n  }");
    assert.match(decider, /cairn\.repairCallDecide\(request\)/u);
    assert.match(decider, /if \(!response\.ok\) \{ setError\(response\.message\); return; \}/u,
      `${name} retains Main's genuine approval on refusal`);
    assert.match(decider, new RegExp(`await ${refreshName}\\(\\)`, "u"), `${name} refreshes Main-owned session truth`);
    assert.match(decider, /finally \{[\s\S]*?setRepairCallBusy\(false\)/u,
      `${name} always re-enables both repair decisions`);
    assert.doesNotMatch(decider, /authorization|instruction|takeRepair|consumeRepair/u);
  }
  assert.match(taskRun, /setRepairCall\(session\.repairCall \?\? null\)/u);
  assert.match(chat, /session\?\.phase === "running" && session\.repairCall/u);
});

test("repair call paper: TaskRun polls only while running and repeated snapshots do not invalidate a press", () => {
  const taskRun = source("src", "renderer", "screens", "TaskRun.tsx");
  assert.match(taskRun, /if \(phase !== "running"\) return;[\s\S]*?setInterval\(\(\) => \{ void refresh\(\); \}, 1000\)/u);
  assert.match(taskRun, /if \(appliedSessionKey\.current !== sessionKey\) \{[\s\S]*?routeGeneration\.current \+= 1/u);
  assert.doesNotMatch(
    between(taskRun, "const applySession", "const refresh"),
    /routeGeneration\.current \+= 1;[\s\S]*?routeGeneration\.current \+= 1;/u,
    "a same-session poll must not repeatedly stale the card the owner is pressing",
  );
});
