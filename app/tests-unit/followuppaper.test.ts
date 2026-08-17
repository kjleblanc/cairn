import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------------ *
 * Task 194's next-step notes, REWRITTEN by Task 260 (Slice 5).
 *
 * Task 194's shape is unchanged and is still what is asserted: one shallow
 * ruled annotation rather than another card, flat full-width notes with a
 * non-colour tick, a restrained slide instead of a pill-like scale, and
 * unmistakable keyboard focus. Every behavioural assertion — the native group,
 * the accessible name, the focus rules on an accepted send versus a refused
 * one, the temporary commentary note that must never become a live region — is
 * PRESERVED verbatim.
 *
 * Two things moved. The rules are drawn from the constitution's teal and
 * hairline in the conversation's own sheet instead of from the pond's cyan and
 * the lantern's cream alphas; and the compact treatment moved from 620 px to
 * 820 px, because 620 sits below the supported 760 px minimum and so only ever
 * reached the containment stress view, while the new sheets are held to the
 * breakpoint set {820, 1260}.
 * ------------------------------------------------------------------------ */

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const surfaces = renderer("surfaces.css");
const motion = renderer("motion.css");
const chat = renderer("screens", "Chat.tsx");

function surfaceRule(selector: string): string {
  const start = surfaces.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule in surfaces.css`);
  return surfaces.slice(start, surfaces.indexOf("}", start));
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

test("the annotation is shallow ruled paper rather than another card", () => {
  const annotation = surfaceRule(".rp-conversation .followups");
  for (const declaration of ["position: relative", "min-width: 0", "border-radius: 0",
    "box-shadow: none", "background: transparent"]) {
    assert.ok(annotation.includes(declaration), `the next-step annotation is missing ${declaration}`);
  }
  assert.ok(annotation.includes("border-top") && annotation.includes("border-bottom"),
    "the shallow annotation has no ruled paper edges");
  const mark = surfaceRule(".rp-conversation .followups::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 2px")
    && mark.includes("var(--rp-teal-ink)"),
  "the next-step annotation has no restrained teal registration rule");
  // The rule and the tick MEAN something, so WCAG 1.4.11 holds them to 3:1.
  // The retired pair were drawn at 52% and 46% opacity over the paper.
  assert.ok(!/opacity:/.test(mark), "the registration rule is faded below its non-text floor");
});

test("each suggestion is a flat full-width ruled note with a non-color mark", () => {
  const list = surfaceRule(".rp-conversation .followups-list");
  assert.ok(list.includes("display: flex") && list.includes("flex-direction: column")
    && list.includes("min-width: 0"),
  "next notes cannot form one contained reading column");
  const note = surfaceRule(".rp-conversation .followup-note");
  for (const declaration of ["width: 100%", "min-width: 0", "min-height: 44px",
    "border: 0", "border-radius: 1px", "background: transparent", "box-shadow: none",
    "white-space: normal", "overflow-wrap: anywhere"]) {
    assert.ok(note.includes(declaration), `a paper note is missing ${declaration}`);
  }
  assert.ok(note.includes("border-bottom"), "paper notes have no hairline separator");
  const mark = surfaceRule(".rp-conversation .followup-note::before");
  assert.ok(mark.includes('content: ""') && mark.includes("width: 8px")
    && mark.includes("height: 2px"),
  "a suggestion still relies on color or button shape alone");
  assert.ok(!/opacity:/.test(mark), "the suggestion's tick is faded below its non-text floor");

  // The staggered arrival stays where it always was — on the unscoped rule near
  // the top of `app.css` — so the scoped rule must not silently drop it.
  assert.ok(!/animation:/.test(note),
    "the scoped note declares its own arrival and would outrank the staggered one");
  assert.ok(/\.followup-note \{[^}]*animation: followup-note-arrive/s.test(css),
    "the staggered arrival is gone from the unscoped note");
});

test("hover is restrained and keyboard focus is unmistakable", () => {
  const hover = surfaceRule(".rp-conversation .followup-note:hover:not(:disabled)");
  assert.ok(hover.includes("translateX(2px)") && !hover.includes("scale("),
    "the note either does not respond or still performs a pill-like scale");
  const active = surfaceRule(".rp-conversation .followup-note:active:not(:disabled)");
  assert.ok(active.includes("translateX(2px)") && !active.includes("scale("),
    "pressing a note still compresses like a chunky button");
  const focus = surfaceRule(".rp-conversation .followup-note:focus-visible");
  assert.ok(focus.includes("outline: 3px solid var(--rp-focus)")
    && focus.includes("outline-offset: 2px"),
  "paper notes lack the drawn keyboard focus the constitution specifies");
});

test("commentary's temporary note is CSS-owned and never becomes a live region", () => {
  assert.match(chat, /className="small muted commentary-stream-note">Commenting on the result above\. Messages sent now wait below\.<\/p>/,
    "the temporary commentary explanation still owns inline visual policy");
  assert.doesNotMatch(chat, /bubble-commentary[^>]*(?:role="status"|aria-live)/,
    "token commentary would chatter through a live region");
  const note = surfaceRule(".rp-conversation .commentary-stream-note");
  assert.ok(note.includes("border-top") && note.includes("overflow-wrap: anywhere"),
    "the streaming explanation does not read as a restrained note");
});

test("compact notes stay contained and final reduced motion wins", () => {
  // The compact block is the LAST thing in the conversation's sheet, and it is
  // at 820 px: the retired 620 px block sat below the supported 760 px minimum
  // and reached only the containment stress view, and the new sheets are held
  // to the breakpoint set {820, 1260} by `visualtokens.test.ts`.
  const compact = surfaces.indexOf("@media (max-width: 820px)");
  assert.notEqual(compact, -1, "the conversation has no compact treatment at all");
  const compactCss = surfaces.slice(compact);
  assert.match(compactCss, /\.rp-conversation \.followups[\s\S]*?\.rp-conversation \.followup-note/,
    "the compact block does not contain long next steps");
  assert.ok(!/@media \(max-width: 620px\)/.test(surfaces),
    "a breakpoint below the supported minimum came back into the new system");

  // Reduced motion for these notes lives at the end of `motion.css`, which is
  // imported last. It cannot live in `app.css`: that file declares no selector
  // from the new system, in a rule or in a comment, so the two cascades stay
  // separable for Slice 10.
  const reduced = motion.slice(motion.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.rp-conversation \.followup-note,[\s\S]*?animation: none; transition: none;/,
    "final reduced motion does not stop the scoped note arrival");
  assert.match(reduced, /\.rp-conversation \.followup-note:hover:not\(:disabled\),[\s\S]*?transform: none;/,
    "reduced motion leaves the note's lateral hover travel active");
});
