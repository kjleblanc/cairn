import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAIRN_GEOMETRY,
  CAIRN_PROGRAM_STATES,
  CairnProgram,
  type CairnProgramState,
} from "../src/renderer/components/CairnProgram.js";

/* ------------------------------------------------------------------------ *
 * Task 258, `c5` and `c6` — the shipped Cairn.
 *
 * Task 255's board suite reads the source as text, which is the right tool for
 * a page that cannot be mounted. This one RENDERS the component, so it can
 * answer questions text cannot: what is actually drawn for each state, how big
 * Cairn really comes out at a given `size`, and whether the art reaches the
 * accessibility tree.
 *
 * The two suites overlap on purpose. The board's proves the constitution is
 * demonstrated; this one proves the thing that ships obeys it.
 * ------------------------------------------------------------------------ */

const SPEC = readFileSync(
  resolve(__dirname, "..", "..", "..", "docs", "superpowers", "specs",
    "2026-08-13-cairn-resident-program-visual-design.md"),
  "utf8",
);
const SOURCE = readFileSync(
  join(__dirname, "..", "..", "src", "renderer", "components", "CairnProgram.tsx"), "utf8");

function draw(props: Parameters<typeof CairnProgram>[0] = {}): string {
  return renderToStaticMarkup(createElement(CairnProgram, props));
}

function attribute(markup: string, name: string): string | null {
  return new RegExp(`${name}="([^"]*)"`, "u").exec(markup)?.[1] ?? null;
}

/* ------------------------------------------------------------ the geometry */

