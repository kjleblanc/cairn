import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const surfaces = renderer("surfaces.css");
const tokens = renderer("tokens.css");
const workspace = renderer("screens", "Workspace.tsx");
const railComponent = renderer("components", "ProjectRail.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/** The same slice, taken from the conversation's own sheet. */
function surfaceRule(selector: string): string {
  const start = surfaces.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return surfaces.slice(start, surfaces.indexOf("}", start));
}

/**
 * Task 186: the project shelf starts tucked, but every icon-only control still
 * says exactly what it does to assistive technology.
 */
test("the project shelf starts tucked without hiding its names", () => {
  assert.match(workspace, /const \[railCollapsed, setRailCollapsed\] = useState\(true\)/,
    "the wide project shelf still claims the whole left side on first paint");
  assert.match(railComponent, /className="rail-project-select"[\s\S]*?aria-label=\{collapsed\s*\?/,
    "a tucked project is reduced to an activity state instead of retaining its project name");
  for (const name of ["Open a project", "Create a project", "Settings"]) {
    assert.ok(railComponent.includes(`aria-label="${name}"`),
      `${name} has no explicit name in the tucked shelf`);
  }
});

test("one static paper grain belongs to the field, shelf, lantern, and composer", () => {
  assert.match(tokens, /--paper-grain:\s*url\("data:image\/svg\+xml/,
    "the renderer has no local paper texture token");
  // REWRITTEN in part by Task 260 (Slice 5). The composer was the fourth
  // surface on this list. It has moved to the constitution's material, whose
  // single shared texture is `--rp-grain` rather than `--paper-grain`, so it is
  // checked below against ITS system's one-texture rule instead. The contract —
  // one texture, shared, never five bespoke noises — is unchanged; what moved
  // is which of the two cascades the composer belongs to.
  for (const selector of [
    ".workspace-shell",
    ".project-rail",
    ".chat-column.chat-column-villager",
    ".town-square",
  ]) {
    // A surface may paint the shared texture on its own skin layer rather than
    // on itself. Task 197 moved the conversation surface's paint to ::after so
    // its feather mask could not touch text; the surface still shares this one
    // texture, which is what this contract is actually about. Widened to the
    // surface AND its skin, deliberately — not relaxed to "somewhere in the
    // file", which would pass on any unrelated rule's grain.
    const skin = `${selector}::after`;
    const painted = rule(selector) + (css.includes(`${skin} {`) ? rule(skin) : "");
    assert.ok(painted.includes("var(--paper-grain)"),
      `${selector} does not share the paper texture`);
  }
  // Exactly one texture token exists. Five bespoke noises would not read as
  // paper, they would read as five textures.
  assert.equal(tokens.match(/--paper-[a-z]*:\s*url\(/g)?.length, 1,
    "a second paper texture token appeared; the shared material is the point");
  assert.ok(!css.includes("paper-grain-shift"),
    "the grain animates instead of staying quiet");
});

test("the shelf monograms are washes, not app-icon badges", () => {
  for (const selector of [".rail-cairn-mark", ".rail-project-avatar"]) {
    const mark = rule(selector);
    assert.ok(mark.includes("background: transparent"), `${selector} still has a badge fill`);
    assert.ok(!/border:\s*1px/.test(mark), `${selector} still has an app-icon border`);
  }
  for (const selector of [".rail-cairn-mark::before", ".rail-project-avatar::before"]) {
    const wash = rule(selector);
    assert.ok(wash.includes("radial-gradient"), `${selector} has no soft offset wash`);
    assert.ok(!/border:/.test(wash), `${selector} draws an outline around its wash`);
  }
});

test("the cast keeps bare face strokes and gains only one offset wash", () => {
  const face = rule(".town-face");
  assert.ok(!/border:/.test(face), "the face is enclosed by a badge or ring");
  const wash = rule(".town-face::before");
  assert.ok(wash.includes("radial-gradient"), "the face has no restrained pastel flair");
  assert.ok(wash.includes("var(--face-color)"), "the wash has lost the cast member's identity colour");
  assert.ok(!/border:/.test(wash), "the face wash is an enclosing outline");
});

test("workspace buttons are flatter while the composer remains one field", () => {
  // REWRITTEN by Task 260 (Slice 5). Task 186's contract is unchanged and is
  // still what is asserted — the composer is ONE field with a single boundary,
  // and its two actions are flat inside it rather than oversized pills with a
  // chunky lower edge. What changed is that they are drawn from the
  // constitution's semantics in the conversation's own sheet, so the values are
  // read from there. The 44 px floor is new and is the constitution's, not
  // Task 186's; it is asserted here because this is the test that owns these
  // two controls' shape.
  const composer = surfaceRule(".rp-conversation .rp-composer");
  assert.ok(composer.includes("border-radius:") && !composer.includes("border-radius: 20px"),
    "the composer still has the uniform rounded-panel silhouette");
  assert.ok(composer.includes("border: 1px solid"),
    "the composer lost its single enclosing boundary");

  const actions = surfaceRule(".rp-conversation .chat-composer-actions .pill");
  assert.ok(actions.includes("box-shadow: none"),
    "New and Send still carry a chunky lower edge inside the field");
  assert.ok(actions.includes("border-radius:") && !actions.includes("999px"),
    "New and Send still read as oversized pills");
  assert.ok(actions.includes("min-height: 44px") && actions.includes("min-width: 44px"),
    "the composer's two actions do not reach the 44 x 44 target floor");

  const hover = surfaceRule(".rp-conversation .chat-composer-actions .pill:hover:not(:disabled)");
  assert.ok(hover.includes("translateY(-1px)") && !hover.includes("scale(1.04)"),
    "the composer controls still use the large glossy-button hover");

  // Send's identity is the constitution's teal action, and its label is the ink
  // measured against that teal in BOTH themes rather than a fixed white.
  const primary = surfaceRule(".rp-conversation .chat-composer-actions .pill-primary");
  assert.ok(primary.includes("var(--rp-teal)") && primary.includes("var(--rp-on-teal)"),
    "Send is not the one primary action drawn in the approved teal pair");

  // The decision and result surfaces still consume Task 186's own skin, and
  // this slice deliberately left it alone.
  const lanternPrimary = rule(".chat-column-villager .pill-primary");
  assert.ok(lanternPrimary.includes("border: 1px solid") && !lanternPrimary.includes("0 5px 0"),
    "the unmigrated surfaces' primary control regained a thick three-dimensional edge");
});

test("the flatter lantern controls become completely still for reduced motion", () => {
  const start = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "the final reduced-motion repair block is gone");
  const reduced = css.slice(start);
  for (const selector of [
    ".chat-column-villager .pill { transition: none; }",
    ".chat-column-villager .pill:hover:not(:disabled),",
    ".chat-column-villager .pill:active:not(:disabled) { transform: none; }",
  ]) {
    assert.ok(reduced.includes(selector), `${selector} is not covered at matching specificity`);
  }
  assert.ok(reduced.includes("{ transform: none; }"),
    "the lantern's hover or press still travels under reduced motion");

  // REWRITTEN by Task 260 (Slice 5). The composer's actions left this block with
  // the composer itself. They cannot be named here — `app.css` declares no
  // selector from the new system, in a rule or in a comment, so the two cascades
  // stay separable — so the kill moved to the end of `motion.css`, which is
  // imported last and therefore wins every tie on source order.
  const motion = renderer("motion.css");
  const motionReduced = motion.slice(motion.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  for (const selector of [
    ".rp-conversation .chat-composer-actions .pill,",
    ".rp-conversation .chat-composer-actions .pill:active:not(:disabled),",
  ]) {
    assert.ok(motionReduced.includes(selector),
      `${selector} keeps moving for a reader who asked for no motion`);
  }
  assert.ok(/\.rp-conversation[\s\S]*?\{[^}]*transform: none;/.test(motionReduced),
    "the conversation's controls still travel under reduced motion");
});

test("current-project context is annotation, not another glass card", () => {
  const context = rule(".town-project-label,\n.town-header-actions");
  assert.ok(context.includes("background: transparent"),
    "the top context still paints an opaque island");
  assert.ok(context.includes("border: 0") && context.includes("box-shadow: none"),
    "the top context still carries glass-card chrome");
  const accent = rule(".town-project-label::before");
  assert.ok(accent.includes("var(--garden-cyan)"),
    "the plain current-project annotation has no environmental anchor");
});
