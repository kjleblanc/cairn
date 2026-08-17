import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const chat = renderer("screens", "Chat.tsx");

const surfaces = renderer("surfaces.css");
const motion = renderer("motion.css");

function lastRule(selector: string): string {
  const start = css.lastIndexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * A rule body from `surfaces.css`, found by a selector that may sit anywhere
 * in a grouped selector list rather than only at its head. The miss is an
 * assertion and never a fallback.
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
  // REWRITTEN by Task 267 (Slice 7). The nudge is still quiet and still
  // unmistakably a publication control, but it is a bordered flat control at
  // the 44px floor rather than a 40px underline. It was 4px short of the
  // constitution's target size — the same shortfall Slice 6 repaired on the
  // question card — and pressing it opens a risk pause.
  const chip = surfaceRule(".rp-conversation .push-chip .pill");
  for (const declaration of ["background: transparent", "box-shadow: none"]) {
    assert.ok(chip.includes(declaration), `the push nudge is missing ${declaration}`);
  }
  assert.match(chip, /min-height:\s*44px/u, "the flat nudge is below the practical target floor");
  assert.match(chip, /color:\s*var\(--rp-amber-ink\)/u, "the nudge no longer reads as a publication control");
  assert.match(chip, /border:\s*1px solid var\(--rp-amber-edge\)/u, "the nudge lost its publication edge");
  assert.match(surfaceRule(".rp-conversation .push-chip .pill:hover:not(:disabled)"),
    /transform:\s*none/u, "the publication nudge lifts on hover");
});

test("the open pause is restrained grain paper with registration focus", () => {
  // REWRITTEN. The checkpoint is still restrained grain paper with a
  // registration mark and a focus that orients rather than outlines, but the
  // mark is a `border-left` instead of an absolutely positioned `::before` —
  // the same conversion Slice 6 made across the decision family, and the same
  // signal with no positioned box to contain.
  const panel = surfaceRule(".rp-conversation .push-confirm");
  for (const declaration of ["position: relative", "border: 0",
    "background-image: var(--rp-grain)"]) {
    assert.ok(panel.includes(declaration), `the publication checkpoint is missing ${declaration}`);
  }
  assert.match(panel, /border-left:\s*3px solid var\(--rp-amber-ink\)/u,
    "the checkpoint has no restrained amber registration mark");
  const focus = surfaceRule(".rp-conversation .push-confirm:focus");
  assert.ok(focus.includes("outline: none"),
    "programmatic panel focus still draws a large rectangular ring");
  assert.match(focus, /border-left:\s*3px solid var\(--rp-amber-ink\)/u,
    "focusing the checkpoint drops its registration mark");
  assert.match(surfaces, /\.rp-conversation \.push-confirm:focus \.push-confirm-title[\s\S]*?text-decoration-line: underline/u,
    "programmatic focus does not orient the owner at the checkpoint title");
});

test("target, branch, effect, publication, and recovery stay in one ruled ledger", () => {
  assert.match(chat, /className="push-confirm-fact"[\s\S]*?className="push-confirm-fact"[\s\S]*?className="push-confirm-fact push-confirm-effect"/,
    "the three exact push facts lack stable ledger rows");
  assert.match(chat, /push-confirm-sentence push-confirm-publication[\s\S]*?\{PUSH_PUBLICATION\}[\s\S]*?push-confirm-sentence push-confirm-recovery[\s\S]*?\{PUSH_RECOVERY\}/,
    "publication exposure and recovery are not distinct open notes");
  const facts = surfaceRule(".rp-conversation .push-confirm-facts");
  assert.ok(facts.includes("list-style: none") && facts.includes("border-top"),
    "the exact facts still read as a bullet wall instead of a ledger");
  const fact = surfaceRule(".rp-conversation .push-confirm-fact");
  assert.ok(fact.includes("border-bottom") && fact.includes("overflow-wrap: anywhere"),
    "long target or effect facts can escape their ruled row");
  assert.match(surfaceRule(".rp-conversation .push-confirm-publication"),
    /border-left:\s*2px solid var\(--rp-amber-ink\)/u,
    "the publication exposure has no distinct risk rule");
  assert.match(surfaceRule(".rp-conversation .push-confirm-effect"),
    /border-left-color:\s*var\(--rp-amber-ink\)/u,
    "what the push actually does no longer carries the attention rule");
});

