/**
 * Task 255 - the resident-program board's own contract.
 *
 * This suite reads the lab sources as text rather than importing them: the
 * board imports CSS and mounts React, neither of which `node --test` can do.
 * What it can do - and what actually protects the owner - is recompute every
 * WCAG ratio from the same token values the page ships, so a later edit that
 * quietly drops a colour below its floor fails here instead of shipping.
 *
 * Rendering itself is proved by `resident-program-board.browser.spec.ts`, and
 * absence from production by `resident-program-bundle-dark.test.mjs`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The unit suite compiles to CommonJS under dist-unit/tests-unit, so the app
// root is two levels up - the same reckoning the other source-scan tests use.
const APP_ROOT = resolve(__dirname, "..", "..");
const CSS = readFileSync(resolve(APP_ROOT, "lab/resident-program.css"), "utf8");
const TSX = readFileSync(resolve(APP_ROOT, "lab/resident-program.tsx"), "utf8");
const HTML = readFileSync(resolve(APP_ROOT, "lab/resident-program.html"), "utf8");

/* ------------------------------------------------------------------ colour */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  assert.equal(full.length, 6, `not an opaque hex colour: ${hex}`);
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Hairlines are `rgb(r g b / a%)`, not hex, so they have no luminance of their
 * own - what the eye meets is the hairline composited over whatever it sits on.
 * c4 claims hairlines are proved at 3:1, and without this they were not
 * measurable at all: `luminance()` threw on the first one.
 */
