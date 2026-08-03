import test from "node:test";
import assert from "node:assert/strict";
import type { ConductorStreamSnapshot, RunSessionSnapshot } from "../src/shared/ipc.js";
import {
  advanceTownCue,
  hydrateTownPresentation,
  observeTownPresentation,
  settleTownPresentation,
  townPresentationStatus,
} from "../src/renderer/town/presentation.js";

function session(overrides: Partial<RunSessionSnapshot> = {}): RunSessionSnapshot {
  return {
    dir: "C:\\project",
    outcome: "Make the pond explain the work",
    adapterId: "codex-exec",
    conversationId: "conversation-1",
    worker: true,
    startedAt: "2026-08-02T12:00:00.000Z",
    activities: [],
    phase: "running",
    result: null,
    error: null,
    ...overrides,
  };
}

function stream(): ConductorStreamSnapshot {
  return {
    dir: "C:\\project",
    conversationId: "conversation-1",
    kind: "reply",
    startedAt: "2026-08-02T11:59:00.000Z",
    text: "I am checking the shape of that request.",
  };
}

const routeDone = { stage: "Route", state: "done", detail: "Codex Exec is ready." } as const;
const runWorking = { stage: "Run", state: "working", detail: "Codex Exec is working." } as const;
const runDone = { stage: "Run", state: "done", detail: "Codex Exec returned evidence." } as const;
const checkWorking = { stage: "Check", state: "working", detail: "Cairn is checking the result." } as const;
const checkWorkingEvidence = { stage: "Check", state: "working", detail: "Three files were reported." } as const;
const checkDone = { stage: "Check", state: "done", detail: "Cairn verified the result." } as const;
const checkStopped = { stage: "Check", state: "stopped", detail: "Cairn could not verify the result." } as const;
const resultDone = { stage: "Result", state: "done", detail: "DONE — verified." } as const;
const runStopped = { stage: "Run", state: "stopped", detail: "The worker stopped safely." } as const;
const resultStopped = { stage: "Result", state: "stopped", detail: "STOPPED — ADAPTER_FAILED" } as const;

test("hydration restores stable truth without replaying historical motion", () => {
  const quiet = hydrateTownPresentation(null, null);
  assert.equal(quiet.truth, "quiet");
  assert.equal(quiet.activeCue, null);

  const thinking = hydrateTownPresentation(null, stream());
  assert.equal(thinking.truth, "thinking");
  assert.equal(thinking.activeCue, null);

  const working = hydrateTownPresentation(session({ activities: [routeDone, runWorking] }), null);
  assert.equal(working.truth, "working");
  assert.equal(working.nextActivityIndex, 2);
  assert.equal(working.activeCue, null);
  assert.equal(working.settledOutcome, null);

  const closed = hydrateTownPresentation(session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  }), null);
  assert.equal(closed.truth, "done");
  assert.equal(closed.activeCue, null);
  assert.equal(closed.settledOutcome, "done");
});

