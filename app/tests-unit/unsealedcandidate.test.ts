import assert from "node:assert/strict";
import test from "node:test";

import {
  closeUnsealedCandidateIfCurrent,
  currentUnsealedCandidate,
  decideUnsealedCandidate,
  openUnsealedCandidateCheckpoint,
  pendingUnsealedCandidateCount,
  _resetUnsealedCandidatesForTests,
} from "../src/main/unsealedcandidate.js";

/**
 * Task 235: Main's half of the pre-terminal pause.
 *
 * This module holds one pending checkpoint per project and answers exactly one
 * press. It is deliberately NOT an authority: resolving "continue" only lets
 * the still-open Core runner reach the close it would have reached anyway, so
 * there is no grant, receipt, or spend to protect — only the requirement that a
 * stale or forged press can never answer the live pause.
 */

const DIR = process.platform === "win32" ? "C:\\projects\\demo" : "/projects/demo";
const OTHER = process.platform === "win32" ? "C:\\projects\\other" : "/projects/other";

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    version: "cairn-serial-unsealed-candidate/v1",
    taskNumber: 7,
    acceptedRequest: {
      outcome: { text: "Add one visible result", source: "owner-stated", ownerQuote: "Add one visible result" },
      requirements: [],
    },
    requestContext: [],
    route: { adapterId: "codex-exec", adapterLabel: "Codex Exec", provider: "OpenAI", model: "gpt-5-codex" },
    changedPaths: ["docs/ai-work/tasks/007-brief.md", "visible.txt"],
    claims: {
      disposition: "DONE",
      summary: "Added the visible result.",
      changes: ["visible.txt - created"],
      checks: [{ name: "read back", result: "matches" }],
      howToTry: "Open visible.txt.",
      limitations: "None.",
      milestone: "YES",
    },
    evidenceSummary: "Bounded worker evidence: fileChangeCount=1.",
    // Task 238: Core always sends this, so the fixture does too. A run that
    // carried no promises sends an empty list, never a missing key.
    answers: [],
    ...overrides,
  };
}

test.beforeEach(() => { _resetUnsealedCandidatesForTests(); });

test("an opened checkpoint is the project's current one and offers both choices", () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  assert.equal(opened.projection.taskNumber, 7);
  assert.deepEqual([...opened.projection.choices], ["continue", "stop"]);
  assert.deepEqual(currentUnsealedCandidate(DIR), opened.projection);
  assert.equal(currentUnsealedCandidate(OTHER), null);
});

test("the projection carries no project path for the renderer to read back", () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  assert.equal(Object.hasOwn(opened.projection, "dir"), false);
  assert.equal(JSON.stringify(opened.projection).includes("projects"), false);
});

test("continue settles the waiting run exactly once and clears the pending checkpoint", async () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  const decision = decideUnsealedCandidate({
    dir: DIR,
    checkpointId: opened.projection.checkpointId,
    choice: "continue",
    ownerAnswers: {},
  });
  assert.equal(decision.ok, true);
  if (!decision.ok) return;
  assert.equal(decision.decision.choice, "continue");
  assert.deepEqual(await opened.settled, { choice: "continue", ownerAnswers: {} });
  assert.equal(currentUnsealedCandidate(DIR), null);
  assert.equal(pendingUnsealedCandidateCount(), 0);
});

test("stop settles the waiting run with stop", async () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  decideUnsealedCandidate({ dir: DIR, checkpointId: opened.projection.checkpointId, choice: "stop", ownerAnswers: {} });
  assert.deepEqual(await opened.settled, { choice: "stop" });
});

test("a second press after the checkpoint is answered is refused", async () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  const request = { dir: DIR, checkpointId: opened.projection.checkpointId, choice: "continue" as const, ownerAnswers: {} };
  assert.equal(decideUnsealedCandidate(request).ok, true);
  const second = decideUnsealedCandidate({ ...request, choice: "stop" as const });
  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.code, "UNSEALED_CANDIDATE_UNKNOWN_CHECKPOINT");
  // The first answer stands; a late press cannot change a settled run.
  assert.deepEqual(await opened.settled, { choice: "continue", ownerAnswers: {} });
});

