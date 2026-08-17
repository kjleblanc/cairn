import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------------ *
 * Task 258, Slice 3 — the semantic foundation, measured.
 *
 * Slice 3 adds a production token layer, three stylesheets and one component.
 * Its whole risk is that a FOUNDATION task silently recolours the rest of the
 * app before its surface slice arrives, so most of this file is about absence:
 * nothing existing moved, and nothing new can reach an unmigrated surface.
 *
 * Every ratio below is recomputed from the stylesheet's own values. Slice 1
 * proved that pinning numbers hides failures — three real contrast defects sat
 * behind pinned expectations there, one of which would have shipped a 2.28:1
 * button label to every System-on-a-dark-OS user.
 * ------------------------------------------------------------------------ */

const RENDERER = join(__dirname, "..", "..", "src", "renderer");
const TESTS = join(__dirname, "..", "..", "tests-unit");
const LAB = join(__dirname, "..", "..", "lab");

const tokensCss = readFileSync(join(RENDERER, "tokens.css"), "utf8");

/** Strip comments first: `/* --foo: bar *\/` is prose, not a declaration. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//gu, "");
}

type Declaration = { name: string; value: string; at: number };

/**
 * Every custom-property declaration, in source order. A regex to the next `;`
 * is not enough: several values here are multi-line, and `--garden-stars` is
 * ten nested `radial-gradient(...)` calls. Depth-track the parentheses and stop
 * at the first semicolon outside them.
 */
function declarations(css: string): Declaration[] {
  const source = withoutComments(css);
  const found: Declaration[] = [];
  const opener = /--([A-Za-z0-9-]+)\s*:/gu;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source)) !== null) {
    let index = opener.lastIndex;
    let depth = 0;
    let value = "";
    while (index < source.length) {
      const character = source[index]!;
      if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
      else if (character === ";" && depth === 0) break;
      value += character;
      index += 1;
    }
    found.push({ name: `--${match[1]}`, value: value.replace(/\s+/gu, " ").trim(), at: match.index });
  }
  return found;
}

function serialize(list: Declaration[]): string {
  return list.map((entry) => `${entry.name}: ${entry.value}`).sort().join("\n");
}

/* ------------------------------------------------------------------------ *
 * `c1` — every token that existed before Slice 3 still has its exact value.
 *
 * The golden was extracted from `tokens.css` at commit 91b087e BEFORE any edit
 * in this task. It is the only thing that makes "we preserved the old aliases"
 * a measurement rather than a promise: the unmigrated Town, pond, rail, lantern
 * and garden surfaces all still read these, and Slice 4 has not moved them yet.
 * ------------------------------------------------------------------------ */

test("c1: no token that existed before Slice 3 changed its value", () => {
  const golden = readFileSync(join(TESTS, "tokens-baseline.golden.txt"), "utf8")
    .replace(/\r\n/gu, "\n").trimEnd();
  const current = new Map(declarations(tokensCss).map((entry) => [entry.name, entry.value]));

  // Build output, gitignored, so a later reader can regenerate and diff.
  writeFileSync(join(__dirname, "tokens-current.txt"), serialize(declarations(tokensCss)), "utf8");

  const missing: string[] = [];
  const changed: string[] = [];
  for (const line of golden.split("\n")) {
    if (line.length === 0) continue;
    const split = line.indexOf(": ");
    const name = line.slice(0, split);
    const value = line.slice(split + 2);
    if (!current.has(name)) { missing.push(name); continue; }
    if (current.get(name) !== value) changed.push(`${name}\n    was: ${value}\n    now: ${current.get(name)}`);
  }
  assert.deepEqual(missing, [], "a token an unmigrated surface still consumes was removed");
  assert.deepEqual(changed, [], "a foundation task recoloured a surface it does not own");
});