test("only the first real Run/working activity launches a dispatch cue", () => {
  const initial = hydrateTownPresentation(null, null);
  const tooEarly = observeTownPresentation(initial, session(), null, true);
  assert.equal(tooEarly.truth, "starting");
  assert.equal(tooEarly.activeCue, null);

  const routed = observeTownPresentation(tooEarly, session({ activities: [routeDone] }), null, true);
  assert.equal(routed.truth, "starting");
  assert.equal(routed.activeCue, null, "Route acceptance is not yet a worker handoff");

  const dispatched = observeTownPresentation(routed, session({ activities: [routeDone, runWorking] }), null, true);
  assert.equal(dispatched.truth, "working");
  assert.equal(dispatched.activeCue?.kind, "dispatch");
  assert.equal(dispatched.activeCue?.phase, "flight");
  assert.equal(dispatched.activeCue?.workerId, "worker:codex-exec");
  assert.match(dispatched.activeCue?.key ?? "", /:1:dispatch$/);

  const repeatedRun = { ...runWorking, detail: "A repeated progress event." };
  const repeated = observeTownPresentation(dispatched, session({ activities: [routeDone, runWorking, repeatedRun] }), null, true);
  assert.equal(repeated.activeCue?.key, dispatched.activeCue?.key);
  assert.deepEqual(repeated.queuedCues, []);

  let settled = advanceTownCue(repeated, repeated.activeCue!.key);
  settled = advanceTownCue(settled, settled.activeCue!.key);
  assert.equal(settled.activeCue, null);
  const samePoll = observeTownPresentation(settled, session({ activities: [routeDone, runWorking, repeatedRun] }), null, true);
  assert.equal(samePoll.activeCue, null, "the same accepted snapshot cannot replay after its cue settles");
  assert.deepEqual(samePoll.queuedCues, []);

  const offline = observeTownPresentation(initial, session({ worker: false, activities: [routeDone, runWorking] }), null, true);
  assert.equal(offline.activeCue, null);
  assert.equal(offline.settledOutcome, null);
});

test("a collapsed snapshot omits an obsolete dispatch but keeps return then DONE", () => {
  const activities = [routeDone, runWorking, runDone, checkWorking, checkWorkingEvidence, checkDone, resultDone];
  let state = observeTownPresentation(hydrateTownPresentation(null, null), session({
    activities,
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  }), null, true);

  assert.equal(state.truth, "done", "runtime truth is immediate");
  assert.equal(state.settledOutcome, null, "semantic water waits for the return");
  assert.equal(state.activeCue?.kind, "return");
  assert.deepEqual(state.queuedCues.map((cue) => cue.kind), ["done"]);
  assert.match(townPresentationStatus(state), /^DONE/, "terminal truth owns the status during return motion");

  state = advanceTownCue(state, state.activeCue!.key);
  assert.equal(state.activeCue?.phase, "landing");
  state = advanceTownCue(state, state.activeCue!.key);
  assert.equal(state.activeCue?.kind, "done");
  assert.equal(state.settledOutcome, "done");
  state = advanceTownCue(state, state.activeCue!.key);
  assert.equal(state.activeCue, null);
  assert.equal(state.settledOutcome, "done");
});

test("checking is immediate, repeated Check activities do not enqueue another return", () => {
  const running = hydrateTownPresentation(session({ activities: [routeDone, runWorking] }), null);
  const checking = observeTownPresentation(running, session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkWorkingEvidence],
  }), null, true);
  assert.equal(checking.truth, "checking");
  assert.equal(checking.activeCue?.kind, "return");
  assert.equal(checking.queuedCues.length, 0);
  assert.match(townPresentationStatus(checking), /^Result .* Cairn\.$/);
});

test("terminal truth stays authoritative while return motion is still queued", () => {
  const working = hydrateTownPresentation(session({ activities: [routeDone, runWorking] }), null);
  const done = observeTownPresentation(working, session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  }), null, true);
  assert.equal(done.truth, "done");
  assert.equal(done.activeCue?.kind, "return");
  assert.deepEqual(done.queuedCues.map((cue) => cue.kind), ["done"]);
  assert.match(townPresentationStatus(done), /^DONE/);

  const stopped = observeTownPresentation(working, session({
    activities: [routeDone, runWorking, runDone, resultStopped],
    phase: "closed",
    result: { status: "stopped", disposition: "STOPPED", reason: "ADAPTER_FAILED" } as RunSessionSnapshot["result"],
  }), null, true);
  assert.equal(stopped.truth, "stopped");
  assert.equal(stopped.activeCue?.kind, "return");
  assert.deepEqual(stopped.queuedCues.map((cue) => cue.kind), ["stopped"]);
  assert.match(townPresentationStatus(stopped), /^STOPPED/);
});

