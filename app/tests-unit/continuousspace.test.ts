import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = join(__dirname, "..", "..", "src", "renderer");
const css = readFileSync(join(renderer, "app.css"), "utf8");
const tokens = readFileSync(join(renderer, "tokens.css"), "utf8");

/** A rule body, sliced by its exact selector. */
function rule(selector: string): string {
  const start = css.indexOf(selector + " {");
  assert.notEqual(start, -1, `the rule \`${selector}\` is gone`);
  return css.slice(start, css.indexOf("}", start));
}

const FIELD = ".workspace-shell";
const SURFACE = ".chat-column.chat-column-villager";
const SKIN = ".chat-column.chat-column-villager::after";

/* ------------------------------------------------------------------ *
 * 1. The grain. This is a defect fix, not a taste choice: the fibre
 *    was always being drawn and then cancelled.
 * ------------------------------------------------------------------ */

test("the paper grain survives the dark ground it is drawn on", () => {
  // `soft-light` leaves a mid-grey unchanged against any base, so noise
  // centred on mid-grey vanishes. `overlay` pushes both directions around
  // the mid-point, so the same fibre survives. The blend mode was the bug;
  // the opacity was a red herring.
  const field = rule(FIELD);
  const blend = field.slice(field.indexOf("background-blend-mode:"), field.indexOf(";", field.indexOf("background-blend-mode:")));
  assert.ok(blend.includes("overlay"), "the field's grain is still cancelled by soft-light");
  assert.ok(!/^\s*background-blend-mode:\s*soft-light/.test(blend), "the field's FIRST blend layer is still soft-light");
});

test("the grain stays monochrome fibre, not coloured noise", () => {
  // Paper fibre has no hue. Dropping the saturate filter would make the
  // turbulence read as chroma speckle — visible, but not paper.
  const grain = tokens.slice(tokens.indexOf("--paper-grain:"), tokens.indexOf(";", tokens.indexOf("--paper-grain:")));
  assert.ok(grain.includes("feColorMatrix"), "the grain lost its desaturation and is now coloured noise");
  assert.ok(grain.includes("saturate"), "the grain is no longer desaturated");
});

/* ------------------------------------------------------------------ *
 * 2. The field has a direction light comes from — using continuous
 *    fields only. Still water (Decision 9, rule 4) forbids drawn marks.
 * ------------------------------------------------------------------ */

test("the field has a key light, a counter-light, haze and a floor", () => {
  const field = rule(FIELD);
  for (const layer of ["--field-key", "--field-counter", "--field-haze", "--field-vignette"]) {
    assert.ok(field.includes(`var(${layer})`), `the field does not use ${layer}`);
  }
});