test("c1: the baseline is a real baseline, not an empty file", () => {
  const golden = readFileSync(join(TESTS, "tokens-baseline.golden.txt"), "utf8")
    .replace(/\r\n/gu, "\n").trimEnd();
  const lines = golden.split("\n").filter((line) => line.length > 0);
  // 91b087e's tokens.css carried this many custom properties. A golden that
  // silently emptied would make the check above vacuously green.
  assert.ok(lines.length >= 90, `the baseline holds only ${lines.length} tokens`);
  assert.ok(lines.every((line) => line.startsWith("--") && line.includes(": ")));
});

test("c1: color-scheme wiring is untouched, so every light-dark() still resolves", () => {
  // Every existing token's value depends on this. Changing `color-scheme` here
  // would move 37 already-shipped `light-dark()` resolutions at once without
  // editing a single colour.
  assert.match(tokensCss, /:root\s*\{[^}]*color-scheme:\s*light dark;/u);
  assert.match(tokensCss, /:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;\s*\}/u);
  assert.match(tokensCss, /:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;\s*\}/u);
});

/* ------------------------------------------------------------------------ *
 * `c2` — the production layer is the constitution's, and agrees with the lab.
 * ------------------------------------------------------------------------ */

const labCss = readFileSync(join(LAB, "resident-program.css"), "utf8");

/** `light-dark(a, b)` → [a, b]; anything else resolves to itself in both. */
function themed(value: string): [string, string] {
  const pair = /^light-dark\(\s*([\s\S]+?)\s*,\s*([\s\S]+?)\s*\)$/u.exec(value.trim());
  return pair ? [pair[1], pair[2]] : [value.trim(), value.trim()];
}

/** One theme's `--rp-*` values as production resolves them. */
function productionPalette(theme: "light" | "dark"): Map<string, string> {
  const source = withoutComments(tokensCss);
  const out = new Map<string, string>();
  for (const entry of declarations(tokensCss)) {
    if (!entry.name.startsWith("--rp-")) continue;
    // A later block (explicit dark, or the System media query) overrides the
    // base `:root` value for the non-colour residue.
    const inDarkBlock = source.slice(0, entry.at).lastIndexOf('[data-theme="dark"]')
      > source.slice(0, entry.at).lastIndexOf(":root {");
    if (inDarkBlock && theme === "light") continue;
    if (inDarkBlock && theme === "dark") { out.set(entry.name, entry.value); continue; }
    out.set(entry.name, themed(entry.value)[theme === "light" ? 0 : 1]);
  }
  return out;
}

/** The lab's own block for a theme, read the way its own suite reads them. */
function labPalette(startsWith: string): Map<string, string> {
  const at = labCss.indexOf(startsWith);
  assert.notEqual(at, -1, `missing lab token block: ${startsWith}`);
  const open = labCss.indexOf("{", at);
  const close = labCss.indexOf("\n}", open);
  const out = new Map<string, string>();
  for (const line of labCss.slice(open + 1, close).split("\n")) {
    const match = /^\s*(--rp-[a-z0-9-]+)\s*:\s*([^;]+);/u.exec(line);
    if (match) out.set(match[1], match[2].trim());
  }
  return out;
}

test("c2: production and the owner-approved board agree token for token", () => {
  // Two copies of a palette is a drift hazard. The lab needs its three explicit
  // blocks for the side-by-side Light and Dark islands; production needs one
  // `light-dark()` per token. That is a real difference in FORM, so the values
  // are pinned together here rather than hoped to stay in step.
  const cases = [
    ["light", labPalette(':root,\n[data-rp-scheme="light"]'), productionPalette("light")],
    ["dark", labPalette(':root[data-theme="dark"],\n[data-rp-scheme="dark"]'), productionPalette("dark")],
  ] as const;

  for (const [theme, lab, production] of cases) {
    const missing: string[] = [];
    const differs: string[] = [];
    for (const [name, value] of lab) {
      if (!production.has(name)) { missing.push(name); continue; }
      if (production.get(name) !== value) differs.push(`${name}: board ${value} / production ${production.get(name)}`);
    }
    assert.deepEqual(missing, [], `${theme}: the board defines tokens production does not ship`);
    assert.deepEqual(differs, [], `${theme}: production drew a different colour from the approved board`);
  }
});

