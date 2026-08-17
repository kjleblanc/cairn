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

test("the receipt leads with pictures, disposition, and Cairn-checked facts", () => {
  const card = chat.indexOf('<article className="card result-card"');
  const evidence = chat.indexOf("<ResultEvidence", card);
  const receipt = chat.indexOf("Cairn&apos;s receipt", card);
  const disposition = chat.indexOf("result-card-headline", card);
  const checked = chat.indexOf("What Cairn checked", card);
  const facts = chat.indexOf('className="result-card-facts"', card);
  assert.ok(card !== -1 && evidence > card && receipt > evidence && disposition > receipt
    && checked > disposition && facts > checked,
  "the receipt no longer leads from checked pictures to disposition and verified facts");
  assert.match(chat, /Checked by Cairn after the builder finished/,
    "the receipt does not plainly name who verified its visible facts");
  assert.match(chat, /card\.disposition === "ERROR"[\s\S]*?Cairn could not complete verification[\s\S]*?!wroteRecords[\s\S]*?Closed by Cairn before a task started[\s\S]*?card\.disposition === "DONE"[\s\S]*?Checked by Cairn after the builder finished[\s\S]*?Closed by Cairn when the task stopped/,
    "error, no-task, and stopped receipts can incorrectly claim a finished builder or verification");
  assert.match(chat, /aria-label=\{`\$\{card\.disposition\} result receipt/,
    "the finished receipt has no named semantic boundary");
});

test("the builder account is one native disclosure with explicit provenance", () => {
  assert.match(chat, /<details className="result-card-claims">[\s\S]*?<summary>[\s\S]*?Builder&apos;s account[\s\S]*?reported, not checked[\s\S]*?<\/summary>/,
    "the builder account is not a plainly labeled native disclosure");
  assert.match(chat, /className="result-card-claims-preview">\{card\.claims\.summary\}/,
    "the collapsed receipt does not retain a concise account of what happened");
  assert.match(chat, /className="result-card-claims-body"/,
    "the builder's complete account has no disclosure body");
  for (const text of ["What the builder says it did", "Checks the builder reported",
    "Builder&apos;s suggested next step", "Builder&apos;s remaining limitations"]) {
    assert.ok(chat.includes(text), `${text} disappeared from the builder's complete account`);
  }
});

test("secondary run accounting stays accessible without flooding the checked facts", () => {
  assert.match(chat, /<details className="result-card-run-details">[\s\S]*?<summary>[\s\S]*?Run details[\s\S]*?checked by Cairn[\s\S]*?<\/summary>/,
    "secondary run accounting is not a plainly labeled native disclosure");
  const factsStart = chat.indexOf('<ul className="result-card-facts">');
  const factsEnd = chat.indexOf("</ul>", factsStart);
  const visibleFacts = chat.slice(factsStart, factsEnd);
  assert.ok(!visibleFacts.includes("Who did the work") && !visibleFacts.includes("card.evidenceSummary"),
    "provider/model or raw run accounting still floods the primary checked-facts stream");
  const runStart = chat.indexOf('<details className="result-card-run-details">');
  const runEnd = chat.indexOf("</details>", runStart);
  const runDetails = chat.slice(runStart, runEnd);
  assert.ok(runDetails.includes("Who did the work") && runDetails.includes("card.evidenceSummary"),
    "secondary checked run detail was hidden by deletion instead of disclosure");
});

test("request context is a separate native disclosure and keeps every attributed row", () => {
  assert.match(chat, /card\.acceptedRequest === undefined && wroteRecords[\s\S]*?<details className="result-card-request-context">/,
    "legacy request provenance is not held in the request disclosure");
  assert.match(chat, /card\.acceptedRequest !== undefined && card\.acceptedRequest !== null[\s\S]*?<details className="result-card-request-context">/,
    "recorded request context is not held in its own disclosure");
  assert.match(chat, /Original request[\s\S]*?reference, not a verified result/,
    "request context does not label its separate provenance at the control");
  assert.match(chat, /<TaskIntentList request=\{card\.acceptedRequest\} heading="What you asked for" \/>/,
    "the complete attributed request view was removed instead of folded");
});

test("recovery truth and the run action remain outside folded secondary detail", () => {
  const recovery = chat.indexOf('className="result-card-recovery"');
  const claims = chat.indexOf('<details className="result-card-claims">');
  const request = chat.indexOf('<details className="result-card-request-context">', claims);
  const footer = chat.indexOf('<footer className="result-card-footer">', request);
  const action = chat.indexOf('className="row result-card-actions"', footer);
  const path = chat.indexOf('className="small mono result-card-path"', footer);
  assert.ok(recovery !== -1 && recovery < claims,
    "record recovery can be hidden inside the builder's unverified account");
  assert.ok(claims !== -1 && request > claims && footer > request && action > footer && path > action,
    "the visible run action and quiet records path do not follow the provenance disclosures");
  assert.ok(chat.includes("Open the run screen"), "the receipt lost its safe next action");
});

test("the receipt is one controlled paper folio instead of a rounded glass card", () => {
  const receipt = rule(".chat-column-villager .result-card");
  assert.ok(receipt.includes("flex-shrink: 0") && receipt.includes("overflow: visible"),
    "a long transcript can compress and clip the finished receipt");
  assert.ok(receipt.includes("border: 0") && receipt.includes("box-shadow: none"),
    "the result still carries enclosing glass-card chrome");
  assert.ok(receipt.includes("var(--paper-grain)"), "the result does not share the paper field");
  assert.ok(!receipt.includes("border-radius: 22px"), "the result still uses the oversized card silhouette");

  const mark = rule(".chat-column-villager .result-card::before");
  assert.ok(mark.includes("width: 2px") && mark.includes("var(--garden-cyan)"),
    "the receipt has no restrained checked-result registration rule");
  const dispositionMark = rule(".chat-column-villager .result-card-disposition::before");
  assert.ok(dispositionMark.includes('content: ""') && dispositionMark.includes("background: currentColor"),
    "the status mark uses generated language instead of a decorative shape beside the real status word");
});

test("DONE, STOPPED, and ERROR remain distinct without an overclaimed ERROR receipt", () => {
  assert.match(chat, /aria-label=\{`\$\{card\.disposition\} result receipt/,
    "terminal status is not part of the receipt's accessible name");
  assert.match(chat, /card\.disposition === "ERROR" \? \(\s*<p className="result-card-sentence">\{ERROR_SENTENCE\}<\/p>/,
    "an ERROR receipt lost its fixed honest sentence");
  assert.match(chat, /card\.disposition !== "ERROR" && wroteRecords \? \(\s*<section className="result-card-verification">/,
    "an ERROR receipt can render the completed-verification facts section");

  const done = rule(".chat-column-villager .result-card-done::before");
  const stopped = rule(".chat-column-villager .result-card-stopped::before");
  const error = rule(".chat-column-villager .result-card-error::before");
  assert.ok(done.includes("width: 8px") && done.includes("height: 8px") && done.includes("border-radius: 50%"),
    "DONE has no circle mark beside its explicit status word");
  assert.ok(stopped.includes("width: 9px") && stopped.includes("height: 2px") && stopped.includes("border-radius: 0"),
    "STOPPED has no bar mark beside its explicit status word");
  assert.ok(error.includes("border: 2px double currentColor") && error.includes("background: transparent"),
    "ERROR has no double-outline mark beside its explicit status word");
});

test("verified facts and disclosures use ruled hierarchy with visible focus", () => {
  const facts = rule(".chat-column-villager .result-card-facts");
  assert.ok(facts.includes("list-style: none") && facts.includes("padding: 0"),
    "verified facts still read as one undifferentiated bullet block");
  const claim = rule(".chat-column-villager .result-card-claims");
  const request = rule(".chat-column-villager .result-card-request-context");
  for (const declaration of [claim, request]) {
    assert.ok(declaration.includes("border: 0") && declaration.includes("background: transparent"),
      "a secondary receipt disclosure still paints a nested card");
    assert.ok(declaration.includes("border-top: 1px solid"),
      "a secondary receipt disclosure has no clean paper rule");
  }
  const focus = rule(".chat-column-villager .result-card details > summary:focus-visible");
  assert.ok(focus.includes("var(--garden-cyan)"),
    "native receipt disclosures lost their visible keyboard focus");
  assert.ok(rule(".result-card-folded:focus-visible").includes("var(--garden-cyan)"),
    "an older folded receipt has no unmistakable keyboard focus");
  const evidenceHeading = rule(".chat-column-villager .result-card .result-evidence-heading");
  assert.ok(evidenceHeading.includes("flex-wrap: wrap"),
    "the checked-picture heading can overflow a compact receipt");
  const evidenceLocal = rule(".chat-column-villager .result-card .result-evidence-local");
  assert.ok(evidenceLocal.includes("background: transparent") && evidenceLocal.includes("border-radius: 0"),
    "the local-evidence note still reads as a nested status pill");
  assert.ok(!rule(".chat-column-villager .result-card-path").includes("opacity:"),
    "the small records path is faded below readable contrast");
  const requestRow = rule(".chat-column-villager .result-card-request-body .task-intent-row");
  assert.ok(requestRow.includes("border-radius: 0") && requestRow.includes("background: transparent")
    && requestRow.includes("border-left: 2px solid"),
  "expanded request attribution still paints a rounded tile inside the receipt");
});

test("the receipt adds no new decorative motion", () => {
  const start = css.indexOf("/* Task 188:");
  // The end marker was the scoped composer rule, which Task 260 (Slice 5) moved
  // to `surfaces.css`. The receipt block is Slice 7's and has not moved; the
  // next thing after it in this file is Task 186's control skin, so that is the
  // boundary now.
  const end = css.indexOf("/* Task 186 flattens", start);
  assert.ok(start !== -1 && end > start, "the Task 188 receipt style block cannot be audited as one slice");
  assert.doesNotMatch(css.slice(start, end), /\b(?:animation|transition)\s*:/,
    "the receipt style block introduces decorative motion");
});
