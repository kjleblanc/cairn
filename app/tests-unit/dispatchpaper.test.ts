import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------------ *
 * Task 191's dispatch checkpoint, REWRITTEN by Task 263 (Slice 6).
 *
 * Task 191's decisions all still hold and are all still asserted: one paper
 * checkpoint rather than a rounded settings card, request provenance as flat
 * ruled rows, the routed facts as one ruled ledger rather than a grid of
 * tiles, the exact task payload as machine evidence that does not shout over
 * the approval, a distinct one-call approval, and quiet keyboard-visible
 * actions. What changed is the material, and where it lives.
 *
 * TWO HALVES, DELIBERATELY. `DisclosureConfirm` mounts on BOTH the manual task
 * screen and the inline checkpoint, and `visualtokens.test.ts` requires every
 * selector in `surfaces.css` to be anchored on an `.rp-` class — so the
 * unscoped rules that serve TaskRun stay in `app.css` until Slice 7 migrates
 * that screen. `the shared disclosure` test below still reads `app.css` for
 * exactly that reason, and it is PRESERVED unedited.
 *
 * One guard is also repaired rather than moved. `the final compact cascade`
 * pinned the whole one-line declaration
 * `.chat-column-villager .route-facts { grid-template-columns: repeat(3, 1fr); }`
 * as an ordering marker. It was live, but it would have gone silent the moment
 * that rule was reformatted or moved, and `lastIndexOf` returning -1 compares
 * as "before everything" — passing while proving nothing. It asserts it was
 * found now.
 * ------------------------------------------------------------------------ */

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const surfaces = renderer("surfaces.css");
const motion = renderer("motion.css");
const chat = renderer("screens", "Chat.tsx");
const disclosure = renderer("components", "DisclosureConfirm.tsx");