test("c2: the face ink is the same colour in both files and in both themes", () => {
  /*
   * The one colour that changed shape when Slice 3 promoted the drawing. Task
   * 255 drew Cairn's face with a bare `#12303f` inside the component; naming it
   * removed the only magic literal in the art, and the value had to stay
   * exactly the same or the approved face would have shifted.
   *
   * It sits outside both palettes deliberately — the pane is warm amber in
   * Light and in Dark, so the face never changes side — which also means the
   * token-for-token comparison above does not reach it. Hence this.
   */
  const production = declarations(tokensCss).filter((entry) => entry.name === "--rp-face-ink");
  assert.equal(production.length, 1, "the face ink must be declared exactly once");
  assert.equal(production[0].value, "#12303f");

  const lab = declarations(labCss).filter((entry) => entry.name === "--rp-face-ink");
  assert.equal(lab.length, 1, "the board must define the face ink too, or it draws an uncoloured face");
  assert.equal(lab[0].value, "#12303f");

  // And the component reads the token rather than re-hardcoding the colour.
  const component = readFileSync(
    join(RENDERER, "components", "CairnProgram.tsx"), "utf8");
  assert.match(component, /var\(--rp-face-ink\)/u);
  assert.ok(!component.includes("#12303f"), "the drawing must not carry the literal any more");
});

test("c2: every role the constitution names exists in production", () => {
  // Read the roles out of the design spec's own palette table, so adding a row
  // there without shipping it fails here.
  const spec = readFileSync(
    join(__dirname, "..", "..", "..", "docs", "superpowers", "specs",
      "2026-08-13-cairn-resident-program-visual-design.md"), "utf8");
  const named = [...spec.matchAll(/\|\s*`(--rp-[a-z0-9-]+)`\s*\|/gu)].map((match) => match[1]);
  assert.ok(named.length >= 15, `the spec's palette table yielded only ${named.length} tokens`);
  const production = productionPalette("light");
  for (const token of named) {
    assert.ok(production.has(token), `the constitution names ${token}, which production does not define`);
  }
  // And the roles the plan calls for beyond the table's colours.
  for (const token of [
    "--rp-r-lg", "--rp-r-md", "--rp-r-sm", "--rp-sans", "--rp-mono",
    "--rp-settle", "--rp-arrive", "--rp-grain", "--rp-grain-opacity", "--rp-grain-blend",
    "--rp-shadow-low", "--rp-shadow-paper", "--rp-shadow-lift",
    "--rp-focus", "--rp-focus-halo", "--rp-control-edge", "--rp-hairline",
  ]) {
    assert.ok(production.has(token), `the foundation is missing ${token}`);
  }
});

/* ------------------------------------------------------------------------ *
 * `c3` — contrast, recomputed from the shipped values in both themes.
 * ------------------------------------------------------------------------ */

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

/** A translucent value is only measurable composited over what it sits on. */
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