test("Push and Not now are flat native decisions with explicit keyboard focus", () => {
  assert.match(chat, /className="row push-confirm-actions"[\s\S]*?>Push<[^]*?>Not now</,
    "the exact native Push and Not now order changed");
  // REWRITTEN. Push and Not now are dressed by the ONE shared control skin
  // now rather than by their own copy of it — the rule that made retiring the
  // old scope safe at all. They are flat, at the 44px floor (up from 40px),
  // and carry the constitution's 3px focus ring at a 2px offset.
  const action = surfaceRule(".rp-conversation .pill");
  assert.match(action, /min-height:\s*44px/u, "publication decisions are too small");
  assert.match(action, /box-shadow:\s*none/u, "publication decisions are still lifted pills");
  assert.match(action, /border-radius:\s*var\(--rp-r-sm\)/u, "publication decisions took the capsule shape back");
  assert.match(surfaceRule(".rp-conversation .pill:hover:not(:disabled)"), /transform:\s*none/u,
    "a publication decision moves under the pointer");
  const focus = surfaceRule(".rp-conversation .pill:focus-visible");
  assert.ok(focus.includes("3px solid var(--rp-focus)") && focus.includes("outline-offset: 2px"),
    "publication decisions lack unmistakable keyboard focus");
});

test("the persistent outcome settles as a state-marked receipt line", () => {
  // RE-POINTED, and the compound is deliberate: `Chat.tsx` adds `card` only
  // when there is something true to say, so the empty node keeps its live
  // region without drawing a box. Flattening this selector to `.push-outcome`
  // would paint that empty node.
  const outcome = surfaceRule(".rp-conversation .push-outcome.card");
  for (const declaration of ["border: 0", "border-radius: 0", "background: transparent", "box-shadow: none"]) {
    assert.ok(outcome.includes(declaration), `the push outcome is missing ${declaration}`);
  }
  assert.ok(outcome.includes("border-top"), "the outcome has no ruled receipt edge");
  const marks = ["running", "success", "refusal"].map((state) =>
    surfaceRule(`.rp-conversation .push-outcome[data-push-state="${state}"].card::before`));
  assert.equal(new Set(marks).size, marks.length,
    "two push states draw the same mark, so they differ only by colour");
  assert.match(surfaceRule('.rp-conversation .push-outcome[data-push-state="refusal"] .push-outcome-title'),
    /color:\s*var\(--rp-coral-ink\)/u, "a refused push does not say so in its title");
});

test("compact publication paper contains long truth and adds no motion", () => {
  // RE-POINTED, and the compact rules moved from 620px to 820px on the way:
  // 620px is below the supported 760px minimum, so they only ever reached the
  // test-only containment stress view.
  assert.match(surfaces, /@media \(max-width: 820px\) \{[\s\S]*?\.rp-conversation \.push-confirm[\s\S]*?\.rp-conversation \.push-confirm-actions/u,
    "the compact cascade does not contain the publication paper");
  assert.match(surfaceRule(".rp-conversation .push-confirm .mono"), /overflow-wrap: anywhere/u,
    "a long remote URL can widen the paper");
  assert.doesNotMatch(surfaces, /\.rp-conversation \.push-(?:confirm|outcome)[^{]*\{[^}]*animation:/u,
    "publication paper adds decorative travel");
  // The chip's entrance is off for EVERYONE now, not only for a reader who
  // asked for less motion: `chat-arrive` slid and scaled it, and it is a
  // button.
  assert.match(motion, /\.rp-conversation \.push-chip[\s\S]{0,80}?animation: none/u,
    "the push chip still travels on arrival inside the conversation");
  const reduced = motion.lastIndexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(reduced, -1, "motion.css has no final reduced-motion cascade");
  assert.match(motion.slice(reduced), /\.rp-conversation \.pill \{ transition: none; \}/u,
    "reduced motion does not win over the conversation's controls");
});
