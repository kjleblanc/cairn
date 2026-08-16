import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ConductorStreamSnapshot, RunSessionSnapshot } from "../src/shared/ipc.js";
/* ------------------------------------------------------------------------ *
 * Task 257, Slice 2. THE IMPORT BLOCK IS THE ONLY THING THAT MOVED.
 *
 * This suite was written against `renderer/town/presentation.ts` and run green
 * against it BEFORE `renderer/activity/presentation.ts` existed. A
 * characterization test that was never executed against the code it claims to
 * characterize proves nothing at all, so the local aliases below exist for one
 * reason: to let the module under test be swapped by editing these lines and
 * nothing else. Every assertion in this file is byte-identical across that
 * swap, which is what makes the transcript golden below a real before/after
 * comparison rather than a fresh opinion about the new code.
 * ------------------------------------------------------------------------ */
import {
  activityRunKey as runKeyOf,
  activityStatus as status,
  advanceActivityCue as advance,
  hydrateActivityPresentation as hydrate,
  observeActivityPresentation as observe,
  settleActivityPresentation as settle,
  type ActivityPresentation as Presentation,
} from "../src/renderer/activity/presentation.js";

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
const runWorkingAgain = { stage: "Run", state: "working", detail: "A repeated progress event." } as const;
const runDone = { stage: "Run", state: "done", detail: "Codex Exec returned evidence." } as const;
const runStopped = { stage: "Run", state: "stopped", detail: "The worker stopped safely." } as const;
const checkWorking = { stage: "Check", state: "working", detail: "Cairn is checking the result." } as const;
const checkMore = { stage: "Check", state: "working", detail: "Three files were reported." } as const;
const checkDone = { stage: "Check", state: "done", detail: "Cairn verified the result." } as const;
const checkStopped = { stage: "Check", state: "stopped", detail: "Cairn could not verify the result." } as const;
const resultDone = { stage: "Result", state: "done", detail: "DONE — verified." } as const;
const resultStopped = { stage: "Result", state: "stopped", detail: "STOPPED — ADAPTER_FAILED" } as const;