/** The pairings `surfaces.css` actually draws. */
const PAIRS: { ink: string; ground: string; min: number; why: string }[] = [
  { ink: "--rp-ink", ground: "--rp-paper", min: 4.5, why: ".rp-prose on .rp-paper" },
  { ink: "--rp-ink", ground: "--rp-paper-raised", min: 4.5, why: ".rp-prose on .rp-paper-raised" },
  { ink: "--rp-ink", ground: "--rp-paper-chrome", min: 4.5, why: ".rp-prose on .rp-paper-chrome" },
  { ink: "--rp-ink", ground: "--rp-chrome", min: 4.5, why: "the desk header" },
  { ink: "--rp-ink", ground: "--rp-rail", min: 4.5, why: "any text in the rail" },
  { ink: "--rp-ink-strong", ground: "--rp-paper", min: 4.5, why: ".rp-heading on paper" },
  { ink: "--rp-ink-strong", ground: "--rp-chrome", min: 4.5, why: ".rp-heading on the header" },
  { ink: "--rp-ink-muted", ground: "--rp-paper", min: 4.5, why: ".rp-label on paper" },
  { ink: "--rp-ink-muted", ground: "--rp-paper-raised", min: 4.5, why: ".rp-label on raised paper" },
  { ink: "--rp-ink-muted", ground: "--rp-paper-chrome", min: 4.5, why: ".rp-label on chrome paper" },
  { ink: "--rp-ink-muted", ground: "--rp-chrome", min: 4.5, why: ".rp-label in the header" },
  { ink: "--rp-teal-ink", ground: "--rp-paper", min: 4.5, why: ".rp-control-quiet's label" },
  { ink: "--rp-teal-ink", ground: "--rp-paper-raised", min: 4.5, why: ".rp-control-quiet on raised paper" },
  { ink: "--rp-on-teal", ground: "--rp-teal", min: 4.5, why: ".rp-control-primary's label" },
  { ink: "--rp-on-teal", ground: "--rp-teal-press", min: 4.5, why: "the pressed primary control" },
  { ink: "--rp-on-amber", ground: "--rp-amber", min: 4.5, why: "a label on Cairn's amber" },
  { ink: "--rp-apricot-ink", ground: "--rp-apricot", min: 4.5, why: ".rp-note-owner" },
  { ink: "--rp-activity-ink", ground: "--rp-activity", min: 4.5, why: ".rp-note-activity" },
  { ink: "--rp-sage-ink", ground: "--rp-sage", min: 4.5, why: ".rp-note-success" },
  { ink: "--rp-coral-ink", ground: "--rp-coral", min: 4.5, why: ".rp-note-stop" },
  { ink: "--rp-amber-ink", ground: "--rp-paper-raised", min: 4.5, why: ".rp-note-attention" },
  { ink: "--rp-face-ink", ground: "--rp-amber", min: 4.5, why: "Cairn's face on his own pane" },
  { ink: "--rp-face-ink", ground: "--rp-amber-low", min: 4.5, why: "his face at the pane's lower edge" },
  // Non-text: WCAG 1.4.11 holds controls, focus rings and state marks to 3:1.
  { ink: "--rp-control-edge", ground: "--rp-paper-raised", min: 3, why: ".rp-control's own boundary" },
  { ink: "--rp-control-edge", ground: "--rp-paper", min: 3, why: ".rp-control-quiet's boundary on paper" },
  { ink: "--rp-control-edge", ground: "--rp-chrome", min: 3, why: "a control in the header" },
  { ink: "--rp-focus", ground: "--rp-paper", min: 3, why: "the focus ring on paper" },
  { ink: "--rp-focus", ground: "--rp-paper-raised", min: 3, why: "the focus ring on raised paper" },
  { ink: "--rp-focus", ground: "--rp-chrome", min: 3, why: "the focus ring in the header" },
  { ink: "--rp-focus", ground: "--rp-field", min: 3, why: "the focus ring on the desk itself" },
  { ink: "--rp-teal", ground: "--rp-paper-raised", min: 3, why: ".rp-control-primary's fill against paper" },
  { ink: "--rp-coral-line", ground: "--rp-coral", min: 3, why: ".rp-note-stop's left rule" },
  { ink: "--rp-amber-ink", ground: "--rp-paper-raised", min: 3, why: ".rp-note-attention's left rule" },
];