test("c5: the drawn geometry is the constitution's measured table", () => {
  // The spec's section 3 is the authority. Reading the numbers back out of it
  // means the drawing cannot drift from the document that approved it — and a
  // reformat of the table fails loudly rather than silently un-checking this.
  const row = (label: string): string => {
    const found = new RegExp(`\\| ${label} \\| ([^|]+)\\|`, "u").exec(SPEC);
    assert.ok(found, `the spec has no measured row for ${label}`);
    return found[1];
  };

  const pane = row("Front pane");
  assert.match(pane, /x 30, y 26, w 76, h 63\.5/u);
  assert.match(pane, /corner radius 5\.5/u);
  assert.match(pane, /top-right chamfer 12\.8/u);
  assert.equal(CAIRN_GEOMETRY.pane.x, 30);
  assert.equal(CAIRN_GEOMETRY.pane.y, 26);
  assert.equal(CAIRN_GEOMETRY.pane.w, 76);
  assert.equal(CAIRN_GEOMETRY.pane.h, 63.5);
  assert.equal(CAIRN_GEOMETRY.pane.r, 5.5);
  // 12.8, measured: the reference's cut is 41 px across a 240 px pane. An
  // eyeballed 9.5 shipped a corner 26% too shallow, on the single most
  // distinctive line of the silhouette.
  assert.equal(CAIRN_GEOMETRY.pane.chamfer, 12.8);

  assert.match(row("Left eye"), /12\.3 at \(46\.4, 45\.9\)/u);
  assert.equal(CAIRN_GEOMETRY.eyeLeft.x, 46.4);
  assert.equal(CAIRN_GEOMETRY.eyeLeft.y, 45.9);
  assert.equal(CAIRN_GEOMETRY.eyeLeft.s, 12.3);

  assert.match(row("Right eye"), /centre x 84\.6, ends at y 54\.4, rx 4\.95, ry 3\.9/u);
  assert.equal(CAIRN_GEOMETRY.eyeRight.cx, 84.6);
  assert.equal(CAIRN_GEOMETRY.eyeRight.base, 54.4);
  assert.equal(CAIRN_GEOMETRY.eyeRight.rx, 4.95);
  assert.equal(CAIRN_GEOMETRY.eyeRight.ry, 3.9);

  // The viewBox and the mark's are both named in the spec's prose.
  assert.match(SPEC, /The `viewBox` is `0 3 128 94`/u);
  assert.match(SPEC, /The compact mark's is `22 18 90 78`/u);
  assert.deepEqual({ ...CAIRN_GEOMETRY.view }, { x: 0, y: 3, w: 128, h: 94 });
  assert.deepEqual({ ...CAIRN_GEOMETRY.markView }, { x: 22, y: 18, w: 90, h: 78 });
});

test("c5: the mouth is a staircase — two posts and a bar strictly between them", () => {
  // The detail most easily got wrong. Row by row the reference gives three
  // SEPARATE blocks, not one outline, and the spec's own table says so.
  const cell = (label: string): string => {
    const found = new RegExp(`\\| ${label} \\| ([^|]+)\\|`, "u").exec(SPEC);
    assert.ok(found, `the spec has no row for ${label}`);
    return found[1].trim();
  };
  assert.equal(cell("Left post"), "x 65.9, y 70.8, 3.8 × 3.8");
  assert.equal(cell("Bar"), "x 69.7, y 74.9, 10.1 × 3.5");
  assert.equal(cell("Right post"), "x 79.8, y 70.8, 4.1 × 3.8");

  const { leftPost, bar, rightPost } = CAIRN_GEOMETRY.mouth;
  assert.deepEqual({ ...leftPost }, { x: 65.9, y: 70.8, w: 3.8, h: 3.8 });
  assert.deepEqual({ ...bar }, { x: 69.7, y: 74.9, w: 10.1, h: 3.5 });
  assert.deepEqual({ ...rightPost }, { x: 79.8, y: 70.8, w: 4.1, h: 3.8 });

  // The relationships that make it a staircase rather than a U.
  assert.ok(bar.y > leftPost.y + leftPost.h - 0.001, "the bar must sit BELOW the posts");
  assert.ok(bar.x >= leftPost.x + leftPost.w - 0.001, "the bar must start at or after the left post");
  assert.ok(bar.x + bar.w <= rightPost.x + 0.001, "the bar must end at or before the right post");
  assert.ok(rightPost.w > leftPost.w, "the lopsidedness is the right post being a hair wider");

  // And it really is drawn that way: three separate rects at rest.
  //
  // Compared as NUMBERS, not as formatted strings. The right post is drawn as
  // `x + 13.9` from a mouth origin of 65.9, and in binary floating point that
  // lands on 79.80000000000001 — the one coordinate in the whole drawing that
  // does not print cleanly. It parses to the same place, so this is a fact
  // about the emitted text rather than about the picture, and the arithmetic
  // is left exactly as the owner approved it.
  const drawnRects = [...draw({ state: "ready" })
    .matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill="currentColor"/gu)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]), w: Number(match[3]), h: Number(match[4]) }));
  for (const block of [leftPost, bar, rightPost]) {
    const found = drawnRects.find((drawn) =>
      Math.abs(drawn.x - block.x) < 0.001 && Math.abs(drawn.y - block.y) < 0.001
      && Math.abs(drawn.w - block.w) < 0.001 && Math.abs(drawn.h - block.h) < 0.001);
    assert.ok(found, `the resting face does not draw the mouth block at ${block.x},${block.y}`);
  }
  assert.equal(drawnRects.length, 3, "the resting mouth is exactly three blocks");
});

/* ------------------------------------------------------------ `size` */

test("c5: size means the amber pane's height, not the bounding box", () => {
  // Sizing by the box would ship a Cairn about a third smaller than the one the
  // owner approved. Compute the pane height back out of the rendered box and
  // the viewBox, exactly as a reader measuring the screen would.
  for (const size of [28, 34, 64, 88]) {
    for (const variant of ["full", "mark"] as const) {
      const markup = draw({ size, variant });
      const height = Number(attribute(markup, "height"));
      const box = attribute(markup, "viewBox")!.split(" ").map(Number);
      const paneHeight = (height / box[3]!) * CAIRN_GEOMETRY.pane.h;
      assert.ok(
        Math.abs(paneHeight - size) < 0.75,
        `size=${size} variant=${variant} drew a pane ${paneHeight.toFixed(1)} px tall`,
      );
    }
  }
  // The whole 28-88 range the plan names is one geometry, scaled.
  assert.match(SOURCE, /const scale = size \/ PANE_H;/u);
});