const doneResult = { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"];
const stoppedResult = { status: "stopped", disposition: "STOPPED", reason: "ADAPTER_FAILED" } as RunSessionSnapshot["result"];

const running = (...activities: RunSessionSnapshot["activities"]) => session({ activities });
const closedDone = (...activities: RunSessionSnapshot["activities"]) =>
  session({ activities, phase: "closed", result: doneResult });

const FULL_DONE = [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone];

/* ------------------------------------------------------------------------ *
 * The transcript golden (`c2`).
 *
 * A fixed matrix of snapshot sequences is driven through the reducer and every
 * observable field is recorded at every step. The golden was generated from
 * the OLD module and is asserted against the NEW one, so any behavioural drift
 * shows up as a line diff rather than as a judgment call about whether two
 * implementations "look equivalent".
 *
 * `same=yes` records that the reducer returned the PREVIOUS OBJECT BY
 * IDENTITY. That is not a detail: `Workspace.refreshActiveRuntime` compares
 * `next === current` and drops the whole task/stream/presentation triple when
 * they match, so a rewrite that returned an equal-but-new object on a rejected
 * stale snapshot would let stale data repopulate a worker while the pond
 * correctly stayed terminal.
 * ------------------------------------------------------------------------ */

type Step =
  | { do: "hydrate"; task?: RunSessionSnapshot | null; stream?: ConductorStreamSnapshot | null }
  | { do: "observe"; task?: RunSessionSnapshot | null; stream?: ConductorStreamSnapshot | null; animate: boolean }
  | { do: "advance"; key?: string }
  | { do: "settle" };

type Scenario = { name: string; steps: Step[] };

function keyTail(runKey: string | null, key: string): string {
  return runKey && key.startsWith(runKey) ? key.slice(runKey.length) : key;
}

function line(index: number, step: Step, state: Presentation, same: boolean): string {
  const action = step.do === "observe"
    ? `observe(animate=${step.animate ? "on" : "off"},task=${step.task ? "yes" : "none"},stream=${step.stream ? "yes" : "none"})`
    : step.do === "hydrate"
      ? `hydrate(task=${step.task ? "yes" : "none"},stream=${step.stream ? "yes" : "none"})`
      : step.do === "advance"
        ? `advance(${step.key === undefined ? "active" : `"${step.key}"`})`
        : "settle()";
  const active = state.activeCue
    ? `${state.activeCue.kind}/${state.activeCue.phase}${keyTail(state.runKey, state.activeCue.key)}`
    : "none";
  const queued = state.queuedCues.length === 0
    ? "[]"
    : `[${state.queuedCues.map((cue) => `${cue.kind}/${cue.phase}${keyTail(state.runKey, cue.key)}`).join(" ")}]`;
  return [
    `  ${String(index).padStart(2, "0")} ${action}`,
    `truth=${state.truth}`,
    `settled=${state.settledOutcome ?? "none"}`,
    `idx=${state.nextActivityIndex}`,
    `run=${state.runKey === null ? "none" : "set"}`,
    `active=${active}`,
    `queued=${queued}`,
    `workerId=${state.workerId ?? "none"}`,
    `worker=${state.workerName ?? "none"}`,
    `adapter=${state.adapterId ?? "none"}`,
    `task=${state.outcome === null ? "none" : `"${state.outcome}"`}`,
    `same=${same ? "yes" : "no"}`,
    `status="${status(state)}"`,
  ].join(" ");
}

function drive(scenario: Scenario): string[] {
  const lines = [`${scenario.name}:`];
  let state = hydrate(null, null);
  scenario.steps.forEach((step, index) => {
    const previous = state;
    if (step.do === "hydrate") state = hydrate(step.task ?? null, step.stream ?? null);
    else if (step.do === "observe") state = observe(previous, step.task ?? null, step.stream ?? null, step.animate);
    else if (step.do === "advance") state = advance(previous, step.key ?? previous.activeCue?.key ?? "no-active-cue");
    else state = settle(previous);
    lines.push(line(index + 1, step, state, state === previous));
  });
  return lines;
}

const SCENARIOS: Scenario[] = [
  {
    name: "still water — polling nothing makes nothing",
    steps: [
      { do: "observe", animate: true },
      { do: "observe", animate: true },
      { do: "observe", animate: true },
    ],
  },
  {
    name: "a live Cairn turn with no run at all",
    steps: [
      { do: "hydrate", stream: stream() },
      { do: "observe", stream: stream(), animate: true },
    ],
  },
  {
    name: "dispatch flies, lands, and is never replayed",
    steps: [
      { do: "observe", task: running(), animate: true },
      { do: "observe", task: running(routeDone), animate: true },
      { do: "observe", task: running(routeDone, runWorking), animate: true },
      { do: "observe", task: running(routeDone, runWorking, runWorkingAgain), animate: true },
      { do: "advance" },
      { do: "advance" },
      { do: "observe", task: running(routeDone, runWorking, runWorkingAgain), animate: true },
      { do: "observe", task: running(routeDone, runWorking, runWorkingAgain), animate: true },
    ],
  },
  {
    name: "a stale timer key is inert",
    steps: [
      { do: "observe", task: running(routeDone, runWorking), animate: true },
      { do: "advance", key: "a key from a run that is over" },
      { do: "advance", key: "" },
    ],
  },
  {
    name: "a collapsed first snapshot drops the obsolete dispatch",
    steps: [
      { do: "observe", task: closedDone(...FULL_DONE), animate: true },
      { do: "advance" },
      { do: "advance" },
      { do: "advance" },
      { do: "observe", task: closedDone(...FULL_DONE), animate: true },
    ],
  },
  {
    name: "checking is immediate and repeated Check activities add no second return",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking) },
      { do: "observe", task: running(routeDone, runWorking, runDone, checkWorking), animate: true },
      { do: "observe", task: running(routeDone, runWorking, runDone, checkWorking, checkMore), animate: true },
    ],
  },
  {
    name: "an intermediate Run stop is STOPPED at once, with no return",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking) },
      { do: "observe", task: running(routeDone, runWorking, runStopped), animate: true },
    ],
  },
  {
    name: "an intermediate Check stop is STOPPED at once, with no return",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking, runDone, checkWorking) },
      { do: "observe", task: running(routeDone, runWorking, runDone, checkWorking, checkStopped), animate: true },
    ],
  },
  {
    name: "a closed STOPPED result returns first, then settles stopped",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking) },
      {
        do: "observe",
        task: session({ activities: [routeDone, runWorking, runDone, resultStopped], phase: "closed", result: stoppedResult }),
        animate: true,
      },
      { do: "advance" },
      { do: "advance" },
      { do: "advance" },
    ],
  },
  {
    name: "an exceptional close is ERROR, never a synthetic STOPPED or DONE",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking) },
      {
        do: "observe",
        task: session({ activities: [routeDone, runWorking], phase: "closed", result: null, error: "Git could not be read" }),
        animate: true,
      },
    ],
  },
  {
    name: "STOPPED escalates to ERROR with motion",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking) },
      { do: "observe", task: running(routeDone, runWorking, runDone, checkWorking, checkStopped), animate: true },
      {
        do: "observe",
        task: session({
          activities: [routeDone, runWorking, runDone, checkWorking, checkStopped],
          phase: "closed",
          error: "The STOPPED report could not be written",
        }),
        animate: true,
      },
    ],
  },
  {
    name: "STOPPED escalates to ERROR without motion",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking, runDone, checkWorking, checkStopped) },
      {
        do: "observe",
        task: session({
          activities: [routeDone, runWorking, runDone, checkWorking, checkStopped],
          phase: "closed",
          error: "The STOPPED report could not be written",
        }),
        animate: false,
      },
    ],
  },
  {
    name: "no other terminal change is accepted — DONE cannot become STOPPED",
    steps: [
      { do: "observe", task: closedDone(...FULL_DONE), animate: true },
      {
        do: "observe",
        task: session({
          activities: [routeDone, runWorking, runDone, resultStopped, checkStopped, checkMore],
          phase: "closed",
          result: stoppedResult,
        }),
        animate: true,
      },
    ],
  },
  {
    name: "reduced motion consumes the same evidence straight into the settled state",
    steps: [
      { do: "observe", task: closedDone(...FULL_DONE), animate: false },
      { do: "settle" },
    ],
  },
  {
    name: "an older prefix is rejected by identity, animated",
    steps: [
      { do: "observe", task: closedDone(...FULL_DONE), animate: true },
      { do: "observe", task: running(routeDone, runWorking), animate: true },
      { do: "observe", task: running(routeDone), animate: true },
    ],
  },
  {
    name: "an older prefix is rejected by identity, reduced",
    steps: [
      { do: "hydrate", task: closedDone(...FULL_DONE) },
      { do: "observe", task: closedDone(...FULL_DONE), stream: stream(), animate: false },
      { do: "observe", task: running(routeDone, runWorking), animate: false },
    ],
  },
  {
    name: "a shorter NON-terminal snapshot is rejected by length alone",
    steps: [
      { do: "hydrate", task: running(routeDone, runWorking) },
      { do: "observe", task: running(routeDone, runWorking, runDone, checkWorking), animate: true },
      { do: "observe", task: running(routeDone, runWorking), animate: true },
      { do: "observe", task: running(routeDone, runWorking), animate: false },
      { do: "observe", task: running(routeDone, runWorking, runDone, checkWorking), animate: true },
    ],
  },
  {
    name: "live commentary speaks over a retained terminal outcome",
    steps: [
      { do: "hydrate", task: closedDone(...FULL_DONE) },
      { do: "observe", task: closedDone(...FULL_DONE), stream: stream(), animate: true },
      { do: "observe", task: closedDone(...FULL_DONE), animate: true },
    ],
  },
  {
    name: "a new run resets motion, outcome and identity",
    steps: [
      { do: "observe", task: closedDone(...FULL_DONE), animate: true },
      { do: "settle" },
      {
        do: "observe",
        task: session({ startedAt: "2026-08-02T12:05:00.000Z", activities: [routeDone, runWorking] }),
        animate: true,
      },
    ],
  },
  {
    name: "the offline demonstration never colours the water as verified work",
    steps: [
      { do: "observe", task: session({ worker: false, activities: [routeDone, runWorking] }), animate: true },
      {
        do: "observe",
        task: session({ worker: false, activities: FULL_DONE, phase: "closed", result: doneResult }),
        animate: true,
      },
    ],
  },
  {
    name: "an offline demonstration may still stop honestly",
    steps: [
      {
        do: "observe",
        task: session({ worker: false, activities: [routeDone, runWorking, runStopped] }),
        animate: true,
      },
    ],
  },
  {
    name: "a connection-required close is quiet, or thinking when Cairn speaks",
    steps: [
      {
        do: "hydrate",
        task: session({ activities: [routeDone], phase: "closed", result: { status: "connection-required" } as RunSessionSnapshot["result"] }),
      },
      {
        do: "hydrate",
        task: session({ activities: [routeDone], phase: "closed", result: { status: "connection-required" } as RunSessionSnapshot["result"] }),
        stream: stream(),
      },
    ],
  },
  {
    name: "settle drains every queued cue to the final outcome",
    steps: [
      { do: "observe", task: closedDone(...FULL_DONE), animate: true },
      { do: "settle" },
      { do: "settle" },
    ],
  },
  {
    name: "a task with no adapter carries no worker identity",
    steps: [
      { do: "observe", task: session({ adapterId: null, activities: [routeDone, runWorking] }), animate: true },
    ],
  },
];