test("an unknown checkpoint id is refused and leaves the live pause waiting", () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  const refused = decideUnsealedCandidate({
    dir: DIR,
    checkpointId: "00000000-0000-4000-8000-000000000000",
    choice: "continue",
    ownerAnswers: {},
  });
  assert.equal(refused.ok, false);
  if (refused.ok) return;
  assert.equal(refused.code, "UNSEALED_CANDIDATE_UNKNOWN_CHECKPOINT");
  assert.deepEqual(currentUnsealedCandidate(DIR), opened.projection);
});

test("a press naming another project cannot answer this project's pause", () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  const refused = decideUnsealedCandidate({
    dir: OTHER,
    checkpointId: opened.projection.checkpointId,
    choice: "continue",
    ownerAnswers: {},
  });
  assert.equal(refused.ok, false);
  assert.deepEqual(currentUnsealedCandidate(DIR), opened.projection);
});

test("a malformed press is refused without touching the live pause", () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  for (const bad of [
    null,
    { dir: DIR, checkpointId: opened.projection.checkpointId, ownerAnswers: {} },
    { dir: DIR, checkpointId: opened.projection.checkpointId, choice: "seal", ownerAnswers: {} },
    { dir: DIR, checkpointId: 7, choice: "continue", ownerAnswers: {} },
    { dir: DIR, checkpointId: opened.projection.checkpointId, choice: "continue", ownerAnswers: {}, extra: 1 },
    // Task 238: the answers themselves must be exactly readable.
    { dir: DIR, checkpointId: opened.projection.checkpointId, choice: "continue" },
    { dir: DIR, checkpointId: opened.projection.checkpointId, choice: "continue", ownerAnswers: { c1: "maybe" } },
    { dir: DIR, checkpointId: opened.projection.checkpointId, choice: "continue", ownerAnswers: { "not-a-row": "met" } },
  ]) {
    const refused = decideUnsealedCandidate(bad);
    assert.equal(refused.ok, false, `refused ${JSON.stringify(bad)}`);
    if (refused.ok) return;
    assert.equal(refused.code, "UNSEALED_CANDIDATE_MALFORMED_DECISION");
  }
  assert.deepEqual(currentUnsealedCandidate(DIR), opened.projection);
});

test("one project cannot hold two pending checkpoints at once", () => {
  const first = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(first);
  const second = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.equal(second, null, "the live pause is never replaced by a second open");
  assert.deepEqual(currentUnsealedCandidate(DIR), first.projection);
});

test("closing the checkpoint Main-side settles the run as stop", async () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  // The abort/window-loss door: Cairn is still alive, so it closes honestly
  // rather than leaving the run waiting on a renderer that will never answer.
  assert.equal(closeUnsealedCandidateIfCurrent(DIR, opened.projection), true);
  assert.deepEqual(await opened.settled, { choice: "stop" });
  assert.equal(currentUnsealedCandidate(DIR), null);
});

test("closing a checkpoint that is no longer current changes nothing", async () => {
  const opened = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  assert.ok(opened);
  decideUnsealedCandidate({ dir: DIR, checkpointId: opened.projection.checkpointId, choice: "continue", ownerAnswers: {} });
  assert.equal(closeUnsealedCandidateIfCurrent(DIR, opened.projection), false);
  assert.deepEqual(await opened.settled, { choice: "continue", ownerAnswers: {} });
});

test("a candidate Core did not mint is refused", () => {
  assert.equal(openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate({ version: "forged/v1" }) }), null);
  assert.equal(openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate({ taskNumber: -1 }) }), null);
  // Task 238: Core always sends the answered rows. A candidate without them is
  // not one Core minted, and putting it on screen would show the owner a card
  // whose promises Cairn cannot vouch for.
  assert.equal(openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate({ answers: undefined }) }), null);
  assert.equal(openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate({ answers: "c1" }) }), null);
  assert.equal(openUnsealedCandidateCheckpoint({ dir: DIR, candidate: null }), null);
  assert.equal(openUnsealedCandidateCheckpoint(null), null);
  assert.equal(pendingUnsealedCandidateCount(), 0);
});

test("two projects can each hold their own pause", () => {
  const first = openUnsealedCandidateCheckpoint({ dir: DIR, candidate: candidate() });
  const second = openUnsealedCandidateCheckpoint({ dir: OTHER, candidate: candidate() });
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.projection.checkpointId, second.projection.checkpointId);
  assert.equal(pendingUnsealedCandidateCount(), 2);
});
