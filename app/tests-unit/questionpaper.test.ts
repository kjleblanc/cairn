import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const question = renderer("components", "QuestionCard.tsx");
const chat = renderer("screens", "Chat.tsx");

function lastRule(selector: string): string {
  const start = css.lastIndexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
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
  assert.ok(lastRule(".chat-column-villager .bubble-active-question-only").includes("display: none"),
    "the empty active question-only prose row remains visible");
});

test("the question is one restrained paper annotation, not a rounded glass card", () => {
  const card = lastRule(".chat-column-villager .question-card");
  for (const declaration of ["position: relative", "border: 0", "box-shadow: none",
    "background-color: rgb(246 236 225 / 3%)", "background-image: var(--paper-grain)"]) {
    assert.ok(card.includes(declaration), `the question paper is missing ${declaration}`);
  }
  assert.ok(card.includes("border-radius: 4px 8px 6px 5px"),
    "the question still has inflated Aero corners");
  const mark = lastRule(".chat-column-villager .question-card::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 2px")
    && mark.includes("var(--garden-cyan)"),
  "the question has no restrained cyan registration rule");
});

test("programmatic heading focus reads as paper orientation, not a false button", () => {
  const heading = lastRule(".chat-column-villager .question-card-heading");
  assert.ok(heading.includes("width: fit-content") && heading.includes("overflow-wrap: anywhere"),
    "a long question cannot own the annotation heading safely");
  const focus = lastRule(".chat-column-villager .question-card-heading:focus");
  assert.ok(focus.includes("outline: none") && focus.includes("text-decoration-line: underline")
    && focus.includes("text-decoration-thickness: 2px"),
  "the automatically focused heading still looks like a boxed action");
});

test("the response field and text input are shallow ruled paper", () => {
  const field = lastRule(".chat-column-villager .question-card-answer");
  assert.ok(field.includes("border-top: 1px solid") && field.includes("border-bottom: 1px solid")
    && field.includes("box-shadow: none"),
  "the response field has no shallow ruled boundary");
  const input = lastRule(".chat-column-villager .question-card-controls input");
  assert.ok(input.includes("border: 0") && input.includes("border-bottom: 1px solid")
    && input.includes("border-radius: 0") && input.includes("background: transparent")
    && input.includes("box-shadow: none"),
  "the answer input still reads as a glossy rounded field");
  const focus = lastRule(".chat-column-villager .question-card-controls input:focus");
  assert.ok(focus.includes("outline: 2px solid var(--garden-cyan)")
    && focus.includes("outline-offset: 3px"),
  "the real input lost unmistakable keyboard focus");
  assert.ok(lastRule(".chat-column-villager .question-card-controls input:disabled").includes("opacity: .5"),
    "the busy native input has no visible disabled state");
});

test("Answer and defer are flat text actions with native disabled truth", () => {
  const actions = lastRule(".chat-column-villager .question-card-actions");
  assert.ok(actions.includes("display: flex") && actions.includes("flex-wrap: wrap"),
    "the two response paths cannot wrap together");
  const pill = lastRule(".chat-column-villager .question-card-actions .pill");
  assert.ok(pill.includes("border-radius: 1px") && pill.includes("background: transparent")
    && pill.includes("box-shadow: none") && pill.includes("min-height: 40px")
    && !pill.includes("transition: transform"),
  "question actions still read as inflated pills");
  const hover = lastRule(".chat-column-villager .question-card-actions .pill:hover:not(:disabled)");
  assert.ok(hover.includes("transform: none") && hover.includes("background: transparent")
    && hover.includes("box-shadow: none"),
  "the lantern's inherited lift still moves question decisions");
  const focus = lastRule(".chat-column-villager .question-card-actions .pill:focus-visible");
  assert.ok(focus.includes("outline: 2px solid var(--garden-cyan)")
    && focus.includes("outline-offset: 3px"),
  "question actions have no strong keyboard focus");
  assert.match(question, /<Pill disabled=\{answerDisabled\}[\s\S]*?<Pill kind="quiet" disabled=\{disabled\}/,
    "native Answer/defer disabled gates or keyboard order changed");
});

test("the late compact cascade stacks long response content without travel", () => {
  const taskStart = css.indexOf("/* Task 192:");
  const oldRound = css.lastIndexOf(".chat-column-villager .question-card,");
  assert.ok(taskStart > oldRound, "an older 22px card rule can override question paper");
  const compactStart = css.indexOf("@media (max-width: 620px)", taskStart);
  const reducedStart = css.indexOf("/* Reduced motion, part two", taskStart);
  const compact = css.slice(compactStart, reducedStart);
  assert.match(compact, /\.chat-column-villager \.question-card-controls[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
    "compact question controls do not stack to one safe column");
  assert.match(compact, /\.chat-column-villager \.question-card-actions[\s\S]*?align-items: flex-start/,
    "compact response actions do not stay contained and readable");
  assert.match(compact, /\.chat-column-villager \.question-card-actions \.pill[\s\S]*?text-align: left/,
    "a long compact defer action does not stay readable inside its target");
});

test("question paper adds no decorative motion and final reduced motion wins", () => {
  const taskStart = css.indexOf("/* Task 192:");
  const sliceEnd = css.indexOf("/* Task 193:", taskStart);
  const taskCss = css.slice(taskStart, sliceEnd);
  assert.ok(taskStart !== -1 && sliceEnd > taskStart, "the Task 192 paper slice is missing");
  assert.doesNotMatch(taskCss, /@keyframes|animation:/, "question paper adds decorative travel");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)", sliceEnd));
  assert.match(reduced, /\.chat-column-villager \.question-card-actions \.pill[\s\S]*?transition: none/,
    "the final reduced-motion block does not pin question actions");
});
