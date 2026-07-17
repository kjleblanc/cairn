import test from "node:test";
import assert from "node:assert/strict";
import { spinnerLine } from "../src/ui.js";

// The @clack/prompts spinner renders "<char>  <message>" — a 3-column prefix — and
// redraws in place only while the whole line fits on ONE physical row. If the rendered
// line reaches the terminal width it wraps, the in-place erase misses the wrapped row,
// and every animation frame floods the console with a fresh copy. So the message must
// stay strictly inside the terminal width at every width.
const PREFIX = 3;

const LONG =
  "The diff is exactly within the brief's boundary: `isCairnProject` rewritten so it " +
  "recognises a real contract by structure and not by a bare mention of the word.";

test("spinnerLine keeps the rendered status line inside the terminal width", () => {
  for (const width of [40, 72, 80, 120]) {
    const line = spinnerLine(LONG, width);
    assert.ok(
      line.length + PREFIX < width,
      `width ${width}: rendered line is ${line.length + PREFIX} columns, must be < ${width}`,
    );
  }
});

test("spinnerLine collapses newlines so the status line never spans rows", () => {
  const line = spinnerLine("first line\nsecond line\n\n   third", 80);
  assert.ok(!line.includes("\n"), "no newline may survive");
});

test("spinnerLine assumes 80 columns when the width is unknown", () => {
  const line = spinnerLine(LONG, undefined);
  assert.ok(line.length + PREFIX < 80, "must fit a standard 80-column console");
});

test("spinnerLine no longer floods a narrow console with the reviewer's line", () => {
  // The exact line from the bug report, at the ~72-column window that clipped it.
  const flooding =
    "The diff is exactly within the brief's boundary: `isCairnProject` rewritten so it never wraps";
  const line = spinnerLine(flooding, 72);
  assert.ok(line.length + PREFIX < 72, "the reviewer's line must fit on one row");
  assert.ok(!line.includes("\n"));
});

test("spinnerLine leaves a short line intact", () => {
  const short = "Building — only what the brief allows…";
  assert.equal(spinnerLine(short, 80), short);
});
