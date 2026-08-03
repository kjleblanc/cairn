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

test("the lantern lands, and then holds still", () => {
  // The approved mockup swayed the whole lantern on an 8s infinite loop. It is
  // deliberately NOT shipped, and this test is what stops it coming back: the
  // mockup swayed a picture, while this panel holds the composer, the run
  // controls, and every card. An infinite transform on the container leaves
  // every control inside it permanently moving — harder to hit for anyone, and
  // materially so with a motor impairment.
  //
  // The evidence was unusually clean. With the sway, Playwright reported
  // "element is not stable" 60 times over 30 seconds on the first click of
  // nearly every spec — 19 failed / 4 passed against a 3-failure baseline.
  // With it removed and nothing else changed, the same specs passed in 4.5s.
  // Playwright's stability check is not a testing artifact; it is a proxy for
  // "can a person reliably click this".
  assert.ok(!css.includes("lantern-sway"),
    "the lantern sways again — every control inside it is now a moving target");
  const rule = lanternRule();
  assert.ok(rule.includes("villager-rise"), "the lantern no longer lands, it just appears");
  assert.ok(!/animation:[^;]*infinite/.test(rule),
    "the lantern carries an infinite animation, so its contents never settle");
  assert.ok(reducedMotionBlock().includes(".chat-column-villager"),
    "the entrance is not killed for reduced motion");
});

test("reduced motion WINS over the lantern's entrance, rather than merely naming it", () => {
  // The entrance is declared on `.chat-column.chat-column-villager` — two
  // classes, (0,2,0). The reduced-motion block above names
  // `.chat-column-villager`, which is (0,1,0) and LOSES to it. That gap once
  // let the lantern's infinite sway run for a reduced-motion user while the
  // test above it passed, because naming an element is not the same as beating
  // it. The sway is gone; the specificity trap is not, so this stays.
  //
  // Equal specificity is settled by source order, so the property that
  // actually matters is that the LAST rule matching that selector is the one
  // that stops the animation.
  const reducedAt = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  const block = css.slice(reducedAt);
  // Anchored to the start of a line, so the compound
  // `.workspace-town-pane-pond-open .chat-column.chat-column-villager` — which
  // is (0,3,0) and only applies while the pond is open — cannot stand in for
  // the plain (0,2,0) selector the entrance is declared on.
  // Bound to that rule, not to the block: the block also carries the cast's
  // blink rules, so a bare `block.includes("animation: none")` would be
  // satisfied by a rule with nothing to do with the lantern.
  const match = block.match(/^\s*\.chat-column\.chat-column-villager\s*[,{]/m);
  assert.ok(match, "the last reduced-motion block does not carry the lantern's own selector");
  const from = block.indexOf(match![0]);
  const winner = block.slice(from, block.indexOf("}", from));
  assert.ok(winner.includes("animation: none"),
    "the rule carrying the lantern's selector does not stop its animation");
  assert.ok(reducedAt > css.indexOf("animation: villager-rise"),
    "the entrance is declared after the last reduced-motion block, so it wins");
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