test("c5: the mark is a reduction, not a shrink", () => {
  // Below about 40 px the rear fan and the data squares turn to mud, so the
  // compact variant drops them and keeps the pane, its clipped corner and the
  // face. The approved mockup does the same in its own header.
  const full = draw({ state: "ready", variant: "full" });
  const mark = draw({ state: "ready", variant: "mark" });

  const rects = (markup: string) => (markup.match(/<rect\b/gu) ?? []).length;
  assert.ok(rects(full) > rects(mark), "the mark must draw fewer parts than the full body");
  // The two data marks and the three fan panes are the parts that go.
  assert.ok(full.includes('fill="var(--rp-mark-sage)"'), "the full body carries its data marks");
  assert.ok(!mark.includes("--rp-mark-sage"), "the mark must drop the data squares");
  assert.ok(full.includes('fill="var(--rp-rear)"'), "the full body carries its rear fan");
  assert.ok(!mark.includes("--rp-rear"), "the mark must drop the rear fan");
  assert.ok(!mark.includes("--rp-seam"), "the mark must drop the seam pane");
  // What it must NOT drop: the pane, the chamfer, and the face.
  assert.ok(mark.includes("--rp-amber-edge"), "the mark keeps the pane's own edge");
  assert.ok(mark.includes(`L ${CAIRN_GEOMETRY.pane.x + CAIRN_GEOMETRY.pane.w} `), "the mark keeps the clipped corner");
  assert.ok(mark.includes("<path") && /stroke="currentColor"|fill="currentColor"/u.test(mark),
    "the mark keeps the face");
});

/* --------------------------------------------------------- the nine states */

/** Everything the face actually draws, with the pane and chrome removed. */
function drawnFace(state: CairnProgramState): string {
  const markup = draw({ state, variant: "mark" });
  const marks = markup.match(/<(?:rect|path|circle)\b[^>]*(?:currentColor)[^>]*>/gu) ?? [];
  return marks.join("|");
}

test("c5: every one of the nine states draws, and no two draw the same face", () => {
  assert.equal(CAIRN_PROGRAM_STATES.length, 9);
  const seen = new Map<string, CairnProgramState>();
  for (const state of CAIRN_PROGRAM_STATES) {
    const face = drawnFace(state);
    assert.ok(face.length > 0, `${state} draws no face at all`);
    const clash = seen.get(face);
    assert.equal(clash, undefined, `${state} draws the same face as ${clash}`);
    seen.set(face, state);
  }
  assert.equal(seen.size, 9);
});

test("c5: STOPPED and ERROR differ by shape, never by colour alone", () => {
  // Colour-blind, monochrome, or simply not looking closely: these two must be
  // told apart by the drawing itself, and by the words beside it.
  const stopped = draw({ state: "stopped" });
  const error = draw({ state: "error" });

  // The seam mark: a hollow SQUARE for stopped, a CIRCLE for error.
  assert.ok(/<rect[^>]*stroke="var\(--rp-coral-line\)"/u.test(stopped), "STOPPED needs its hollow square");
  assert.ok(!/<circle/u.test(stopped), "STOPPED must not use the round mark");
  assert.ok(/<circle[^>]*stroke="var\(--rp-coral-line\)"/u.test(error), "ERROR needs its round mark");

  // And the faces themselves are different drawings.
  assert.notEqual(drawnFace("stopped"), drawnFace("error"));
  // Both carry coral, so colour alone would NOT separate them — which is the
  // point of asserting the shapes above.
  assert.ok(stopped.includes("--rp-coral-line") && error.includes("--rp-coral-line"));
});