function lastRule(selector: string): string {
  const start = css.lastIndexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * EVERYTHING `selector` declares in `surfaces.css`, brace-tracked, comments
 * stripped first so a comma inside prose cannot split a selector list. Slice
 * 6's decision family is written as shared rule sets, so most of its selectors
 * never appear as `\n<selector> {` and several are declared twice — once in a
 * shared list and once in a small override.
 */
function surfaceRuleFor(selector: string): string {
  const source = surfaces.replace(/\/\*[\s\S]*?\*\//gu, "");
  let depth = 0;
  let head = "";
  const found: string[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (character === "{") {
      depth += 1;
      if (depth === 1
        && head.split(",").map((part) => part.trim().replace(/\s+/gu, " ")).includes(selector)) {
        found.push(source.slice(index + 1, source.indexOf("}", index)));
      }
      head = "";
    } else if (character === "}") {
      depth -= 1;
      head = "";
    } else if (depth === 0) head += character;
  }
  assert.notEqual(found.length, 0, `no rule in surfaces.css lists "${selector}"`);
  return found.join("\n");
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
  const focus = surfaceRuleFor(".rp-conversation .dispatch-heading:focus");
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
  const panel = surfaceRuleFor(".rp-conversation .dispatch-panel");
  for (const declaration of ["position: relative", "border: 0",
    "background-color: var(--rp-paper-raised)", "box-shadow: var(--rp-shadow-low)"]) {
    assert.ok(panel.includes(declaration), `the paper checkpoint is missing ${declaration}`);
  }
  assert.ok(!/border-radius: (?:1[0-9]|2[0-9])px/u.test(panel),
    "the checkpoint regained inflated Aero corners");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(/u.test(panel),
    "the checkpoint decides a colour outside the measured token layer");
  assert.ok(panel.includes("border-left: 3px solid var(--rp-teal)"),
    "the checkpoint has no restrained registration mark");
});

test("request provenance and routed facts are flat ruled rows", () => {
  // ONE intent-row rule set now serves the checkpoint, the operational papers
  // and the proposal (which adds a fill of its own). The result receipt's
  // near-identical copy in `app.css` is Slice 7's and is untouched.
  const intent = surfaceRuleFor(".rp-conversation .task-intent-row");
  assert.ok(intent.includes("border: 0") && intent.includes("border-left: 2px solid")
    && intent.includes("border-radius: 0") && intent.includes("background: transparent"),
  "final-request provenance still stacks rounded filled tiles");

  const facts = surfaceRuleFor(".rp-conversation .dispatch-panel .route-facts");
  assert.ok(facts.includes("grid-template-columns: minmax(0, 1fr)")
    && facts.includes("gap: 0") && facts.includes("border-top: 1px solid"),
  "provider/model/project/task facts are not one ruled ledger");
  const row = surfaceRuleFor(".rp-conversation .dispatch-panel .route-facts p");
  assert.ok(row.includes("display: grid") && row.includes("border-radius: 0")
    && row.includes("background: transparent") && row.includes("border-bottom: 1px solid"),
  "routed facts still render as little rounded cards");

  const exactTask = surfaceRuleFor(".rp-conversation .dispatch-panel .disclosure-task");
  assert.ok(exactTask.includes("font-family: var(--rp-mono)")
    && exactTask.includes("border-left: 1px solid"),
  "the exact task payload still shouts over the owner approval");
  assert.ok(exactTask.includes("white-space: pre-wrap"),
    "the confirmed task's own line breaks collapse into one run-on line");
});

test("approval and actions are quiet, distinct, keyboard-visible paper controls", () => {
  const approval = surfaceRuleFor(".rp-conversation .dispatch-approval");
  assert.ok(approval.includes("display: grid") && approval.includes("border-left: 3px solid")
    && approval.includes("var(--rp-amber-ink)"),
  "the one-call approval is not a distinct ruled checkpoint");
  // The gate itself is a real target, not a 16px browser default.
  const box = surfaceRuleFor(".rp-conversation .dispatch-approval input");
  assert.ok(box.includes("width: 20px") && box.includes("height: 20px"),
    "the one-call gate shrank back to the browser's default checkbox");
  assert.ok(surfaceRuleFor(".rp-conversation .dispatch-approval input:focus-visible")
    .includes("var(--rp-focus)"),
  "the one-call gate has no visible keyboard focus");

  const action = surfaceRuleFor(".rp-conversation .dispatch-actions .pill");
  assert.ok(action.includes("box-shadow: none"), "dispatch actions still read as glossy pills");
  assert.ok(action.includes("min-height: 44px") && action.includes("min-width: 44px"),
    "dispatch actions are below the 44 x 44 floor");
  const focus = surfaceRuleFor(".rp-conversation .dispatch-actions .pill:focus-visible");
  assert.ok(focus.includes("outline: 3px solid var(--rp-focus)")
    && focus.includes("outline-offset: 2px"),
  "dispatch actions have no unmistakable keyboard focus");

  // Cancel must never fade out of legibility while a dispatch is in flight.
  const disabled = surfaceRuleFor(".rp-conversation .dispatch-actions .pill:disabled");
  assert.ok(disabled.includes("opacity: 1") && disabled.includes("color: var(--rp-ink-muted)"),
    "a busy dispatch action is carried by a fade instead of a measured ink");
});

test("the compact cascade wraps the ledger at a supported width without adding motion", () => {
  // REPAIRED: the old ordering marker pinned a whole one-line declaration and
  // would have gone silent the moment it was reformatted. Both ends assert.
  const wideReset = css.lastIndexOf(".chat-column-villager .route-facts {");
  assert.notEqual(wideReset, -1, "the older route-facts reset is gone; this ordering check is vacuous");
  assert.ok(!/\.rp-/u.test(css), "the retired cascade and the new system interleaved");

  const sliceStart = surfaces.indexOf("Task 263 (Slice 6)");
  assert.notEqual(sliceStart, -1, "the Slice 6 checkpoint rules are missing");
  const compactStart = surfaces.indexOf("@media (max-width: 820px)", sliceStart);
  assert.notEqual(compactStart, -1, "the decision family has no compact block");
  const compact = surfaces.slice(compactStart);
  assert.match(compact, /\.rp-conversation \.dispatch-panel \.route-facts p[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
    "compact routed facts do not collapse to one wrapping column");
  assert.ok(!/@media \(max-width: (?:6[0-9]{2}|7[0-5][0-9])px\)/u.test(surfaces),
    "a breakpoint below the supported 760px minimum came back");

  assert.doesNotMatch(surfaces.slice(sliceStart), /@keyframes|animation:/,
    "dispatch paper adds decorative motion");
  const reduced = motion.slice(motion.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.rp-conversation \.dispatch-actions \.pill[\s\S]*?transition: none/,
    "the final reduced-motion block does not pin dispatch actions");
});
