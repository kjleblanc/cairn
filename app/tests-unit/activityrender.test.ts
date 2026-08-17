import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ConductorStreamSnapshot, RunSessionSnapshot, TownPoint } from "../src/shared/ipc.js";
import { TownSquare } from "../src/renderer/components/TownSquare.js";
/* ------------------------------------------------------------------------ *
 * Task 257, `c5` — the rendered no-visible-change assertion.
 *
 * Slice 2's whole deliverable is an absence: the app must look EXACTLY as it
 * did while its truth moves out of a Town-named module. This suite renders the
 * two components that consume the projection across a fixed matrix of real
 * runtime states, hashes each rendered section, and compares those hashes with
 * a golden captured from the pre-change tree.
 *
 * Markup, not pixels. The plan asks for controlled fonts, timers and motion
 * "where pixels are compared"; nothing here compares pixels, so there is no
 * font, clock or animation in the loop to control, and the comparison is exact
 * rather than tolerant. What it cannot see is CSS: this task changes no
 * stylesheet, and `pondline.test.ts` keeps asserting the narrow-window CSS
 * contract directly.
 *
 * Hashes rather than 94,000 committed characters of generated HTML. The full
 * text is written to `dist-unit` (build output, gitignored) on every run, so
 * diagnosis is a checkout of the parent commit and a diff of two generated
 * files — no stash required. Task 257's report records this golden file's own
 * SHA-256, so a later silent regeneration of it is detectable rather than
 * invisible.
 *
 * The states come from driving the real reducer rather than from presentation
 * literals, so this covers the whole truth-to-markup path. THE IMPORT BLOCK
 * BELOW IS THE ONLY THING THAT MOVED when the module was swapped.
 * ------------------------------------------------------------------------ */
import {
  advanceActivityCue as advance,
  hydrateActivityPresentation as hydrate,
  observeActivityPresentation as observe,
  type ActivityPresentation as Presentation,
} from "../src/renderer/activity/presentation.js";

/* React warns once per `useLayoutEffect` that the server renderer cannot run
 * it. `TownThreadTarget` uses one to hand focus back to Cairn when a thread
 * unmounts, which is correct client behaviour and irrelevant here. Silence
 * exactly that message and let every other warning through, so an unexpected
 * one still reaches the suite output. */
const SSR_LAYOUT_EFFECT = "useLayoutEffect does nothing on the server";
const realConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes(SSR_LAYOUT_EFFECT)) return;
  realConsoleError(...args);
};

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
const runStopped = { stage: "Run", state: "stopped", detail: "The worker stopped safely." } as const;
const checkWorking = { stage: "Check", state: "working", detail: "Cairn is checking the result." } as const;
const checkDone = { stage: "Check", state: "done", detail: "Cairn verified the result." } as const;
const resultDone = { stage: "Result", state: "done", detail: "DONE — verified." } as const;

