import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const chat = renderer("screens", "Chat.tsx");
const disclosure = renderer("components", "DisclosureConfirm.tsx");

function lastRule(selector: string): string {
  const start = css.lastIndexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

test("the inline checkpoint is a named phase surface with deliberate focus", () => {
  assert.match(chat, /<section className="card dispatch-panel"[\s\S]*?data-dispatch-phase=\{dispatch\.phase\}/,
    "dispatch has no named phase surface for presentation and live checks");
  assert.match(chat, /aria-labelledby=\{dispatch\.phase === "confirm" \? dispatchHeadingId : undefined\}/,
    "the final review is not named by its visible heading");
  assert.match(chat, /<h2[\s\S]*?className="card-title dispatch-heading"[\s\S]*?ref=\{dispatchHeadingRef\}[\s\S]*?tabIndex=\{-1\}/,
    "the replacement checkpoint has no focusable visible heading");
  assert.match(chat, /dispatch\?\.phase === "confirm"[\s\S]*?dispatchHeadingRef\.current\?\.focus\(\)/,
    "opening Review does not move focus to the replacement checkpoint");
  assert.match(chat, /dispatchFocusReturnPendingRef\.current = true[\s\S]*?setDispatch\(null\)/,
    "Cancel does not request focus restoration to the proposal");
  const focus = lastRule(".chat-column-villager .dispatch-heading:focus");
  assert.ok(focus.includes("outline: none") && focus.includes("text-decoration-line: underline")
    && focus.includes("text-decoration-thickness: 2px"),
  "the focused non-interactive heading still reads as a boxed action");
});

test("only the pre-start checkpoint carries review and approval information", () => {
  const start = chat.indexOf('{dispatch.phase === "running" ? (');
  const end = chat.indexOf("{streaming ? (", start);
  assert.ok(start !== -1 && end > start, "the dispatch phase branch is missing");
  const branch = chat.slice(start, end);
  assert.match(branch, /className="small muted dispatch-running"[\s\S]*?Cairn is working on this/,
    "running dispatch has no short handoff line");
  const runningEnd = branch.indexOf(") : (");
  assert.ok(runningEnd > 0, "the running and confirm branches are not separate");
  assert.doesNotMatch(branch.slice(0, runningEnd), /TaskIntentList|DisclosureConfirm|dispatch-actions/,
    "review or approval content remains duplicated after Start");
  assert.match(branch.slice(runningEnd), /TaskIntentList[\s\S]*?dispatch-acceptance[\s\S]*?DisclosureConfirm[\s\S]*?dispatch-actions/,
    "the pre-start branch lost its final review, disclosure, or actions");
});

test("the shared disclosure keeps every byte and native approval while adding hooks only", () => {
  for (const text of ["Provider", "Model", "Target project", "Task",
    "What gets sent or can be read:", "Cost or usage limit:",
    "I approve this one real ${label} call."]) {
    assert.ok(disclosure.includes(text), `${text} disappeared from the routed disclosure`);
  }
  for (const hook of ["dispatch-disclosure-lead", "dispatch-disclosure-scope",
    "dispatch-disclosure-quota", "dispatch-approval"]) {
    assert.ok(disclosure.includes(hook), `${hook} is missing from the shared disclosure`);
  }
  assert.match(disclosure, /<label className="row dispatch-approval">[\s\S]*?<input[\s\S]*?type="checkbox"[\s\S]*?checked=\{confirmed\}[\s\S]*?onChange=/,
    "the real-call gate is no longer a native labeled controlled checkbox");
  assert.ok(lastRule(".dispatch-approval").includes("margin-top: 12px"),
    "the shared TaskRun approval lost its neutral spacing when inline styling moved");
});

test("the checkpoint is one restrained paper folio, not a rounded glass card", () => {
  const panel = lastRule(".chat-column-villager .dispatch-panel");
  for (const declaration of ["position: relative", "border: 0", "box-shadow: none",
    "background-color: rgb(246 236 225 / 3%)", "background-image: var(--paper-grain)"]) {
    assert.ok(panel.includes(declaration), `the paper checkpoint is missing ${declaration}`);
  }
  assert.ok(panel.includes("border-radius: 5px 8px 6px 4px"),
    "the checkpoint still has inflated Aero corners");
  const mark = lastRule(".chat-column-villager .dispatch-panel::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 2px")
    && mark.includes("var(--garden-cyan)"),
  "the checkpoint has no restrained registration mark");
});

