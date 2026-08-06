import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const tokens = renderer("tokens.css");
const chatmock = readFileSync(join(__dirname, "..", "..", "lab", "chatmock-view.tsx"), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * Task 185: project navigation and current-project context are shore furniture
 * inside the pond, not opaque application panels sitting beside and above it.
 */
test("the rail dissolves into the pond instead of drawing a dividing wall", () => {
  assert.ok(tokens.includes("--environment-island"),
    "the night garden does not define one shared island material");
  assert.ok(tokens.includes("--environment-edge"),
    "the night garden does not define one shared island edge");

  const rail = rule(".project-rail");
  assert.ok(rail.includes("var(--environment-shore)"),
    "the rail is not made from the night garden's shore material");
  assert.ok(!rail.includes("border-right"),
    "the rail still draws a hard wall between projects and the pond");
});

test("the shared material reaches the standalone Town preview", () => {
  assert.match(chatmock, /<TownSquare\b/,
    "the visual lab no longer carries the standalone Town consumer");
  const root = tokens.slice(tokens.indexOf(":root {"), tokens.indexOf("\n}", tokens.indexOf(":root {")));
  for (const token of [
    "--environment-shore",
    "--environment-island",
    "--environment-edge",
    "--environment-shadow",
  ]) {
    assert.ok(root.includes(token), `${token} is not global to every TownSquare`);
  }
});

test("the selected project stays a pond wash while current context becomes an annotation", () => {
  const selected = rule(".rail-project-active");
  assert.ok(selected.includes("var(--environment-island)"),
    "the selected project does not use the environment's island material");
  assert.ok(!selected.includes("var(--environment-edge)"),
    "the selected project still draws a shoreline around itself");
  assert.ok(!selected.includes("inset 2px 0"),
    "the selected project still carries the old sidebar stripe");

  const header = rule(".town-square-header");
  assert.ok(header.includes("background: transparent"),
    "the current-project header still covers the pond with a full-width band");
  assert.ok(!header.includes("border-bottom"),
    "the current-project header still divides the pond with a hard line");

  const annotation = rule(".town-project-label,\n.town-header-actions");
  assert.ok(annotation.includes("background: transparent"),
    "the current-project context still paints another island card");
  assert.ok(annotation.includes("border: 0") && annotation.includes("box-shadow: none"),
    "the current-project context still carries glass-card chrome");
});

test("rail and current-project controls have unmistakable keyboard focus", () => {
  for (const selector of [
    ".rail-collapse:focus-visible",
    ".rail-project-select:focus-visible",
    ".rail-project-toggle:focus-visible",
    ".rail-action:focus-visible",
    ".town-square-header button:focus-visible",
  ]) {
    const focused = rule(selector);
    assert.match(focused, /outline:\s*3px solid var\(--garden-cyan\)/,
      `${selector} does not show the shared three-pixel focus ring`);
  }
});

test("the rail palette now belongs to the approved pond palette", () => {
  for (const mapping of [
    "--neon: var(--garden-cyan)",
    "--neon-soft: var(--garden-cyan-dim)",
    "--neon-warm: var(--pond-task)",
    "--neon-green: var(--pond-done)",
  ]) {
    assert.ok(tokens.includes(mapping), `${mapping} is not wired`);
  }
  assert.ok(!tokens.includes("keeps the old teal"),
    "tokens.css still declares the project rail outside the pond palette");
});