for (const theme of ["light", "dark"] as const) {
  test(`c3: every pairing surfaces.css draws clears its WCAG floor (${theme})`, () => {
    const palette = productionPalette(theme);
    const value = (token: string): string => {
      const found = palette.get(token);
      assert.ok(found, `missing token ${token}`);
      return found;
    };
    for (const pair of PAIRS) {
      const measured = ratio(value(pair.ink), value(pair.ground));
      assert.ok(
        measured >= pair.min,
        `${pair.why}: ${pair.ink} on ${pair.ground} measures ${measured.toFixed(2)}:1, needs ${pair.min}:1`,
      );
    }
  });

  test(`c3: a decorative hairline is visible, and never asked to do a control's job (${theme})`, () => {
    // Two different jobs. Hairlines are seams between paper surfaces and WCAG
    // asks nothing of them; a control's own boundary is held to 3:1. Slice 1
    // shipped the first drawn with the second's token at 1.68:1.
    const palette = productionPalette(theme);
    for (const ground of ["--rp-paper", "--rp-paper-raised", "--rp-chrome"]) {
      const seam = flatten(palette.get("--rp-hairline")!, palette.get(ground)!);
      const measured = ratio(seam, palette.get(ground)!);
      assert.ok(measured > 1.02, `the hairline is invisible on ${ground} (${measured.toFixed(3)}:1)`);
      assert.ok(measured < 3, `the hairline on ${ground} is doing a control boundary's job`);
    }
  });
}

/* ------------------------------------------------------------------------ *
 * `c4` — one declaration per token, so the System trap cannot be built.
 * ------------------------------------------------------------------------ */

test("c4: no --rp- colour is declared twice, and theme variation rides in light-dark()", () => {
  const all = declarations(tokensCss).filter((entry) => entry.name.startsWith("--rp-"));
  const counts = new Map<string, number>();
  for (const entry of all) counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);

  // The five non-colour tokens are the only ones allowed a second and third
  // declaration, because CSS `light-dark()` takes colours and these are two
  // shadows, an opacity and a blend mode.
  const RESIDUE = ["--rp-shadow-low", "--rp-shadow-paper", "--rp-shadow-lift",
    "--rp-grain-opacity", "--rp-grain-blend"];
  const repeated = [...counts].filter(([, n]) => n > 1).map(([name]) => name).sort();
  assert.deepEqual(repeated, [...RESIDUE].sort(),
    "a colour declared more than once is the System trap the design spec warns about");
  for (const name of RESIDUE) {
    assert.equal(counts.get(name), 3, `${name} needs base, explicit-dark and System declarations`);
  }
});

test("c4: the System block and the explicit-dark block are identical, token for token", () => {
  // The exact guard the design spec asks for. `--rp-on-teal` was once added to
  // explicit dark and forgotten in System, which would have shipped a 2.28:1
  // button label to every System-on-a-dark-OS user.
  const source = withoutComments(tokensCss);
  /*
   * Scans EVERY occurrence of the marker and returns the block that actually
   * declares `--rp-` tokens. `:root[data-theme="dark"]` appears twice in this
   * file: once as the original one-line `color-scheme: dark` switch, and once
   * as this slice's residue block. Taking the first match returned an empty
   * map and made the comparison below vacuously true — which the
   * "yielded nothing" guard caught on its first run.
   */
  const block = (marker: string): Map<string, string> => {
    let found: Map<string, string> | null = null;
    for (let at = source.indexOf(marker); at !== -1; at = source.indexOf(marker, at + 1)) {
      const open = source.indexOf("{", at);
      const close = source.indexOf("}", open);
      const out = new Map<string, string>();
      for (const line of source.slice(open + 1, close).split("\n")) {
        const match = /^\s*(--rp-[a-z0-9-]+)\s*:\s*([^;]+);/u.exec(line);
        if (match) out.set(match[1], match[2].trim());
      }
      if (out.size > 0) found = out;
    }
    assert.ok(found, `no block matching ${marker} declares any --rp- token`);
    return found;
  };
  const explicit = block(':root[data-theme="dark"] {');
  const system = block(':root:not([data-theme="light"]) {');
  assert.ok(explicit.size > 0, "the explicit-dark block yielded nothing, so this proves nothing");
  assert.deepEqual([...system].sort(), [...explicit].sort(),
    "a token fixed in one dark block and forgotten in the other");
});