const doneResult = { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"];
const FULL_DONE = [routeDone, runWorking, runDone, checkWorking, checkDone, resultDone];

const running = (...activities: RunSessionSnapshot["activities"]) => session({ activities });
const closedDone = () => session({ activities: FULL_DONE, phase: "closed", result: doneResult });
const errored = () => session({ activities: [routeDone, runWorking], phase: "closed", error: "Git could not be read" });

/** Deliberately PAST the beside-chat shore (0.52) and inside the pond's own
 *  bound (0.87), so the whole-pond case really renders somewhere the wide
 *  layout clamps it back. A first draft used x=0.42, which sits inside both
 *  bounds and hashed the two cases identically — a matrix row proving nothing. */
const SAVED: Record<string, TownPoint> = { "worker:codex-exec": { x: 0.8, y: 0.61 } };

type Case = {
  name: string;
  task: RunSessionSnapshot | null;
  live: ConductorStreamSnapshot | null;
  state: Presentation;
  positions?: Record<string, TownPoint>;
  wholePond?: boolean;
};

/**
 * One poll observed from a reattached run, which is how the app reaches every
 * mid-run state: `Workspace` hydrates on mount and project switch, then
 * observes on each refresh.
 *
 * Chaining `observe` from a quiet start instead would leave the FIRST cue
 * active and merely queue the later one — real behaviour, but not the state
 * these cases are named for. That mistake shipped in this file's first draft
 * and was caught by the matrix guard at the bottom, so the distinction is
 * pinned here rather than left as a comment.
 */
function poll(seed: RunSessionSnapshot | null, next: RunSessionSnapshot | null,
  live: ConductorStreamSnapshot | null = null, animate = true): Presentation {
  return observe(hydrate(seed, null), next, live, animate);
}

function advanceBy(state: Presentation, times: number): Presentation {
  let next = state;
  for (let step = 0; step < times && next.activeCue; step += 1) next = advance(next, next.activeCue.key);
  return next;
}

const atWork = running(routeDone, runWorking);
const dispatchFlight = poll(running(routeDone), atWork);
const returnFlight = poll(atWork, running(routeDone, runWorking, runDone, checkWorking));
const doneQueued = poll(atWork, closedDone());
const offline = () => session({ worker: false, activities: [routeDone, runWorking] });

const CASES: Case[] = [
  { name: "quiet — nothing has ever run", task: null, live: null, state: hydrate(null, null) },
  { name: "thinking — a live Cairn turn, no run", task: null, live: stream(), state: hydrate(null, stream()) },
  { name: "starting — accepted, not yet handed off", task: running(routeDone), live: null, state: poll(null, running(routeDone)) },
  { name: "working — dispatch in flight", task: atWork, live: null, state: dispatchFlight },
  { name: "working — dispatch landing", task: atWork, live: null, state: advanceBy(dispatchFlight, 1) },
  { name: "working — cue spent, worker at work", task: atWork, live: null, state: advanceBy(dispatchFlight, 2) },
  {
    name: "checking — result in flight back to Cairn",
    task: running(routeDone, runWorking, runDone, checkWorking), live: null, state: returnFlight,
  },
  { name: "done — return still in flight, DONE queued", task: closedDone(), live: null, state: doneQueued },
  { name: "done — terminal cue landing", task: closedDone(), live: null, state: advanceBy(doneQueued, 2) },
  { name: "done — fully settled", task: closedDone(), live: null, state: advanceBy(doneQueued, 3) },
  {
    name: "stopped — an intermediate Run stop",
    task: running(routeDone, runWorking, runStopped), live: null,
    state: poll(atWork, running(routeDone, runWorking, runStopped)),
  },
  { name: "error — an exceptional close", task: errored(), live: null, state: poll(atWork, errored()) },
  {
    name: "commentary — Cairn speaks over a retained DONE",
    task: closedDone(), live: stream(), state: poll(closedDone(), closedDone(), stream()),
  },
  {
    name: "offline demonstration — working without a worker handoff",
    task: offline(), live: null, state: poll(null, offline()),
  },
  { name: "saved positions — Reset layout is enabled", task: atWork, live: null, state: dispatchFlight, positions: SAVED },
  {
    name: "the whole pond — no shore reserved for the conversation",
    task: atWork, live: null, state: dispatchFlight, positions: SAVED, wholePond: true,
  },
  {
    name: "a first observation of a finished run — the obsolete dispatch is dropped",
    task: closedDone(), live: null, state: observe(hydrate(null, null), closedDone(), null, true),
  },
  {
    name: "reduced motion — the same DONE with no cue at all",
    task: closedDone(), live: null, state: observe(hydrate(null, null), closedDone(), null, false),
  },
];

/** One tag per line, so a regenerated diff names the element that moved
 *  instead of one 4,000-character line that differs "somewhere". */
function readable(markup: string): string {
  return markup.replace(/></g, ">\n<");
}

function renderTown(entry: Case): string {
  return renderToStaticMarkup(createElement(TownSquare, {
    projectName: "Garden",
    task: entry.task,
    stream: entry.live,
    presentation: entry.state,
    positions: entry.positions ?? {},
    wholePond: entry.wholePond ?? false,
    onPositionsChange: () => undefined,
    onFocusChat: () => undefined,
    onOpenRun: () => undefined,
  }));
}

/*
 * The 32 `PondLine · …` sections stood here until Task 259 (Slice 4) deleted
 * the component. **The 18 TownSquare hashes below are unchanged, byte for
 * byte** — the golden file lost its last 32 lines and not one character of its
 * first 18, which is the evidence that removing the pond disturbed nothing
 * else. What the pond's sections proved — that a waiting decision outranks
 * every other state, and that the words follow truth — is proved for the
 * surface that replaced them in `cairnpresence.test.ts` and
 * `activitycapsule.test.ts`, which also carry its live region.
 */
function sections(): { name: string; markup: string }[] {
  return CASES.map((entry) => ({ name: `TownSquare · ${entry.name}`, markup: readable(renderTown(entry)) }));
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

const GOLDEN_PATH = join(__dirname, "..", "..", "tests-unit", "activity-render.golden.txt");

test("c5: every rendered section hashes exactly as it did before the extraction", () => {
  const rendered = sections();
  writeFileSync(join(__dirname, "activity-render.txt"),
    rendered.map((entry) => `=== ${entry.name}\n${entry.markup}\n`).join("\n"), "utf8");
  const actual = rendered.map((entry) => `${sha256(entry.markup)}  ${entry.name}`);
  writeFileSync(join(__dirname, "activity-render.hashes.txt"), `${actual.join("\n")}\n`, "utf8");
  const golden = readFileSync(GOLDEN_PATH, "utf8").replace(/\r\n/g, "\n").split("\n").filter((line) => line.length > 0);

  for (let index = 0; index < Math.max(actual.length, golden.length); index += 1) {
    assert.equal(actual[index], golden[index],
      "a rendered section changed. Regenerate on the parent commit and diff "
      + "app/dist-unit/tests-unit/activity-render.txt to see exactly what moved");
  }
  assert.equal(actual.length, golden.length, "the number of rendered sections changed");
});

/* The hashes above prove "nothing moved". These pin WHAT must not move, in the
 * same terms `tests/conductor.spec.ts` asserts against the real app, so a
 * regression reads as a named contract break rather than an opaque digest. */

function attribute(markup: string, name: string): string | null {
  return new RegExp(`${name}="([^"]*)"`).exec(markup)?.[1] ?? null;
}

test("c5: the Town's observable state attributes still say what the E2E suite reads", () => {
  const seen: string[] = [];
  for (const entry of CASES) {
    const markup = renderTown(entry);
    const truth = attribute(markup, "data-town-truth");
    const motion = attribute(markup, "data-town-motion");
    const outcome = attribute(markup, "data-town-outcome");
    assert.equal(truth, entry.state.truth, `${entry.name}: data-town-truth is not the reducer's truth`);
    assert.equal(motion, entry.state.activeCue
      ? `${entry.state.activeCue.kind}-${entry.state.activeCue.phase}` : "none", `${entry.name}: data-town-motion drifted`);
    assert.equal(outcome, entry.state.settledOutcome ?? "none", `${entry.name}: data-town-outcome drifted`);

    if (entry.state.activeCue) {
      const layer = /<div class="town-transfer-layer[\s\S]*?<\/div>/.exec(markup)?.[0] ?? "";
      assert.equal(attribute(layer, "data-cue-key"), entry.state.activeCue.key, `${entry.name}: the cue key is not the reducer's`);
      assert.equal(attribute(layer, "data-cue-kind"), entry.state.activeCue.kind);
      assert.equal(attribute(layer, "data-cue-phase"), entry.state.activeCue.phase);
    } else {
      assert.ok(!markup.includes("town-transfer-layer"), `${entry.name}: motion is drawn with no cue`);
    }
    seen.push(`${truth}/${motion}/${outcome}`);
  }
  // Named rather than counted: a magic number here would let the matrix drift
  // onto a narrower set of states and still pass.
  assert.deepEqual([...new Set(seen)].sort(), [
    "checking/return-flight/none",
    "done/done-landing/done",
    "done/none/done",
    "done/return-flight/none",
    "error/error-landing/error",
    "quiet/none/none",
    "starting/none/none",
    "stopped/stopped-landing/stopped",
    "thinking/none/done",
    "thinking/none/none",
    "working/dispatch-flight/none",
    "working/dispatch-landing/none",
    "working/none/none",
  ]);
});

test("c5: Cairn's node, its accessible name and the spoken status stay joined to truth", () => {
  for (const entry of CASES) {
    const markup = renderTown(entry);
    const label = /aria-label="Cairn, ([a-z]+)"/.exec(markup)?.[1];
    assert.equal(label, entry.state.truth === "quiet" ? "ready" : entry.state.truth,
      `${entry.name}: Cairn's accessible name stopped naming the real truth`);
    // The live region carries words, never colour or position alone.
    const status = /<p role="status" aria-live="polite" aria-atomic="true">([^<]*)<\/p>/.exec(markup)?.[1];
    assert.ok(status && status.length > 0, `${entry.name}: the Town header lost its spoken status`);
    // Provenance, not scenery: a worker villager may only stand in the Town
    // when this run really handed work to a named adapter.
    const workers = markup.split("town-node-worker").length - 1;
    const handedOff = Boolean(entry.task?.worker && entry.task.adapterId);
    assert.ok(handedOff || workers === 0,
      `${entry.name}: ${workers} worker nodes rendered for a run with no worker handoff`);
    assert.ok(workers <= 1, `${entry.name}: ${workers} worker nodes for one serial run`);
  }
});

/*
 * "c5: the narrow-window line's tone and words stay joined to truth" stood
 * here. REPLACED by Task 259 (Slice 4): the component it rendered no longer
 * exists, and the rule it enforced — a waiting decision outranks everything
 * else, in words, with one answer and never two — is now enforced against the
 * surface that carries it, in `cairnpresence.test.ts` ("a waiting decision
 * outranks everything else, exactly as the pond's line did") and
 * `activitycapsule.test.ts`.
 */

test("c5: the matrix really exercises every truth and every cue kind", () => {
  const truths = new Set(CASES.map((entry) => entry.state.truth));
  assert.deepEqual([...truths].sort(),
    ["checking", "done", "error", "quiet", "starting", "stopped", "thinking", "working"]);
  const cues = new Set(CASES.flatMap((entry) => entry.state.activeCue
    ? [`${entry.state.activeCue.kind}/${entry.state.activeCue.phase}`] : []));
  assert.deepEqual([...cues].sort(),
    ["dispatch/flight", "dispatch/landing", "done/landing", "error/landing", "return/flight", "stopped/landing"]);
  assert.ok(CASES.some((entry) => entry.state.settledOutcome === "done"));
  assert.ok(CASES.some((entry) => entry.wholePond));
  assert.ok(CASES.some((entry) => Object.keys(entry.positions ?? {}).length > 0));
  // The whole pond must actually render differently from the same state beside
  // the conversation, or that row is a duplicate wearing a second name.
  const beside = CASES.find((entry) => entry.positions && !entry.wholePond)!;
  const whole = CASES.find((entry) => entry.wholePond)!;
  assert.notEqual(sha256(readable(renderTown(beside))), sha256(readable(renderTown(whole))),
    "the whole-pond case renders identically to the beside-chat case");
  assert.ok(CASES.some((entry) => entry.state.workerId === null && entry.task !== null),
    "no case covers a run with no worker identity");
});
