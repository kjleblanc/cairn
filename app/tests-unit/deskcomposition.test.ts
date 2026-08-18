import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------------ *
 * Task 259, `c1`, `c5`, `c6` and `c7` — the chat-first desk.
 *
 * These are structural, and deliberately so. `Workspace` and `Chat` cannot be
 * rendered in `node:test`: between them they reach the IPC bridge, the
 * conductor stream and the serial runtime, so the RENDERED proof that no Town,
 * pond or tucked chat is mounted comes from `tests/conductor.spec.ts` and
 * `tests/projects.spec.ts` driving a real Electron window. What lives here is
 * the fast causal half — the wiring that, if it broke, would make those slow
 * suites fail for a reason nobody could read from the failure.
 *
 * The capture-identity test below is the one that matters most. It is not
 * cosmetic: `src/main/evidencecapture.ts` finds the stage by CLASS and reads
 * the project identity off it, and `src/main` is not this slice's to change.
 * Renaming that class while moving the composition would have silently blinded
 * evidence capture, with every other test still green.
 * ------------------------------------------------------------------------ */

const RENDERER = join(__dirname, "..", "..", "src", "renderer");
const MAIN = join(__dirname, "..", "..", "src", "main");

const WORKSPACE = readFileSync(join(RENDERER, "screens", "Workspace.tsx"), "utf8");
const CHAT = readFileSync(join(RENDERER, "screens", "Chat.tsx"), "utf8");
const RAIL = readFileSync(join(RENDERER, "components", "ProjectRail.tsx"), "utf8");
const WORKSPACE_CSS = readFileSync(join(RENDERER, "workspace.css"), "utf8");
const CAPTURE = readFileSync(join(MAIN, "evidencecapture.ts"), "utf8");

/**
 * Comments are prose, not code. Task 257 turned a bundle check red by naming
 * this overhaul in a header comment, which is how a repository learns that a
 * marker matching a word in a comment was never testing imports. Every scan
 * below reads the CODE, so a file may still explain what it used to do.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "");
}

/** Every `.tsx`/`.ts` under `src/renderer`, excluding the retired Town's own
 *  directory and components, which stay on disk until Slice 10. */
function rendererSources(): { name: string; path: string; text: string }[] {
  const found: { name: string; path: string; text: string }[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/u.test(entry.name)) {
        found.push({ name: entry.name, path: full, text: withoutComments(readFileSync(full, "utf8")) });
      }
    }
  };
  walk(RENDERER);
  return found;
}

const RETIRED_SURFACES = ["TownSquare.tsx", "TownDetail.tsx"];
const TOWN_DIRECTORY = `${join("renderer", "town")}`;

/* ------------------------------------------------------- c1: unmounted ---- */

test("c1: PondLine is gone, and nothing imports it", () => {
  assert.ok(!existsSync(join(RENDERER, "components", "PondLine.tsx")),
    "PondLine.tsx still exists");
  for (const source of rendererSources()) {
    assert.ok(!/PondLine/u.test(source.text), `${source.name} still names PondLine`);
  }
});

