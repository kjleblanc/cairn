import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const tokens = renderer("tokens.css");
const workspace = renderer("screens", "Workspace.tsx");
const railComponent = renderer("components", "ProjectRail.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
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
  for (const selector of [
    ".workspace-shell",
    ".project-rail",
    ".chat-column.chat-column-villager",
    ".chat-column-villager .chat-composer",
    ".town-square",
  ]) {
    assert.ok(rule(selector).includes("var(--paper-grain)"),
      `${selector} does not share the paper texture`);
  }
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
  const composer = rule(".chat-column-villager .chat-composer");
  assert.ok(composer.includes("border-radius:") && !composer.includes("border-radius: 20px"),
    "the composer still has the uniform rounded-panel silhouette");

  const actions = rule(".chat-column-villager .chat-composer-actions .pill");
  assert.ok(actions.includes("box-shadow: none"),
    "New and Send still carry a chunky lower edge inside the field");
  assert.ok(actions.includes("border-radius:") && !actions.includes("999px"),
    "New and Send still read as oversized pills");

  const hover = rule(".chat-column-villager .chat-composer-actions .pill:hover:not(:disabled)");
  assert.ok(hover.includes("translateY(-1px)") && !hover.includes("scale(1.04)"),
    "the composer controls still use the large glossy-button hover");

  const primary = rule(".chat-column-villager .pill-primary");
  assert.ok(primary.includes("border: 1px solid") && !primary.includes("0 5px 0"),
    "Send still uses a thick three-dimensional edge");
});

test("the flatter lantern controls become completely still for reduced motion", () => {
  const start = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "the final reduced-motion repair block is gone");
  const reduced = css.slice(start);
  for (const selector of [
    ".chat-column-villager .pill,",
    ".chat-column-villager .chat-composer-actions .pill { transition: none; }",
    ".chat-column-villager .pill:hover:not(:disabled),",
    ".chat-column-villager .chat-composer-actions .pill:active:not(:disabled)",
  ]) {
    assert.ok(reduced.includes(selector), `${selector} is not covered at matching specificity`);
  }
  assert.ok(reduced.includes("{ transform: none; }"),
    "the lantern's hover or press still travels under reduced motion");
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