function transcript(): string {
  return SCENARIOS.flatMap((scenario) => [...drive(scenario), ""]).join("\n");
}

/** Written on every run so a later reader can regenerate and diff the golden
 *  instead of copying it out of a truncated assertion message. `dist-unit` is
 *  build output and is gitignored. */
function recordTranscript(text: string): void {
  writeFileSync(join(__dirname, "activity-transcript.txt"), text, "utf8");
}

const GOLDEN = readFileSync(join(__dirname, "..", "..", "tests-unit", "activity-transcript.golden.txt"), "utf8");

test("c2: the projection reproduces the recorded transcript exactly", () => {
  const actual = transcript();
  recordTranscript(actual);
  const actualLines = actual.split("\n");
  const goldenLines = GOLDEN.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < Math.max(actualLines.length, goldenLines.length); index += 1) {
    assert.equal(actualLines[index], goldenLines[index],
      `transcript line ${index + 1} drifted from the golden recorded on the old module`);
  }
  assert.equal(actualLines.length, goldenLines.length, "the transcript changed length");
});

/* ------------------------------------------------------------------------ *
 * `c3` — causal transitions. The transcript pins WHAT the reducer produces;
 * these pin WHY, in terms a later reader can act on. Several assert object
 * identity, which no golden line can express on its own.
 * ------------------------------------------------------------------------ */

