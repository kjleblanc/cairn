import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

/** Every `.town-*` rule, from the square down to its keyframes. */
const town = css.slice(css.indexOf(".town-square {"), css.indexOf("@keyframes town-face-float"));

/**
 * Decision 9, rule 1: the cast carries the identity; the furniture does not.
 * The owner's words were that the imagery read "too sci fi". The crisp
 * luminous faces ARE the Ghost in the Shell half; everything around them goes
 * warm, rounded, and friendly, and "hairline rules, monospaced type, HUD
 * labels, and crawling data-threads are removed."
 */
test("the town labels itself in words, not in machine type", () => {
  assert.ok(!town.includes("var(--mono)"), "a town surface is still set in machine type");
  assert.ok(!/text-transform:\s*uppercase/.test(town), "a town surface still shouts in HUD caps");
});

test("machine type survives where the text really is machine text", () => {
  // A file path in a result card IS a path. What Decision 9 removes is
  // monospace used as decoration, not monospace used correctly.
  assert.match(css, /\.mono \{[^}]*font-family: var\(--mono\)/s);
});

test("the threads no longer crawl", () => {
  assert.ok(!town.includes("stroke-dasharray"), "the relationship threads are still dashed");
});

test("no character stands inside a drawn ring", () => {
  const bed = town.slice(town.indexOf(".town-node-bed span {"));
  const rule = bed.slice(0, bed.indexOf("}"));
  assert.ok(!/border:/.test(rule), "each character still stands inside a hairline ellipse");
});

test("the cast is already the approved size and is deliberately not resized", () => {
  assert.match(town, /\.town-face \{[^}]*width: 78px/s);
  assert.match(town, /\.town-face-kimi[^{]*\{[^}]*width: 68px/s);
});
