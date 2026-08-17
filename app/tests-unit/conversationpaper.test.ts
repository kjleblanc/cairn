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

/**
 * EVERYTHING `selector` declares in `surfaces.css`, brace-tracked, comments
 * stripped first so a comma inside prose cannot split a selector list.
 *
 * Task 263's decision family is written as shared rule sets — one sheet, one
 * heading, one action skin for nine surfaces — so most of its selectors sit in
 * a comma-separated list and never appear as `\n<selector> {`. `surfaceRule`
 * above would simply not find them, and a helper that cannot find its rule is
 * a test that goes quiet rather than red; this one asserts it found something.
 * Several selectors are also declared twice, once in a shared list and once in
 * a small override, so the union is what the selector actually declares here.
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

/* ------------------------------------------------------------------------ *
 * The proposal, REWRITTEN by Task 263 (Slice 6).
 *
 * Slice 5 deliberately left these five tests pointing at `app.css`, because
 * the task card was Slice 6's surface and moving its guard early would have
 * guarded nothing. Slice 6 moved the rules, so the guard moves with them.
 *
 * Task 187's IDEAS are all still asserted: one folio rather than an enclosing
 * glass card, a concern as a margin note rather than a second card, a label
 * that does not compete with the outcome it introduces, details behind a
 * native disclosure with visible focus, and no decorative travel on any of it.
 * What changed is the material — measured token pairs instead of eleven
 * hard-coded cream alphas — and three specific things that are named here so
 * they are not mistaken for drift:
 *
 *   1. The registration mark is a real `border-left`, not an absolutely
 *      positioned 2px `::before`. Same signal, no positioned box, and it is
 *      the vocabulary `.rp-note-attention` and `.rp-note-stop` already use.
 *   2. `box-shadow: none` became `var(--rp-shadow-low)`. Task 187 banned the
 *      lantern's GLOW; the new constitution asks for "subtle shadows and
 *      hairlines" and this is the lowest step of the shipped paper vocabulary,
 *      the same one the composer takes.
 *   3. Disabled Review no longer fades. `opacity: .68` on a teal fill was the
 *      defect Slice 5 measured at 2.45:1 on the composer's Send, and this
 *      family carried two more of it.
 * ------------------------------------------------------------------------ */

test("the proposal is one folio on measured paper, not a rounded card", () => {
  const proposal = surfaceRuleFor(".rp-conversation .task-card");
  assert.ok(proposal.includes("flex-shrink: 0") && proposal.includes("overflow: visible"),
    "a long transcript can compress and clip the current proposal");
  assert.ok(proposal.includes("border: 0"), "the proposal regained a full enclosing outline");
  assert.ok(!/border-radius: (?:16|22)px/u.test(proposal), "the proposal still uses an oversized card radius");

  // The ground, the depth and the rule all come from the measured layer, so a
  // later edit that drops one below its floor fails `visualtokens.test.ts`
  // instead of shipping.
  assert.ok(proposal.includes("background-color: var(--rp-paper-raised)"),
    "the proposal does not sit on the measured raised paper");
  assert.ok(proposal.includes("box-shadow: var(--rp-shadow-low)"),
    "the proposal's depth is not the shipped paper vocabulary");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(/u.test(proposal),
    "the proposal decides a colour outside the measured token layer");

  // The registration rule, and the amber switch that is the whole point of it.
  assert.ok(proposal.includes("border-left: 3px solid var(--rp-teal)"),
    "the risk-free proposal has no restrained registration rule");
  assert.ok(surfaceRuleFor(".rp-conversation .task-card:has(.task-risk)")
    .includes("border-left-color: var(--rp-amber-ink)"),
  "a proposal with a concern does not switch its margin cue to the attention ink");
});