function flatten(overlay: string, groundHex: string): string {
  const parts = /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)%\s*\)/u.exec(overlay.trim());
  assert.ok(parts, `not an rgb(r g b / a%) colour: ${overlay}`);
  const alpha = Number(parts[4]) / 100;
  const ground = rgb(groundHex);
  const mixed = [1, 2, 3].map((i) => Math.round(Number(parts[i]) * alpha + ground[i - 1] * (1 - alpha)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function ratio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Reads one theme's token block. The light block is the `:root,` selector; the
 * dark block is the `:root[data-theme="dark"],` selector. The System block is
 * a third copy inside a media query and is checked separately for equality, so
 * a token fixed in one place and forgotten in another cannot slip through.
 */
function tokenBlock(startsWith: string): Map<string, string> {
  const at = CSS.indexOf(startsWith);
  assert.notEqual(at, -1, `missing token block: ${startsWith}`);
  const open = CSS.indexOf("{", at);
  const close = CSS.indexOf("\n}", open);
  assert.ok(close > open, `unterminated token block: ${startsWith}`);
  const body = CSS.slice(open + 1, close);
  const map = new Map<string, string>();
  for (const line of body.split("\n")) {
    const match = /^\s*(--rp-[a-z0-9-]+)\s*:\s*([^;]+);/u.exec(line);
    if (match) map.set(match[1], match[2].trim());
  }
  return map;
}

const LIGHT = tokenBlock(":root,\n[data-rp-scheme=\"light\"]");
const DARK = tokenBlock(":root[data-theme=\"dark\"],\n[data-rp-scheme=\"dark\"]");
const SYSTEM = tokenBlock(":root:not([data-theme=\"light\"])");

/** Pairs the page actually renders. `min` is the WCAG floor for that use. */
const PAIRS: { ink: string; ground: string; min: number; why: string }[] = [
  { ink: "--rp-ink", ground: "--rp-paper", min: 4.5, why: "Cairn's prose on conversation paper" },
  { ink: "--rp-ink", ground: "--rp-paper-raised", min: 4.5, why: "body text on raised paper" },
  { ink: "--rp-ink", ground: "--rp-paper-chrome", min: 4.5, why: "body text on chrome paper" },
  { ink: "--rp-ink", ground: "--rp-chrome", min: 4.5, why: "body text on the shell panel" },
  { ink: "--rp-ink-strong", ground: "--rp-paper", min: 4.5, why: "headings on paper" },
  { ink: "--rp-ink-strong", ground: "--rp-chrome", min: 4.5, why: "headings on the shell panel" },
  { ink: "--rp-ink-muted", ground: "--rp-paper", min: 4.5, why: "secondary text on paper" },
  { ink: "--rp-ink-muted", ground: "--rp-paper-raised", min: 4.5, why: "swatch metadata" },
  { ink: "--rp-ink-muted", ground: "--rp-paper-chrome", min: 4.5, why: "captions on chrome paper" },
  { ink: "--rp-ink-muted", ground: "--rp-chrome", min: 4.5, why: "secondary text on the shell panel" },
  // The rail carries glyphs, not prose, so its floor is the non-text 3:1. Any
  // text that ever lands there uses full ink, which is checked on the row below.
  { ink: "--rp-ink-muted", ground: "--rp-rail", min: 3, why: "rail glyphs (non-text)" },
  { ink: "--rp-ink", ground: "--rp-rail", min: 4.5, why: "any text in the rail" },
  { ink: "--rp-teal-ink", ground: "--rp-paper", min: 4.5, why: "the kicker and teal links" },
  { ink: "--rp-teal-ink", ground: "--rp-paper-raised", min: 4.5, why: "teal text on raised paper" },
  { ink: "--rp-on-teal", ground: "--rp-teal", min: 4.5, why: "the label on the primary button" },
  { ink: "--rp-on-teal", ground: "--rp-teal-press", min: 4.5, why: "the label on the pressed button" },
  { ink: "--rp-on-amber", ground: "--rp-amber", min: 4.5, why: "the decision flag on amber" },
  { ink: "--rp-apricot-ink", ground: "--rp-apricot", min: 4.5, why: "the owner's own note" },
  { ink: "--rp-activity-ink", ground: "--rp-activity", min: 4.5, why: "WORKING in the activity capsule" },
  { ink: "--rp-sage-ink", ground: "--rp-sage", min: 4.5, why: "VERIFIED DONE" },
  { ink: "--rp-coral-ink", ground: "--rp-coral", min: 4.5, why: "STOPPED and ERROR" },
  { ink: "--rp-amber-ink", ground: "--rp-paper-raised", min: 4.5, why: "the project chip in the rail" },
  // Non-text: 3:1 is the floor for controls, focus rings and state marks.
  { ink: "--rp-teal", ground: "--rp-paper", min: 3, why: "the button's own edge against paper" },
  { ink: "--rp-teal", ground: "--rp-paper-raised", min: 3, why: "the button against the composer" },
  { ink: "--rp-focus", ground: "--rp-paper", min: 3, why: "the focus ring on paper" },
  { ink: "--rp-focus", ground: "--rp-paper-raised", min: 3, why: "the focus ring on raised paper" },
  { ink: "--rp-focus", ground: "--rp-chrome", min: 3, why: "the focus ring on the shell panel" },
  { ink: "--rp-coral-line", ground: "--rp-paper", min: 3, why: "the STOPPED rule and seam mark" },
  { ink: "--rp-coral-line", ground: "--rp-paper-raised", min: 3, why: "the STOPPED receipt's left rule" },
  { ink: "--rp-sage-ink", ground: "--rp-paper-raised", min: 3, why: "the DONE receipt's left rule" },
];

for (const [themeName, tokens] of [["light", LIGHT], ["dark", DARK]] as const) {
  test(`c4 · every rendered colour pair clears its WCAG floor (${themeName})`, () => {
    const failures: string[] = [];
    for (const pair of PAIRS) {
      const ink = tokens.get(pair.ink);
      const ground = tokens.get(pair.ground);
      assert.ok(ink, `${themeName} is missing ${pair.ink}`);
      assert.ok(ground, `${themeName} is missing ${pair.ground}`);
      const measured = ratio(ink, ground);
      if (measured < pair.min) {
        failures.push(
          `${pair.ink} on ${pair.ground} = ${measured.toFixed(2)}:1, needs ${pair.min}:1 — ${pair.why}`,
        );
      }
    }
    assert.deepEqual(failures, [], `contrast failures in ${themeName}:\n  ${failures.join("\n  ")}`);
  });
}

const GROUNDS = ["--rp-paper", "--rp-paper-raised", "--rp-paper-chrome", "--rp-chrome", "--rp-activity"];

for (const [themeName, tokens] of [["light", LIGHT], ["dark", DARK]] as const) {
  test(`c4 · a control's own boundary clears the 3:1 non-text floor (${themeName})`, () => {
    // WCAG 1.4.11 holds the visible boundary of a user-interface component to
    // 3:1. The board drew those boundaries with the DECORATIVE hairline, which
    // measures about 1.7:1 - so the input and the quiet button had edges a
    // low-vision user could not find. `--rp-control-edge` exists for that job.
    const edge = tokens.get("--rp-control-edge");
    assert.ok(edge, `${themeName} is missing --rp-control-edge`);
    const failures: string[] = [];
    for (const groundToken of GROUNDS) {
      const ground = tokens.get(groundToken);
      assert.ok(ground, `${themeName} is missing ${groundToken}`);
      const measured = ratio(edge, ground);
      if (measured < 3) failures.push(`--rp-control-edge on ${groundToken} = ${measured.toFixed(2)}:1`);
    }
    assert.deepEqual(failures, [], `control-edge failures in ${themeName}:\n  ${failures.join("\n  ")}`);

    // And every control the board renders must actually use it.
    for (const rule of [".rp-field-input", ".rp-btn-quiet", ".rp-toggle"]) {
      const at = CSS.indexOf(`${rule} {`);
      assert.notEqual(at, -1, `missing rule ${rule}`);
      const body = CSS.slice(at, CSS.indexOf("}", at));
      assert.match(body, /border(?:-color)?:[^;]*var\(--rp-control-edge\)/u,
        `${rule} must draw its boundary with --rp-control-edge, not a decorative hairline`);
    }
  });

  test(`c4 · decorative hairlines are visible, and are not asked to do a control's job (${themeName})`, () => {
    // These are seams between paper surfaces. WCAG asks nothing of pure
    // decoration, so the honest claim is "visible", not "3:1" - which is why
    // the brief no longer says hairlines are proved at the non-text floor.
    for (const line of ["--rp-hairline", "--rp-hairline-strong"]) {
      const overlay = tokens.get(line);
      assert.ok(overlay, `${themeName} is missing ${line}`);
      for (const groundToken of GROUNDS) {
        const measured = ratio(flatten(overlay, tokens.get(groundToken)!), tokens.get(groundToken)!);
        assert.ok(measured > 1.2,
          `${line} on ${groundToken} is ${measured.toFixed(2)}:1 — too faint to read as a seam at all`);
      }
    }
    // No control may fall back to a decorative hairline for its edge.
    const controlRules = [".rp-btn ", ".rp-btn-quiet", ".rp-field-input", ".rp-toggle "];
    for (const rule of controlRules) {
      const at = CSS.indexOf(`${rule}{`) === -1 ? CSS.indexOf(rule.trim() + " {") : CSS.indexOf(`${rule}{`);
      if (at === -1) continue;
      const body = CSS.slice(at, CSS.indexOf("}", at));
      assert.ok(!/border[^;]*var\(--rp-hairline/u.test(body),
        `${rule.trim()} draws its own edge with a decorative hairline`);
    }
  });
}

/**
 * The palette section renders one specimen per swatch, and each swatch names
 * its own ink. A hand-written PAIRS list cannot see a NEW swatch, which is how
 * two real failures hid here at once: teal at 4.31:1 in Light and amber at
 * 1.48:1 in Dark. So the pairs are DERIVED from the board's own table instead.
 */
function swatchPairs(): { role: string; token: string; ink: string }[] {
  const at = TSX.indexOf("const SWATCHES");
  assert.notEqual(at, -1, "the board must keep its swatch table where this test can read it");
  const table = TSX.slice(at, TSX.indexOf("\n];", at));
  const pairs = [...table.matchAll(
    /\{\s*role:\s*"([^"]+)",\s*token:\s*"(--rp-[a-z0-9-]+)",[^}]*?ink:\s*"(--rp-[a-z0-9-]+)"\s*\}/gu,
  )].map((m) => ({ role: m[1], token: m[2], ink: m[3] }));
  assert.ok(pairs.length >= 12, `only parsed ${pairs.length} swatches; the table shape changed`);
  return pairs;
}

for (const [themeName, tokens] of [["light", LIGHT], ["dark", DARK]] as const) {
  test(`c4 · every palette specimen is legible on its own swatch (${themeName})`, () => {
    const failures: string[] = [];
    for (const pair of swatchPairs()) {
      const ink = tokens.get(pair.ink);
      const ground = tokens.get(pair.token);
      assert.ok(ink && ground, `${themeName} is missing ${pair.ink} or ${pair.token}`);
      const measured = ratio(ink, ground);
      if (measured < 4.5) {
        failures.push(`"${pair.role}" specimen ${pair.ink} on ${pair.token} = ${measured.toFixed(2)}:1`);
      }
    }
    assert.deepEqual(failures, [], `illegible palette specimens in ${themeName}:\n  ${failures.join("\n  ")}`);
  });
}

test("c4 · the System block is the Dark block, token for token", () => {
  // Three copies of the dark palette exist because CSS custom properties cannot
  // be aliased across a media query without re-declaring them. That duplication
  // is the risk; this is the guard.
  const missing: string[] = [];
  const different: string[] = [];
  for (const [name, value] of DARK) {
    if (!SYSTEM.has(name)) missing.push(name);
    else if (SYSTEM.get(name) !== value) different.push(`${name}: dark=${value} system=${SYSTEM.get(name)}`);
  }
  assert.deepEqual(missing, [], "tokens defined for explicit Dark but not for System-resolved dark");
  assert.deepEqual(different, [], "System-resolved dark disagrees with explicit Dark");
});

test("c4 · light and dark define exactly the same token names", () => {
  const onlyLight = [...LIGHT.keys()].filter((k) => !DARK.has(k));
  const onlyDark = [...DARK.keys()].filter((k) => !LIGHT.has(k));
  assert.deepEqual(onlyLight, [], "tokens with no dark value would fall back to the light one");
  assert.deepEqual(onlyDark, []);
});

/* ------------------------------------------------------------------ states */

const REQUIRED_STATES = [
  { state: "ready", truth: "Ready" },
  { state: "thinking", truth: "Thinking" },
  { state: "needs-decision", truth: "Needs decision" },
  { state: "working", truth: "Working · 1 approved task" },
  { state: "checking", truth: "Checking" },
  { state: "done", truth: "Verified done" },
  { state: "stopped", truth: "Stopped" },
  { state: "error", truth: "Error" },
  { state: "disconnected", truth: "Not connected" },
];

test("c3 · all nine semantic states are on the board with their literal words", () => {
  for (const entry of REQUIRED_STATES) {
    assert.ok(
      TSX.includes(`state: "${entry.state}"`),
      `the state board is missing a row for ${entry.state}`,
    );
    assert.ok(
      TSX.includes(`truth: "${entry.truth}"`),
      `${entry.state} does not carry its literal written truth "${entry.truth}"`,
    );
    assert.ok(
      new RegExp(`case "${entry.state}":`, "u").test(TSX) || entry.state === "ready",
      `${entry.state} has no drawn expression`,
    );
  }
});

test("c3 · no two states are drawn with the same face", () => {
  // Colour and words already separate the states; the faces must too, or the
  // expression board is claiming a distinction it does not make.
  //
  // `ready` is the switch's DEFAULT and sits last, so slicing to the next
  // `case "` returned nothing for it and it was silently skipped - leaving the
  // one collision most likely to happen (a state drifting back into the
  // approved resting face) undetectable. Every face is now compared, ready
  // included, by cutting each case at the next `case`/`default` OR at the end
  // of the switch.
  const switchStart = TSX.indexOf("function Face(");
  assert.notEqual(switchStart, -1);
  const switchEnd = TSX.indexOf("\n}\n", switchStart);
  const bodies = new Map<string, string>();
  const marks = /<(?:OutlinedSquare|SolidSquare|CrescentUp|Bar|SteppedMouth)\b[^/]*\/>/gu;

  for (const entry of REQUIRED_STATES) {
    const label = entry.state === "ready" ? 'case "ready":\n    default:' : `case "${entry.state}":`;
    const at = TSX.indexOf(label, switchStart);
    assert.notEqual(at, -1, `no drawn expression for ${entry.state}`);
    const nextCase = TSX.indexOf('case "', at + label.length);
    const end = nextCase === -1 || nextCase > switchEnd ? switchEnd : nextCase;
    // Compare the DRAWN MARKS, not the source text, so a comment or a
    // reformat cannot make two identical faces look different.
    const drawn = (TSX.slice(at, end).match(marks) ?? [])
      .map((m) => m.replace(/\s+/gu, " "))
      .join("|");
    assert.ok(drawn.length > 0, `${entry.state} draws no marks at all`);
    const clash = [...bodies].find(([, other]) => other === drawn);
    assert.equal(clash?.[0], undefined, `${entry.state} draws the same face as ${clash?.[0]}`);
    bodies.set(entry.state, drawn);
  }
  assert.equal(bodies.size, 9, "every one of the nine states needs its own drawn expression");
});

test("c3 · a card never describes eyes the drawing does not draw", () => {
  // The needs-decision card said "level" while the drawing lifted the right
  // eye, and STOPPED's card used near-identical words - erasing in prose the
  // one feature that separates pushback from a stop. A caption the owner reads
  // to know what to look for must not contradict the thing beside it.
  const face = (state: string) => {
    const label = state === "ready" ? 'case "ready":\n    default:' : `case "${state}":`;
    const at = TSX.indexOf(label);
    assert.notEqual(at, -1, `no drawn expression for ${state}`);
    const next = TSX.indexOf('case "', at + label.length);
    return TSX.slice(at, next === -1 ? TSX.indexOf("\n}\n", at) : next);
  };
  const card = (state: string) => {
    const at = TSX.indexOf(`state: "${state}",`);
    assert.notEqual(at, -1, `no state row for ${state}`);
    return /character: "([^"]+)"/u.exec(TSX.slice(at, at + 900))![1];
  };

  // "level" eyes must actually be drawn at the same y.
  for (const state of REQUIRED_STATES.map((r) => r.state)) {
    const text = card(state);
    if (!/eyes[^.]*\blevel\b/iu.test(text)) continue;
    const drawn = face(state);
    const lifted = /y=\{EYE_L\.y\s*[-+]/u.test(drawn);
    assert.equal(lifted, false,
      `the ${state} card says its eyes are level, but the drawing offsets one of them`);
  }

  // And the two coral states must not share a description either.
  assert.notEqual(card("needs-decision"), card("stopped"),
    "needs-decision and stopped must not be described with the same words");
});

test("c3 · STOPPED and ERROR carry their required written truth, not just a badge", () => {
  // The constitution requires more than the status word for these two.
  for (const state of ["stopped", "error"]) {
    const at = TSX.indexOf(`state: "${state}",`);
    const row = TSX.slice(at, at + 1200);
    const consequence = /consequence: "([^"]+)"/u.exec(row);
    assert.ok(consequence, `${state} must carry its effect and recovery in plain words`);
    assert.ok(consequence[1].length > 60, `${state}'s written truth is too thin to be a real recovery`);
  }
  assert.match(TSX, /\{row\.consequence \? <p className="rp-state-consequence">/u,
    "the written truth must actually be rendered, not merely declared");
  assert.match(CSS, /\.rp-state-consequence \{[^}]*color: var\(--rp-ink\)/u,
    "required truth is full ink, never muted away");
});

