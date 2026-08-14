import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/** App-relative, like the other paper tests. */
const source = (...parts: string[]) => readFileSync(join(__dirname, "..", "..", ...parts), "utf8");
/** One level further up, for the Core seam this slice depends on. */
const repoSource = (...parts: string[]) => readFileSync(join(__dirname, "..", "..", "..", ...parts), "utf8");

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `could not bound ${start}`);
  return text.slice(from, to);
}

/**
 * Task 235. Containment guards for the pre-terminal pause: the properties that
 * make it a checkpoint rather than a second way to finish a task, and that no
 * behavioural test can see because they are about what the code does NOT do.
 */

test("unsealed candidate paper: the card says what has not happened and attributes every claim", () => {
  const card = source("src", "renderer", "components", "UnsealedCandidate.tsx");
  // The one sentence the whole slice exists to put on screen.
  assert.match(card, /Cairn has not declared this task\s*\n?\s*complete/u);
  assert.match(card, /No task report is written\./u);
  assert.match(card, /No row is added to the work log\./u);
  assert.match(card, /Nothing is committed\./u);
  assert.match(card, /"Continue to Cairn's current checks"/u);
  assert.match(card, /"Stop and keep the work for inspection"/u);
  // Cairn's list is Git's, and is never labelled as the worker's doing.
  assert.match(card, /Files changed in your project/u);
  assert.match(card, /checked by Cairn/u);
  assert.match(card, /reported, not checked/u);
  assert.doesNotMatch(card, /Files the worker changed|What the worker changed/u);
  // Only what the projection lists, and nothing from main or the network.
  assert.match(card, /candidate\.choices\.map/u);
  assert.doesNotMatch(card, /from\s+["'][^"']*main\//u);
  assert.doesNotMatch(card, /\b(?:fetch|spawn|exec)\s*\(/u);
});

test("unsealed candidate paper: shared output carries no project path or authority", () => {
  const shared = source("src", "shared", "unsealed-candidate.ts");
  const projection = between(shared, "export type UnsealedCandidateProjectionV1", "export type UnsealedCandidateDecisionRequest");
  const request = between(shared, "export type UnsealedCandidateDecisionRequest", "export type UnsealedCandidateDecisionV1");
  assert.doesNotMatch(projection, /^\s*(?:dir|projectPath|projectRoot|authorization|grant|token):/mu);
  assert.match(request, /^\s*dir:/mu);
  assert.match(request, /^\s*checkpointId:/mu);
  assert.match(request, /^\s*choice:/mu);
  // Exactly two choices reach the owner, and neither of them is a third door.
  assert.match(shared, /UNSEALED_CANDIDATE_CHOICES = Object\.freeze\(\["continue", "stop"\] as const\)/u);
});

test("unsealed candidate paper: Main owns an inert pause, not a way to finish a task", () => {
  const main = source("src", "main", "unsealedcandidate.ts");
  assert.match(main, /closeUnsealedCandidateIfCurrent/u);
  assert.match(main, /pendingByCheckpoint/u);
  // No process, network, filesystem, or Electron surface in the pause itself.
  assert.doesNotMatch(main, /node:child_process|node:fs|electron|\bfetch\b|\bspawn\b|\bexec(?:File)?\b/u);
  // It must not be able to author, seal, commit, or record anything.
  assert.doesNotMatch(main, /\bcommit\b|\bseal\b|writeFile|appendFile|runSerialTask/u);
});

test("unsealed candidate paper: one decision-only channel, and only one", () => {
  const ipc = source("src", "shared", "ipc.ts");
  const preload = source("src", "preload.ts");
  const session = between(ipc, "export type RunSessionSnapshot = {", "/** Main creates evidence run IDs");
  const api = between(ipc, "export interface CairnApi", "export interface TaskBlockConcern");

  assert.match(session, /unsealedCandidate\?: UnsealedCandidateProjectionV1;/u);
  assert.match(api, /unsealedCandidateDecide\(request: UnsealedCandidateDecisionRequest\): Promise<Result<UnsealedCandidateDecisionV1>>/u);
  assert.match(preload, /unsealedCandidateDecide: \(request\) => ipcRenderer\.invoke\("task:candidate-decide", request\)/u);
  assert.equal(preload.match(/task:candidate-decide/gu)?.length, 1,
    "one preload route, with no alternate way to answer the pause");
});

test("unsealed candidate paper: Chat echoes the pause's own id, retains refusals, and refreshes", () => {
  const chat = source("src", "renderer", "screens", "Chat.tsx");
  assert.match(chat, /import \{ UnsealedCandidateCard \}/u);
  assert.match(chat, /<UnsealedCandidateCard/u);
  assert.match(chat, /session\?\.phase === "running" && session\.unsealedCandidate/u);
  const chooser = between(chat, "async function chooseUnsealedCandidate", "\n  }");
  assert.match(chooser, /checkpointId: candidate\.checkpointId/u);
  assert.match(chooser, /if \(!response\.ok\) \{ setError\(response\.message\); return; \}/u);
  assert.match(chooser, /await refreshSession\(\)/u);
  assert.match(chooser, /finally \{[\s\S]*?setUnsealedCandidateBusy\(false\)/u);
  // The renderer answers; it never decides what the answer means. Word
  // boundaries matter here: "unsealedCandidate" is the subject of every line.
  assert.doesNotMatch(chooser, /\bdisposition\b|\bcommit\b|\bseal\b|\bDONE\b/u);
});

test("unsealed candidate paper: Main fails closed when nobody can answer", () => {
  const tasks = source("src", "main", "tasks.ts");
  const hook = between(tasks, "onUnsealedCandidate: async (candidate, signal)", "        });");
  // No window, or a candidate Main cannot vouch for, must never seal silently.
  assert.match(hook, /if \(contents === null \|\| contents\.isDestroyed\(\)\) return "stop"/u);
  assert.match(hook, /if \(opened === null\) return "stop"/u);
  // Cancel and renderer loss both take the honest STOPPED door.
  assert.match(hook, /signal\?\.aborted/u);
  assert.match(hook, /contents\.once\("destroyed", close\)/u);
  assert.match(hook, /closeUnsealedCandidateIfCurrent/u);
  // The pause is cleared however it ends.
  assert.match(hook, /finally \{[\s\S]*?delete current\.unsealedCandidate/u);
});

test("unsealed candidate paper: the Q9 branch gains no checkpoint", () => {
  const tasks = source("src", "main", "tasks.ts");
  // The guarded fixture route keeps its own lifecycle; Slice 1 touches only the
  // ordinary run. One hook, on one branch.
  assert.equal(tasks.match(/onUnsealedCandidate:/gu)?.length, 1);
  const q9 = between(tasks, "if (pending.q9Harness) {", "return run;");
  assert.doesNotMatch(q9, /onUnsealedCandidate|unsealedCandidate/u);
});

test("unsealed candidate paper: Core pauses before the terminal close and stays optional", () => {
  const serial = repoSource("core", "src", "serial.ts");
  // The checkpoint must sit AFTER the stop decision and BEFORE the DONE path,
  // which is the only position where nothing terminal has been written yet.
  const stopGate = serial.indexOf("if (stopReason) return closeStopped(stopReason);");
  const hook = serial.indexOf("if (options.onUnsealedCandidate) {");
  const donePath = serial.indexOf("// DONE path — the claims say DONE");
  assert.ok(stopGate > 0 && hook > stopGate && donePath > hook,
    "the pause is between the stop gate and the DONE path");
  // Fail closed: only an exact "continue" may reach the seal.
  assert.match(serial, /if \(choice !== "continue"\) return closeStopped\("OWNER_STOPPED_AT_CANDIDATE"\);/u);
  // Optional by construction, so a run without it keeps today's close.
  assert.match(serial, /onUnsealedCandidate\?: \(/u);
});
