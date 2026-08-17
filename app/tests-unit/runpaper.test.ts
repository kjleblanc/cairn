import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const surfaces = renderer("surfaces.css");
const motion = renderer("motion.css");
const chat = renderer("screens", "Chat.tsx");
const taskRun = renderer("screens", "TaskRun.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * A rule body from `surfaces.css`, found by a selector that may sit anywhere
 * in a grouped selector list rather than only at its head. The miss is an
 * assertion and never a fallback: a silent -1 here would turn every check
 * below into a check of nothing, which is the shape of dead guard Task 267
 * repaired in three other files.
 */
function surfaceRule(selector: string): string {
  for (const suffix of [" {", ",\n"]) {
    let at = surfaces.indexOf(selector + suffix);
    while (at !== -1) {
      const open = surfaces.indexOf("{", at);
      const close = surfaces.indexOf("}", open);
      if (open !== -1 && (close === -1 || open < close)) return surfaces.slice(at, close);
      at = surfaces.indexOf(selector + suffix, at + 1);
    }
  }
  return assert.fail(`surfaces.css has no rule carrying \`${selector}\``);
}

test("the project run keeps one live status node and exposes only presentation state", () => {
  assert.match(chat, /const runThreadState = session\?\.phase === "running"[\s\S]*?session\?\.error[\s\S]*?session\?\.result\?\.status === "done"[\s\S]*?session\?\.result\?\.status === "stopped"/,
    "the paper thread has no explicit main-derived presentation state");
  assert.match(chat, /<div className="run-strip" data-run-state=\{runThreadState\}>/,
    "the strip does not expose its truthful presentation state to CSS");
  assert.match(chat, /<span className=\{`run-strip-state[\s\S]*?role="status">[\s\S]*?session\.phase === "running" \? latestStage \?\? "Starting" : terminalLine[\s\S]*?<\/span>/,
    "the running and terminal text no longer swap inside one persistent live-region node");
  assert.equal((chat.match(/className=\{`run-strip-state/g) ?? []).length, 1,
    "running and terminal truth can render through more than one live-region node");
});

