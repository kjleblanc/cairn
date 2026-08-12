import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");
const shared = read("src", "shared", "task-review.ts");
const ipc = read("src", "shared", "ipc.ts");
const preload = read("src", "preload.ts");
const tasks = read("src", "main", "tasks.ts");
const view = read("src", "renderer", "components", "TaskReview.tsx");
const chat = read("src", "renderer", "screens", "Chat.tsx");
const taskRun = read("src", "renderer", "screens", "TaskRun.tsx");

function section(source: string, opening: string, closing: string): string {
  const start = source.indexOf(opening);
  const end = source.indexOf(closing, start + opening.length);
  assert.ok(start >= 0 && end > start, `could not bound ${opening}`);
  return source.slice(start, end);
}

test("one shared view names the source-marked plan, cN evidence, advisory pN, critic mode, budget, and pre-seal boundary", () => {
  assert.match(view, /export function TaskReviewView/);
  assert.match(view, /<TaskSpecProposalPreviewView preview=\{review\.plan\}/);
  assert.match(view, /Criterion evidence and owner checks/);
  assert.match(view, /pre-seal evidence records, not Cairn&apos;s DONE\/STOPPED result and not your final verdict/);
  assert.match(view, /advisory preference, not a DONE gate/);
  assert.match(view, /Independent critic/);
  assert.match(view, /Whole-run limits/);
  assert.match(view, /Critic allegation/);
  assert.match(view, /allegation only; it cannot block the task unless you confirm this exact evidence/);
  assert.match(view, /Cairn check failure/);
  assert.match(view, /Cairn cannot request a repair unless you confirm this exact failed check/);
  assert.match(view, /Confirming it does not approve a repair; Cairn will show a separate exact repair approval next/);
  assert.match(view, /I see it working/);
  assert.match(view, /Confirm Cairn's failed check/);
  assert.match(view, /Dismiss and stop/);
  assert.match(view, /I can&apos;t tell — stop/);
  assert.match(view, /Dismiss this allegation/);
  for (const field of [
    "initialBuilderCalls", "maxRepairCalls", "maxCriticAttempts", "maxExternalEvidenceCalls",
    "maxBuilderElapsedMs", "maxCriticElapsedMs", "maxBuilderCapturedOutputBytes",
    "maxCriticCapturedOutputBytes", "enforceableDollarLimitCents",
  ]) assert.match(view, new RegExp(`budget\\.${field}`), field);
});

test("Chat and manual Task Run both consume the same output-only view and closed action vocabulary", () => {
  assert.match(chat, /import \{ TaskReviewView, TaskSpecProposalPreviewView/);
  assert.match(taskRun, /import \{ TaskReviewView, TaskSpecProposalPreviewView/);
  assert.match(chat, /<TaskReviewView review=\{dispatch\.taskReview\}/);
  assert.match(chat, /<TaskReviewView review=\{card\.taskReview\}/);
  assert.match(taskRun, /<TaskReviewView review=\{taskReview\} heading="Final Task Spec"/);
  assert.match(taskRun, /phase === "running" && taskReview \? \([\s\S]*?<TaskReviewView review=\{taskReview\} heading="Accepted Task Spec"/);
  assert.match(taskRun, /phase === "result"[\s\S]*?<TaskReviewView review=\{taskReview\}/);

  for (const source of [chat, taskRun]) {
    const callback = section(source, "async function applyTaskReviewChoice", "\n  }");
    assert.match(callback, /cairn\.taskReviewAction\(request\)/);
    assert.doesNotMatch(callback, /(?:taskSpec|candidate|criterionId|finding|assessment|evidence|render|policy|seal|verdict|disposition)\s*:/iu);
  }
});

test("accepted running sessions keep owner-check actions without reviving a spent route preview", () => {
  const taskRunPreRoute = section(taskRun, "async function applyTaskReviewChoice", "async function applyRunningTaskReviewChoice");
  const chatPreRoute = section(chat, "async function applyTaskReviewChoice", "async function applyRunningTaskReviewChoice");
  assert.match(taskRunPreRoute, /previewId === null/u, "manual pre-route review still requires its live preview");
  assert.match(chatPreRoute, /expectedPreviewId === null/u, "chat pre-route review still requires its live dispatch preview");

  const taskRunAccepted = section(taskRun, "async function applyRunningTaskReviewChoice", "/**\n   * The renderer chooses only");
  const chatAccepted = section(chat, "async function applyRunningTaskReviewChoice", "async function decideRepairCall");
  for (const [name, callback] of [["TaskRun", taskRunAccepted], ["Chat", chatAccepted]] as const) {
    assert.match(callback, /phase !== "running"|held\?\.phase !== "running"/u, `${name} scopes the bypass to an accepted run`);
    assert.match(callback, /cairn\.taskReviewAction\(request\)/u);
    assert.doesNotMatch(callback, /previewId === null|expectedPreviewId|dispatch\.taskReview/u,
      `${name} does not require the already-spent renderer preview`);
    assert.doesNotMatch(callback, /taskSpec\s*:|candidate\s*:|criterionId\s*:|evidence\s*:/u,
      `${name} still returns only Main's opaque action id and closed choice`);
  }
  assert.match(taskRun, /onAction=\{\(actionId, choice\) => void applyRunningTaskReviewChoice\(actionId, choice\)\}/u);
  assert.match(chat, /review=\{session\.taskReview\}[\s\S]*?applyRunningTaskReviewChoice\(actionId, choice\)/u);
});

test("IPC adds only optional output review fields and one exact authority-free action request", () => {
  assert.match(ipc, /taskReview\?: TaskReviewProjectionV1;/);
  assert.match(ipc, /taskReviewAction\(request: TaskReviewActionRequest\): Promise<Result<TaskReviewProjectionV1>>/);
  assert.match(preload, /taskReviewAction: \(request\) => ipcRenderer\.invoke\("task:review-action", request\)/);

  const routeRequest = section(ipc, "export type TaskRouteRequest = {", "/** A renderer-safe projection");
  const runRequest = section(ipc, "export type TaskRunRequest = {", "export type RunSessionSnapshot");
  assert.doesNotMatch(routeRequest, /taskReview|taskSpec|candidate|criterion|finding|verdict/iu);
  assert.doesNotMatch(runRequest, /taskReview|taskSpec|candidate|criterion|finding|verdict/iu);

  const action = section(shared, "export type TaskReviewActionRequest =", "type InspectedRecord");
  assert.match(action, /dir: string/);
  assert.match(action, /actionId: string/);
  assert.match(action, /kind: "observe"/);
  assert.match(action, /kind: "resolve"/);
  assert.match(action, /kind: "review-cairn-failure"/);
  assert.doesNotMatch(action, /taskSpec|candidate|criterion|finding|assessment|evidence|render|policy|seal|verdict|disposition/iu);
});

test("Main retains exact brands, consumes one action, and keeps the empty-registry worker path intent-only", () => {
  assert.match(tasks, /const reviewAuthorities = new Map<string, MainTaskReviewAuthorityV1>\(\)/);
  assert.match(tasks, /composePendingTaskReviewAuthority\(dir, taskSpec\)/);
  assert.match(tasks, /taskReviewProjection\(pending\.taskReviewAuthority\) === pending\.taskReview/);
  assert.match(tasks, /parseTaskReviewActionRequest\(unsafeRequest\)/);
  assert.match(tasks, /applyTaskReviewAction\(authority, request\)/);
  assert.match(tasks, /if \(taskReviewProjection\(authority\) === null\) \{[\s\S]*?reviewAuthorities\.delete\(key\)/,
    "a replay refuses without revoking the regenerated current authority");
  assert.match(tasks, /invalidateTaskReviewAuthority/);
  assert.match(tasks, /const QUALITY_PREVIEW_ACTIVATION_IDENTITY: unknown = null/);
  assert.match(tasks, /runSerialTask\(dir, pending\.intent, \{/);
  assert.doesNotMatch(tasks, /runSerialTask\(dir, pending\.taskSpec/);
});
