import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunSessionSnapshot } from "../src/shared/ipc.js";
import {
  hydrateTownPresentation,
  pondLineLabel,
  pondLineTone,
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

const runWorking = { stage: "Run", state: "working", detail: "Codex Exec is working." } as const;

/**
 * The narrow window, resolved 2026-08-03 and owner-approved. Below 1260px the
 * conversation takes the window and the pond becomes a line you can press. The
 * line is honest because it is a line: it never pretends to be a picture, so
 * it cannot read as a shrunken one.
 */
test("the line says who is working, in the pond's own words", () => {
  const working = hydrateTownPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineLabel(working, false), "Codex Exec worker is working.");
  assert.equal(pondLineTone(working, false), "busy");
});

test("a waiting decision turns the line amber and changes what it says", () => {
  const working = hydrateTownPresentation(session({ activities: [runWorking] }), null);
  assert.equal(pondLineTone(working, true), "needs-you");
  assert.notEqual(pondLineLabel(working, true), pondLineLabel(working, false));
  assert.match(pondLineLabel(working, true), /waiting for you/);
});

test("the line carries the water's settled state", () => {
  const quiet = hydrateTownPresentation(null, null);
  assert.equal(pondLineTone(quiet, false), "quiet");
  assert.equal(pondLineLabel(quiet, false), "Town is quiet.");

  const done = hydrateTownPresentation(session({
    activities: [runWorking, { stage: "Result", state: "done", detail: "DONE — verified." }],
    phase: "closed",
    result: { status: "done", disposition: "DONE" } as RunSessionSnapshot["result"],
  }), null);
  assert.equal(pondLineTone(done, false), "done");

  const stopped = hydrateTownPresentation(session({
    activities: [{ stage: "Run", state: "stopped", detail: "The worker stopped safely." }],
    phase: "closed",
  }), null);
  assert.equal(pondLineTone(stopped, false), "stopped");
});

test("a decision waiting outranks everything else the water is doing", () => {
  // Amber is the one state the owner has to act on; nothing may bury it.
  for (const state of [
    hydrateTownPresentation(null, null),
    hydrateTownPresentation(session({ activities: [runWorking] }), null),
  ]) {
    assert.equal(pondLineTone(state, true), "needs-you");
  }
});

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

test("the pond is never reduced — it is whole, or it is a line", () => {
  // Wide: the line is not there at all. Narrow: the line is, and the pond's
  // contents wait behind it. Nothing anywhere shrinks the pond to fit.
  const base = css.slice(css.indexOf("\n.pond-line {"), css.indexOf("}", css.indexOf("\n.pond-line {")));
  assert.ok(base.includes("display: none"), "the line shows on the approved wide layout");
  const narrow = css.slice(css.lastIndexOf("@media (max-width: 1260px)"));
  assert.ok(narrow.includes(".pond-line { display: flex"), "the line never appears at any width");
  assert.ok(narrow.includes("visibility: hidden"), "the pond's contents do not wait behind the line");
});

test("no new breakpoint was invented for the narrow window", () => {
  const widths = [...css.matchAll(/@media \(m(?:in|ax)-width: (\d+)px\)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(widths)].sort(), ["1260", "620", "621"]);
});
