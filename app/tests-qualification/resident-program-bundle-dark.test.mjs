import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Task 255 - "product-dark" means absent from production imports, routes and
 * emitted bundles. It does NOT mean dark-coloured.
 *
 * Run this against a FRESH build; it inspects emitted output, not source
 * intent, because an import that no test looks at is exactly how a lab page
 * ends up shipped:
 *
 *   npm.cmd run build:vite
 *   npm.cmd run build:lab
 *   node --test tests-qualification/resident-program-bundle-dark.test.mjs
 */

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * Markers that belong to the BOARD and to nothing else.
 *
 * REWRITTEN by Task 258 (Slice 3), because the original set stopped
 * discriminating. It matched `CairnProgram`, `rp-program` and the bare phrase
 * `resident-program`, all three of which now legitimately live in production:
 * Slice 3's whole job was to promote that primitive out of the lab, and its
 * class and component name went with it.
 *
 * Two things this discovered, both disclosed in Task 258's report:
 *  - the loose phrase had ALREADY turned this test red on `main`. Task 257's
 *    `renderer/activity/presentation.ts` names "the resident-program visual
 *    overhaul" in its header comment, and Task 257 never ran this file.
 *  - a marker that matches a word in a COMMENT was never testing imports.
 *
 * What remains is board-only: its declared marker, a path reference to its
 * source, and three classes that exist nowhere but the board. The contract is
 * unchanged — "product-dark" still means absent from production imports,
 * routes and emitted bundles, and it does NOT mean dark-coloured.
 */
const BOARD_MARKER = /cairn-resident-program-board|lab\/resident-program|rp-state-consequence|rp-btn-inert|rp-swatch/iu;

function files(root, extensions = /\.(?:js|css|html)$/u) {
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...files(path, extensions));
    else if (entry.isFile() && extensions.test(entry.name)) output.push(path);
  }
  return output;
}

function bundleText(root, label) {
  assert.equal(existsSync(root), true,
    `missing fresh bundle root ${root} — run the two builds above before this test`);
  const found = files(root);
  assert.ok(found.length > 0, `${label} bundle is empty at ${root}`);
  return found.map((path) => readFileSync(path, "utf8")).join("\n");
}

test("c7 · the board is in the lab bundle and in no production bundle", () => {
  const mainRoot = resolve(APP_ROOT, ".vite", "build");
  const rendererRoot = resolve(APP_ROOT, ".vite", "renderer");
  const labRoot = resolve(APP_ROOT, ".vite", "lab");

  // Positive control first. If this fails, the negative results below prove
  // nothing at all — they would just mean the marker never existed anywhere.
  const lab = bundleText(labRoot, "lab");
  assert.match(lab, BOARD_MARKER, "the lab bundle must contain the board; otherwise this test is vacuous");
  assert.match(lab, /cairn-resident-program-board/u);

  const main = bundleText(mainRoot, "main");
  const renderer = bundleText(rendererRoot, "renderer");
  assert.doesNotMatch(main, BOARD_MARKER, "Main must not carry a lab-only visual board");
  assert.doesNotMatch(renderer, BOARD_MARKER, "the production renderer must not carry a lab-only visual board");

  const preloadFiles = files(mainRoot).filter((path) => /preload/iu.test(path));
  // Positive control for the preload check too: an empty file list would make
  // "the board is not in the preload" true for the wrong reason.
  assert.ok(preloadFiles.length > 0, "no preload bundle was found; the check below would be vacuous");
  const preload = preloadFiles.map((path) => readFileSync(path, "utf8")).join("\n");
  assert.ok(preload.length > 0, "the preload bundle is empty; the check below would be vacuous");
  assert.doesNotMatch(preload, BOARD_MARKER);

  // Task 229's lab page must still be in the lab bundle: this task added an
  // entry, it did not replace one.
  assert.match(lab, /builder-proposal-review/u,
    "Task 229's lab page must survive alongside the new one");
});