test("c3: the run key is composed from every field that makes a run distinct", () => {
  const base = session();
  assert.equal(runKeyOf(null), null);
  const key = runKeyOf(base)!;
  assert.equal(key, ["C:\\project", "2026-08-02T12:00:00.000Z", "codex-exec", "conversation-1",
    "Make the pond explain the work"].join("\u001f"));
  // Each field alone re-keys the run. A key that ignored one of these would
  // let a different run inherit the previous run's spent cues.
  for (const overrides of [
    { dir: "C:\\other" },
    { startedAt: "2026-08-02T12:05:00.000Z" },
    { adapterId: null },
    { conversationId: null },
    { outcome: "Something else entirely" },
  ] as Partial<RunSessionSnapshot>[]) {
    assert.notEqual(runKeyOf(session(overrides)), key, `${Object.keys(overrides)[0]} did not re-key the run`);
  }
});

test("c3: a rejected stale snapshot returns the PREVIOUS OBJECT, not an equal copy", () => {
  // Workspace drops the whole task/stream/presentation triple on `next ===
  // current`. An equal-but-new object here would let a stale snapshot
  // repopulate a worker while the pond correctly stayed terminal.
  const terminal = observe(hydrate(null, null), closedDone(...FULL_DONE), null, true);
  const stalePrefix = observe(terminal, running(routeDone, runWorking), null, true);
  assert.equal(stalePrefix, terminal, "the animated path did not reject by identity");

  const reduced = hydrate(closedDone(...FULL_DONE), null);
  const staleReduced = observe(reduced, running(routeDone, runWorking), null, false);
  assert.equal(staleReduced, reduced, "the reduced path did not reject by identity");
});

