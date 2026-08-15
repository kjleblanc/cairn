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

/**
 * Task 243. The exact record is FOLDED, never deleted, and nothing the owner
 * decides from is folded away. Behavioural tests can see that a fact renders;
 * only source can say the fact is still produced at all, so a later
 * "simplification" that drops one fails here rather than quietly narrowing
 * what Cairn shows.
 */
test("unsealed candidate paper: the folded record keeps every fact, and the decision stays outside it", () => {
  const card = source("src", "renderer", "components", "UnsealedCandidate.tsx");
  // Three folds, each a native <details> that opens with no script at all.
  assert.equal(card.match(/<details className="unsealed-candidate-fold">/gu)?.length, 3);
  // Git's own list, the bounded evidence line, and the worker's whole account
  // are all still rendered from the projection, not summarized away.
  assert.match(card, /candidate\.changedPaths\.map/u);
  assert.match(card, /candidate\.evidenceSummary/u);
  assert.match(card, /claims\.changes\.map/u);
  assert.match(card, /claims\.checks\.map/u);
  assert.match(card, /Remaining limitations:/u);

  // Order is the whole point of the repair. The promise rows sit ABOVE every
  // fold; the folds close before the critic offer; the offer comes before the
  // two choices. Nothing a decision depends on is behind a click.
  const firstFold = card.indexOf('<details className="unsealed-candidate-fold">');
  const promises = card.indexOf("candidate.promises.map");
  const lastFoldEnd = card.lastIndexOf("</details>");
  const critiqueSlot = card.indexOf("{critique}");
  const choices = card.indexOf("candidate.choices.map");
  assert.ok(promises > 0 && promises < firstFold,
    "the promise rows stay on the first screen, above every fold");
  assert.ok(critiqueSlot > lastFoldEnd && choices > critiqueSlot,
    "the folds close, then the second opinion, then the two choices");
});

/**
 * Task 244. An allegation is the OWNER'S to confirm, the correction is the
 * critic's own sentence, and there is exactly one repair. These are properties
 * about what the surface does NOT offer — a text box, a second repair, a
 * confirm button on a row Cairn already proved — so no behavioural test can
 * see them.
 */
test("unsealed candidate paper: an allegation is the owner's to confirm, and one repair is the limit", () => {
  const critique = source("src", "renderer", "components", "CandidateCritique.tsx");
  const card = source("src", "renderer", "components", "UnsealedCandidate.tsx");
  const shared = source("src", "shared", "unsealed-candidate.ts");

  // Only a not_met finding, only on a row Cairn has not itself proved, and only
  // while this pause still has its one repair to give.
  assert.match(critique, /finding\.judgment === "not_met"/u);
  assert.match(critique, /openRowIds\.includes\(finding\.checkId\)/u);
  assert.match(critique, /repairAvailable/u);
  // The correction IS the critic's observation. There is nowhere on this
  // surface for the owner — or anything driving it — to type a wider one.
  assert.match(critique, /onRepair\(finding\.checkId, finding\.observation\)/u);
  assert.doesNotMatch(critique, /<input|<textarea|contentEditable/u);
  // The renderer holds the confirm state and no authority at all.
  assert.doesNotMatch(critique, /from\s+["'][^"']*main\//u);
  assert.doesNotMatch(critique, /\b(?:fetch|spawn|exec)\s*\(/u);

  // A repair already spent is stated on the candidate itself, above the
  // decision, so the owner cannot judge repaired work without knowing it was.
  assert.match(card, /candidate\.repairAsked/u);
  assert.ok(card.indexOf("candidate.repairAsked") < card.indexOf("candidate.choices.map"),
    "what was already repaired is said before the two choices");

  // Two exact key sets on the one channel: a repair carries its correction, a
  // continue never does, and a repair carries no row judgments to spend.
  assert.match(shared, /checkpointId\\0choice\\0dir\\0ownerAnswers\\0repair/u);
  assert.match(shared, /if \(Object\.keys\(answers\)\.length > 0\) return null;/u);
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
  // Fail closed: only an exact continue may reach the seal. Task 238 moved the
  // test from a bare string comparison to one normalizer, because the answer
  // now carries the owner's row judgments — but the rule is unchanged, so this
  // guard pins the new shape rather than being dropped.
  assert.match(serial, /const continuation = unsealedCandidateContinuation\(choice\);/u);
  assert.match(serial, /if \(!continuation\) return closeStopped\("OWNER_STOPPED_AT_CANDIDATE"\);/u);
  // And the normalizer itself refuses anything that is not exactly a continue,
  // in either accepted shape.
  assert.match(serial, /if \(value === "continue"\) return Object\.freeze\(\{ ownerAnswers: Object\.freeze\(\{\}\) \}\);/u);
  assert.match(serial, /if \(record\.choice !== "continue"\) return null;/u);
  // Task 238: an unreadable owner answer leaves the row pending rather than
  // becoming a silent "met".
  assert.match(serial, /if \(answer === "met" \|\| answer === "not-met"\) answers\[key\] = answer;/u);
  // Optional by construction, so a run without it keeps today's close.
  assert.match(serial, /onUnsealedCandidate\?: \(/u);
  assert.match(serial, /taskPromises\?: SerialTaskPromisesV1;/u);
});