test("request provenance and routed facts are flat ruled rows", () => {
  const intent = lastRule(".chat-column-villager .dispatch-panel .task-intent-row");
  assert.ok(intent.includes("border: 0") && intent.includes("border-left: 2px solid")
    && intent.includes("border-radius: 0") && intent.includes("background: transparent"),
  "final-request provenance still stacks rounded filled tiles");
  const facts = lastRule(".chat-column-villager .dispatch-panel .route-facts");
  assert.ok(facts.includes("grid-template-columns: minmax(0, 1fr)")
    && facts.includes("gap: 0") && facts.includes("border-top: 1px solid"),
  "provider/model/project/task facts are not one ruled ledger");
  const row = lastRule(".chat-column-villager .dispatch-panel .route-facts p");
  assert.ok(row.includes("display: grid") && row.includes("border-radius: 0")
    && row.includes("background: transparent") && row.includes("border-bottom: 1px solid"),
  "routed facts still render as little rounded cards");
  const exactTask = lastRule(".chat-column-villager .dispatch-panel .disclosure-task");
  assert.ok(exactTask.includes("font-family: var(--mono)") && exactTask.includes("font-weight: 500")
    && exactTask.includes("border-left: 1px solid"),
  "the exact task payload still shouts over the owner approval");
});

test("approval and actions are quiet, distinct, keyboard-visible paper controls", () => {
  const approval = lastRule(".chat-column-villager .dispatch-approval");
  assert.ok(approval.includes("display: grid") && approval.includes("border-top: 1px solid")
    && approval.includes("border-bottom: 1px solid") && approval.includes("border-radius: 0"),
  "the one-call approval is not a distinct ruled checkpoint");
  const action = lastRule(".chat-column-villager .dispatch-actions .pill");
  assert.ok(action.includes("border-radius: 1px") && action.includes("background: transparent")
    && action.includes("box-shadow: none"),
  "dispatch actions still read as glossy or chunky pills");
  const focus = lastRule(".chat-column-villager .dispatch-actions .pill:focus-visible");
  assert.ok(focus.includes("outline: 2px solid var(--garden-cyan)")
    && focus.includes("outline-offset: 3px"),
  "dispatch actions have no unmistakable keyboard focus");
});

test("the final compact cascade wraps the ledger without adding motion", () => {
  const taskStart = css.indexOf("/* Task 191:");
  const lastWideReset = css.lastIndexOf(".chat-column-villager .route-facts { grid-template-columns: repeat(3, 1fr); }");
  assert.ok(taskStart > lastWideReset, "an older route-facts reset can override the checkpoint ledger");
  const compactStart = css.indexOf("@media (max-width: 620px)", taskStart);
  const compactEnd = css.indexOf("}", css.indexOf("}", compactStart) + 1);
  const compact = css.slice(compactStart, compactEnd + 1);
  assert.match(compact, /\.chat-column-villager \.dispatch-panel \.route-facts p[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
    "compact routed facts do not collapse to one wrapping column");
  const sliceEnd = css.indexOf("/* Reduced motion, part two", taskStart);
  const taskCss = css.slice(taskStart, sliceEnd);
  assert.doesNotMatch(taskCss, /@keyframes|animation:/, "dispatch paper adds decorative motion");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)", sliceEnd));
  assert.match(reduced, /\.chat-column-villager \.dispatch-actions \.pill[\s\S]*?transition: none/,
    "the final reduced-motion block does not pin dispatch actions");
});