test("a concern is an amber margin note, not a second card", () => {
  const concern = surfaceRuleFor(".rp-conversation .task-risk");
  assert.ok(concern.includes("border: 0") && concern.includes("border-left: 3px solid"),
    "the concern still has a full enclosing outline");
  assert.ok(concern.includes("var(--rp-amber-ink)"), "the concern lost its amber decision cue");
  assert.ok(concern.includes("grid-template-columns: minmax(0, 1fr) auto"),
    "Set aside still floats on a separate empty row below the concern");
  assert.ok(!concern.includes("border-radius: 16px"), "the concern still reads as a nested rounded card");

  // Set aside is a real target, not a text link squeezed onto a note.
  const setAside = surfaceRuleFor(".rp-conversation .task-risk .pill");
  assert.ok(setAside.includes("min-height: 44px") && setAside.includes("min-width: 44px"),
    "Set aside is below the 44 x 44 floor");
});

test("proposal hierarchy and controls remain visibly decisive", () => {
  // Decision first: the heading is the strongest ink on the card and the
  // outcome is the prose beneath it, not the other way round.
  const heading = surfaceRuleFor(".rp-conversation .task-card-heading");
  assert.ok(heading.includes("color: var(--rp-ink-strong)") && heading.includes("font-weight: 700"),
    "the proposal label still competes with its outcome instead of leading it");
  const focusedHeading = surfaceRuleFor(".rp-conversation .task-card-heading:focus");
  assert.ok(focusedHeading.includes("outline: none")
    && focusedHeading.includes("text-decoration-line: underline")
    && focusedHeading.includes("var(--rp-focus)"),
  "replacement focus still boxes the label instead of marking the paper line");
  const outcome = surfaceRuleFor(".rp-conversation .task-card-outcome");
  assert.ok(outcome.includes("color: var(--rp-ink)"), "the proposal outcome no longer leads the note");

  // A DISABLED CONTROL IS STILL READ. The retired rule faded it to .68.
  const disabled = surfaceRuleFor(".rp-conversation .task-card-actions .pill-primary:disabled");
  assert.ok(disabled.includes("opacity: 1"), "disabled Review fades into the paper again");
  assert.ok(disabled.includes("color: var(--rp-ink-muted)"),
    "inactive Review is not carried by a measured ink");
  assert.ok(!css.includes("opacity: .68"), "the retired disabled fade is still in the old cascade");

  // Every action clears the floor, and the native gates are untouched.
  const action = surfaceRuleFor(".rp-conversation .task-card-actions .pill");
  assert.ok(action.includes("min-height: 44px") && action.includes("min-width: 44px"),
    "the proposal's primary control is below the 44 x 44 floor");
  assert.match(taskCard, /className="task-card-risks" aria-label="Concerns to decide"/,
    "the visual pass removed the labeled concern list");
  assert.match(taskCard, /disabled=\{busy \|\| !current \|\| action\.risks\.length > 0\}/,
    "the visual pass changed Review's native decision gate");
});

test("expanded proposal details use rules rather than nested tiles", () => {
  const details = surfaceRuleFor(".rp-conversation .task-card-details");
  assert.ok(details.includes("border-radius: 0") && details.includes("background: transparent"),
    "Details still creates a rounded inner panel");

  // ONE intent-row rule set, flat, with the proposal's fill as an override.
  const shared = surfaceRuleFor(".rp-conversation .task-intent-row");
  assert.ok(shared.includes("border: 0") && shared.includes("border-left: 2px solid"),
    "attributed details still stack bordered tiles");
  const inProposal = surfaceRuleFor(".rp-conversation .task-card .task-intent-row");
  assert.ok(inProposal.includes("background: var(--rp-paper)"),
    "the proposal's own intent rows lost the quiet fill that groups them");

  // Provenance is a word before it is a colour — TaskIntentList prints "You
  // said so" on the row — but the label still has to be readable.
  assert.ok(surfaceRuleFor(".rp-conversation .task-intent-owner-stated .task-intent-source")
    .includes("var(--rp-teal-ink)"),
  "owner-attribution labels inherit an unreadable legacy dark color");
  assert.ok(surfaceRuleFor(".rp-conversation .task-card-details > summary:focus-visible")
    .includes("var(--rp-focus)"),
  "the native Details disclosure lost its visible keyboard focus");
});

