import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (file: string) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", file), "utf8");
const tokens = renderer("tokens.css");
const app = renderer("app.css");

/**
 * Decision 9, rule 3: the muted pastels supersede the saturated set. These
 * seven were chosen by the owner on 2026-08-02 and are the only colours this
 * work is allowed to introduce.
 */
const APPROVED: Array<[token: string, hex: string]> = [
  ["--garden-cyan", "#a3ddd0"],
  ["--face-kimi", "#d5c0ec"],
  ["--face-codex", "#f3c49a"],
  ["--face-claude", "#b8c9de"],
  ["--pond-done", "#c2ddb6"],
  ["--pond-stop", "#f2aaa4"],
  ["--pond-task", "#f7d3a8"],
];

/**
 * The values the pastels replace, each with the `rgb()` form it also takes.
 * Any survivor is a half-finished re-tone.
 */
const SUPERSEDED: Array<[hex: string, rgb: string]> = [
  ["#7fd8c8", "127 216 200"],
  ["#c9a7e8", "201 167 232"],
  ["#f2a35c", "242 163 92"],
  ["#9fb8d8", "159 184 216"],
  ["#a9d39b", "169 211 155"],
  ["#ff8178", "255 129 120"],
  ["#ffb467", "255 180 103"],
  ["#70e3d3", "112 227 211"],
];

test("every approved pastel is on its own token", () => {
  for (const [token, hex] of APPROVED) {
    assert.match(tokens, new RegExp(`${token}:\\s*${hex};`), `${token} is not ${hex}`);
  }
});

test("no superseded saturated value survives on a re-toned token", () => {
  // app.css as well as tokens.css, and the rgb() form as well as the hex, so
  // the test covers what its name claims. It did not: the pre-pastel teal
  // survived a whole task cycle on the town header and both town-node rules,
  // written as `rgb(112 227 211 / …)`, where a hex-only sweep of one file was
  // structurally unable to see it.
  //
  // --neon (#7fd8c8) is the project rail's own colour and is NOT part of
  // Decision 9, so its token and its one rgb() use are excluded by name rather
  // than by accident. A rail literal at any other alpha stops matching these
  // and fails the sweep, which is the right way round: it comes back to be
  // justified instead of riding in on a wildcard.
  const swept = [
    tokens.replace(/--neon:\s*#7fd8c8;/, "--neon: RAIL;"),
    app.replace(/rgb\(127 216 200 \/ 12%\)/, "RAIL"),
  ].join("\n");
  for (const [hex, rgb] of SUPERSEDED) {
    assert.ok(!swept.includes(hex), `${hex} is still in the renderer after the pastel re-tone`);
    assert.ok(!swept.includes(rgb), `${hex} survives as rgb(${rgb}) after the pastel re-tone`);
  }
});

test("each cast glow is derived from its own pastel, not the old one", () => {
  assert.match(tokens, /--garden-cyan-dim:\s*rgb\(163 221 208 \/ 35%\);/);
  assert.match(tokens, /--garden-cyan-glow:\s*rgb\(163 221 208 \/ 9%\);/);
  assert.match(tokens, /--face-kimi-glow:\s*rgb\(213 192 236 \/ 9%\);/);
  assert.match(tokens, /--face-codex-glow:\s*rgb\(243 196 154 \/ 9%\);/);
  assert.match(tokens, /--face-claude-glow:\s*rgb\(184 201 222 \/ 9%\);/);
});

test("the lantern's own surfaces and easings exist for the panel work", () => {
  for (const [token, value] of [
    ["--lantern-deep", "#161b2c"],
    ["--lantern-mid", "#212739"],
    ["--lantern-plum", "#2f2946"],
    ["--lantern-paper", "#332c3a"],
    ["--lantern-paper-lit", "#3d3444"],
    ["--lantern-ink", "#f6ece1"],
    ["--lantern-soft", "#c3b3a6"],
  ] as const) {
    assert.match(tokens, new RegExp(`${token}:\\s*${value};`), `${token} is not ${value}`);
  }
  assert.match(tokens, /--pop:\s*cubic-bezier\(\.34, 1\.56, \.64, 1\);/);
  assert.match(tokens, /--ease:\s*cubic-bezier\(\.22, \.9, \.3, 1\);/);
});

test("Gemini and the fallback worker are left saturated on purpose", () => {
  // Recorded, not fixed. The owner approved four cast colours; these two are
  // not among them, and inventing pastels for them is exactly the failure the
  // design spec's process note records. Delete this test the day they are
  // chosen — never by changing the values under it.
  assert.match(tokens, /--face-gemini:\s*#8ad8b0;/);
  assert.match(tokens, /--garden-amber:\s*#f2b95c;/);
});
