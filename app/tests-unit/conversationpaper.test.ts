import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const taskCard = renderer("components", "TaskCard.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

test("the owner speaks on one flat clipped memo", () => {
  const owner = rule(".chat-column-villager .bubble-owner");
  assert.ok(owner.includes("box-shadow: none"), "the owner's note still glows like a bubble");
  assert.ok(owner.includes("clip-path: polygon"), "the owner's note has no controlled paper-cut corner");
  assert.ok(!owner.includes("border-radius: 20px"), "the owner's note still has the inflated bubble silhouette");
});

test("Cairn prose stays unboxed and gains one restrained registration mark", () => {
  const plain = rule(".bubble-cairn");
  assert.ok(plain.includes("background: transparent") && plain.includes("border: 0"),
    "Cairn's prose has regained a filled or outlined bubble");
  const prose = rule(".chat-column-villager .bubble-cairn");
  assert.ok(prose.includes("position: relative") && prose.includes("padding-left:"),
    "Cairn's prose has no place for its quiet speaker mark");
  const mark = rule(".chat-column-villager .bubble-cairn::before");
  assert.ok(mark.includes("var(--garden-cyan)"), "Cairn's mark does not belong to the pond palette");
  assert.ok(mark.includes("width:") && mark.includes("height: 2px"), "Cairn's mark is not a short clean stroke");
  assert.ok(!mark.includes("border:"), "Cairn's mark draws another outlined badge");
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
    ".chat-column-villager .bubble-owner",
    ".chat-column-villager .bubble-cairn::before",
    ".chat-column-villager .task-card",
    ".chat-column-villager .task-card::before",
    ".chat-column-villager .task-risk",
  ]) {
    const declaration = rule(selector);
    assert.ok(!/\b(?:animation|transition):/.test(declaration), `${selector} introduces decorative motion`);
  }
});
