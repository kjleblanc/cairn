import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const chat = renderer("screens", "Chat.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * Decision 9, rule 5. Buttons are chunky pills with a solid lower edge that
 * compresses on press; motion overshoots rather than easing out; menu items
 * stagger; characters spring when touched; type is heavy, never thin.
 */
test("a pill has a solid lower edge that compresses under a press", () => {
  assert.ok(rule(".pill").includes("--pill-edge"), "the pill has no lower edge");
  const pressed = rule(".pill:active:not(:disabled)");
  assert.ok(pressed.includes("translateY(2px)"), "the pill does not sink when pressed");
  assert.ok(/box-shadow:\s*0 1px 0/.test(pressed), "the pill's edge does not compress");
});

test("motion overshoots instead of easing out", () => {
  assert.ok(rule(".pill").includes("var(--pop)"), "the pill does not overshoot");
  assert.ok(rule(".town-face").includes("var(--pop)"), "the cast does not spring");
});

test("the cast springs when touched", () => {
  assert.ok(css.includes(".town-node:hover .town-face"), "the cast does not react to a pointer");
  assert.ok(css.includes(".town-node:active .town-face"), "the cast does not compress when touched");
});

test("suggestion notes settle in gently and respond without scaling", () => {
  assert.ok(css.includes("@keyframes followup-note-arrive"), "there is no restrained note arrival");
  for (const nth of [1, 2, 3]) {
    assert.ok(
      css.includes(`.followup-note:nth-child(${nth})`),
      `suggestion ${nth} does not take its own turn`,
    );
  }
  // REPOINTED by Task 260 (Slice 5). Decision 9's rule is unchanged and is
  // still what is asserted — a suggestion slides a little and never scales like
  // a chunky pill. The rule that draws it moved to the conversation's own
  // sheet; the stagger and the arrival it responds to are still the unscoped
  // ones checked above, in `app.css`.
  const surfaces = renderer("surfaces.css");
  const at = surfaces.indexOf("\n.rp-conversation .followup-note:hover:not(:disabled) {");
  assert.notEqual(at, -1, "the suggestion note has no hover response at all");
  const hover = surfaces.slice(at, surfaces.indexOf("}", at));
  assert.ok(hover.includes("translateX(2px)") && !hover.includes("scale("),
    "a suggestion does not make its restrained paper response");
  // `both` would leave the final keyframe's `transform: none` pinned over the
  // hover slide forever. `backwards` fills only the delay, which is the half
  // the stagger actually needs.
  assert.ok(/animation:[^;]*followup-note-arrive[^;]*backwards/.test(css),
    "the staggered arrival would freeze the hover slide");
});

test("type is heavy, and the heavy face is really loaded", () => {
  assert.match(css, /body\s*{[^}]*font-weight:\s*600/s);
  assert.match(css, /h1, h2, h3\s*{[^}]*font-weight:\s*700/s);
  assert.ok(!/font-weight:\s*[89]\d\d/.test(css),
    "a weight above 700 was asked for; Quicksand tops out at 700 and the rest is faux bold");
  assert.ok(renderer("main.tsx").includes("@fontsource/quicksand/700.css"),
    "700 is used but never imported, so it renders as synthesized bold");
});

test("every added motion stops for reduced motion", () => {
  // Brace-balanced, not sliced to end-of-file: the ≤620px and 621–1260px
  // blocks further down mention `.pill` and `.chat-column-villager`, so an
  // end-of-file slice would find those selectors and pass even after a
  // regression removed them from the reduced-motion rule itself.
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(start, -1, "app.css has no reduced-motion block");
  let depth = 0;
  let end = -1;
  for (let index = css.indexOf("{", start); index < css.length && end < 0; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}" && --depth === 0) end = index + 1;
  }
  assert.notEqual(end, -1, "app.css's reduced-motion block never closes");
  const reduced = css.slice(start, end);
  for (const selector of [".pill", ".town-face", ".followup-note"]) {
    assert.ok(reduced.includes(selector), `${selector} keeps moving under reduced motion`);
  }
  // The rule is the same FINAL STATE, not merely less motion: a pill must
  // still sit on its edge and a suggestion must still be fully arrived.
  // Killing the animations is half of that; neutralising the hover and press
  // geometry is the other half, and naming only the selectors above would
  // pass with that half deleted.
  for (const selector of [
    ".pill:hover:not(:disabled)",
    ".town-node:hover .town-face",
    ".followup-note:hover:not(:disabled)",
  ]) {
    assert.ok(reduced.includes(selector), `${selector} keeps its transform under reduced motion`);
  }
  assert.ok(reduced.includes("transform: none"),
    "reduced motion leaves a hover or press transform applied");
});

