import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");

/**
 * Decision 9, rule 4: "At rest the pond is one continuous blend — no rings, no
 * drawn contours, no perpetual animation." Task 168's brief already required
 * that motion be information and never perpetual decoration; its pond drew
 * three permanent contour rings anyway. These tests hold the rule where the
 * rings actually lived, so it cannot quietly come back.
 */
test("no drawn contour ring survives anywhere in the renderer", () => {
  for (const file of [["app.css"], ["components", "TownSquare.tsx"], ["motion.css"]]) {
    const source = renderer(...file);
    assert.ok(
      !source.includes("town-pond-contour"),
      `${file.join("/")} still draws a pond contour ring`,
    );
  }
});

test("the pond has no rim to draw", () => {
  // --pond-line was the contour and border colour. With still water there is
  // nothing for it to outline, so its absence is the rule made structural.
  assert.ok(!renderer("tokens.css").includes("--pond-line"), "--pond-line is still defined");
  assert.ok(!renderer("app.css").includes("--pond-line"), "--pond-line is still used");
});

test("the water breathes rather than drawing", () => {
  const motion = renderer("motion.css");
  assert.ok(motion.includes("town-sheen-drift"), "the sheen has no drift");
  assert.ok(!motion.includes("town-sky-breathe"), "the old skyglow pulse is still declared");
  // The drift must be killed for reduced motion like every other loop here.
  const reduced = motion.slice(motion.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.includes(".town-skyglow"), "the sheen is not killed for reduced motion");
});

test("a settled outcome colours the water instead of ringing it", () => {
  const css = renderer("app.css");
  const layer = css.slice(css.indexOf(".town-pond-layer {"), css.indexOf(".town-threads"));
  assert.ok(!/\bborder:/.test(layer), "the pond layer still draws a border");
  assert.ok(!/border-radius/.test(layer), "the pond layer still draws a blob edge");
  assert.ok(layer.includes("var(--pond-done)"), "DONE no longer tints the water");
  assert.ok(layer.includes("var(--pond-stop)"), "STOPPED no longer tints the water");
});