test("c5: the resting face is Face D, and working turns the lower data mark teal", () => {
  const ready = draw({ state: "ready" });
  // The approved resting face: an outlined square, a crescent, the stepped smile.
  assert.ok(/<rect[^>]*fill="none"[^>]*stroke="currentColor"/u.test(ready), "the outlined left eye");
  assert.ok(/<path d="M [\d.]+ 54\.4 A 4\.95 3\.9 0 0 1/u.test(ready), "the closed crescent right eye");

  const working = draw({ state: "working" });
  assert.ok(working.includes('fill="var(--rp-teal)"'), "working turns the lower data mark teal");
  assert.ok(!ready.includes('fill="var(--rp-teal)"'), "the resting state has no teal mark");
});

test("c5: disconnected drains the pane instead of inventing a tenth state", () => {
  const off = draw({ state: "disconnected" });
  assert.ok(off.includes("var(--rp-paper-chrome)"), "a disconnected pane is drained, not amber");
  assert.ok(off.includes("var(--rp-ink-muted)"), "its face goes muted rather than full ink");
  // Still Cairn: the silhouette and the marks are the same vocabulary.
  assert.ok(off.includes(`L ${CAIRN_GEOMETRY.pane.x + CAIRN_GEOMETRY.pane.w} `), "the clipped corner stays");
});

/* -------------------------------------------------- the accessibility rule */

test("c6: the art announces nothing — the words carry every truth", () => {
  for (const state of CAIRN_PROGRAM_STATES) {
    for (const variant of ["full", "mark"] as const) {
      const markup = draw({ state, variant, animate: true });
      assert.equal(attribute(markup, "aria-hidden"), "true", `${state}/${variant} is not hidden`);
      assert.equal(attribute(markup, "focusable"), "false", `${state}/${variant} is focusable`);
      for (const forbidden of ["<title", "<desc", "role=", "aria-label", "aria-labelledby", "aria-live", "tabindex"]) {
        assert.ok(!markup.includes(forbidden),
          `${state}/${variant} carries ${forbidden}; the program must have no announced name or state`);
      }
    }
  }
});

test("c6: state reaches the DOM as data, so a surface can style it without reading colour", () => {
  for (const state of CAIRN_PROGRAM_STATES) {
    assert.equal(attribute(draw({ state }), "data-rp-program"), state);
  }
  assert.equal(attribute(draw({ variant: "mark" }), "data-rp-variant"), "mark");
});

/* ------------------------------------------------------------- the motion */

test("c6: the arrival is opt-in, finite, and lands where the still frame is", () => {
  assert.ok(!draw({ state: "ready" }).includes("rp-anim-arrive"), "nothing moves that you did not cause");
  assert.ok(draw({ state: "ready", animate: true }).includes("rp-anim-arrive"), "the arrival is available");

  const motion = readFileSync(join(__dirname, "..", "..", "src", "renderer", "motion.css"), "utf8");
  const block = motion.slice(motion.indexOf("@keyframes rp-arrive"));
  assert.ok(!/\binfinite\b/u.test(block), "the resident program's motion may not loop");

  // Both keyframes must END at `transform: none`. That is exactly why skipping
  // them for reduced motion lands on the identical rendered state rather than
  // somewhere mid-flight.
  for (const name of ["rp-arrive", "rp-settle"]) {
    const at = motion.indexOf(`@keyframes ${name}`);
    assert.notEqual(at, -1, `${name} is missing`);
    const body = motion.slice(at, motion.indexOf("\n}", at));
    assert.match(body, /to \{[^}]*transform: none;/u, `${name} has no resting end state`);
  }

  // And every animation declared for these components is re-killed for reduced
  // motion — the trap this stylesheet's own header warns about.
  const reduced = [...motion.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/gu)]
    .map((match) => match[1]).join("\n");
  for (const name of ["rp-anim-arrive", "rp-anim-settle"]) {
    assert.ok(reduced.includes(name), `${name} has no reduced-motion counterpart`);
  }
});

/* --------------------------------------------------------- originality */

test("c5: the drawing is code-native — no raster, no remote asset, no dependency", () => {
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/[^\n]*$/gmu, "");
  assert.ok(!/<img\b/u.test(code));
  assert.ok(!/\.(?:png|jpe?g|gif|webp|avif)\b/iu.test(code), "no bitmap may be referenced");
  assert.ok(!/data:image\/(?!svg)/u.test(code), "no raster data URI");
  // The only url() may be the in-document clip/gradient reference.
  for (const url of code.match(/url\([^)]*\)/gu) ?? []) {
    assert.match(url, /^url\(#|^url\(`?#|^url\(\$\{|^url\(#\$/u, `unexpected asset reference: ${url}`);
  }
  // React only. A drawing that needed a library would be a dependency decision,
  // and this slice is explicitly not allowed to make one.
  const imports = [...SOURCE.matchAll(/^import .*? from "(.*?)";$/gmu)].map((match) => match[1]);
  assert.deepEqual(imports, ["react"]);
});
