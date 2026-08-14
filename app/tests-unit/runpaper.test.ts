import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const motion = renderer("motion.css");
const chat = renderer("screens", "Chat.tsx");
const taskRun = renderer("screens", "TaskRun.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
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
  const composer = chat.indexOf('<div className="chat-composer">');
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

test("the run reads as a ruled paper thread instead of a rounded glass card", () => {
  const strip = rule(".chat-column-villager .run-strip");
  for (const declaration of ["position: relative", "display: grid",
    "grid-template-columns: minmax(0, 1fr) auto auto", "border: 0", "border-radius: 0",
    "background: transparent", "box-shadow: none", "border-top: 1px solid"]) {
    assert.ok(strip.includes(declaration), `the paper thread is missing ${declaration}`);
  }

  const mark = rule(".chat-column-villager .run-strip::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 2px")
    && mark.includes("var(--garden-cyan)"),
  "the run thread has no restrained static registration mark");
});

test("running and terminal words have distinct non-color marks", () => {
  const state = rule(".chat-column-villager .run-strip-state::before");
  assert.ok(state.includes('content: ""') && state.includes("background: currentColor"),
    "the real state word has no supplemental empty geometry");

  const running = rule('.chat-column-villager .run-strip[data-run-state="running"] .run-strip-state::before');
  const done = rule('.chat-column-villager .run-strip[data-run-state="done"] .run-strip-state::before');
  const stopped = rule('.chat-column-villager .run-strip[data-run-state="stopped"] .run-strip-state::before');
  const error = rule('.chat-column-villager .run-strip[data-run-state="error"] .run-strip-state::before');
  assert.ok(running.includes("border: 1.5px solid currentColor") && running.includes("background: transparent"),
    "RUNNING has no outlined mark");
  assert.ok(done.includes("width: 8px") && done.includes("height: 8px") && done.includes("border-radius: 50%"),
    "DONE has no filled circle");
  assert.ok(stopped.includes("width: 9px") && stopped.includes("height: 2px") && stopped.includes("border-radius: 0"),
    "STOPPED has no bar");
  assert.ok(error.includes("border: 2px double currentColor") && error.includes("background: transparent"),
    "ERROR has no double-outline mark");
});

test("the complete outcome remains a ruled second line", () => {
  const outcome = rule(".chat-column-villager .run-strip-outcome");
  for (const declaration of ["grid-column: 1 / -1", "grid-row: 2", "order: initial", "white-space: normal",
    "overflow: visible", "text-overflow: clip", "overflow-wrap: anywhere", "border-top: 1px solid"]) {
    assert.ok(outcome.includes(declaration), `the outcome line is missing ${declaration}`);
  }
});

test("Stop and Open run are quiet text actions with unmistakable focus", () => {
  const controls = rule(".chat-column-villager .run-strip-controls .pill");
  assert.ok(controls.includes("border: 0") && controls.includes("border-radius: 1px")
    && controls.includes("background: transparent") && controls.includes("box-shadow: none"),
  "run actions still use filled rounded-button chrome");
  const hover = rule(".chat-column-villager .run-strip-controls .pill:hover:not(:disabled)");
  assert.ok(hover.includes("transform: none") && hover.includes("background: transparent"),
    "a quiet run action still lifts or fills on hover");
  const focus = rule(".chat-column-villager .run-strip-controls .pill:focus-visible");
  assert.ok(focus.includes("outline: 2px solid var(--garden-cyan)") && focus.includes("outline-offset: 3px"),
    "run actions have no clear keyboard focus ring");
  const controlRow = rule(".chat-column-villager .run-strip-controls");
  assert.ok(controlRow.includes("grid-column: 3") && controlRow.includes("grid-row: 1"),
    "the current safe actions no longer share the status line");
});

test("the paper thread keeps compact actions and adds no decorative travel", () => {
  const start = css.indexOf("/* Task 189:");
  const end = css.indexOf("/* Task 191:", start);
  assert.ok(start !== -1 && end > start, "the Task 189 presentation slice is not bounded for review");
  const slice = css.slice(start, end);
  assert.match(slice, /@media \(max-width: 620px\) \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto[\s\S]*?\.chat-column-villager \.run-strip-controls \{[\s\S]*?grid-column: 1 \/ -1[\s\S]*?grid-row: 3[\s\S]*?width: 100%[\s\S]*?\}/,
    "the narrow paper thread does not give its actions a contained row");
  assert.doesNotMatch(slice, /@keyframes|animation\s*:/,
    "the paper thread adds decorative motion");
  assert.match(motion, /prefers-reduced-motion:[\s\S]*?\.run-strip[\s\S]*?animation: none/,
    "the existing run-strip entrance is not removed for reduced motion");
});
