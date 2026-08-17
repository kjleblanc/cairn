import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------------ *
 * Task 192's question paper, REWRITTEN by Task 263 (Slice 6).
 *
 * Task 192's decisions all still hold and are all still asserted: one shallow
 * response field owning the native input and both ordered decisions, a heading
 * that takes focus without pretending to be a button, flat text actions with
 * native disabled truth, and no decorative travel. What changed is the
 * material — measured token pairs in `surfaces.css` instead of hard-coded
 * cream alphas in `app.css` — plus three things named here so they are not
 * mistaken for drift:
 *
 *   1. `min-height: 40px` on the actions became 44px. The constitution's floor
 *      is 44 x 44 and this surface was 4px short of it. REWRITTEN deliberately.
 *   2. The answer input no longer fades to `opacity: .5` when busy. Fading a
 *      label and its ground together is the defect Slice 5 measured at 2.45:1
 *      on the composer's Send; inactive is carried by the edge and the ink now.
 *   3. The actions no longer TRANSITION opacity, for the same reason.
 *
 * And one guard is repaired rather than moved. `the late compact cascade` used
 * `css.lastIndexOf(".chat-column-villager .question-card,")` — WITH a trailing
 * comma — as its ordering marker. That string had ZERO occurrences in
 * `app.css` on `main`, so `lastIndexOf` returned -1, `taskStart > -1` was
 * vacuously true, and the assertion had been proving nothing since it was
 * written. Every marker below asserts it was found.
 * ------------------------------------------------------------------------ */

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const surfaces = renderer("surfaces.css");
const motion = renderer("motion.css");
const question = renderer("components", "QuestionCard.tsx");
const chat = renderer("screens", "Chat.tsx");