/*
 * `c3` — ONE HIERARCHY, and nothing reads as already acted on.
 *
 * Decision first, then effect/reason/recovery, then details on demand, then
 * actions. Asserted here on the two halves a stylesheet can actually be held
 * to: the surfaces put their actions on their own ruled row at the end, and no
 * decision surface is filled with a settled or terminal colour.
 *
 * ONE HONEST EXCEPTION, NOT PAPERED OVER. `TaskCard.tsx` renders its actions
 * row BEFORE its `<details>` fold, so on that one surface "details on demand"
 * sits after "actions" in the DOM. It was left that way deliberately: moving
 * the fold above the actions changes the KEYBOARD ORDER of a live approval
 * surface, and the boundary of intent for this slice keeps focus movement and
 * native control semantics exactly as they are. Reordering it belongs to a
 * task that can carry its own keyboard evidence, and the report says so.
 */
test("every decision surface ends in its actions, and none is filled like a settled one", () => {
  // Actions sit on their own ruled row at the end of the always-visible
  // content — a rule above them, nothing below them but a fold.
  const actions = surfaceRuleFor(".rp-conversation .dispatch-actions");
  assert.ok(actions.includes("border-top: 1px solid"), "the action row has no rule separating it");
  assert.ok(actions.includes("margin: 12px 0 0"), "the action row is not the last thing on the card");

  // Nothing in this family takes a success, verified or terminal ground. A
  // prettier card must never look already approved, executed or done.
  const settled = ["--rp-sage", "--rp-mark-sage"];
  const slice = surfaces.slice(surfaces.indexOf("Task 263 (Slice 6)"));
  for (const token of settled) {
    assert.ok(!slice.includes(`background: var(${token})`),
      `a decision surface is filled with ${token}, which reads as already done`);
  }

  // The decision itself is the strongest ink on every surface, and it is a
  // heading rather than a label competing with the body.
  for (const heading of [
    ".rp-conversation .task-card-heading",
    ".rp-conversation .question-card-heading",
    ".rp-conversation .dispatch-heading",
    ".rp-conversation .critic-call-title",
    ".rp-conversation .unsealed-candidate-title",
    ".rp-conversation .candidate-critique-title",
    ".rp-conversation .task-promise-card-title",
  ]) {
    const rule = surfaceRuleFor(heading);
    assert.ok(rule.includes("color: var(--rp-ink-strong)"), `${heading} is not the strongest ink`);
    assert.ok(rule.includes("font-weight: 700"), `${heading} does not lead its surface`);
  }

  // The Builder proposal is the one surface that must never read as a change
  // that happened, so it carries the attention rule rather than the teal one.
  assert.ok(surfaceRuleFor(".rp-conversation .builder-proposal-review")
    .includes("border-left: 5px solid var(--rp-amber-ink)"),
  "the unapplied Builder proposal reads like a routine settled decision");
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
    ".rp-conversation .task-card",
    ".rp-conversation .task-risk",
    ".rp-conversation .task-card-details",
  ]) {
    const declaration = surfaceRuleFor(selector);
    assert.ok(!/\b(?:animation|transition):/.test(declaration), `${selector} introduces decorative motion`);
  }

  // A turn does not travel, and neither does the proposal. Three of the four
  // bubble kinds hold a control — Stop, Take back, Try again — and the
  // proposal holds Review plus a Set aside on every concern row, which is
  // exactly the container the constitution forbids transforming; a scaled
  // container also blurs its own text mid-flight.
  const motion = renderer("motion.css");
  // REWRITTEN by Task 267 (Slice 7). The list grew rather than changed: the
  // receipt, the run strip and the push chip were the three names `chat-arrive`
  // still slid and scaled, each held back as "its own slice" until this one.
  // Every one of them holds an interactive control — the receipt's actions and
  // disclosures, Stop this task, and the chip itself, which IS a button — so
  // each is exactly the container the constitution forbids transforming.
  for (const surface of ["bubble", "task-card", "result-card", "run-strip", "push-chip"]) {
    assert.match(motion, new RegExp(`\\.rp-conversation \\.${surface}[,\\s]`, "u"),
      `the conversation's ${surface} still slides and scales on arrival`);
  }
  assert.match(motion, /\.rp-conversation \.push-chip \{ animation: none; \}/u,
    "the arrival opt-out list does not end in an animation kill");
});
