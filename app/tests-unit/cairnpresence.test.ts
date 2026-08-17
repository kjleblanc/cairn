import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ConductorStreamSnapshot, RunSessionSnapshot } from "../src/shared/ipc.js";
import {
  CAIRN_PRESENCE_STATES,
  resolveCairnPresence,
  type CairnPresenceInput,
  type CairnPresenceState,
} from "../src/renderer/activity/presence.js";
import {
  hydrateActivityPresentation,
  type ActivityPresentation,
  type ActivityTruth,
} from "../src/renderer/activity/presentation.js";
import { CAIRN_PROGRAM_STATES } from "../src/renderer/components/CairnProgram.js";

/* ------------------------------------------------------------------------ *
 * Task 259, `c2`, `c3` and `c4` — one resolved value behind the line and the
 * face.
 *
 * Two independent answers to "is something waiting?" would eventually
 * disagree, and the line would be the one that lied. That is not a
 * hypothetical: it is exactly why Task 155's `needsYou` was computed once in
 * Chat and PASSED to the pond's line rather than recomputed there. The pond is
 * retired; the reason is not. So this module resolves ONE state, and the
 * written status, the secondary detail, the ground tone and Cairn's expression
 * are all read off it.
 *
 * These tests therefore do two different jobs. Most of them pin the resolution
 * table. The ones under "one value, not two" try to prove the stronger thing:
 * that no input can move the face without moving the words.
 * ------------------------------------------------------------------------ */

function session(overrides: Partial<RunSessionSnapshot> = {}): RunSessionSnapshot {
  return {
    dir: "C:\\project",
    outcome: "Make Cairn say what is happening",
    adapterId: "codex-exec",
    conversationId: "conversation-1",
    worker: true,
    startedAt: "2026-08-16T12:00:00.000Z",
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
    startedAt: "2026-08-16T11:59:00.000Z",
    text: "I am checking the shape of that request.",
  };
}