/* ------------------------------------------------------------------------ *
 * `c8` — the boundary between the new system and the retired one.
 *
 * REWRITTEN by Task 259 (Slice 4). Slice 3 wrote these three tests to prove
 * that `.rp-` reached NOTHING: no production markup carried the prefix, so a
 * stylesheet matching only `.rp-` selectors could not change a pixel. That was
 * the right guard for a foundation nobody consumed, and it is the wrong one
 * the moment the foundation is consumed — which is Slice 4's whole deliverable.
 *
 * Left as it was, the first test would have kept passing while meaning
 * nothing, and the third would have failed for a reason that is now correct
 * behaviour. So the boundary is restated as the thing that must STILL be true:
 *
 *   1. Every selector in the new sheets is ANCHORED on an `.rp-` class. A rule
 *      may reach an old class name — `.rp-conversation .chat-topbar` has to —
 *      but only inside a surface that opted in by carrying an `.rp-` class.
 *      Nothing outside the migrated desk can be recoloured from here.
 *   2. `app.css` still declares no `.rp-` selector. The retired night garden
 *      and the new system stay in separate files, so Slice 10 can delete one
 *      without reading the other.
 *   3. Production markup DOES now carry `rp-` classes. Without this the first
 *      test would silently go back to guarding a stylesheet nobody uses, which
 *      is exactly how Task 257 turned a bundle check into a comment check.
 *   4. Custom properties may be declared only inside an `.rp-`-anchored rule.
 *      Slice 3 banned them outright to stop a new sheet recolouring the app
 *      globally; a SCOPED re-point cannot do that, and it is the mechanism the
 *      migration runs on.
 * ------------------------------------------------------------------------ */

const NEW_SHEETS = ["surfaces.css", "workspace.css", "cairn-program.css"] as const;

/** Every rule's selector, brace-tracked. A regex attributes a declaration to
 *  the previous rule's last line, which is how a bad rule hides. */
function selectors(css: string): string[] {
  const stripped = withoutComments(css);
  const out: string[] = [];
  const stack: string[] = [];
  let token = "";
  for (const character of stripped) {
    if (character === "{") { stack.push(token.trim().replace(/\s+/gu, " ")); token = ""; }
    else if (character === "}") { const selector = stack.pop(); if (selector !== undefined) out.push(selector); token = ""; }
    else token += character;
  }
  assert.equal(stack.length, 0, "unbalanced braces");
  return out;
}

/** A rule and its own body, brace-tracked. `selectors()` above throws the
 *  bodies away, and a scoped-declaration check needs them. */
function rules(css: string): { selector: string; body: string }[] {
  const stripped = withoutComments(css);
  const out: { selector: string; body: string }[] = [];
  const stack: { selector: string; start: number }[] = [];
  let token = "";
  for (let index = 0; index < stripped.length; index += 1) {
    const character = stripped[index]!;
    if (character === "{") {
      stack.push({ selector: token.trim().replace(/\s+/gu, " "), start: index + 1 });
      token = "";
    } else if (character === "}") {
      const open = stack.pop();
      if (open !== undefined) out.push({ selector: open.selector, body: stripped.slice(open.start, index) });
      token = "";
    } else token += character;
  }
  assert.equal(stack.length, 0, "unbalanced braces");
  return out;
}

/** Anchored: the selector's FIRST compound carries an `.rp-` class, so the rule
 *  cannot match anything that has not opted in. */
function anchored(selector: string): boolean {
  return /^\.rp-[a-z0-9-]+/u.test(selector);
}

