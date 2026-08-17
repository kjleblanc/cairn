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
 *
 * REPLACED by Task 267 (Slice 7). Every test in this section used to read
 * `.chat-column.chat-column-villager` out of `app.css` — the translucent
 * lantern panel that floated over the pond. Slice 4 replaced that surface
 * with a region inside the desk and wrote the replacement in
 * `workspace.css`; Slice 7 deleted the retired rule, so these tests now read
 * the surface that actually paints.
 *
 * The dispositions are recorded one by one below, because two of them are
 * not simple re-pointings: one idea survives in a different construction,
 * and one premise is genuinely retired and says so rather than being
 * quietly reworded into something that passes.
 * ------------------------------------------------------------------ */

const workspace = readFileSync(join(renderer, "workspace.css"), "utf8");

/** A rule body from `workspace.css`, sliced by its exact selector. */
function workspaceRule(selector: string): string {
  const start = workspace.indexOf(selector + " {");
  assert.notEqual(start, -1, `the rule \`${selector}\` is gone from workspace.css`);
  return workspace.slice(start, workspace.indexOf("}", start));
}

const CONVERSATION = ".rp-conversation.chat-column";
const CONVERSATION_SKIN = ".rp-conversation.chat-column::after";

test("the surface has no outline and no drop shadow", () => {
  // The idea survives exactly: a drop shadow is the single strongest signal
  // that a surface floats ABOVE what is behind it, and this surface must not.
  // The construction changed with the ground under it. There is no pond to
  // spill light onto any more, so instead of one warm gold spill the paper
  // takes the constitution's own paper shadow — asserted as the TOKEN rather
  // than as an rgb() triple, because that token is a different colour in
  // Light and in Dark and pinning the string would make this test depend on
  // the machine's theme.
  const surface = workspaceRule(CONVERSATION);
  assert.match(surface, /border:\s*0/u, "the surface took an outline back");
  assert.match(surface, /box-shadow:\s*var\(--rp-shadow-paper\)/u,
    "the surface does not take the constitution's paper shadow");
  const shadow = surface.slice(surface.indexOf("box-shadow:"), surface.indexOf(";", surface.indexOf("box-shadow:")));
  assert.ok(!/rgb\(0 0 0/u.test(shadow), "the drop shadow returned, so the surface floats again");
});

test("the surface's paper is defined from the constitution's own palette", () => {
  // Re-pointed. The retired rule declared its fill from the lantern's cream
  // alphas; the replacement declares it from the measured paper token, and
  // must not fall back to the app's flat card fill.
  const surface = workspaceRule(CONVERSATION);
  assert.match(surface, /background:\s*var\(--rp-paper\)/u, "the surface is no longer paper");
  assert.match(surface, /color:\s*var\(--rp-ink\)/u, "the surface's ink is not the paper's ink");
  assert.ok(!surface.includes("var(--card-solid);"), "the surface fell back to the app's flat card fill");
});

test("the texture is painted on ::after, so it can never touch text", () => {
  // This is the one construction that survives unchanged, and it is the one
  // that matters most: a grain or a mask laid OVER the column dulls every
  // glyph at the same time. Held at z-index -1 inside the column's own
  // stacking context, the paper carries the fibre and the text stays at full
  // strength. ::before is still deliberately not used.
  assert.ok(!css.includes(".chat-column-villager::before"), "the villager tail returned");
  assert.ok(!workspace.includes(`${CONVERSATION}::before`), "the retired tail came back on the replacement");
  const skin = workspaceRule(CONVERSATION_SKIN);
  assert.match(skin, /z-index:\s*-1/u, "the painted skin is not behind the text");
  assert.match(skin, /background-image:\s*var\(--rp-grain\)/u, "the paper carries no fibre");
  assert.match(skin, /pointer-events:\s*none/u, "the painted skin can be hit");
});

test("the conversation re-points the paired tokens instead of rewriting its children", () => {
  // REPLACED, from `lantern.test.ts`. This is the one assertion in that file
  // that was not merely re-pointable, because what it guards became MORE
  // load-bearing when Task 267 deleted the retired panel: this rule is now the
  // only place the paired tokens are re-pointed, so it is what keeps every
  // surface inside the conversation that no slice has migrated yet on warm
  // paper instead of on the retired night-garden palette.
  //
  // It is also the rule whose SELECTOR had to shorten in the same commit that
  // removed the class from `Chat.tsx`. Had it kept the third class it would
  // have stopped matching, and every one of these re-points would have
  // silently reverted — which would have looked like a hundred unrelated
  // colour regressions rather than one selector that no longer matched. So the
  // selector's exact shape is asserted, not just its contents.
  // Comments are stripped first, deliberately. `workspace.css` still EXPLAINS
  // in prose why the third class went, and that history is worth keeping; what
  // must not survive is a SELECTOR keyed on a class no element carries, which
  // would match nothing while looking entirely correct in a diff.
  const withoutComments = workspace.replace(/\/\*[\s\S]*?\*\//gu, "");
  assert.ok(!withoutComments.includes(".chat-column-villager"),
    "workspace.css still keys a rule on the class Task 267 removed, so that rule matches nothing");
  const surface = workspaceRule(CONVERSATION);
  for (const token of ["--card:", "--card-solid:", "--card-ink:", "--card-muted:", "--line:"]) {
    assert.ok(surface.includes(token), `${token} is not re-pointed on the conversation`);
  }
  assert.match(surface, /--card-ink:\s*var\(--rp-ink\)/u, "the conversation's ink is not the paper's ink");
  // The legacy aliases the unmigrated surfaces still read must resolve to the
  // constitution's inks, not to the retired pond's.
  for (const alias of ["--lantern-ink:", "--lantern-soft:", "--pond-done:", "--pond-stop:"]) {
    assert.ok(surface.includes(alias), `${alias} is no longer re-pointed, so an unmigrated surface reverts`);
  }
  assert.doesNotMatch(surface, /--pond-done:\s*#/u, "a legacy alias was hard-coded instead of re-pointed");
});

test("the retired lantern's own properties are turned off BY NAME, not left unset", () => {
  // REPLACED, and this is the honest version of the old "the surface reads
  // the pond through itself". That premise is retired: there is no pond to
  // read through, and the conversation is opaque paper on a desk. What
  // replaces it is the stronger guard the replacement actually needs —
  // leaving any one of the retired panel's properties merely unset would let
  // it show through the paper that replaced it, so each is cancelled by name.
  const skin = workspaceRule(CONVERSATION_SKIN);
  assert.match(skin, /backdrop-filter:\s*none/u, "the retired blur can come back");
  assert.match(skin, /mask-image:\s*none/u, "the retired four-edge feather can come back");
  const surface = workspaceRule(CONVERSATION);
  assert.match(surface, /animation:\s*none/u, "the retired entrance can come back");
  assert.match(surface, /transform:\s*none/u, "the retired put-away transform can come back");
  assert.match(surface, /position:\s*relative/u, "the surface floats absolutely again");
  assert.match(surface, /inset:\s*auto/u, "the retired absolute placement can come back");
});

/* ------------------------------------------------------------------ *
 * 4. The fallback.
 *
 * REPLACED by Task 267. The old test proved that a machine without
 * `backdrop-filter` still got a legible surface, because the retired panel
 * was a translucent fill over a lit field and the feather thinned it exactly
 * where the field was brightest. The replacement uses neither a translucent
 * fill nor a blur nor a feather, so there is no longer a capability whose
 * absence could make it unreadable — and the test that would have proved
 * that is the one directly above, which asserts all three are off by name.
 *
 * What is worth keeping is that the fallback did not survive as a stale
 * block: `@supports not (backdrop-filter…)` existed only to serve the
 * retired panel, so its removal is asserted rather than assumed.
 * ------------------------------------------------------------------ */

test("the retired backdrop-filter fallback went with the surface it served", () => {
  assert.equal(css.indexOf("@supports not (backdrop-filter"), -1,
    "the fallback for the retired translucent panel is still here, serving nothing");
  assert.ok(!css.includes("--surface-feather"), "the retired feather token is still consumed");
  assert.ok(!css.includes("--surface-alpha-lit"), "the retired translucency tokens are still consumed");
});

/* ------------------------------------------------------------------ *
 * 5. What the space must not disturb.
 * ------------------------------------------------------------------ */

test("the space changes, and the approved paper surfaces are not lost with it", () => {
  // Tasks 186-194's checkpoints, receipts, questions, publication controls
  // and follow-up notes are approved and are not redesigned by a change to
  // the space they sit in.
  //
  // RE-POINTED TWICE. Slice 5 moved the composer out of `app.css` and this
  // guard followed it; Slice 7 moved the receipt, the run strip and the
  // publication checkpoint, so it follows those too. The guard's meaning is
  // unchanged and is the reason it is worth keeping through both moves: each
  // surface must still EXIST somewhere, so that "migrated" can never be
  // satisfied by "deleted".
  const surfaces = readFileSync(join(renderer, "surfaces.css"), "utf8");
  for (const selector of [
    ".rp-conversation .rp-composer {",
    ".rp-conversation .result-card {",
    ".rp-conversation .run-strip {",
    ".rp-conversation .push-confirm {",
    ".rp-conversation .result-evidence {",
  ]) {
    assert.ok(surfaces.includes(selector), `${selector} was lost rather than moved`);
  }
});

test("the space adds no motion", () => {
  // The field and the surface skin are static.
  const skin = workspaceRule(CONVERSATION_SKIN);
  assert.doesNotMatch(skin, /\b(?:animation|transition)\s*:/u, "the surface skin animates");
  assert.doesNotMatch(rule(FIELD), /\b(?:animation|transition)\s*:/u, "the field animates");
});