test("c7 · no production source, config or route references the board", () => {
  const srcRoot = resolve(APP_ROOT, "src");
  const consumers = [];
  const walk = (root) => {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.(?:ts|tsx|css|html)$/u.test(entry.name)) {
        if (BOARD_MARKER.test(readFileSync(path, "utf8"))) {
          consumers.push(relative(srcRoot, path).replaceAll("\\", "/"));
        }
      }
    }
  };
  walk(srcRoot);
  assert.deepEqual(consumers, [],
    "nothing under app/src may import, route to, or even name the lab board");

  // The production build configs must not know it exists either.
  for (const relativePath of [
    "index.html",
    "package.json",
    "forge.config.ts",
    "vite.main.config.ts",
    "vite.preload.config.ts",
    "vite.renderer.config.ts",
    "playwright.config.ts",
  ]) {
    const text = readFileSync(resolve(APP_ROOT, relativePath), "utf8");
    assert.doesNotMatch(text, BOARD_MARKER, relativePath);
  }

  // And exactly one build config knows: the lab's.
  const labConfig = readFileSync(resolve(APP_ROOT, "vite.lab.config.ts"), "utf8");
  assert.match(labConfig, /residentprogram: "lab\/resident-program\.html"/u);
});

test("c7 · the board reaches nothing that could act", () => {
  const board = readFileSync(resolve(APP_ROOT, "lab", "resident-program.tsx"), "utf8");
  const css = readFileSync(resolve(APP_ROOT, "lab", "resident-program.css"), "utf8");
  const html = readFileSync(resolve(APP_ROOT, "lab", "resident-program.html"), "utf8");

  for (const seam of [
    "node:fs", "node:child_process", "electron", "ipcRenderer", "contextBridge",
    "window.cairn", "fetch(", "XMLHttpRequest", "WebSocket", "EventSource",
    "localStorage", "sessionStorage", "indexedDB", "navigator.clipboard",
    "process.env", "eval(", "dangerouslySetInnerHTML", "@cairn/core",
  ]) {
    assert.ok(!board.includes(seam), `the board must not reach ${seam}`);
  }

  /*
   * `../src/` used to be on that list. Task 258 (Slice 3) deliberately gave the
   * board exactly two production imports, so that it demonstrates the CairnProgram
   * the app actually ships instead of a private copy of the same geometry.
   *
   * A blanket ban would now be false, so the reach is enumerated instead: these
   * two and nothing else. `app.css`, the token file, the stores and every
   * behaviour-bearing screen stay out — importing the retired night-garden
   * cascade would mean judging the new system through the old one, and
   * importing anything that acts would give a lab board authority.
   */
  const reach = [...board.matchAll(/from "(\.\.\/src\/[^"]+)"|import "(\.\.\/src\/[^"]+)"/gu)]
    .map((match) => match[1] ?? match[2]).sort();
  assert.deepEqual(reach, [
    "../src/renderer/cairn-program.css",
    "../src/renderer/components/CairnProgram",
  ], "the board may take only the shipped primitive from production");

  // No remote anything, in any of the three files. The allowed exceptions are
  // the SVG namespace URI, which is an identifier and not a fetch, and the
  // localhost entries in the dev server's own connect-src.
  const REMOTE = /(?:https?|wss?):\/\/(?!www\.w3\.org\b)(?!localhost[:/*])(?!127\.0\.0\.1[:/*])/u;
  for (const [name, text] of [["tsx", board], ["css", css], ["html", html]]) {
    const hit = REMOTE.exec(text);
    assert.equal(hit, null,
      `${name} must reference no remote origin (found near: ${text.slice(hit?.index ?? 0, (hit?.index ?? 0) + 60)})`);
  }
  assert.match(html, /default-src 'self'/u, "the lab page keeps its content-security policy");
  assert.match(html, /form-action 'none'/u);
  assert.match(html, /base-uri 'none'/u);
  assert.doesNotMatch(html, /script-src[^;]*unsafe-eval/u);
});