test("c3: a shorter snapshot with NO terminal evidence is rejected by length alone", () => {
  /*
   * The length check is the only protection in this case. Neither snapshot
   * carries a terminal outcome, so `previousOutcome` is null and the terminal
   * guard below it never fires.
   *
   * This test exists because Task 257's `c4` mutation run found that deleting
   * the length check left every other assertion in this file green — the two
   * "older prefix" cases both start from a terminal state, where the terminal
   * guard rejects the snapshot anyway and hides the deletion. Without the
   * length check, `truth` regresses from `checking` back to `working` and
   * `nextActivityIndex` rewinds to 2, so the very next full snapshot re-emits
   * the return cue the owner has already watched.
   */
  const midRun = running(routeDone, runWorking, runDone, checkWorking);
  const checking = observe(hydrate(running(routeDone, runWorking), null), midRun, null, true);
  assert.equal(checking.truth, "checking");
  assert.equal(checking.nextActivityIndex, 4);
  assert.equal(checking.activeCue?.kind, "return");
  assert.equal(checking.settledOutcome, null, "this case is only meaningful with no terminal evidence");

  for (const animate of [true, false]) {
    const stale = observe(checking, running(routeDone, runWorking), null, animate);
    assert.equal(stale, checking, `animate=${animate}: an older prefix with no terminal evidence was accepted`);
    assert.equal(stale.truth, "checking", `animate=${animate}: truth regressed`);
    assert.equal(stale.nextActivityIndex, 4, `animate=${animate}: the consumed-activity mark rewound`);
  }

  // The consequence the guard exists to prevent: one return, never two.
  const again = observe(checking, midRun, null, true);
  const returns = [again.activeCue, ...again.queuedCues].filter((cue) => cue?.kind === "return");
  assert.equal(returns.length, 1, "the return cue was replayed");
});

test("c3: ERROR is the only terminal escalation, and it works with and without motion", () => {
  const stopped = running(routeDone, runWorking, runDone, checkWorking, checkStopped);
  const failedWhileStopping = session({
    activities: stopped.activities,
    phase: "closed",
    error: "The STOPPED report could not be written",
  });

  for (const animate of [true, false]) {
    const before = observe(hydrate(running(routeDone, runWorking), null), stopped, null, animate);
    assert.equal(before.truth, "stopped");
    const after = observe(before, failedWhileStopping, null, animate);
    assert.equal(after.truth, "error", `animate=${animate} froze on the safer-looking disposition`);
    assert.notEqual(after, before);
    assert.ok([after.activeCue, ...after.queuedCues, { kind: after.settledOutcome }]
      .some((cue) => cue?.kind === "error"), `animate=${animate} lost the ERROR evidence`);
  }

  // The reverse is refused: an ERROR run never relaxes back into STOPPED.
  const errored = observe(hydrate(running(routeDone, runWorking), null), failedWhileStopping, null, true);
  const relaxed = observe(errored, session({
    activities: [...stopped.activities, checkMore],
    phase: "closed",
    result: stoppedResult,
  }), null, true);
  assert.equal(relaxed, errored, "ERROR relaxed back into STOPPED");
});

