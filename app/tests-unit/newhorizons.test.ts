import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * Decision 9, rule 5. Buttons are chunky pills with a solid lower edge that
 * compresses on press; motion overshoots rather than easing out; menu items
 * stagger; characters spring when touched; type is heavy, never thin.
 */
test("a pill has a solid lower edge that compresses under a press", () => {
  assert.ok(rule(".pill").includes("--pill-edge"), "the pill has no lower edge");
  const pressed = rule(".pill:active:not(:disabled)");
  assert.ok(pressed.includes("translateY(2px)"), "the pill does not sink when pressed");
  assert.ok(/box-shadow:\s*0 1px 0/.test(pressed), "the pill's edge does not compress");
});

test("motion overshoots instead of easing out", () => {
  assert.ok(rule(".pill").includes("var(--pop)"), "the pill does not overshoot");
  assert.ok(rule(".town-face").includes("var(--pop)"), "the cast does not spring");
});

test("the cast springs when touched", () => {
  assert.ok(css.includes(".town-node:hover .town-face"), "the cast does not react to a pointer");
  assert.ok(css.includes(".town-node:active .town-face"), "the cast does not compress when touched");
});

test("suggestions stagger in and slide on hover", () => {
  assert.ok(css.includes("@keyframes lantern-arrive"), "there is no arrival to stagger");
  for (const nth of [1, 2, 3, 4]) {
    assert.ok(
      css.includes(`.followup-chip:nth-child(${nth})`),
      `suggestion ${nth} does not take its own turn`,
    );
  }
  assert.ok(rule(".followup-chip:hover:not(:disabled)").includes("translateX(5px)"),
    "a suggestion does not slide under the pointer");
  // `both` would leave the final keyframe's `transform: none` pinned over the
  // hover slide forever. `backwards` fills only the delay, which is the half
  // the stagger actually needs.
  assert.ok(/animation:[^;]*lantern-arrive[^;]*backwards/.test(css),
    "the staggered arrival would freeze the hover slide");
});

test("type is heavy, and the heavy face is really loaded", () => {
  assert.match(css, /body\s*{[^}]*font-weight:\s*600/s);
  assert.match(css, /h1, h2, h3\s*{[^}]*font-weight:\s*700/s);
  assert.ok(!/font-weight:\s*[89]\d\d/.test(css),
    "a weight above 700 was asked for; Quicksand tops out at 700 and the rest is faux bold");
  assert.ok(renderer("main.tsx").includes("@fontsource/quicksand/700.css"),
    "700 is used but never imported, so it renders as synthesized bold");
});

test("every added motion stops for reduced motion", () => {
  // Brace-balanced, not sliced to end-of-file: the ≤620px and 621–1260px
  // blocks further down mention `.pill` and `.chat-column-villager`, so an
  // end-of-file slice would find those selectors and pass even after a
  // regression removed them from the reduced-motion rule itself.
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no reduced-motion block");
  let depth = 0;
  let end = -1;
  for (let index = css.indexOf("{", start); index < css.length && end < 0; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) end = index + 1;
  }
  assert.notEqual(end, -1, "app.css's reduced-motion block never closes");
  const reduced = css.slice(start, end);
  for (const selector of [".pill", ".town-face", ".followup-chip"]) {
    assert.ok(reduced.includes(selector), `${selector} keeps moving under reduced motion`);
  }
});

test("the lantern's own buttons are the mockup's mint and ghost", () => {
  assert.ok(rule(".chat-column-villager .pill-primary").includes("#bfe8dd"),
    "Send is not the approved mint gradient");
  assert.ok(rule(".chat-column-villager .pill-primary").includes("#7cbdae"),
    "Send has no solid lower edge to compress");
});
