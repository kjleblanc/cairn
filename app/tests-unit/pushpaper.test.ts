import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const chat = renderer("screens", "Chat.tsx");

function lastRule(selector: string): string {
  const start = css.lastIndexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

test("the publication flow exposes stable phase and state without replacing its live node", () => {
  assert.match(chat, /className="push-flow" data-push-phase=\{flow\.phase\}/,
    "the publication paper has no stable phase hook");
  assert.match(chat, /const outcomeTone = [\s\S]*?flow\.phase === "pushing"[\s\S]*?result\.ok[\s\S]*?"refusal"/,
    "the persistent outcome has no presentation-only state tone");
  assert.match(chat, /className=\{`push-outcome[\s\S]*?data-push-state=\{outcomeTone\}[\s\S]*?role="status"/,
    "the outcome state is not carried by the existing persistent live node");
  assert.match(chat, /className="card push-confirm"[\s\S]*?tabIndex=\{-1\}[\s\S]*?role="group"[\s\S]*?aria-labelledby="push-confirm-title"/,
    "the exact focused confirmation group semantics changed");
  assert.equal((chat.match(/className=\{`push-outcome/g) ?? []).length, 1,
    "the flow renders more than one persistent outcome node");
});

test("declining the pause restores focus only to the owner-triggered nudge", () => {
  assert.match(chat, /const restorePushChipFocus = useRef\(false\);[\s\S]*?flow\.phase === "chip" && restorePushChipFocus\.current[\s\S]*?querySelector<HTMLButtonElement>\("button"\)\?\.focus\(\)/,
    "Not now cannot restore focus to the remounted nudge");
  assert.match(chat, /restorePushChipFocus\.current = true;[\s\S]*?onDecline\(\);/,
    "the decline path does not explicitly mark its focus return");
  assert.doesNotMatch(chat, /autoFocus/,
    "the publication nudge steals focus when it first appears");
});

test("the publication nudge is a quiet annotation, not a lifted pill", () => {
  const chip = lastRule(".chat-column-villager .push-chip .pill");
  for (const declaration of ["border: 0", "border-radius: 1px", "background: transparent",
    "box-shadow: none", "transform: none"]) {
    assert.ok(chip.includes(declaration), `the push nudge is missing ${declaration}`);
  }
  assert.ok(chip.includes("min-height: 40px") && chip.includes("border-bottom"),
    "the flat nudge lost either its practical target or publication underline");
});

test("the open pause is restrained grain paper with registration focus", () => {
  const panel = lastRule(".chat-column-villager .push-confirm");
  for (const declaration of ["position: relative", "border: 0", "box-shadow: none",
    "background-image: var(--paper-grain)", "border-radius: 5px 8px 6px 4px"]) {
    assert.ok(panel.includes(declaration), `the publication checkpoint is missing ${declaration}`);
  }
  const mark = lastRule(".chat-column-villager .push-confirm::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 2px")
    && mark.includes("var(--garden-amber)"),
  "the checkpoint has no restrained amber registration mark");
  const focus = lastRule(".chat-column-villager .push-confirm:focus");
  assert.ok(focus.includes("outline: none"),
    "programmatic panel focus still draws a large rectangular ring");
  assert.match(css, /\.chat-column-villager \.push-confirm:focus \.push-confirm-title[\s\S]*?text-decoration-line: underline/,
    "programmatic focus does not orient the owner at the checkpoint title");
});

test("target, branch, effect, publication, and recovery stay in one ruled ledger", () => {
  assert.match(chat, /className="push-confirm-fact"[\s\S]*?className="push-confirm-fact"[\s\S]*?className="push-confirm-fact push-confirm-effect"/,
    "the three exact push facts lack stable ledger rows");
  assert.match(chat, /push-confirm-sentence push-confirm-publication[\s\S]*?\{PUSH_PUBLICATION\}[\s\S]*?push-confirm-sentence push-confirm-recovery[\s\S]*?\{PUSH_RECOVERY\}/,
    "publication exposure and recovery are not distinct open notes");
  const facts = lastRule(".chat-column-villager .push-confirm-facts");
  assert.ok(facts.includes("list-style: none") && facts.includes("border-top"),
    "the exact facts still read as a bullet wall instead of a ledger");
  const fact = lastRule(".chat-column-villager .push-confirm-fact");
  assert.ok(fact.includes("border-bottom") && fact.includes("overflow-wrap: anywhere"),
    "long target or effect facts can escape their ruled row");
  assert.ok(lastRule(".chat-column-villager .push-confirm-publication").includes("var(--garden-amber)"),
    "the publication exposure has no distinct risk rule");
});

test("Push and Not now are flat native decisions with explicit keyboard focus", () => {
  assert.match(chat, /className="row push-confirm-actions"[\s\S]*?>Push<[^]*?>Not now</,
    "the exact native Push and Not now order changed");
  const action = lastRule(".chat-column-villager .push-confirm-actions .pill");
  assert.ok(action.includes("min-height: 40px") && action.includes("border-radius: 1px")
    && action.includes("background: transparent") && action.includes("box-shadow: none"),
  "publication decisions are still lifted pills or too small");
  const focus = lastRule(".chat-column-villager .push-confirm-actions .pill:focus-visible");
  assert.ok(focus.includes("2px solid var(--garden-cyan)") && focus.includes("outline-offset: 3px"),
    "publication decisions lack unmistakable keyboard focus");
});

test("the persistent outcome settles as a state-marked receipt line", () => {
  const outcome = lastRule(".chat-column-villager .push-outcome.card");
  for (const declaration of ["border: 0", "border-radius: 0", "background: transparent", "box-shadow: none"]) {
    assert.ok(outcome.includes(declaration), `the push outcome is missing ${declaration}`);
  }
  assert.ok(outcome.includes("border-top"), "the outcome has no ruled receipt edge");
  for (const state of ["running", "success", "refusal"]) {
    assert.match(css, new RegExp(`\\.chat-column-villager \\.push-outcome\\[data-push-state="${state}"\\]::before`),
      `${state} has no non-color state mark`);
  }
});

test("compact publication paper contains long truth and adds no motion", () => {
  assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*?\.chat-column-villager \.push-confirm \{[\s\S]*?\.chat-column-villager \.push-confirm-actions/,
    "the late compact cascade does not contain the publication paper");
  assert.match(css, /\.chat-column-villager \.push-confirm \.mono[\s\S]*?overflow-wrap: anywhere/,
    "a long remote URL can widen the lantern");
  assert.doesNotMatch(css, /\.chat-column-villager \.push-(?:confirm|outcome)[^{]*\{[^}]*animation:/,
    "publication paper adds decorative travel");
  const reduced = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  assert.ok(reduced > css.lastIndexOf("Task 193"),
    "the final reduced-motion cascade no longer follows the publication rules");
  assert.match(css.slice(reduced), /\.chat-column-villager \.push-confirm-actions \.pill \{ transition: none;/,
    "reduced motion does not win over the scoped publication decisions");
});
