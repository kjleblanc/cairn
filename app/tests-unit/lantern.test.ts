import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "..", "..", "src", "renderer", "app.css"), "utf8");

/** The `.chat-column.chat-column-villager` rule body. */
function lanternRule(): string {
  const start = css.indexOf(".chat-column.chat-column-villager {");
  assert.notEqual(start, -1, "the villager column rule is gone");
  return css.slice(start, css.indexOf("}", start));
}

/**
 * app.css's `prefers-reduced-motion` block, brace-balanced.
 *
 * Slicing to end-of-file instead would be worse than useless here: the ≤620px
 * block further down carries `.chat-column.chat-column-villager`, whose text
 * contains `.chat-column-villager`, so a regression that dropped this element
 * from the real reduced-motion rule would still find the substring and pass.
 */
function reducedMotionBlock(): string {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no reduced-motion block");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  return assert.fail("app.css's reduced-motion block never closes");
}

/**
 * Decision 9: "Lantern on Water". The conversation is a warm, softly lit
 * lantern resting on dark water — light spills from it onto the pond instead
 * of covering the pond. It replaces a large bright white rectangle that
 * occupied roughly a third of the screen and fought the whole scene.
 */
test("the panel is warm lit paper, not a bright rectangle", () => {
  const rule = lanternRule();
  assert.ok(rule.includes("var(--lantern-paper-lit)"), "the lantern is not lit paper");
  assert.ok(rule.includes("var(--lantern-paper)"), "the lantern has no paper body");
  assert.ok(!rule.includes("var(--card-solid);"), "the lantern is still the app's flat card fill");
});

test("light spills out of the lantern onto the water", () => {
  // Three shadows from the approved mockup: a hairline halo, a wide warm
  // spill, and the drop that lifts it off the pond. Two would be a border.
  const rule = lanternRule();
  const shadow = rule.slice(rule.indexOf("box-shadow:"), rule.indexOf(";", rule.indexOf("box-shadow:")));
  assert.equal(shadow.match(/rgb\(/g)?.length, 3, "the lantern does not spill light onto the water");
  assert.ok(shadow.includes("247 211 168"), "the spill is not the mockup's lantern gold");
});

test("the lantern re-points the paired tokens instead of rewriting its children", () => {
  const rule = lanternRule();
  for (const token of ["--card:", "--card-solid:", "--card-ink:", "--card-muted:", "--line:"]) {
    assert.ok(rule.includes(token), `${token} is not re-pointed inside the lantern`);
  }
  assert.ok(rule.includes("--card-ink: var(--lantern-ink)"), "the lantern's ink is not lantern ink");
});

test("the lantern has no tail", () => {
  assert.ok(
    !css.includes(".chat-column-villager::before"),
    "the villager tail is still drawn; the approved lantern floats free",
  );
});

test("the lantern sways, and stops swaying for reduced motion", () => {
  assert.ok(css.includes("@keyframes lantern-sway"), "the lantern does not sway");
  assert.ok(lanternRule().includes("lantern-sway"), "the sway is declared but never used");
  assert.ok(reducedMotionBlock().includes(".chat-column-villager"),
    "the sway is not killed for reduced motion");
});

test("each disposition chip wears its own approved colour", () => {
  for (const [selector, token] of [
    [".chat-column-villager .result-card-done", "var(--pond-done)"],
    [".chat-column-villager .result-card-stopped", "var(--pond-task)"],
    [".chat-column-villager .result-card-error", "var(--pond-stop)"],
  ] as const) {
    const start = css.indexOf(selector);
    assert.notEqual(start, -1, `${selector} has no lantern rule`);
    assert.ok(css.slice(start, css.indexOf("}", start)).includes(token), `${selector} is not ${token}`);
  }
});