test("c3: a spent cue stays spent however often the same snapshot is polled", () => {
  let state = observe(hydrate(null, null), closedDone(...FULL_DONE), null, true);
  const spent: string[] = [];
  for (let step = 0; state.activeCue && step < 10; step += 1) {
    if (!spent.includes(state.activeCue.key)) spent.push(state.activeCue.key);
    state = advance(state, state.activeCue.key);
  }
  assert.deepEqual(spent.map((key) => key.split(":").at(-1)), ["return", "done"]);
  for (let poll = 0; poll < 12; poll += 1) {
    const next = observe(state, closedDone(...FULL_DONE), null, true);
    assert.equal(next.activeCue, null, `poll ${poll} replayed a spent cue`);
    assert.deepEqual(next.queuedCues, [], `poll ${poll} queued a spent cue`);
    state = next;
  }
  assert.equal(state.settledOutcome, "done");
});

test("c3: an advance whose key no longer owns the active cue changes nothing", () => {
  const dispatched = observe(hydrate(null, null), running(routeDone, runWorking), null, true);
  assert.equal(dispatched.activeCue?.phase, "flight");
  // A React timer from a cue that already settled, or from a previous run.
  assert.equal(advance(dispatched, "some other key"), dispatched);
  assert.equal(advance(dispatched, `${dispatched.runKey}:1:return`), dispatched);
  // The owning key still advances exactly one step.
  const landed = advance(dispatched, dispatched.activeCue!.key);
  assert.equal(landed.activeCue?.phase, "landing");
  assert.equal(advance(landed, dispatched.activeCue!.key).activeCue, null);
});

test("c3: a new run resets motion, settled outcome and identity together", () => {
  const finished = settle(observe(hydrate(null, null), closedDone(...FULL_DONE), null, true));
  assert.equal(finished.settledOutcome, "done");
  const next = observe(finished, session({
    startedAt: "2026-08-02T12:05:00.000Z",
    activities: [routeDone, runWorking],
  }), null, true);
  assert.notEqual(next.runKey, finished.runKey);
  assert.equal(next.settledOutcome, null, "the new run inherited the old outcome");
  assert.equal(next.activeCue?.kind, "dispatch");
  assert.deepEqual(next.queuedCues, []);
});

test("c3: reduced motion reaches the animated path's settled state", () => {
  const snapshot = closedDone(...FULL_DONE);
  const reduced = observe(hydrate(null, null), snapshot, null, false);
  const animated = settle(observe(hydrate(null, null), snapshot, null, true));
  assert.equal(animated.truth, reduced.truth);
  assert.equal(animated.settledOutcome, reduced.settledOutcome);
  assert.equal(animated.activeCue, null);
  assert.equal(reduced.activeCue, null);
  assert.equal(status(animated), status(reduced));
});

test("c3: live commentary owns the spoken status without disturbing the outcome", () => {
  const retained = hydrate(closedDone(...FULL_DONE), null);
  const commentary = observe(retained, closedDone(...FULL_DONE), stream(), true);
  assert.equal(commentary.truth, "thinking");
  assert.equal(commentary.settledOutcome, "done");
  assert.equal(commentary.activeCue, null);
  assert.equal(status(commentary), "Cairn is replying.");
});

