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

test("settled next steps keep their native group and become paper notes", () => {
  assert.match(chat, /className="followups" ref=\{followupsRef\} data-followups-state="ready" role="group" aria-label="Cairn's suggestions for what to do next"/,
    "the next-step annotation lost its stable state or accessible group");
  assert.match(chat, /className="followups-label">Where we could go next<\/p>[\s\S]*?className="small muted followups-hint">Tap one to send it as your message\.<\/p>/,
    "the heading and plain-language send hint are still one dense sentence");
  assert.match(chat, /className="followups-list"[\s\S]*?<button[^>]*type="button"[^>]*className="followup-note"[\s\S]*?\{suggestion\}<\/button>/,
    "suggestions are not native ordered paper-note buttons");
  assert.doesNotMatch(chat, /followups-row|followup-chip/,
    "the obsolete chip presentation hooks remain in the renderer");
});

test("a successful note send returns focus to writing while a refusal restores its note", () => {
  assert.match(chat, /const followupsRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(chat, /async function sendFollowup\(suggestion: string\)[\s\S]*?await send\(suggestion, false, undefined, false\)[\s\S]*?if \(!sent\) \{[\s\S]*?followupsRef\.current\?\.querySelectorAll<HTMLButtonElement>\("\.followup-note"\)[\s\S]*?note\.textContent === suggestion\)\?\.focus\(\)[\s\S]*?return;[\s\S]*?requestAnimationFrame\(\(\) => composerRef\.current\?\.focus\(\)\)/,
    "follow-up focus does not distinguish an accepted ordinary send from a refused, remounted note");
  assert.match(chat, /className="followups" ref=\{followupsRef\}/,
    "the current next-step group cannot receive refusal focus restoration");
  assert.match(chat, /onClick=\{\(\) => void sendFollowup\(suggestion\)\}/,
    "paper notes bypass the bounded ordinary-send helper");
  assert.doesNotMatch(chat, /autoFocus/,
    "next steps steal focus merely by appearing");
});

test("the annotation is shallow cyan-ruled paper rather than another card", () => {
  const annotation = lastRule(".chat-column-villager .followups");
  for (const declaration of ["position: relative", "min-width: 0", "border-radius: 0",
    "box-shadow: none", "background: transparent"]) {
    assert.ok(annotation.includes(declaration), `the next-step annotation is missing ${declaration}`);
  }
  assert.ok(annotation.includes("border-top") && annotation.includes("border-bottom"),
    "the shallow annotation has no ruled paper edges");
  const mark = lastRule(".chat-column-villager .followups::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 2px")
    && mark.includes("var(--garden-cyan)"),
  "the next-step annotation has no restrained cyan registration rule");
});

test("each suggestion is a flat full-width ruled note with a non-color mark", () => {
  const list = lastRule(".chat-column-villager .followups-list");
  assert.ok(list.includes("display: flex") && list.includes("flex-direction: column")
    && list.includes("min-width: 0"),
  "next notes cannot form one contained reading column");
  const note = lastRule(".chat-column-villager .followup-note");
  for (const declaration of ["width: 100%", "min-width: 0", "min-height: 44px",
    "border: 0", "border-radius: 1px", "background: transparent", "box-shadow: none",
    "white-space: normal", "overflow-wrap: anywhere"]) {
    assert.ok(note.includes(declaration), `a paper note is missing ${declaration}`);
  }
  assert.ok(note.includes("border-bottom"), "paper notes have no hairline separator");
  const mark = lastRule(".chat-column-villager .followup-note::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 8px")
    && mark.includes("height: 2px"),
  "a suggestion still relies on color or button shape alone");
});

test("hover is restrained and keyboard focus is unmistakable", () => {
  const hover = lastRule(".chat-column-villager .followup-note:hover:not(:disabled)");
  assert.ok(hover.includes("translateX(2px)") && !hover.includes("scale("),
    "the note either does not respond or still performs a pill-like scale");
  const active = lastRule(".chat-column-villager .followup-note:active:not(:disabled)");
  assert.ok(active.includes("translateX(2px)") && !active.includes("scale("),
    "pressing a note still compresses like a chunky button");
  const focus = lastRule(".chat-column-villager .followup-note:focus-visible");
  assert.ok(focus.includes("outline: 2px solid var(--garden-cyan)")
    && focus.includes("outline-offset: 3px"),
  "paper notes lack unmistakable keyboard focus");
});

test("commentary's temporary note is CSS-owned and never becomes a live region", () => {
  assert.match(chat, /className="small muted commentary-stream-note">Commenting on the result above\. Messages sent now wait below\.<\/p>/,
    "the temporary commentary explanation still owns inline visual policy");
  assert.doesNotMatch(chat, /bubble-commentary[^>]*(?:role="status"|aria-live)/,
    "token commentary would chatter through a live region");
  const note = lastRule(".chat-column-villager .commentary-stream-note");
  assert.ok(note.includes("border-top") && note.includes("overflow-wrap: anywhere"),
    "the streaming explanation does not read as a restrained note");
});

test("compact notes stay contained and final reduced motion wins", () => {
  const taskStart = css.indexOf("/* Task 194:");
  const reducedStart = css.indexOf("/* Reduced motion, part two", taskStart);
  assert.ok(taskStart !== -1 && reducedStart > taskStart,
    "the Task 194 paper-note slice is missing or follows reduced motion");
  const taskCss = css.slice(taskStart, reducedStart);
  assert.match(taskCss, /@media \(max-width: 620px\) \{[\s\S]*?\.chat-column-villager \.followups[\s\S]*?\.chat-column-villager \.followup-note/,
    "the late compact cascade does not contain long next steps");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)", reducedStart));
  assert.match(reduced, /\.chat-column-villager \.followup-note \{[\s\S]*?animation: none;[\s\S]*?transition: none;/,
    "final reduced motion does not stop the scoped note arrival");
  assert.match(reduced, /\.chat-column-villager \.followup-note:hover:not\(:disabled\)[\s\S]*?transform: none;/,
    "reduced motion leaves the note's lateral hover travel active");
});