/**
 * EVERYTHING `selector` declares in `surfaces.css`, brace-tracked, comments
 * stripped first so a comma inside prose cannot split a selector list.
 *
 * Slice 6's decision family is written as shared rule sets — one sheet, one
 * heading, one action skin for nine surfaces — so most of its selectors never
 * appear as `\n<selector> {` and several are declared twice: once in a shared
 * list and once in a small override. Returning only the last rule would hide
 * the shared half; the union is what the selector actually declares here, and
 * it is the safe direction for the negative assertions too, which have to see
 * a bad declaration wherever it was written.
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

test("one response field owns the native answer and both ordered decisions", () => {
  assert.match(question,
    /<div className="question-card-answer">[\s\S]*?className="row question-card-controls"[\s\S]*?<input[\s\S]*?className="row question-card-actions"[\s\S]*?>Answer<[\s\S]*?I'm not sure/,
  "answer and defer are still split into separate form-card rows");
  assert.doesNotMatch(question, /question-card-defer/,
    "the obsolete separate defer row still exists");
  assert.match(question, /<label htmlFor=\{answerId\}>Your answer<\/label>[\s\S]*?id=\{answerId\}[\s\S]*?type="text"/,
    "the response field lost its native label/input association");
  assert.match(question, /const rawAnswer = draft;[\s\S]*?onAnswer\(rawAnswer\)/,
    "the paper field transforms the owner's raw answer");
  assert.match(question, /const disabled = busy \|\| submitting;[\s\S]*?const answerDisabled = disabled \|\| !draft\.trim\(\)/,
    "busy, submitting, or whitespace answer gates changed");
});

test("the active prompt appears once while its exact passive turn stays stored", () => {
  assert.match(chat,
    /function activeQuestionLead\(text: string, question: string\): string \{[\s\S]*?if \(!text\.includes\(question\)\) return text;[\s\S]*?text\.split\(question\)[\s\S]*?\.filter\(Boolean\)\.join\("\\n\\n"\);/,
  "Chat has no bounded display-only projection for the repeated active prompt");
  assert.match(chat,
    /action\?\.kind === "question"[\s\S]*?activeQuestionLead\(turn\.text, action\.question\)[\s\S]*?: turn\.text/,
  "the current question still renders both its passive turn and active heading");
  assert.doesNotMatch(chat, /turn\.text\s*=/,
    "question de-duplication rewrites stored turn evidence");
  assert.match(chat, /bubble-active-question-only/,
    "a question-only active turn leaves an empty Cairn prose row on screen");
  assert.ok(surfaceRuleFor(".rp-conversation .bubble-active-question-only").includes("display: none"),
    "the empty active question-only prose row remains visible");
});

test("the question is one restrained paper annotation, not a rounded glass card", () => {
  const card = surfaceRuleFor(".rp-conversation .question-card");
  for (const declaration of ["position: relative", "border: 0",
    "background-color: var(--rp-paper-raised)", "box-shadow: var(--rp-shadow-low)"]) {
    assert.ok(card.includes(declaration), `the question paper is missing ${declaration}`);
  }
  assert.ok(!/border-radius: (?:1[0-9]|2[0-9])px/u.test(card),
    "the question regained inflated Aero corners");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(/u.test(card),
    "the question decides a colour outside the measured token layer");
  assert.ok(card.includes("border-left: 3px solid var(--rp-teal)"),
    "the question has no restrained registration rule");
});

test("programmatic heading focus reads as paper orientation, not a false button", () => {
  const heading = surfaceRuleFor(".rp-conversation .question-card-heading");
  assert.ok(heading.includes("width: fit-content") && heading.includes("overflow-wrap: anywhere"),
    "a long question cannot own the annotation heading safely");
  const focus = surfaceRuleFor(".rp-conversation .question-card-heading:focus");
  assert.ok(focus.includes("outline: none") && focus.includes("text-decoration-line: underline")
    && focus.includes("text-decoration-thickness: 2px"),
  "the automatically focused heading still looks like a boxed action");
});

test("the response field and text input are shallow ruled paper", () => {
  const field = surfaceRuleFor(".rp-conversation .question-card-answer");
  assert.ok(field.includes("background: var(--rp-paper)") && field.includes("box-shadow: none"),
    "the response field has no shallow boundary of its own against the card");
  const input = surfaceRuleFor(".rp-conversation .question-card-controls input");
  // `background`, not `background-color`: only the outer decision SHEET splits
  // the shorthand, because it composites the shared paper grain over its own
  // colour. A control inside the card takes the colour on its own.
  assert.ok(input.includes("border: 1px solid var(--rp-control-edge)")
    && input.includes("background: var(--rp-paper-raised)")
    && input.includes("box-shadow: none"),
  "the answer input still reads as a glossy rounded field");
  assert.ok(input.includes("min-height: 44px"), "the answer input is below the 44 x 44 floor");
  assert.ok(input.includes("font-size: 16px"), "the answer input is small enough to zoom the page on focus");

  // Focus is measured on :focus-visible, not :focus. A programmatic .focus()
  // sets :focus and never :focus-visible, so a ring declared only on :focus is
  // one users never actually see.
  const focus = surfaceRuleFor(".rp-conversation .question-card-controls input:focus-visible");
  assert.ok(focus.includes("outline: 3px solid var(--rp-focus)")
    && focus.includes("outline-offset: 2px"),
  "the real input lost unmistakable keyboard focus");

  // A DISABLED CONTROL IS STILL READ. The retired rule faded it to .5.
  const disabled = surfaceRuleFor(".rp-conversation .question-card-controls input:disabled");
  assert.ok(disabled.includes("opacity: 1") && disabled.includes("color: var(--rp-ink-muted)"),
    "the busy native input is carried by a fade instead of a measured ink");
  assert.ok(!css.includes(".question-card-controls input:disabled { opacity: .5; }"),
    "the retired disabled fade is still in the old cascade");
});

test("Answer and defer are flat text actions with native disabled truth", () => {
  const actions = surfaceRuleFor(".rp-conversation .question-card-actions");
  assert.ok(actions.includes("display: flex") && actions.includes("flex-wrap: wrap"),
    "the two response paths cannot wrap together");

  // 40px was below the constitution's floor. Raised deliberately; see the file
  // header. The real bounding boxes are measured in `contrast.spec.ts`.
  const pill = surfaceRuleFor(".rp-conversation .question-card-actions .pill");
  assert.ok(pill.includes("min-height: 44px") && pill.includes("min-width: 44px"),
    "question actions are below the 44 x 44 floor again");
  assert.ok(!pill.includes("min-height: 40px"), "the retired 40px floor came back");
  assert.ok(!/transition:[^;]*\bopacity\b/u.test(pill),
    "question actions transition opacity again, which fades a label and its ground together");
  assert.ok(!/transition:[^;]*\btransform\b/u.test(pill), "question actions travel on state change");

  const hover = surfaceRuleFor(".rp-conversation .question-card-actions .pill:hover:not(:disabled)");
  assert.ok(hover.includes("transform: none"),
    "the lantern's inherited lift still moves question decisions");
  const focus = surfaceRuleFor(".rp-conversation .question-card-actions .pill:focus-visible");
  assert.ok(focus.includes("outline: 3px solid var(--rp-focus)")
    && focus.includes("outline-offset: 2px"),
  "question actions have no strong keyboard focus");
  assert.match(question, /<Pill disabled=\{answerDisabled\}[\s\S]*?<Pill kind="quiet" disabled=\{disabled\}/,
    "native Answer/defer disabled gates or keyboard order changed");
});

test("the compact cascade stacks long response content at a supported width", () => {
  // REPAIRED. The old ordering marker had zero occurrences in `app.css`, so
  // this assertion had been vacuously true since it was written; see the file
  // header. The question's rules now live in one sheet whose every selector is
  // anchored, so ordering against a stale rounded-card rule is not the risk it
  // was — what has to stay true is that the compact rules exist and reach a
  // SUPPORTED width. 620px never did: it is below the 760px minimum.
  const compactStart = surfaces.indexOf("@media (max-width: 820px)",
    surfaces.indexOf("Task 263 (Slice 6)"));
  assert.notEqual(compactStart, -1, "the decision family has no compact block");
  const compact = surfaces.slice(compactStart);
  assert.match(compact, /\.rp-conversation \.question-card-controls[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
    "compact question controls do not stack to one safe column");
  assert.match(compact, /\.rp-conversation \.question-card-actions[\s\S]*?align-items: flex-start/,
    "compact response actions do not stay contained and readable");
  assert.match(compact, /\.rp-conversation \.question-card-actions \.pill[\s\S]*?text-align: left/,
    "a long compact defer action does not stay readable inside its target");
  assert.ok(!/@media \(max-width: (?:6[0-9]{2}|7[0-5][0-9])px\)/u.test(surfaces),
    "a breakpoint below the supported 760px minimum came back");
});

test("question paper adds no decorative motion and final reduced motion wins", () => {
  const sliceStart = surfaces.indexOf("Task 263 (Slice 6)");
  assert.notEqual(sliceStart, -1, "the Slice 6 paper slice is missing");
  const slice = surfaces.slice(sliceStart);
  assert.doesNotMatch(slice, /@keyframes|animation:/, "question paper adds decorative travel");

  // The kill lives at the end of `motion.css`, which is imported last: the
  // scoped rules are more specific than anything `app.css` can say, and
  // `app.css` may not name this class at all.
  const reduced = motion.slice(motion.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.rp-conversation \.question-card-actions \.pill[\s\S]*?transition: none/,
    "the final reduced-motion block does not pin question actions");
  assert.match(reduced, /\.rp-conversation \.question-card-controls input[\s\S]*?transition: none/,
    "the final reduced-motion block does not pin the answer input");
});
