import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------------ *
 * Task 187's conversation paper, REWRITTEN by Task 260 (Slice 5).
 *
 * Task 187 decided the shape of the two voices and it still holds: Cairn is a
 * line in the correspondence rather than another speech card, the owner keeps a
 * fill and a paper-cut corner so the two stay scannable, and neither one gains
 * decorative motion. Every one of those assertions survives below.
 *
 * What changed is the material. Those rules were written against the retired
 * lantern's palette — the pond's cyan at 44% opacity for Cairn's mark, and for
 * the owner a hard-coded `#fae3c8 → #f3d0a8` gradient with `#453120` ink. That
 * gradient had NO dark-theme value at all: it was three fixed hex literals on a
 * surface that was permanently dark, so on the warm daylight paper the desk now
 * uses it was decorative luck rather than a measured pairing. Both are the
 * constitution's semantics now, and `visualtokens.test.ts` recomputes their
 * contrast from the shipped token values in both themes.
 *
 * The proposal card's assertions are PRESERVED, unchanged, against `app.css`.
 * The task card is Slice 6's surface, not this one's, and this slice
 * deliberately left its structure alone.
 * ------------------------------------------------------------------------ */

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const surfaces = renderer("surfaces.css");
const chat = renderer("screens", "Chat.tsx");
const taskCard = renderer("components", "TaskCard.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/** The same slice, taken from the conversation's own sheet. */
function surfaceRule(selector: string): string {
  const start = surfaces.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule in surfaces.css`);
  return surfaces.slice(start, surfaces.indexOf("}", start));
}

test("the owner speaks on one flat clipped memo, in the measured apricot pair", () => {
  const owner = surfaceRule(".rp-conversation .bubble-owner");
  assert.ok(owner.includes("box-shadow: none"), "the owner's note still glows like a bubble");
  assert.ok(owner.includes("clip-path: polygon"), "the owner's note has no controlled paper-cut corner");
  assert.ok(owner.includes("min-width: 0") && owner.includes("overflow-wrap: anywhere"),
    "an exact long owner answer can escape its clipped paper memo");
  assert.ok(!owner.includes("border-radius: 20px"), "the owner's note still has the inflated bubble silhouette");

  // The ground and the ink are the semantic pair, carried by the class the
  // markup adds. Declaring them here instead would put a colour decision
  // outside the layer `visualtokens.test.ts` measures.
  assert.ok(!/background:|color:/.test(owner),
    "the owner's note decides its own colour again instead of taking the measured pair");
  assert.match(chat, /"bubble-owner rp-note-owner"/,
    "the owner's turn no longer carries the measured apricot pair");
  assert.match(chat, /bubble bubble-owner rp-note-owner bubble-pending/,
    "a queued message is drawn differently from the message it will become");
  assert.ok(!surfaces.includes("#fae3c8") && !surfaces.includes("#453120"),
    "the retired hard-coded peach came along with the shape");
  assert.ok(!css.includes("#fae3c8"),
    "the retired hard-coded peach is still in the old cascade");
});

test("Cairn prose stays unboxed and keeps one restrained registration mark", () => {
  const plain = rule(".bubble-cairn");
  assert.ok(plain.includes("background: transparent") && plain.includes("border: 0"),
    "Cairn's prose has regained a filled or outlined bubble");

  const prose = surfaceRule(".rp-conversation .bubble-cairn");
  assert.ok(prose.includes("position: relative") && prose.includes("padding: 2px 0 2px 18px"),
    "Cairn's prose has no place for its quiet speaker mark");
  assert.ok(prose.includes("background: transparent") && prose.includes("border: 0")
    && prose.includes("box-shadow: none"),
  "Cairn's prose gained a box on the paper");

  // Type and ink come from `.rp-prose`, the material Slice 3 declared, so the
  // measure and the line height are stated once for the whole system.
  assert.match(chat, /"bubble-cairn rp-prose"/, "Cairn's turn is not drawn as open prose");
  assert.match(chat, /bubble bubble-cairn rp-prose bubble-commentary/,
    "the envelope's comment is not drawn as the same open prose");
  const material = surfaceRule(".rp-prose");
  assert.ok(/max-width:\s*\d+ch/.test(material) && material.includes("line-height: 1.6"),
    "long prose has no comfortable measure or line height");

  const mark = surfaceRule(".rp-conversation .bubble-cairn::before");
  assert.ok(mark.includes("var(--rp-teal-ink)"), "Cairn's mark does not belong to the approved palette");
  assert.ok(mark.includes("width:") && mark.includes("height: 2px"), "Cairn's mark is not a short clean stroke");
  assert.ok(!mark.includes("border:"), "Cairn's mark draws another outlined badge");
  // The mark MEANS something — it says who is speaking — so WCAG 1.4.11 holds
  // it to 3:1, and the retired rule drew it at 44% opacity on the paper.
  assert.ok(!/opacity:/.test(mark),
    "the speaker mark is faded again, which drops a meaningful mark below its non-text floor");
});

test("a refusal is a full-width note carrying shape as well as colour", () => {
  const note = surfaceRule(".rp-conversation .bubble-system");
  assert.ok(note.includes("align-self: stretch") && note.includes("text-align: left"),
    "a recovery the owner has to act on is still centred like an aside");
  assert.ok(note.includes("overflow-wrap: anywhere"), "a long error message can escape its note");
  assert.match(chat, /"bubble bubble-system rp-note-stop"/,
    "the refusal note does not take the measured stop pair and its left rule");
  const material = surfaceRule(".rp-note-stop");
  assert.ok(material.includes("border-left: 3px solid"),
    "a stop is drawn in colour alone, with no rule to carry it by shape and position");
});

test("machine evidence in Cairn's prose is bounded and scrolls inside its own frame", () => {
  const md = renderer("components", "Md.tsx");
  assert.match(md, /className="md-code mono rp-machine rp-scroll-x"/,
    "a fenced block is not a bounded mono surface that contains itself");
  assert.match(md, /className="md-table-wrap rp-scroll-x"/,
    "a wide table widens the paper instead of scrolling inside its frame");
  assert.match(md, /<code className="mono rp-machine"/,
    "an inline command or path is not marked as machine evidence");
  const workspace = renderer("workspace.css");
  const at = workspace.indexOf("\n.rp-scroll-x {");
  assert.notEqual(at, -1, "the containment class the markup asks for does not exist");
  assert.ok(workspace.slice(at, workspace.indexOf("}", at)).includes("overflow-x: auto"),
    "the containment class does not actually contain anything");
  const code = surfaceRule(".rp-conversation .md-code");
  assert.ok(code.includes("var(--rp-paper-raised)") && code.includes("font-size: 13px"),
    "machine evidence is not set on its own raised mono surface");
});

test("the proposal is one translucent folio instead of a rounded card", () => {
  const proposal = rule(".chat-column-villager .task-card");
  assert.ok(proposal.includes("border: 0") && proposal.includes("box-shadow: none"),
    "the proposal still carries enclosing glass-card chrome");
  assert.ok(proposal.includes("flex-shrink: 0") && proposal.includes("overflow: visible"),
    "a long transcript can compress and clip the current proposal");
  assert.ok(proposal.includes("var(--paper-grain)"), "the proposal does not share the paper field");
  assert.ok(!proposal.includes("border-radius: 22px"), "the proposal still uses the oversized card radius");

  const registration = rule(".chat-column-villager .task-card::before");
  assert.ok(registration.includes("var(--garden-cyan)"), "the risk-free proposal has no restrained registration rule");
  assert.ok(registration.includes("width: 2px"), "the proposal registration rule became decorative");
  assert.ok(rule(".chat-column-villager .task-card:has(.task-risk)::before").includes("var(--garden-amber)"),
    "a proposal with a concern does not switch its margin cue to amber");
});

test("a concern is an amber margin note, not a second card", () => {
  const concern = rule(".chat-column-villager .task-risk");
  assert.ok(concern.includes("border: 0") && concern.includes("border-left: 2px solid"),
    "the concern still has a full enclosing outline");
  assert.ok(concern.includes("var(--garden-amber)"), "the concern lost its amber decision cue");
  assert.ok(concern.includes("grid-template-columns: minmax(0, 1fr) auto"),
    "Set aside still floats on a separate empty row below the concern");
  assert.ok(!concern.includes("border-radius: 16px"), "the concern still reads as a nested rounded card");
});

test("proposal hierarchy and controls remain visibly decisive", () => {
  const heading = rule(".chat-column-villager .task-card-heading");
  assert.ok(heading.includes("var(--lantern-soft)"), "the proposal label still competes with its outcome");
  const focusedHeading = rule(".chat-column-villager .task-card-heading:focus");
  assert.ok(focusedHeading.includes("outline: none") && focusedHeading.includes("var(--garden-cyan)"),
    "replacement focus still boxes the label instead of marking the paper line");
  const outcome = rule(".chat-column-villager .task-card-outcome");
  assert.ok(outcome.includes("var(--lantern-ink)"), "the proposal outcome no longer leads the note");

  const disabled = rule(".chat-column-villager .task-card-actions .pill-primary:disabled");
  assert.ok(disabled.includes("opacity: .68"), "disabled Review disappears into the paper");
  assert.match(taskCard, /className="task-card-risks" aria-label="Concerns to decide"/,
    "the visual pass removed the labeled concern list");
  assert.match(taskCard, /disabled=\{busy \|\| !current \|\| action\.risks\.length > 0\}/,
    "the visual pass changed Review's native decision gate");
});

test("expanded proposal details use rules rather than nested tiles", () => {
  const details = rule(".chat-column-villager .task-card-details");
  assert.ok(details.includes("border-radius: 0") && details.includes("background: transparent"),
    "Details still creates a rounded inner panel");
  const intent = rule(".chat-column-villager .task-card .task-intent-row");
  assert.ok(intent.includes("border: 0") && intent.includes("border-left: 2px solid"),
    "attributed details still stack bordered tiles inside the proposal");
  assert.ok(rule(".chat-column-villager .task-card .task-intent-owner-stated .muted")
    .includes("var(--garden-cyan)"),
  "owner-attribution labels inherit an unreadable legacy dark color");
  assert.ok(rule(".task-card-details > summary:focus-visible").includes("var(--garden-cyan)"),
    "the native Details disclosure lost its visible keyboard focus");
});

test("conversation paper adds no new moving decoration", () => {
  for (const selector of [
    ".rp-conversation .bubble-owner",
    ".rp-conversation .bubble-cairn",
    ".rp-conversation .bubble-cairn::before",
    ".rp-conversation .bubble-system",
    ".rp-conversation .rp-transcript",
  ]) {
    const declaration = surfaceRule(selector);
    assert.ok(!/\b(?:animation|transition):/.test(declaration), `${selector} introduces decorative motion`);
  }
  for (const selector of [
    ".chat-column-villager .task-card",
    ".chat-column-villager .task-card::before",
    ".chat-column-villager .task-risk",
  ]) {
    const declaration = rule(selector);
    assert.ok(!/\b(?:animation|transition):/.test(declaration), `${selector} introduces decorative motion`);
  }

  // A turn does not travel. Three of the four bubble kinds hold a control —
  // Stop, Take back, Try again — and the constitution forbids a transform on a
  // container that holds one; a scaled container also blurs its own text
  // mid-flight, on the one surface whose whole content is text.
  const motion = renderer("motion.css");
  assert.match(motion, /\.rp-conversation \.bubble \{ animation: none; \}/,
    "the transcript's turns still slide and scale on arrival");
});