test("c1: the Town still exists on disk and reaches nothing that mounts", () => {
  // Slice 10 deletes these. Slice 4's contract is only that the running app
  // never reaches them — an obsolete file may safely remain.
  for (const retired of RETIRED_SURFACES) {
    assert.ok(existsSync(join(RENDERER, "components", retired)),
      `${retired} was deleted a slice early; Slice 10 owns that`);
  }
  const reachable = rendererSources().filter((source) =>
    !RETIRED_SURFACES.includes(source.name)
    && !source.path.includes(TOWN_DIRECTORY)
    && /from "\.{1,2}\/(?:components\/)?Town|from "\.{1,2}\/town\//u.test(source.text));
  assert.deepEqual(reachable.map((source) => source.name), [],
    "a mounted component still imports the Town");
});

test("c1: no tucked chat survives anywhere in the renderer", () => {
  for (const retired of ["chat-villager", "chat-tuck", "villager-chip", "Tuck the conversation"]) {
    for (const source of rendererSources()) {
      assert.ok(!source.text.includes(retired),
        `${source.name} still renders '${retired}'`);
    }
  }
  assert.ok(!/\btucked\b/u.test(withoutComments(CHAT)), "Chat still carries a tucked state");
});

test("c1: the workspace mounts the capsule and nothing scenic", () => {
  assert.match(WORKSPACE, /<ActivityCapsule presence=\{presence\} \/>/u,
    "the workspace does not mount the activity capsule");
  for (const scenery of ["<TownSquare", "<PondLine", "wholePond", "onPositionsChange", "townLoad", "townSave"]) {
    assert.ok(!WORKSPACE.includes(scenery), `the workspace still reaches for '${scenery}'`);
  }
});

/* --------------------------------------------- c2: one Cairn, one value --- */

test("c2: exactly one production component draws Cairn", () => {
  // "There is one canonical expressive presence." A second `<CairnProgram>` in
  // production would be a second place a state could be read from.
  const drawing = rendererSources().filter((source) => /<CairnProgram\b/u.test(source.text));
  assert.deepEqual(drawing.map((source) => source.name), ["ActivityCapsule.tsx"],
    "Cairn is drawn in more than one production surface");
});

test("c2: the workspace resolves the presence once and hands it over", () => {
  assert.equal([...WORKSPACE.matchAll(/resolveCairnPresence\(/gu)].length, 1,
    "the workspace resolves the presence more than once");
  assert.match(WORKSPACE,
    /resolveCairnPresence\(\{ activity: runtimePresentation, needsOwner: chatNeedsYou, connected \}\)/u,
    "the presence is not built from the runtime projection, Chat's seam and the connection");
  // Chat still publishes the seam rather than a second component working it out.
  assert.match(CHAT, /onNeedsYouChange\?\.\(needsYou\)/u,
    "Chat no longer publishes its needs-you signal");
  assert.match(WORKSPACE, /onNeedsYouChange=\{setChatNeedsYou\}/u,
    "the workspace no longer receives Chat's needs-you signal");
});

test("the native title bar has a measured drag region with clickable children", () => {
  const main = readFileSync(join(process.cwd(), "src", "main", "main.ts"), "utf8");
  const rule = (selector: string): string => {
    const at = WORKSPACE_CSS.indexOf(`${selector} {`);
    assert.notEqual(at, -1, `workspace.css has no ${selector} rule`);
    return WORKSPACE_CSS.slice(at, WORKSPACE_CSS.indexOf("}", at));
  };
  const header = rule(".rp-desk-header");
  const children = rule(".rp-desk-header > *");

  assert.match(main, /titleBarOverlay:\s*\{[\s\S]*?color:\s*"#dbdcdd"[\s\S]*?symbolColor:\s*"#0d2634"[\s\S]*?height:\s*41/u,
    "the native window controls no longer have Cairn's measured header styling");
  assert.match(header, /padding:\s*8px calc\(138px \+ 16px\) 8px 16px/u,
    "the header no longer reserves the three-button native overlay width");
  assert.match(header, /-webkit-app-region:\s*drag/u,
    "the visible top bar is no longer a draggable window region");
  assert.match(children, /-webkit-app-region:\s*no-drag/u,
    "header controls can be swallowed by the drag region");
});

/* ------------------------------------------------ c5: capture identity ---- */

test("c5: the capture selector and the stage's identity attributes are the same element", () => {
  // `src/main/evidencecapture.ts` is out of this slice's scope and finds the
  // stage by class. Pin the class it exports to the element that actually
  // carries the identity, so a rename in the renderer cannot blind it.
  const exported = /WORKSPACE_STAGE_SELECTOR = "\.([a-z-]+)"/u.exec(CAPTURE)?.[1];
  assert.equal(exported, "workspace-stage", "the main-process capture selector moved");
  const stage = new RegExp(
    `<section className="[^"]*\\b${exported}\\b[^"]*"[^>]*data-project-dir=\\{activeDir\\}`
    + "[\\s\\S]{0,200}?data-project-generation=", "u");
  assert.match(WORKSPACE, stage,
    "the element main captures by class is not the element carrying the project identity");
});

test("c5: the project generation still advances exactly once per project change", () => {
  assert.match(WORKSPACE, /if \(captureProjectRef\.current\.dir !== activeDir\) \{[\s\S]*?generation: captureProjectRef\.current\.generation \+ 1,/u,
    "the project-generation guard was lost in the composition change");
});

test("c4: a project switch still invalidates every request in flight", () => {
  for (const guard of [
    "runtimeAppliedRef.current = ++runtimeRequestRef.current;",
    "statusAppliedRef.current = ++statusRequestRef.current;",
    "if (activeDirRef.current !== dir || request < runtimeAppliedRef.current) return;",
    "if (activeDirRef.current !== dir || request < statusAppliedRef.current) return;",
    "if (!hydrate && next === current) return;",
  ]) {
    assert.ok(WORKSPACE.includes(guard), `the stale-request guard '${guard}' is gone`);
  }
});

/* --------------------------------------------------- c6: region, focus ---- */

test("c6: the conversation is a named region inside the desk's main content", () => {
  assert.ok(!/role=\{embedded \? "dialog"/u.test(CHAT), "the conversation is still a dialog");
  assert.match(CHAT, /role=\{embedded \? "region" : undefined\}/u);
  assert.match(CHAT, /aria-label=\{embedded \? "Conversation with Cairn" : undefined\}/u);
  assert.match(WORKSPACE, /<main className="rp-desk-view">/u,
    "the routed view is not a main landmark");
  assert.equal([...WORKSPACE.matchAll(/<main\b/gu)].length, 1, "more than one main landmark");
});

test("c6: the shell's talk intent still lands on the composer", () => {
  assert.match(CHAT, /if \(!focusSignal\) return;[\s\S]{0,160}composerRef\.current\?\.focus\(\)/u,
    "the focus signal no longer focuses the composer");
  assert.match(WORKSPACE, /setChatFocusSignal\(\(n\) => n \+ 1\)/u);
});

test("c6: the rail keeps its behaviour and takes the desk's material", () => {
  assert.match(RAIL, /className=\{`project-rail rp-desk-rail\$\{collapsed \? " project-rail-collapsed rp-desk-rail-slim" : ""\}`\}/u,
    "the rail is not wired into the desk, or lost its existing compaction hook");
  assert.match(RAIL, /aria-label="Cairn projects"/u);
  assert.match(RAIL, /onToggleCollapsed/u);
});

/* ------------------------------------------------------ c7: composition -- */

test("c7: a long project name shortens, and the connection state never does", () => {
  const rule = (selector: string): string => {
    const at = WORKSPACE_CSS.indexOf(`${selector} {`);
    assert.notEqual(at, -1, `workspace.css has no ${selector} rule`);
    return WORKSPACE_CSS.slice(at, WORKSPACE_CSS.indexOf("}", at));
  };
  assert.match(rule(".rp-desk-title"), /text-overflow: ellipsis/u);
  assert.match(rule(".rp-desk-title"), /white-space: nowrap/u);
  assert.match(rule(".rp-desk-connection"), /flex: none/u);
  assert.ok(!/white-space|text-overflow/u.test(rule(".rp-desk-connection")),
    "the connection state can be truncated");
});

test("c7: the transcript is the only region that scrolls", () => {
  for (const [selector, property] of [
    [".rp-desk", "overflow: hidden"],
    [".rp-desk-stage", "overflow: hidden"],
    [".rp-activity", "flex: none"],
  ] as const) {
    const at = WORKSPACE_CSS.indexOf(`${selector} {`);
    assert.notEqual(at, -1, `workspace.css has no ${selector} rule`);
    assert.ok(WORKSPACE_CSS.slice(at, WORKSPACE_CSS.indexOf("}", at)).includes(property),
      `${selector} does not declare ${property}`);
  }
  assert.match(WORKSPACE_CSS, /\.rp-conversation > \.chat-messages \{[^}]*flex-shrink: 1[^}]*min-height: 0/u,
    "the message list is not the child that absorbs the overflow");
  assert.match(WORKSPACE_CSS, /\.rp-conversation > \* \{ flex-shrink: 0; \}/u,
    "the composer and the top bar can be squeezed away");
});

test("c7: compact drops the detail and the name, and never the state", () => {
  const compact = WORKSPACE_CSS.slice(WORKSPACE_CSS.indexOf("@media (max-width: 820px)"));
  assert.match(compact, /\.rp-desk-title \{ display: none; \}/u);
  assert.match(compact, /\.rp-activity-detail \{ display: none; \}/u);
  assert.ok(!/\.rp-activity(?:-status)? \{[^}]*display: none/u.test(compact),
    "compact hides the activity state itself");
  assert.ok(!/\.rp-activity-words \{[^}]*display: none/u.test(compact));
});

/* ----------------------------------------------------- c8: motion -------- */

test("c8: the desk starts nothing that never stops", () => {
  assert.ok(!/infinite/u.test(WORKSPACE_CSS), "workspace.css declares a perpetual animation");
  // `animation: none` is the opposite of animating: it is how this file turns
  // OFF the retired panel's entrance. What must not appear is an animation
  // with a name — the constitution's one arrival and one settle live in
  // motion.css, and nothing on the desk starts either by itself.
  const started = [...WORKSPACE_CSS.matchAll(/animation(?:-name)?:\s*([^;]+);/gu)]
    .map((match) => match[1]!.trim())
    .filter((value) => value !== "none");
  assert.deepEqual(started, [], "the desk starts an animation of its own");
  assert.ok(/animation: none/u.test(WORKSPACE_CSS),
    "nothing turns off the retired panel's entrance, so it still plays");
});