test("disconnected restart exposes only authenticated local results and run reattachment", () => {
  assert.match(chat,
    /if \(!status\.connected\) \{[\s\S]*?conductorConversations\(dir\)[\s\S]*?conductorTurns\(dir, id\)[\s\S]*?\.filter\(\(turn\)[\s\S]*?turn\.role === "envelope" \|\| turn\.role === "builder-review"/,
    "disconnected restore must load only authenticated local envelope and Builder-review evidence");
  assert.match(chat,
    /status && !status\.connected && turns\.some\(\(turn\) => turn\.role === "envelope" \|\| turn\.role === "builder-review"\)[\s\S]*?aria-label="Saved conversation evidence"[\s\S]*?turn\.role === "envelope"[\s\S]*?<ResultCardView[\s\S]*?<BuilderProposalReview/,
    "authenticated result cards and inert Builder reviews stay visible while ordinary prose stays hidden");
  assert.match(chat, /status && !status\.connected \? runStrip : null/,
    "the restored run has no disconnected reattachment strip");

  const disconnectedResults = chat.indexOf('aria-label="Saved conversation evidence"');
  const connectedGate = chat.indexOf("{status?.connected ? (", disconnectedResults);
  const ordinaryTurn = chat.indexOf('className={`bubble ${turn.role === "owner"');
  // Matched on the PREFIX of the class list, not on the whole attribute. Task
  // 260 appended a second class here, and an exact-attribute marker silently
  // becomes -1 — which compares as "before the gate" and would have passed this
  // assertion while proving nothing about where the composer actually sits.
  const composer = chat.indexOf('<div className="chat-composer');
  assert.notEqual(composer, -1, "the composer element cannot be found at all");
  assert.ok(disconnectedResults !== -1 && disconnectedResults < connectedGate,
    "local result receipts remain inside the connection gate");
  assert.ok(ordinaryTurn > connectedGate && composer > connectedGate,
    "ordinary prose or mutable composer controls escaped the connection gate");
});

test("the Task Run result names every STOP cause in plain words and retains its exact code", () => {
  assert.match(taskRun, /result\.status === "stopped"[\s\S]*?Why it stopped: \{codeInPlainWords\(result\.reason\)\}/,
    "the direct run surface hides the authenticated terminal cause");
  assert.match(taskRun, /Code: \{result\.reason\}/,
    "the direct run surface drops the exact terminal code needed for diagnosis");
});

/*
 * REWRITTEN by Task 267 (Slice 7). Task 189's contract is intact and every
 * idea below is still asserted; only the address changed, from the retired
 * scope in `app.css` to the conversation's own sheet. Four differences are
 * named here so they cannot be mistaken for drift:
 *
 *   - the registration mark is 3px in `--rp-teal`, not 2px in the retired
 *     garden cyan, matching every other registration rule on this paper;
 *   - the running mark's outline is 2px rather than 1.5px, because a
 *     sub-pixel border rounds inconsistently between the two themes;
 *   - the two controls have the constitution's 44 x 44 floor. They were
 *     `padding: 2px 4px` text links — roughly 20px tall — and one of them is
 *     "Stop this task". This is the same repair Slice 6 made to the question
 *     card's 40px actions, for the same reason;
 *   - their focus ring is the constitution's 3px `--rp-focus` at a 2px
 *     offset, not the retired 2px garden cyan at 3px.
 */

test("the run reads as a ruled paper thread instead of a rounded glass card", () => {
  const strip = surfaceRule(".rp-conversation .run-strip");
  for (const declaration of ["position: relative", "display: grid",
    "grid-template-columns: minmax(0, 1fr) auto auto", "border: 0", "border-radius: 0",
    "background: transparent", "box-shadow: none", "border-top: 1px solid"]) {
    assert.ok(strip.includes(declaration), `the paper thread is missing ${declaration}`);
  }

  const mark = surfaceRule(".rp-conversation .run-strip::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 3px")
    && mark.includes("var(--rp-teal)"),
  "the run thread has no restrained static registration mark");
});

test("running and terminal words have distinct non-color marks", () => {
  const state = surfaceRule(".rp-conversation .run-strip-state::before");
  assert.ok(state.includes('content: ""') && state.includes("background: currentColor"),
    "the real state word has no supplemental empty geometry");

  const running = surfaceRule('.rp-conversation .run-strip[data-run-state="running"] .run-strip-state::before');
  const done = surfaceRule('.rp-conversation .run-strip[data-run-state="done"] .run-strip-state::before');
  const stopped = surfaceRule('.rp-conversation .run-strip[data-run-state="stopped"] .run-strip-state::before');
  const error = surfaceRule('.rp-conversation .run-strip[data-run-state="error"] .run-strip-state::before');
  const closed = surfaceRule('.rp-conversation .run-strip[data-run-state="closed"] .run-strip-state::before');
  assert.match(running, /border:\s*2px solid currentColor/u, "RUNNING has no outlined mark");
  assert.match(running, /background:\s*transparent/u, "the RUNNING ring is filled, so it reads as DONE");
  assert.match(done, /border-radius:\s*50%/u, "DONE has no filled circle");
  assert.match(done, /background:\s*currentColor/u, "the DONE circle is hollow, so it reads as RUNNING");
  assert.match(stopped, /height:\s*2px/u, "STOPPED has no bar");
  assert.match(error, /border:\s*2px double currentColor/u, "ERROR has no double-outline mark");
  assert.match(closed, /border:\s*1px solid currentColor/u, "CLOSED has no hollow square");

  // Five states must be five MARKS, not one mark in five colours. Every
  // assertion above would pass on five identical rules.
  const marks = [running, done, stopped, error, closed];
  assert.equal(new Set(marks).size, marks.length,
    "two run states draw the same mark, so they differ only by colour");
});

test("the complete outcome remains a ruled second line", () => {
  const outcome = surfaceRule(".rp-conversation .run-strip-outcome");
  for (const declaration of ["grid-column: 1 / -1", "grid-row: 2", "white-space: normal",
    "overflow: visible", "text-overflow: clip", "overflow-wrap: anywhere", "border-top: 1px solid"]) {
    assert.ok(outcome.includes(declaration), `the outcome line is missing ${declaration}`);
  }
});

test("Stop and Open run are quiet text actions with unmistakable focus", () => {
  const controls = surfaceRule(".rp-conversation .run-strip-controls .pill");
  assert.ok(controls.includes("background: transparent") && controls.includes("box-shadow: none")
    && controls.includes("border: 1px solid transparent"),
  "run actions still use filled rounded-button chrome");
  assert.match(controls, /min-height:\s*44px/u, "a run action is below the 44px target floor");
  assert.match(controls, /min-width:\s*44px/u, "a run action is below the 44px target floor");

  const hover = surfaceRule(".rp-conversation .run-strip-controls .pill:hover:not(:disabled)");
  assert.ok(hover.includes("transform: none"), "a quiet run action still lifts on hover");

  const focus = surfaceRule(".rp-conversation .run-strip-controls .pill:focus-visible");
  assert.ok(focus.includes("outline: 3px solid var(--rp-focus)") && focus.includes("outline-offset: 2px"),
    "run actions have no clear keyboard focus ring");

  const controlRow = surfaceRule(".rp-conversation .run-strip-controls");
  assert.ok(controlRow.includes("grid-column: 3") && controlRow.includes("grid-row: 1"),
    "the current safe actions no longer share the status line");
});

test("the paper thread keeps compact actions and adds no decorative travel", () => {
  // RE-POINTED, and its compact rules moved from 620px to 820px on the way.
  // 620px sits below the supported 760px minimum, so those rules only ever
  // reached the test-only containment stress view and never a size anyone is
  // meant to use. BOTH markers assert they were found: two bare `indexOf`
  // results can yield an empty slice that satisfies every negative assertion
  // below while reading nothing.
  const start = surfaces.indexOf("/* ----------------------------------------------------- the run strip */");
  const end = surfaces.indexOf("/* ------------------------------------------------ the result receipt */", start);
  assert.notEqual(start, -1, "the run strip's section in surfaces.css cannot be found");
  assert.ok(end > start, "the run strip's section has no end marker after it");
  const slice = surfaces.slice(start, end);
  assert.ok(slice.length > 2000, "the run strip's section is implausibly short, so this proves nothing");

  // REWRITTEN, and the reason is worth keeping. The retired block gave the
  // actions their own full-width row at 620px. Porting that to 820px looked
  // mechanical and was not: 820px is ABOVE the supported 760px minimum, so a
  // reflow that had only ever reached the unsupported stress view began firing
  // at a real size — and `conductor.spec.ts` measured, at exactly 760 x 620,
  // that the actions still share the status line. They tighten and wrap now
  // instead of restacking, which contains them without breaking that contract.
  assert.match(surfaces, /@media \(max-width: 820px\) \{[\s\S]*?\.rp-conversation \.run-strip \{[\s\S]*?padding:[\s\S]*?\.rp-conversation \.run-strip-controls \{[\s\S]*?flex-wrap: wrap/u,
    "the narrow paper thread does not contain its actions");
  assert.doesNotMatch(surfaces, /@media \(max-width: 820px\) \{[\s\S]*?\.rp-conversation \.run-strip-controls \{[^}]*grid-row: 3/u,
    "the actions restack at a SUPPORTED width, where they must still share the status line");
  assert.doesNotMatch(slice, /@keyframes|animation\s*:/u, "the paper thread adds decorative motion");

  // The entrance is not merely killed for reduced motion now — it is off for
  // everyone. `chat-arrive` slid AND scaled this strip, which holds Stop this
  // task, and the constitution forbids transforming a container that holds an
  // interactive control.
  assert.match(motion, /\.rp-conversation \.run-strip,?[\s\S]{0,200}?animation: none/u,
    "the run strip still travels on arrival inside the conversation");
  assert.match(motion, /prefers-reduced-motion:[\s\S]*?\.run-strip[\s\S]*?animation: none/u,
    "the existing run-strip entrance is not removed for reduced motion");
});
