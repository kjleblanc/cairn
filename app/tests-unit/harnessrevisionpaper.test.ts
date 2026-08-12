import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (...parts: string[]) => readFileSync(join(__dirname, "..", "..", ...parts), "utf8");

test("harness revision paper shows exact failure, immutable identities, narrow change, and offline boundary", () => {
  const card = source("src", "renderer", "components", "HarnessRevision.tsx");
  for (const label of [
    "Original check", "Failure", "Mechanical change", "Captured failed output", "Output SHA-256",
    "Failure SHA-256", "Evidence reference", "Task Spec SHA-256", "Evidence Plan revision 0",
    "Evidence Plan revision 1", "Data:", "Billing:",
  ]) assert.match(card, new RegExp(label, "u"));
  assert.match(card, /Use this narrow harness correction/u);
  assert.match(card, /Keep the original plan and stop/u);
  assert.match(card, /dir,[\s\S]*approvalId: revision\.approvalId[\s\S]*action,[\s\S]*disclosure: revision/u);
  assert.doesNotMatch(card, /\b(?:fetch|spawn|exec|authorize|adopt|rerun)\s*\(/u);
});

test("harness revision IPC is decision-only and both running surfaces preserve Main truth", () => {
  const ipc = source("src", "shared", "ipc.ts");
  const preload = source("src", "preload.ts");
  const tasks = source("src", "main", "tasks.ts");
  const taskRun = source("src", "renderer", "screens", "TaskRun.tsx");
  const chat = source("src", "renderer", "screens", "Chat.tsx");
  assert.match(ipc, /harnessRevision\?: Q9HarnessRevisionDisclosureV1/u);
  assert.match(ipc, /harnessRevisionDecide\(request: Q9HarnessRevisionDecisionRequest\): Promise<Result<Q9HarnessRevisionDecisionV1>>/u);
  assert.match(preload, /harnessRevisionDecide: \(request\) => ipcRenderer\.invoke\("harness:revision-decide", request\)/u);
  assert.equal(preload.match(/harness:revision-decide/gu)?.length, 1);
  assert.match(tasks, /ipcMain\.handle\("harness:revision-decide"/u);
  assert.match(tasks, /decideQ9HarnessRevision\(unsafeRequest\)/u);
  assert.match(tasks, /kind: "synthetic-q9-harness-revision"/u);
  for (const screen of [taskRun, chat]) {
    assert.match(screen, /<HarnessRevisionCard/u);
    assert.match(screen, /cairn\.harnessRevisionDecide\(request\)/u);
    assert.match(screen, /if \(!response\.ok\) \{ setError\(response\.message\); return; \}/u);
  }
});

test("shared harness request carries no executable or authority bytes", () => {
  const shared = source("src", "shared", "harness-revision.ts");
  const request = shared.slice(shared.indexOf("export type Q9HarnessRevisionDecisionRequest"),
    shared.indexOf("export type Q9HarnessRevisionDecisionV1"));
  assert.match(request, /dir: string/u);
  assert.match(request, /approvalId: string/u);
  assert.match(request, /action: Q9HarnessRevisionActionV1/u);
  assert.match(request, /disclosure: Q9HarnessRevisionDisclosureV1/u);
  assert.doesNotMatch(request, /command|plan:|authorization|candidate|failureCanonicalPayload/u);
});

test("the guarded desktop result tells the offline fixture truth", () => {
  const taskRun = source("src", "renderer", "screens", "TaskRun.tsx");
  assert.match(taskRun, /Run guarded Q9 fixture/u);
  assert.match(taskRun, /Verified guarded Q9 result/u);
  assert.match(taskRun, /completed and verified in the isolated fixture/u);
  assert.match(taskRun, /No provider, saved key, billable call, or external service was used/u);
});
