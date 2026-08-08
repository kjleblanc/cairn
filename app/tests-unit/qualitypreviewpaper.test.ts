import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ipc = readFileSync(join(process.cwd(), "src", "shared", "ipc.ts"), "utf8");
const chat = readFileSync(join(process.cwd(), "src", "renderer", "screens", "Chat.tsx"), "utf8");
const taskReview = readFileSync(join(process.cwd(), "src", "renderer", "components", "TaskReview.tsx"), "utf8");

function section(source: string, opening: string, closing: string): string {
  const start = source.indexOf(opening);
  const end = source.indexOf(closing, start + opening.length);
  assert.ok(start >= 0 && end > start, `could not bound ${opening}`);
  return source.slice(start, end);
}

test("the Task Spec preview crosses IPC as optional output only", () => {
  assert.match(ipc, /import type \{ TaskSpecProposalPreviewV1 \} from "\.\/quality-preview\.js";/);
  assert.match(ipc, /export type \{ TaskSpecProposalPreviewV1 \} from "\.\/quality-preview\.js";/);

  const routePreview = section(ipc, "export type TaskRoutePreview = {", "/** `pushPreview`");
  assert.match(routePreview, /taskSpecPreview\?: TaskSpecProposalPreviewV1;/);

  const routeRequest = section(ipc, "export type TaskRouteRequest = {", "/** A renderer-safe projection");
  const runRequest = section(ipc, "export type TaskRunRequest = {", "export type RunSessionSnapshot");
  assert.doesNotMatch(routeRequest, /taskSpec|quality|criteria|preferences/iu);
  assert.doesNotMatch(runRequest, /taskSpec|quality|criteria|preferences/iu);

  const action = section(ipc, "export type ConductorAction =", "export interface ConductorDelta");
  assert.match(action, /taskSpecPreview\?: TaskSpecProposalPreviewV1;/);
});

test("the pure preview view renders the owner-readable Quality Plan vocabulary", () => {
  const view = section(taskReview, "function previewSourceLabel", "function evidenceList");
  assert.match(view, /<TaskIntentList request=\{preview\.request\} heading="Request and source"/);
  assert.match(view, /preview\.supportedPath\.statement/);
  assert.match(view, /preview\.supportedPath\.sources/);
  assert.match(view, /preview\.criteria\.map/);
  assert.match(view, /\{criterion\.id\} — required promise/);
  assert.match(view, /criterion\.failure/);
  assert.match(view, /criterion\.evidence\.proves/);
  assert.match(view, /criterion\.evidence\.mode/);
  assert.match(view, /criterion\.sources/);
  assert.match(view, /what you asked for/);
  assert.match(view, /something you were unsure about/);
  assert.match(view, /preview\.preferences\.map/);
  assert.match(view, /advisory preference, not a DONE gate/);
  assert.match(view, /preference\.sources/);
  assert.match(view, /preview\.references\.map/);
  assert.match(view, /reference\.title/);
  assert.match(view, /reference\.source/);
  assert.match(view, /reference\.dimensions\.join/);
  assert.match(view, /reference\.antiCopyBoundary/);
  assert.match(view, /preview\.unknowns\.map/);
  assert.match(view, /unknown\.sources/);
  assert.match(view, /preview\.critic\.mode/);
  assert.match(view, /preview\.critic\.reason/);
  assert.match(view, /preview\.critic\.sources/);
  assert.match(view, /\? "Required"[\s\S]*?\? "Optional"[\s\S]*?: "Off"/);
  for (const field of [
    "initialBuilderCalls", "maxRepairCalls", "maxCriticAttempts", "maxExternalEvidenceCalls",
    "maxBuilderElapsedMs", "maxCriticElapsedMs", "maxBuilderCapturedOutputBytes",
    "maxCriticCapturedOutputBytes", "enforceableDollarLimitCents",
  ]) {
    assert.match(view, new RegExp(`budget\\.${field}`), `${field} is not shown`);
  }

  assert.doesNotMatch(view, /taskSpecSha256|snapshotSha256|stateSha256|locator|failureCondition|allowedArtifactIds|inputId|sourceId|offset/iu);
});

test("proposal and dispatch render conditionally without creating input authority", () => {
  assert.match(chat, /action\.taskSpecPreview \? \([\s\S]*?<TaskSpecProposalPreviewView preview=\{action\.taskSpecPreview\}/);
  assert.match(chat, /setDispatch\(\{ previewId: null, request: null, context: \[\], taskSpecPreview: null,/,
    "dispatch must not copy the proposal card's preview");
  assert.match(chat, /taskSpecPreview: response\.ok \? response\.value\.taskSpecPreview \?\? null : current\.taskSpecPreview/,
    "dispatch preview must come from main's exact route response");
  assert.match(chat, /dispatch\.taskSpecPreview !== null \? \([\s\S]*?<TaskSpecProposalPreviewView preview=\{dispatch\.taskSpecPreview\}/);

  const routeCall = section(chat, "void cairn.taskRoute({", "}).then((response)");
  assert.doesNotMatch(routeCall, /taskSpecPreview|quality|criteria|preferences/iu);
  const runCall = section(chat, "const response = await cairn.taskRun({", "});");
  assert.doesNotMatch(runCall, /taskSpecPreview|quality|criteria|preferences/iu);
});

test("the absent-preview branch keeps today's final review and approval copy", () => {
  assert.match(chat, /\) : dispatch\.request !== null \? \([\s\S]*?<TaskIntentList request=\{dispatch\.request\} context=\{dispatch\.context\} heading="Final review" \/>/);
  assert.match(chat, /Starting accepts every displayed <strong>Cairn chose<\/strong> value as part of this task\./);
  assert.match(chat, /Starting does not turn a Cairn-chosen value or something you were unsure about into a required promise\./);
});