test("intermediate Run and Check stops become truthful STOPPED states immediately", () => {
  const working = hydrateTownPresentation(session({ activities: [routeDone, runWorking] }), null);
  const runStop = observeTownPresentation(working, session({
    activities: [routeDone, runWorking, runStopped],
  }), null, true);
  assert.equal(runStop.truth, "stopped");
  assert.equal(runStop.activeCue?.kind, "stopped");
  assert.equal(runStop.settledOutcome, "stopped");
  assert.ok(![runStop.activeCue, ...runStop.queuedCues].some((cue) => cue?.kind === "return"));
  assert.match(townPresentationStatus(runStop), /^STOPPED/);

  const checking = hydrateTownPresentation(session({
    activities: [routeDone, runWorking, runDone, checkWorking],
  }), null);
  const checkStop = observeTownPresentation(checking, session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkStopped],
  }), null, true);
  assert.equal(checkStop.truth, "stopped");
  assert.equal(checkStop.activeCue?.kind, "stopped");
  assert.equal(checkStop.settledOutcome, "stopped");
  assert.ok(![checkStop.activeCue, ...checkStop.queuedCues].some((cue) => cue?.kind === "return"));
  assert.match(townPresentationStatus(checkStop), /^STOPPED/);
});

test("an exceptional close is needs-inspection ERROR, never synthetic STOPPED or DONE", () => {
  const working = hydrateTownPresentation(session({ activities: [routeDone, runWorking] }), null);
  const failed = observeTownPresentation(working, session({
    activities: [routeDone, runWorking],
    phase: "closed",
    result: null,
    error: "Git could not be read",
  }), null, true);
  assert.equal(failed.truth, "error");
  assert.equal(failed.activeCue?.kind, "error");
  assert.equal(failed.settledOutcome, "error");
  assert.match(townPresentationStatus(failed), /needs inspection/i);
});

test("a failure after STOPPED escalates to ERROR with and without motion", () => {
  const stoppedSnapshot = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkStopped],
  });
  const errorSnapshot = session({
    activities: stoppedSnapshot.activities,
    phase: "closed",
    error: "The STOPPED report could not be written",
  });

  const animatedStop = observeTownPresentation(
    hydrateTownPresentation(session({ activities: [routeDone, runWorking] }), null),
    stoppedSnapshot,
    null,
    true,
  );
  assert.equal(animatedStop.truth, "stopped");
  const animatedError = observeTownPresentation(animatedStop, errorSnapshot, null, true);
  assert.equal(animatedError.truth, "error");
  assert.ok([animatedError.activeCue, ...animatedError.queuedCues].some((cue) => cue?.kind === "error"));
  assert.match(townPresentationStatus(animatedError), /needs inspection/i);

  const reducedStop = hydrateTownPresentation(stoppedSnapshot, null);
  const reducedError = observeTownPresentation(reducedStop, errorSnapshot, null, false);
  assert.equal(reducedError.truth, "error");
  assert.equal(reducedError.settledOutcome, "error");
  assert.equal(reducedError.activeCue, null);
});

test("reduced motion consumes the same evidence directly into the stable semantic state", () => {
  const snapshot = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  });
  const reduced = observeTownPresentation(hydrateTownPresentation(null, null), snapshot, null, false);
  assert.equal(reduced.truth, "done");
  assert.equal(reduced.activeCue, null);
  assert.deepEqual(reduced.queuedCues, []);
  assert.equal(reduced.settledOutcome, "done");

  let animated = observeTownPresentation(hydrateTownPresentation(null, null), snapshot, null, true);
  animated = settleTownPresentation(animated);
  assert.equal(animated.truth, reduced.truth);
  assert.equal(animated.settledOutcome, reduced.settledOutcome);
  assert.equal(animated.activeCue, null);
});