test("c8: every new selector is anchored on an .rp- class, so nothing outside the desk can be reached", () => {
  for (const sheet of NEW_SHEETS) {
    for (const selector of selectors(readFileSync(join(RENDERER, sheet), "utf8"))) {
      // Media queries are containers, not selectors.
      if (selector.startsWith("@media")) continue;
      for (const one of selector.split(",").map((part) => part.trim()).filter(Boolean)) {
        assert.ok(anchored(one),
          `${sheet}: "${one}" is not anchored on an .rp- class and could reach a surface outside the desk`);
      }
    }
  }
});

test("c8: the two systems stay in separate files, so one can be deleted without reading the other", () => {
  const appCss = readFileSync(join(RENDERER, "app.css"), "utf8");
  assert.ok(!/\.rp-/u.test(appCss),
    "app.css declares an rp- selector; the retired cascade and the new system must not interleave");
});

test("c8: production really does carry rp- classes now, or the anchor guard proves nothing", () => {
  // The positive control. Slice 3's version of this test asserted the OPPOSITE
  // — that no production component rendered an `rp-` class — which was true and
  // load-bearing while the foundation had no consumer. Slice 4 gave it one, so
  // the guard above only means something if the classes it constrains are
  // actually on screen.
  const carriers: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx$/u.test(entry.name) && /\brp-[a-z]/u.test(readFileSync(full, "utf8"))) {
        carriers.push(entry.name);
      }
    }
  };
  walk(RENDERER);
  assert.ok(carriers.includes("Workspace.tsx"),
    "the workspace no longer renders an rp- class, so the desk composition is not mounted");
  assert.ok(carriers.includes("ActivityCapsule.tsx"), "the activity capsule is not on the desk");
  assert.ok(carriers.length >= 3, `only ${carriers.length} components carry the prefix: ${carriers.join(", ")}`);
});

test("c8: the new stylesheets declare tokens only inside an .rp- scope, and no global rule", () => {
  // A SCOPED re-point cannot recolour an unmigrated surface — that is the whole
  // difference between it and a `:root` declaration, and it is the mechanism
  // the migration runs on: the interior of the conversation is already written
  // against the paired tokens, so re-pointing them once re-tones the paper
  // instead of two hundred rules being rewritten a slice early.
  for (const sheet of NEW_SHEETS) {
    const css = readFileSync(join(RENDERER, sheet), "utf8");
    assert.ok(!/^\s*(?:html|body|:root|\*)\b/mu.test(withoutComments(css)),
      `${sheet} carries a global selector`);
    let declaring = 0;
    for (const rule of rules(css)) {
      if (rule.selector.startsWith("@")) continue;
      if (!/--[A-Za-z0-9-]+\s*:/u.test(rule.body)) continue;
      declaring += 1;
      for (const one of rule.selector.split(",").map((part) => part.trim()).filter(Boolean)) {
        assert.ok(anchored(one),
          `${sheet}: "${one}" declares a custom property from outside an .rp- scope`);
      }
    }
    // Every declaration the file-wide scan finds must have been attributed to
    // one of those rules; a token declared at top level would be counted by
    // `declarations` and by no rule at all.
    if (declarations(css).length > 0) {
      assert.ok(declaring > 0, `${sheet} declares a token that belongs to no rule`);
    }
  }
});

test("c7: the desk adds no breakpoint of its own", () => {
  // The composition replaced a 1260 px open/closed state; it did not move a
  // width or invent one. 820 px is Slice 3's compact block and 1260 px is where
  // app.css already narrows the rail.
  const widths = new Set<string>();
  for (const sheet of NEW_SHEETS) {
    for (const match of readFileSync(join(RENDERER, sheet), "utf8")
      .matchAll(/@media \(m(?:in|ax)-width: (\d+)px\)/gu)) widths.add(match[1]!);
  }
  assert.deepEqual([...widths].sort(), ["1260", "820"],
    "the desk introduced a breakpoint the retired composition did not already have");
});