test("c3 · STOPPED and ERROR differ by shape, not only by colour", () => {
  assert.match(CSS, /\.rp-glyph-stop\s*\{[^}]*border-radius:\s*2px/u, "STOPPED needs a square mark");
  assert.match(CSS, /\.rp-glyph-error\s*\{[^}]*border-radius:\s*50%/u, "ERROR needs a round mark");
  assert.match(TSX, /tone="down"/u, "ERROR needs its inverted stepped mouth");
});

/* ------------------------------------------------------------ art contract */

test("c2 · the program is code-native, decorative, and announces nothing", () => {
  // The only url() on the page is the SVG clip-path reference; no raster,
  // remote image, or generated bitmap may appear anywhere.
  const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/[^\n]*$/gmu, "");
  const code = strip(TSX);
  // The CSS is the file that actually embeds an image, so scanning only the
  // TSX left the one real raster risk unexamined.
  const style = strip(CSS);
  for (const [name, text] of [["tsx", code], ["css", style], ["html", HTML]] as const) {
    assert.ok(!/<img\b/u.test(text), `${name} must not load a raster asset`);
    assert.ok(
      !/\.(?:png|jpe?g|gif|webp|avif)\b/iu.test(text),
      `${name} must not load a bitmap (naming one in a comment is fine)`,
    );
  }
  assert.ok(!/url\((?!`?#)/u.test(code), "the TSX's only url() may be an in-document SVG reference");
  // The stylesheet has exactly one url(): the shared paper grain, which is an
  // inline SVG data URI - vector, local, and the single texture the
  // constitution allows.
  const urls = [...style.matchAll(/url\(([^)]*)\)/gu)].map((m) => m[1].slice(0, 34));
  assert.equal(urls.length, 1, `the stylesheet may embed exactly one asset, found: ${urls.join(", ")}`);
  assert.match(urls[0], /^"data:image\/svg\+xml/u, "the one embedded asset must be an inline SVG");
  assert.ok(!/data:image\/(?!svg)/u.test(style), "no raster data URI may be embedded");

  // The art itself: hidden from the accessibility tree, unfocusable, unnamed.
  const at = TSX.indexOf("function CairnProgram(");
  assert.notEqual(at, -1);
  const program = TSX.slice(at, TSX.indexOf("\n}\n", TSX.indexOf("</svg>", at)));
  assert.match(program, /aria-hidden="true"/u);
  assert.match(program, /focusable="false"/u);
  assert.ok(!/role="img"/u.test(program), "the art must not become an announced image");
  assert.ok(!/<title>|aria-label=|aria-live=/u.test(program),
    "the program must have no accessible name and no announced state; the words carry the truth");
});

test("c2 · one geometry serves every size", () => {
  assert.match(TSX, /const PANE_W = 76;/u);
  assert.match(TSX, /const PANE_H = 63\.5;/u);
  // 12.8, measured: the reference's cut is 41 px across a 240 px pane. An
  // eyeballed 9.5 shipped a corner 26% too shallow.
  assert.match(TSX, /const CHAMFER = 12\.8;/u);
  assert.match(TSX, /const scale = size \/ PANE_H;/u,
    "size must mean the front pane's height, so 88 px matches the approved mockup");
  // The clipped top-right corner is the approved silhouette, not a rounded box.
  assert.match(TSX, /L \$\{PANE_X \+ PANE_W\} \$\{PANE_Y \+ CHAMFER\}/u);
});

/* ---------------------------------------------------------------- motion */

test("c6 · no animation loops, and reduced motion has a matching rule", () => {
  assert.ok(!/\binfinite\b/u.test(CSS), "nothing on this page may loop");
  assert.ok(!/animation-iteration-count/u.test(CSS));
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/u.exec(CSS);
  assert.ok(reduced, "the page must answer prefers-reduced-motion");
  for (const name of ["rp-anim-arrive", "rp-anim-settle"]) {
    assert.ok(reduced[1].includes(name), `${name} has no reduced-motion counterpart`);
  }
  assert.match(reduced[1], /animation:\s*none/u);
});

/**
 * Walks the stylesheet, tracking brace depth, and returns every rule whose own
 * body declares something - paired with the selector that opened it. Written
 * by hand because the alternative, a regex, silently attributes a declaration
 * to the PREVIOUS rule's last line, which is how a bad rule hides from a test
 * that looks like it is passing.
 */
function rules(css: string): { selector: string; body: string }[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//gu, "");
  const out: { selector: string; body: string }[] = [];
  const stack: string[] = [];
  let token = "";
  for (const ch of stripped) {
    if (ch === "{") {
      stack.push(token.trim().replace(/\s+/gu, " "));
      token = "";
    } else if (ch === "}") {
      const selector = stack.pop() ?? "";
      out.push({ selector, body: token });
      token = "";
    } else {
      token += ch;
    }
  }
  assert.equal(stack.length, 0, "unbalanced braces in resident-program.css");
  return out;
}

test("c6 · no transform is applied to a container holding a control", () => {
  // `.rp-btn:active` transforms the button itself, which IS the control - not
  // a box wrapped around one. Keyframes are the motion primitives themselves.
  // `(?<![-\w])` matters: a plain \b also matches inside `text-transform`,
  // which would have made this test pass by accident on eight harmless rules.
  const declares = (body: string, property: string): string[] =>
    [...body.matchAll(new RegExp(String.raw`(?<![-\w])${property}:\s*([^;]+);`, "gu"))]
      .map((m) => m[1].trim())
      .filter((value) => value !== "none");

  const movers = rules(CSS)
    .filter((rule) => declares(rule.body, "transform").length > 0)
    .map((rule) => rule.selector)
    .sort();
  // Two `from` frames, no `to` frame: both keyframes END at `transform: none`,
  // which is precisely why skipping the animation for reduced motion lands on
  // the identical rendered state instead of somewhere mid-flight.
  assert.deepEqual(movers, [".rp-btn:active", "from", "from"],
    "only the button itself and the two keyframe openings may move; wrapping a control "
    + "in a moving box breaks hit-testing");
  const endFrames = rules(CSS).filter((rule) => rule.selector === "to");
  assert.equal(endFrames.length, 2, "each keyframe needs an explicit resting end state");
  for (const frame of endFrames) assert.match(frame.body, /transform:\s*none;/u);

  // And what is animated must be the art, never a box around a control.
  const animated = rules(CSS)
    .filter((rule) => declares(rule.body, "animation").length > 0)
    .flatMap((rule) => rule.selector.split(",").map((s) => s.trim()))
    .sort();
  assert.deepEqual([...new Set(animated)], [".rp-anim-arrive", ".rp-anim-settle"]);
  assert.match(TSX, /className=\{\["rp-program"/u, "the arrival class belongs to the art alone");
});

/* -------------------------------------------------------------- typography */

test("c4 · type sizes, measure and targets stay inside the constitution", () => {
  const prose = /\.rp-cairn-prose \{[^}]*max-width: (\d+)ch;[^}]*font-size: (\d+)px;[^}]*line-height: ([\d.]+)/u.exec(CSS);
  assert.ok(prose, "Cairn's prose must set an explicit measure, size and line height");
  const measure = Number(prose[1]);
  const size = Number(prose[2]);
  const leading = Number(prose[3]);
  assert.ok(size >= 16 && size <= 18, `conversation prose is ${size}px, must be 16-18px`);
  assert.ok(leading >= 1.5 && leading <= 1.6, `conversation prose leads at ${leading}, must be 1.5-1.6`);
  // Read from the file rather than pinned to a literal. The previous version
  // asserted `max-width: 62ch` while its own failure message said 65-75, so it
  // guarded the wrong number and would have passed forever.
  assert.ok(measure >= 65 && measure <= 75, `conversation measure is ${measure}ch, must be 65-75ch`);
  // Every control the board renders declares a 44 px minimum.
  for (const rule of [".rp-btn", ".rp-toggle button", ".rp-field-input"]) {
    const at = CSS.indexOf(`${rule} {`);
    assert.notEqual(at, -1, `missing rule ${rule}`);
    const body = CSS.slice(at, CSS.indexOf("}", at));
    assert.match(body, /min-height: 44px/u, `${rule} must be at least 44 px tall`);
  }
  assert.match(CSS, /--rp-sans: Quicksand/u, "the board uses the bundled face, not a new one");
  assert.match(TSX, /@fontsource\/quicksand\/700\.css/u);
});

/* ---------------------------------------------------------- lab isolation */

test("c7 · the board imports nothing from production and offers no action", () => {
  const imports = [...TSX.matchAll(/^import\s+(?:[^"']*from\s+)?["']([^"']+)["'];/gmu)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), [
    "./resident-program.css",
    "@fontsource/quicksand/400.css",
    "@fontsource/quicksand/600.css",
    "@fontsource/quicksand/700.css",
    "react",
    "react-dom/client",
  ].sort(), "the board must not reach into src/, core/, or any new dependency");
  for (const forbidden of ["window.cairn", "ipcRenderer", "fetch(", "XMLHttpRequest", "dangerouslySetInnerHTML", "localStorage"]) {
    assert.ok(!TSX.includes(forbidden), `the board must not use ${forbidden}`);
  }
  // The board's only behaviour is switching its own theme. `onChange` here is
  // a prop on the board's own ThemeControl component, not a DOM handler; the
  // single DOM handler is the theme button's onClick.
  const handlers = [...new Set([...TSX.matchAll(/\son[A-Z][a-zA-Z]+=\{/gu)].map((m) => m[0].trim()))].sort();
  assert.deepEqual(handlers, ["onChange={", "onClick={"],
    "the board's only behaviours are switching its own theme and replaying one animation");
  // Every click handler, named exactly. Both change local view state and
  // nothing else: neither can approve, dispatch, apply, send, or publish.
  // Brace-counted rather than regexed: `[^}]*\}?[^}]*` runs straight past the
  // handler's own closing brace and swallows the rest of the element.
  const clicks: string[] = [];
  for (let at = TSX.indexOf("onClick={"); at !== -1; at = TSX.indexOf("onClick={", at + 1)) {
    let depth = 0;
    let end = at + "onClick=".length;
    for (; end < TSX.length; end++) {
      if (TSX[end] === "{") depth++;
      else if (TSX[end] === "}" && --depth === 0) break;
    }
    clicks.push(TSX.slice(at + "onClick={".length, end).trim());
  }
  assert.deepEqual(clicks.sort(), [
    "() => onChange(choice)",
    "() => setReplays((n) => n + 1)",
  ].sort());
  assert.match(TSX, /rp-btn-inert/u, "the sample approval pair must be drawn, not built from controls");
  assert.ok(!/<button[^>]*>\s*Approve/u.test(TSX), "an approval control must not exist on a lab board");
});

test("c7 · the page declares itself synthetic and carries its marker", () => {
  assert.match(HTML, /cairn-resident-program-board/u);
  assert.match(HTML, /synthetic data \/ visual lab/u);
  assert.match(HTML, /Content-Security-Policy/u);
  assert.match(TSX, /cairn-resident-program-board\/v1/u);
});