const routeDone = { stage: "Route", state: "done", detail: "Codex Exec is ready." } as const;
const runWorking = { stage: "Run", state: "working", detail: "Codex Exec is working." } as const;
const runDone = { stage: "Run", state: "done", detail: "Codex Exec returned evidence." } as const;
const runStopped = { stage: "Run", state: "stopped", detail: "The worker stopped safely." } as const;
const checkWorking = { stage: "Check", state: "working", detail: "Cairn is checking the result." } as const;
const resultDone = { stage: "Result", state: "done", detail: "DONE — verified." } as const;
const doneResult = { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"];

/** One activity projection per truth the runtime can hold. */
const ACTIVITY: Record<ActivityTruth, ActivityPresentation> = {
  quiet: hydrateActivityPresentation(null, null),
  thinking: hydrateActivityPresentation(null, stream()),
  starting: hydrateActivityPresentation(session({ activities: [routeDone] }), null),
  working: hydrateActivityPresentation(session({ activities: [routeDone, runWorking] }), null),
  checking: hydrateActivityPresentation(
    session({ activities: [routeDone, runWorking, runDone, checkWorking] }), null),
  done: hydrateActivityPresentation(session({
    activities: [routeDone, runWorking, runDone, checkWorking, resultDone],
    phase: "closed",
    result: doneResult,
  }), null),
  stopped: hydrateActivityPresentation(
    session({ activities: [routeDone, runWorking, runStopped], phase: "closed" }), null),
  error: hydrateActivityPresentation(
    session({ activities: [routeDone, runWorking], phase: "closed", error: "Git could not be read" }), null),
};

const TRUTHS = Object.keys(ACTIVITY) as ActivityTruth[];

function at(truth: ActivityTruth, overrides: Partial<CairnPresenceInput> = {}): CairnPresenceInput {
  return { activity: ACTIVITY[truth], needsOwner: false, connected: true, ...overrides };
}

test("the fixtures really do hold every truth, or every table below is vacuous", () => {
  for (const truth of TRUTHS) {
    assert.equal(ACTIVITY[truth].truth, truth,
      `the '${truth}' fixture does not actually project '${truth}'`);
  }
  assert.equal(TRUTHS.length, 8);
});

/* ------------------------------------------------------------ the table --- */

test("c3: every runtime truth resolves to its own presence state", () => {
  const expected: Record<ActivityTruth, CairnPresenceState> = {
    quiet: "ready",
    thinking: "thinking",
    starting: "starting",
    working: "working",
    checking: "checking",
    done: "done",
    stopped: "stopped",
    error: "error",
  };
  for (const truth of TRUTHS) {
    assert.equal(resolveCairnPresence(at(truth)).state, expected[truth],
      `truth '${truth}' resolved to the wrong presence state`);
  }
});

test("c3: a waiting decision outranks everything else, exactly as the pond's line did", () => {
  // Amber is the one state the owner has to act on; nothing may bury it. This
  // is the approved Task 155 / Decision 9 rule, carried over unchanged — the
  // surface changed, the rule did not.
  for (const truth of TRUTHS) {
    const presence = resolveCairnPresence(at(truth, { needsOwner: true }));
    assert.equal(presence.state, "needs-decision",
      `a decision waiting was buried by truth '${truth}'`);
    assert.notEqual(presence.status, resolveCairnPresence(at(truth)).status,
      `the words did not change when a decision started waiting during '${truth}'`);
  }
});

test("c3: a decision still outranks a waiting decision while disconnected", () => {
  const presence = resolveCairnPresence(at("quiet", { needsOwner: true, connected: false }));
  assert.equal(presence.state, "needs-decision");
});

test("c3: disconnected shows only where no real run state is true", () => {
  // The header carries the connection permanently, so the capsule leads with it
  // only when there is nothing else to say. A reattached run and a saved result
  // are true whether or not the conductor is connected.
  assert.equal(resolveCairnPresence(at("quiet", { connected: false })).state, "disconnected");
  for (const truth of TRUTHS) {
    if (truth === "quiet") continue;
    assert.equal(resolveCairnPresence(at(truth, { connected: false })).state,
      resolveCairnPresence(at(truth)).state,
      `losing the connection rewrote what the run itself was doing during '${truth}'`);
  }
});

test("c3: a live stream and a retained terminal outcome are already one truth", () => {
  // The runtime projection settles that collision itself: a live Cairn turn
  // owns his face while it streams, and the outcome stays retained underneath.
  // Resolving it a second time here would be the second answer this module
  // exists to prevent.
  const closedThenSpeaking = hydrateActivityPresentation(session({
    activities: [routeDone, runWorking, runDone, checkWorking, resultDone],
    phase: "closed",
    result: doneResult,
  }), stream());
  assert.equal(closedThenSpeaking.truth, "thinking");
  assert.equal(closedThenSpeaking.settledOutcome, "done");
  const presence = resolveCairnPresence({ activity: closedThenSpeaking, needsOwner: false, connected: true });
  assert.equal(presence.state, "thinking");
});

test("c4: a project switch resets the presence to a quiet desk", () => {
  // Workspace hydrates from (null, null) the moment the active project changes.
  // Whatever the old project was doing, the new one opens ready.
  const afterSwitch = hydrateActivityPresentation(null, null);
  assert.equal(resolveCairnPresence({ activity: afterSwitch, needsOwner: false, connected: true }).state, "ready");
  assert.equal(resolveCairnPresence({ activity: afterSwitch, needsOwner: false, connected: false }).state, "disconnected");
});

test("c4: a stale project's run cannot be resolved into anything but its own words", () => {
  // The guard against a stale poll painting the current project lives in
  // Workspace, and Slice 2's tests cover it. What belongs HERE is the weaker
  // but still necessary property: this function reads nothing but its argument,
  // so it can never reach for a project, a clock or a previous call.
  const first = resolveCairnPresence(at("working"));
  const between = resolveCairnPresence(at("stopped", { needsOwner: true, connected: false }));
  const again = resolveCairnPresence(at("working"));
  assert.deepEqual(again, first, "an intervening call changed a later result");
  assert.equal(between.state, "needs-decision");
});

/* ------------------------------------------------- one value, not two ----- */

test("c2: the status, the detail, the tone and the expression all follow the state", () => {
  // The real property: two inputs that resolve to the same state must produce
  // the SAME words and the SAME face. A future refactor that computed the words
  // from the raw inputs instead would break here rather than in production.
  const byState = new Map<CairnPresenceState, { status: string; tone: string; expression: string }>();
  const inputs: CairnPresenceInput[] = [];
  for (const truth of TRUTHS) {
    for (const needsOwner of [false, true]) {
      for (const connected of [false, true]) inputs.push(at(truth, { needsOwner, connected }));
    }
  }
  assert.equal(inputs.length, 32);
  for (const input of inputs) {
    const presence = resolveCairnPresence(input);
    const seen = byState.get(presence.state);
    const shape = { status: presence.status, tone: presence.tone, expression: presence.expression };
    if (seen === undefined) byState.set(presence.state, shape);
    else {
      assert.deepEqual(shape, seen,
        `state '${presence.state}' produced two different answers about itself`);
    }
  }
  // The detail is the one field allowed to vary within a state, because it
  // carries a worker's NAME rather than a second opinion about the state.
  assert.ok(byState.size >= 6, "the sweep collapsed to almost nothing and proves little");
});

test("c2: no two presence states say the same thing", () => {
  const words = new Map<string, CairnPresenceState>();
  for (const state of CAIRN_PRESENCE_STATES) {
    const presence = presenceFor(state);
    assert.ok(presence.status.trim().length > 0, `'${state}' has no words at all`);
    const clash = words.get(presence.status);
    assert.equal(clash, undefined, `'${state}' and '${clash}' both say "${presence.status}"`);
    words.set(presence.status, state);
  }
  assert.equal(words.size, CAIRN_PRESENCE_STATES.length);
});

test("c2: every presence state draws a real Cairn, and the two lists agree", () => {
  for (const state of CAIRN_PRESENCE_STATES) {
    const expression = presenceFor(state).expression;
    assert.ok(CAIRN_PROGRAM_STATES.includes(expression),
      `'${state}' asks for an expression '${expression}' the component cannot draw`);
  }
  // `starting` is the one presence state with no expression of its own: the
  // constitution's table makes "Starting / working" a single row, so the two
  // share a face and are separated by their words. Every OTHER program state
  // must be reachable, or a face nobody can ever see is dead art.
  const reachable = new Set(CAIRN_PRESENCE_STATES.map((state) => presenceFor(state).expression));
  assert.deepEqual([...reachable].sort(), [...CAIRN_PROGRAM_STATES].sort(),
    "a drawn expression is unreachable, or an unreachable one is asked for");
  assert.equal(presenceFor("starting").expression, presenceFor("working").expression);
  assert.notEqual(presenceFor("starting").status, presenceFor("working").status);
});

test("c3: the words carry the state, so compact dropping the detail loses no truth", () => {
  // Compact is the same components with less room, not a second design: it
  // drops the project name and the activity DETAIL. The activity state itself
  // never drops — which is only safe if the detail never held it alone.
  for (const state of CAIRN_PRESENCE_STATES) {
    const presence = presenceFor(state);
    if (presence.detail === null) continue;
    assert.notEqual(presence.detail, presence.status, `'${state}' says the same thing twice`);
    assert.ok(presence.status.trim().length > 0);
  }
  // The three dispositions keep their literal words, where the product's own
  // meaning lives. State is never colour-, face-, position- or motion-only.
  assert.match(presenceFor("done").status, /\bDONE\b/);
  assert.match(presenceFor("stopped").status, /\bSTOPPED\b/);
  assert.match(presenceFor("error").status, /\bERROR\b/);
});

test("c3: a real worker is named where one is working, and never invented", () => {
  const named = resolveCairnPresence(at("working"));
  assert.equal(named.state, "working");
  assert.match(String(named.detail), /Codex Exec worker/);

  const offline = hydrateActivityPresentation(
    session({ worker: false, adapterId: null, activities: [routeDone, runWorking] }), null);
  assert.equal(offline.truth, "working");
  assert.equal(offline.workerName, null);
  const anonymous = resolveCairnPresence({ activity: offline, needsOwner: false, connected: true });
  assert.equal(anonymous.state, "working");
  assert.doesNotMatch(String(anonymous.detail), /worker/i,
    "a worker was named where the runtime says there is none");
});

test("c2: tone never carries a state the words do not", () => {
  const tones = new Map<CairnPresenceState, string>();
  for (const state of CAIRN_PRESENCE_STATES) tones.set(state, presenceFor(state).tone);
  // Tone is a ground, and grounds are allowed to be shared — STOPPED and ERROR
  // sit on the same restrained coral. What is not allowed is a tone that is the
  // ONLY thing separating two states, which the distinct-words test above rules
  // out for every pair.
  assert.equal(tones.get("stopped"), tones.get("error"));
  assert.notEqual(tones.get("needs-decision"), tones.get("ready"));
  assert.notEqual(tones.get("done"), tones.get("ready"));
});

/* --------------------------------------------------------- the module ---- */

const SOURCE = readFileSync(
  join(__dirname, "..", "..", "src", "renderer", "activity", "presence.ts"), "utf8");

test("c2: the combiner is pure — no clock, no window, no component, no scenery", () => {
  for (const reach of [
    "Date", "window", "document", "localStorage", "Math.random",
    "useState", "useEffect", "className", "town", "pond", "villager",
  ]) {
    assert.ok(!SOURCE.includes(reach),
      `the presence combiner reaches for '${reach}', which is not an argument it was given`);
  }
  const imports = [...SOURCE.matchAll(/^import .*? from "(.*?)";$/gm)].map((match) => match[1]);
  assert.deepEqual(imports.sort(),
    ["../components/CairnProgram.js", "./presentation.js"].sort(),
    "the combiner took a dependency beyond the truth it projects and the faces it can ask for");
});

test("c2: resolving twice from one input returns the same answer and mutates nothing", () => {
  const input = at("working", { needsOwner: false, connected: true });
  const before = JSON.stringify(input.activity);
  const first = resolveCairnPresence(input);
  const second = resolveCairnPresence(input);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(input.activity), before, "the combiner mutated the truth it was handed");
});

/* --------------------------------------------------------------- helper -- */

/**
 * The cheapest input that reaches a given state, so the tables above can be
 * written per STATE rather than per input. `needs-decision` and `disconnected`
 * are the two that no runtime truth alone can produce.
 */
function presenceFor(state: CairnPresenceState) {
  if (state === "needs-decision") return resolveCairnPresence(at("quiet", { needsOwner: true }));
  if (state === "disconnected") return resolveCairnPresence(at("quiet", { connected: false }));
  const truth = state === "ready" ? "quiet" : state;
  return resolveCairnPresence(at(truth as ActivityTruth));
}