test("the lantern's buttons keep their mint and ghost identities without chunky edges", () => {
  const primary = rule(".chat-column-villager .pill-primary");
  assert.ok(primary.includes("var(--garden-cyan)"),
    "Send has lost its muted mint identity");
  assert.ok(primary.includes("border: 1px solid") && !primary.includes("0 5px 0"),
    "Send still carries the old thick lower edge");
  assert.ok(rule(".chat-column-villager .pill-quiet").includes("background: transparent"),
    "quiet lantern actions no longer disappear into the paper");
});

test("New and Send live inside one compact composer surface", () => {
  // The class list is matched by PREFIX. Task 260 (Slice 5) added a second class
  // to this element, and an exact-attribute match would simply have stopped
  // finding the composer — which is a test going quiet, not a test passing.
  assert.match(chat, /<div className="chat-composer[^"]*">[\s\S]*?<textarea[\s\S]*?<div className="chat-composer-actions">[\s\S]*?aria-label="New conversation"[\s\S]*?>New<\/button>[\s\S]*?>Send<\/Pill>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
    "the writing field, New, and Send are not one composer control");

  // Decision 9's arrangement, asserted on the sheet that actually draws the
  // shipped composer. Task 260 moved it; it did not change what it must be.
  const surfaces = renderer("surfaces.css");
  const surfaceRule = (selector: string): string => {
    const start = surfaces.indexOf(`\n${selector} {`);
    assert.notEqual(start, -1, `${selector} has no rule`);
    return surfaces.slice(start, surfaces.indexOf("}", start));
  };
  const composer = surfaceRule(".rp-conversation .rp-composer");
  assert.ok(composer.includes("flex-direction: column"),
    "the composer does not stack its writing area above its actions");
  assert.ok(composer.includes("border: 1px solid"),
    "the composer has no single enclosing boundary");
  const focus = surfaceRule(".rp-conversation .rp-composer:focus-within");
  assert.ok(focus.includes("border-color:") && focus.includes("box-shadow:"),
    "keyboard focus does not mark the shared composer surface");
  const textarea = surfaceRule(".rp-conversation .rp-composer textarea");
  assert.ok(textarea.includes("border: 0") && textarea.includes("background: transparent"),
    "the textarea still draws a competing field inside the shared composer");
  assert.ok(surfaceRule(".rp-conversation .chat-composer-actions").includes("justify-content: space-between"),
    "New and Send do not anchor opposite ends of the shared control");
  assert.ok(surfaceRule(".rp-conversation .chat-composer-actions .pill").includes("padding:"),
    "the full-size pills were not compacted to fit inside the composer");

  // The unscoped rules stay in `app.css` for the standalone chat branch, which
  // Slice 8 owns. They are not what ships on the desk, and this test no longer
  // pretends they are — but a regression that emptied them would leave that
  // branch unstyled, so their shape is still checked.
  assert.ok(rule(".chat-composer").includes("flex-direction: column"));
  assert.ok(rule(".chat-composer-actions").includes("justify-content: space-between"));
});

test("nothing outranks the pill's own press", () => {
  // Both `.chat-composer` buttons are pills, and
  // `motion.css`'s `.chat-composer button:hover:not(:disabled)` is (0,3,1)
  // against `.pill:hover:not(:disabled)`'s (0,3,0), in a file imported AFTER
  // app.css. So a generic button rule there wins twice over, and the app's
  // most-clicked control keeps the old flat press while every test, the
  // typecheck, and both builds stay green. It happened; this is the guard.
  //
  // Unqualified, not just `:hover`/`:active`: the bare
  // `.chat-composer button { transition: … }` shorthand alone is (0,1,1)
  // against `.pill`'s (0,1,0), which would silently drop `box-shadow` from
  // Send's transition list and make the edge snap instead of compress.
  const motion = renderer("motion.css")
    // A comment may name the selector — that is how the rule explains itself.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Killing the transition under reduced motion is correct, and this block
    // runs to the end of the file.
    .replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/, "");
  assert.ok(!motion.includes(".chat-composer button"),
    "a live rule in motion.css outranks the pill treatment on the Send button");
});
