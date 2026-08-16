import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunSessionSnapshot } from "../src/shared/ipc.js";
import {
  hydrateActivityPresentation,
  pondLineLabel,
  pondLineTone,
} from "../src/renderer/activity/presentation.js";
import { TOWN_BOUNDS, TOWN_SHORE_BESIDE_CHAT, townShore } from "../src/renderer/town/layout.js";

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

const runWorking = { stage: "Run", state: "working", detail: "Codex Exec is working." } as const;

/**
 * The narrow window, resolved 2026-08-03 and owner-approved. Below 1260px the
 * conversation takes the window and the pond becomes a line you can press. The
 * line is honest because it is a line: it never pretends to be a picture, so
 * it cannot read as a shrunken one.
 */
test("the line says who is working, in the pond's own words", () => {
  const working = hydrateActivityPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineLabel(working, false), "Codex Exec worker is working.");
  assert.equal(pondLineTone(working, false), "busy");
});

test("a waiting decision turns the line amber and changes what it says", () => {
  const working = hydrateActivityPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineTone(working, true), "needs-you");
  assert.notEqual(pondLineLabel(working, true), pondLineLabel(working, false));
  assert.match(pondLineLabel(working, true), /waiting for you/);
});

test("the line carries the water's settled state", () => {
  const quiet = hydrateActivityPresentation(null, null);
  assert.equal(pondLineTone(quiet, false), "quiet");
  assert.equal(pondLineLabel(quiet, false), "Town is quiet.");

  const done = hydrateActivityPresentation(session({
    activities: [runWorking, { stage: "Result", state: "done", detail: "DONE — verified." }],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  }), null);
  assert.equal(pondLineTone(done, false), "done");

  const stopped = hydrateActivityPresentation(session({
    activities: [{ stage: "Run", state: "stopped", detail: "The worker stopped safely." }],
    phase: "closed",
  }), null);
  assert.equal(pondLineTone(stopped, false), "stopped");
});

test("a decision waiting outranks everything else the water is doing", () => {
  // Amber is the one state the owner has to act on; nothing may bury it.
  for (const state of [
    hydrateActivityPresentation(null, null),
    hydrateActivityPresentation(session({ activities: [runWorking] }), null),
  ]) {
    assert.equal(pondLineTone(state, true), "needs-you");
  }
});

test("the whole pond gives the cast the whole width", () => {
  // Beside the conversation a villager stops at the shore; with the pond whole
  // there is no conversation to stay clear of. Reverting this to a constant
  // used to leave every other assertion green — the E2E checks containment in
  // the pane, which a villager cannot escape whichever bound applies.
  assert.equal(townShore(false), TOWN_SHORE_BESIDE_CHAT);
  assert.equal(townShore(true), TOWN_BOUNDS.maxX);
  assert.ok(townShore(true) > townShore(false), "the whole pond is no wider than the shore");
});

test("the whole-pond shore is wired to the prop, not pinned to a constant", () => {
  // townShore's value table is pinned above, but a call site that passed a
  // literal would keep every one of those assertions green.
  const town = readFileSync(
    join(__dirname, "..", "..", "src", "renderer", "components", "TownSquare.tsx"), "utf8");
  assert.match(town, /const shore = townShore\(wholePond\)/,
    "the render clamp is not wired to the wholePond prop");
});

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

/**
 * The LAST `@media (max-width: 1260px)` block — the narrow-window block —
 * brace-balanced.
 *
 * Slicing to end-of-file instead would reach past it into the Task 160 checkup
 * rules AND the final reduced-motion block, so a `visibility: hidden` bound to
 * some unrelated selector further down would satisfy the assertion below.
 */
function narrowBlock(): string {
  const start = css.lastIndexOf("@media (max-width: 1260px)");
  assert.notEqual(start, -1, "app.css has no narrow-window block");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  return assert.fail("app.css's narrow-window block never closes");
}

test("the pond is never reduced — it is whole, or it is a line", () => {
  // Wide: the line is not there at all. Narrow: the line is, and the pond's
  // contents wait behind it. Nothing anywhere shrinks the pond to fit.
  const base = css.slice(css.indexOf("\n.pond-line {"), css.indexOf("}", css.indexOf("\n.pond-line {")));
  assert.ok(base.includes("display: none"), "the line shows on the approved wide layout");
  const narrow = narrowBlock();
  assert.ok(narrow.includes(".pond-line { display: flex"), "the line never appears at any width");
  // The selector, not the bare property: hiding is only hiding if it is the
  // pond's own ground that is hidden.
  assert.match(narrow, /\.town-square-ground\s*[,{][^{}]*\{[^{}]*visibility:\s*hidden/,
    "the pond's contents do not wait behind the line");
});

test("no new breakpoint was invented for the narrow window", () => {
  const widths = [...css.matchAll(/@media \(m(?:in|ax)-width: (\d+)px\)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(widths)].sort(), ["1260", "620", "621", "820"],
    "Task 231 adds only the explicit compact Builder-review card breakpoint");
});