test("still water holds: the depth is falloff, never a drawn mark", () => {
  // Task 171 deleted three permanently drawn contour rings by owner
  // decision. Depth may be added only as continuous fields. A border,
  // outline or stroke on the field would put a drawn edge back on the pond.
  const field = rule(FIELD);
  assert.doesNotMatch(field, /\b(?:border|outline)\s*:/, "a drawn edge returned to the pond");
  for (const token of ["--field-key", "--field-counter", "--field-haze", "--field-vignette"]) {
    const value = tokens.slice(tokens.indexOf(`${token}:`), tokens.indexOf(";", tokens.indexOf(`${token}:`)));
    assert.ok(/gradient\(/.test(value), `${token} is not a continuous field`);
  }
});

test("the field invents no new colour", () => {
  // Every added layer must resolve to the approved garden/lantern palette.
  // A raw hex in a field token would be a new hue nobody approved.
  for (const token of ["--field-key", "--field-counter", "--field-haze", "--field-vignette"]) {
    const value = tokens.slice(tokens.indexOf(`${token}:`), tokens.indexOf(";", tokens.indexOf(`${token}:`)));
    assert.doesNotMatch(value, /#[0-9a-fA-F]{3,8}\b/, `${token} introduces a raw hex colour`);
  }
});

/* ------------------------------------------------------------------ *
 * 3. The surface stops being a slab.
 * ------------------------------------------------------------------ */

test("the surface has no outline and no drop shadow", () => {
  // A drop shadow is the single strongest signal that a surface floats
  // ABOVE what is behind it. Removing it is the point of Task 197; the
  // warm spill stays, because light spilling onto the pond is what puts
  // the surface IN the pond rather than over it.
  const surface = rule(SURFACE);
  assert.doesNotMatch(surface, /border:\s*1px/, "the surface still carries its outline");
  const shadow = surface.slice(surface.indexOf("box-shadow:"), surface.indexOf(";", surface.indexOf("box-shadow:")));
  assert.equal(shadow.match(/rgb\(/g)?.length, 1, "the surface does not carry exactly one warm spill");
  assert.ok(shadow.includes("247 211 168"), "the spill is not the mockup's lantern gold");
  assert.ok(!/rgb\(0 0 0/.test(shadow), "the drop shadow returned, so the surface floats again");
});

test("the surface's paper is still defined from the lantern's own palette", () => {
  // The painting moved to ::after, but the paper must still be the
  // lantern's, declared in the lantern's own rule.
  const surface = rule(SURFACE);
  assert.ok(surface.includes("var(--lantern-paper-lit)"), "the surface is no longer lit lantern paper");
  assert.ok(surface.includes("var(--lantern-paper)"), "the surface has no lantern paper body");
  assert.ok(!surface.includes("var(--card-solid);"), "the surface fell back to the app's flat card fill");
});

test("the feather is painted on ::after, so it can never touch text", () => {
  // ::before is deliberately NOT used: that selector is the retired
  // villager tail and `lantern.test.ts` guards its absence.
  assert.ok(!css.includes(".chat-column-villager::before"), "the villager tail returned");
  const skin = rule(SKIN);
  assert.ok(skin.includes("mask-image:"), "the surface's edge does not thin out");
  assert.ok(skin.includes("mask-composite: intersect"), "the feather does not apply to all four edges");
  assert.ok(skin.includes("var(--surface-feather)"), "the feather distance is not a token");
  assert.ok(/z-index:\s*-1/.test(skin), "the painted skin is not behind the text");
});

test("the surface reads the pond through itself", () => {
  const skin = rule(SKIN);
  assert.ok(skin.includes("backdrop-filter:"), "nothing behind the surface is diffused through it");
  assert.ok(/color-mix\(|\/\s*var\(--surface-alpha/.test(rule(SURFACE) + skin),
    "the surface fill is fully opaque again, so the pond cannot read through");
});

/* ------------------------------------------------------------------ *
 * 4. The fallback. Without backdrop-filter a translucent fill over a lit
 *    field is unreadable, and the feather thins it exactly where the
 *    field is brightest. It must fail closed to legible.
 * ------------------------------------------------------------------ */

test("without backdrop-filter the surface fails closed to legible", () => {
  const at = css.indexOf("@supports not (backdrop-filter");
  assert.notEqual(at, -1, "there is no fallback for a machine without backdrop-filter");
  let depth = 0;
  let block = "";
  for (let i = css.indexOf("{", at); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}" && --depth === 0) {
      block = css.slice(at, i + 1);
      break;
    }
  }
  assert.ok(block, "the fallback block never closes");
  assert.ok(block.includes(SURFACE), "the fallback does not reach the surface itself");
  assert.ok(/mask-image:\s*none/.test(block), "the feather survives without the blur that made it readable");
  assert.match(block, /--surface-alpha-lit:\s*(?:9[0-9]|100)%/, "the fallback does not restore an opaque fill");
});

/* ------------------------------------------------------------------ *
 * 5. What Task 197 must not disturb.
 * ------------------------------------------------------------------ */

test("Task 197 changes the space, not the approved paper surfaces", () => {
  // Tasks 186-194's checkpoints, receipts, questions, publication controls
  // and follow-up notes are approved and are not redesigned here.
  //
  // REPOINTED by Task 260 (Slice 5). The composer used to be the second name on
  // this list. It is still an approved paper surface and Task 197 still does not
  // redesign it — but it is no longer drawn from the retired lantern's cream
  // alphas, so it is no longer in this file. Naming its new home keeps the
  // guard's meaning: the surface exists and was not deleted along the way.
  for (const selector of [".chat-column-villager .result-card"]) {
    assert.ok(css.includes(selector), `${selector} was removed by Task 197`);
  }
  const surfaces = readFileSync(join(renderer, "surfaces.css"), "utf8");
  assert.ok(surfaces.includes(".rp-conversation .rp-composer {"),
    "the composer surface was lost rather than moved");
});

test("Task 197 adds no motion", () => {
  // Motion is Task C. The field and the surface skin are static.
  const skin = rule(SKIN);
  assert.doesNotMatch(skin, /\b(?:animation|transition)\s*:/, "the surface skin animates");
  assert.doesNotMatch(rule(FIELD), /\b(?:animation|transition)\s*:/, "the field animates");
});