test("c3: the offline demonstration never claims verified worker work", () => {
  const demo = observe(hydrate(null, null), session({
    worker: false,
    activities: FULL_DONE,
    phase: "closed",
    result: doneResult,
  }), null, true);
  assert.equal(demo.settledOutcome, null, "an unbacked demo coloured the water as DONE");
  assert.equal(demo.workerId, null);
  assert.equal(demo.workerName, null);
  // An honest stop is still a stop.
  const stoppedDemo = observe(hydrate(null, null), session({
    worker: false,
    activities: [routeDone, runWorking, runStopped],
  }), null, true);
  assert.equal(stoppedDemo.truth, "stopped");
});

/* ------------------------------------------------------------------------ *
 * The slice's own finish line: this projection can drive Cairn and written
 * status with no worker scenery at all.
 * ------------------------------------------------------------------------ */

/* The one section that is NOT characterization. It cannot run against the old
 * module, because what it asserts is exactly what the extraction created; it
 * was added after the swap and is declared as an addition in Task 257's
 * report rather than counted as before/after evidence. */

const MODULE_SOURCE = readFileSync(
  join(__dirname, "..", "..", "src", "renderer", "activity", "presentation.ts"), "utf8");

test("the projection is neutral: no scenery, no geometry, no component", () => {
  for (const scenery of [
    "town/layout", "town/faces", "town/model", "TOWN_", "TownPoint",
    "positions", "villager", "ripple", "packet", "react", "css", "className",
  ]) {
    assert.ok(!MODULE_SOURCE.includes(scenery),
      `the neutral projection reaches for '${scenery}', which belongs to a surface`);
  }
  // Its only import is the runtime snapshot contract it projects.
  const imports = [...MODULE_SOURCE.matchAll(/^import .*? from "(.*?)";$/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["../../shared/ipc.js"]);
});

test("the projection's own API is neutrally named, and its two exceptions are declared", () => {
  const exported = [...MODULE_SOURCE.matchAll(/^export (?:function|type|const) (\w+)/gm)].map((match) => match[1]);
  assert.ok(exported.length >= 10, "the export scan found almost nothing, so it proves nothing");
  const scenic = exported.filter((name) => /town|pond/i.test(name));
  // Slice 2 must change nothing visible, so the narrow-window Pond line keeps
  // its own wording for one more slice. Those two names and their type are the
  // ONLY surface vocabulary allowed to remain; Slice 4 retires all three.
  assert.deepEqual(scenic.sort(), ["PondLineTone", "pondLineLabel", "pondLineTone"]);
});

test("written status is derived from truth and events alone", () => {
  // Every truth the reducer can hold produces a sentence, with no cue, no
  // position and no scenery in scope. This is what Slice 3+ will read.
  const seen = new Map<string, string>();
  for (const [truth, task, live] of [
    ["quiet", null, null],
    ["thinking", null, stream()],
    ["starting", running(), null],
    ["working", running(routeDone, runWorking), null],
    ["checking", running(routeDone, runWorking, runDone, checkWorking), null],
    ["done", closedDone(...FULL_DONE), null],
    ["stopped", running(routeDone, runWorking, runStopped), null],
  ] as [string, RunSessionSnapshot | null, ConductorStreamSnapshot | null][]) {
    const state = hydrate(task, live);
    assert.equal(state.truth, truth);
    assert.equal(state.activeCue, null, `${truth} needed a motion cue to be reached`);
    const sentence = status(state);
    assert.ok(sentence.length > 0 && sentence.endsWith("."), `${truth} has no plain sentence`);
    assert.equal(seen.get(sentence), undefined, `'${sentence}' speaks for two different truths`);
    seen.set(sentence, truth);
  }
  // ERROR is the eighth truth and reaches its own sentence too.
  const errored = hydrate(session({ activities: [routeDone, runWorking], phase: "closed", error: "Git could not be read" }), null);
  assert.equal(errored.truth, "error");
  assert.match(status(errored), /needs inspection/i);
  assert.equal(seen.get(status(errored)), undefined);
});