test("reduced motion cannot hydrate a stale prefix over retained terminal evidence", () => {
  const terminalSnapshot = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  });
  const replyingOverDone = observeTownPresentation(
    hydrateTownPresentation(terminalSnapshot, null),
    terminalSnapshot,
    stream(),
    false,
  );
  assert.equal(replyingOverDone.truth, "thinking");
  assert.equal(replyingOverDone.settledOutcome, "done");

  const stale = observeTownPresentation(
    replyingOverDone,
    session({ activities: [routeDone, runWorking] }),
    null,
    false,
  );
  assert.equal(stale, replyingOverDone, "the stale running prefix is rejected before no-motion hydration");
  assert.equal(stale.settledOutcome, "done");
});

test("live Cairn commentary speaks over a retained terminal outcome", () => {
  const terminalSnapshot = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  });
  const retained = hydrateTownPresentation(terminalSnapshot, null);
  const commentary = observeTownPresentation(retained, terminalSnapshot, stream(), true);
  assert.equal(commentary.truth, "thinking");
  assert.equal(commentary.settledOutcome, "done");
  assert.equal(commentary.activeCue, null);
  assert.equal(townPresentationStatus(commentary), "Cairn is replying.");
});

test("a stale shorter snapshot cannot regress a terminal run, and a new run resets old motion", () => {
  const terminalSnapshot = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  });
  const terminal = observeTownPresentation(
    hydrateTownPresentation(session({ activities: [routeDone, runWorking] }), null),
    terminalSnapshot,
    null,
    true,
  );
  assert.equal(terminal.activeCue?.kind, "return");
  assert.deepEqual(terminal.queuedCues.map((cue) => cue.kind), ["done"]);

  const stale = observeTownPresentation(terminal, session({ activities: [routeDone, runWorking] }), null, true);
  assert.equal(stale.truth, "done");
  assert.equal(stale.nextActivityIndex, 6);

  const nextRun = observeTownPresentation(stale, session({
    startedAt: "2026-08-02T12:05:00.000Z",
    activities: [routeDone, runWorking],
  }), null, true);
  assert.equal(nextRun.truth, "working");
  assert.equal(nextRun.activeCue?.kind, "dispatch");
  assert.deepEqual(nextRun.queuedCues, []);
  assert.notEqual(nextRun.runKey, stale.runKey);
  assert.equal(nextRun.settledOutcome, null);
});

test("still water: a quiet pond makes no ripple, however often it is polled", () => {
  let state = hydrateTownPresentation(null, null);
  for (let poll = 0; poll < 12; poll += 1) {
    state = observeTownPresentation(state, null, null, true);
    assert.equal(state.activeCue, null, `poll ${poll} made a ripple out of nothing`);
    assert.deepEqual(state.queuedCues, [], `poll ${poll} queued a ripple out of nothing`);
  }
});

test("still water: a spent ripple is never replayed by a later poll", () => {
  const closed = session({
    activities: [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  });
  // One observation of a finished run earns two landings: the result returning
  // to Cairn, then DONE. The obsolete dispatch is dropped — a handoff that is
  // already over is not news. (`a collapsed snapshot omits an obsolete dispatch
  // but keeps return then DONE`, above, pins that ordering.)
  let state = observeTownPresentation(hydrateTownPresentation(null, null), closed, null, true);
  assert.equal(state.activeCue?.kind, "return");

  // Drain every earned ripple, then the water must be still.
  const spent: string[] = [];
  for (let step = 0; state.activeCue && step < 10; step += 1) {
    const key = state.activeCue.key;
    if (!spent.includes(key)) spent.push(key);
    state = advanceTownCue(state, key);
  }
  assert.equal(state.activeCue, null, "the water never went still");
  assert.deepEqual(spent.map((key) => key.split(":").at(-1)), ["return", "done"]);

  // Every later poll of the same snapshot leaves it still.
  for (let poll = 0; poll < 12; poll += 1) {
    state = observeTownPresentation(state, closed, null, true);
    assert.equal(state.activeCue, null, `poll ${poll} replayed a spent ripple`);
    assert.deepEqual(state.queuedCues, [], `poll ${poll} queued a spent ripple`);
  }
  assert.equal(state.settledOutcome, "done");
});
