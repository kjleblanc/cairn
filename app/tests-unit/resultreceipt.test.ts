import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");
const css = renderer("app.css");
const surfaces = renderer("surfaces.css");
const chat = renderer("screens", "Chat.tsx");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `${selector} has no rule`);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * A rule body from `surfaces.css`, found by a selector that may appear
 * ANYWHERE in a grouped selector list rather than only at its head.
 *
 * Task 267 needs this because the migrated receipt shares several rules
 * between three disclosures. A plain `indexOf(selector + " {")` silently
 * misses those and returns -1, which is the exact shape of quiet guard this
 * slice repaired elsewhere — so the miss is an assertion, never a fallback.
 */
function surfaceRule(selector: string): string {
  for (const suffix of [" {", ",\n"]) {
    let at = surfaces.indexOf(selector + suffix);
    while (at !== -1) {
      const open = surfaces.indexOf("{", at);
      const close = surfaces.indexOf("}", open);
      // Reject a match whose "{" is separated from it by another rule's "}".
      if (open !== -1 && (close === -1 || open < close)) {
        return surfaces.slice(at, close);
      }
      at = surfaces.indexOf(selector + suffix, at + 1);
    }
  }
  return assert.fail(`surfaces.css has no rule carrying \`${selector}\``);
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
  // REWRITTEN by Task 267 (Slice 7). Task 188's contract is intact and still
  // asserted; only its address changed, from the retired scope in `app.css` to
  // the conversation's own sheet. Three differences are named here so they are
  // not mistaken for drift:
  //
  //   - the registration mark is a `border-left`, not an absolutely positioned
  //     2px `::before`. Same signal, no positioned box to contain — the same
  //     conversion Slice 6 made for the decision family;
  //   - the shadow is `--rp-shadow-low` rather than `none`, matching the sheet
  //     every other surface on this paper now uses;
  //   - the grain is `--rp-grain` rather than `--paper-grain`, because the
  //     retired token belonged to the retired palette.
  const receipt = surfaceRule(".rp-conversation .result-card");
  assert.ok(receipt.includes("flex-shrink: 0") && receipt.includes("overflow: visible"),
    "a long transcript can compress and clip the finished receipt");
  assert.ok(receipt.includes("border: 0"), "the result still carries enclosing glass-card chrome");
  assert.ok(receipt.includes("var(--rp-grain)"), "the result does not share the paper field");
  assert.ok(!receipt.includes("border-radius: 22px"), "the result still uses the oversized card silhouette");

  assert.match(receipt, /border-left:\s*3px solid var\(--rp-teal\)/u,
    "the receipt has no restrained checked-result registration rule");
  assert.match(surfaceRule(".rp-conversation .result-card:has(.result-card-stopped)"),
    /border-left-color:\s*var\(--rp-amber-ink\)/u,
    "a stopped receipt's registration rule does not change with its disposition");
  assert.match(surfaceRule(".rp-conversation .result-card:has(.result-card-error)"),
    /border-left-color:\s*var\(--rp-coral-ink\)/u,
    "an error receipt's registration rule does not change with its disposition");

  const dispositionMark = surfaceRule(".rp-conversation .result-card-disposition::before");
  assert.ok(dispositionMark.includes('content: ""') && dispositionMark.includes("background: currentColor"),
    "the status mark uses generated language instead of a decorative shape beside the real status word");
});

test("each receipt disposition word carries its own semantic ink", () => {
  // REPLACED, from `lantern.test.ts`. That file's subject was the retired
  // conversation panel and Task 267 deleted it, but this one assertion was a
  // result-family guard sitting in a file named for something else, so it
  // moves here rather than dying with its host.
  //
  // Re-pointed from the pond's palette to the constitution's: `--pond-done`,
  // `--pond-task` and `--pond-stop` were legacy aliases that the retired
  // panel's own rule re-pointed, so they resolved correctly only while that
  // panel existed. The inks below are the same three semantics, named
  // directly.
  for (const [selector, token] of [
    [".rp-conversation .result-card-done", "var(--rp-sage-ink)"],
    [".rp-conversation .result-card-stopped", "var(--rp-amber-ink)"],
    [".rp-conversation .result-card-error", "var(--rp-coral-ink)"],
  ] as const) {
    const body = surfaceRule(selector);
    assert.ok(body.includes(token), `${selector} is not ${token}`);
    assert.ok(body.includes("background: transparent"),
      `${selector} paints a filled pill again instead of printing a word`);
  }
});

test("DONE, STOPPED, and ERROR remain distinct without an overclaimed ERROR receipt", () => {
  assert.match(chat, /aria-label=\{`\$\{card\.disposition\} result receipt/,
    "terminal status is not part of the receipt's accessible name");
  assert.match(chat, /card\.disposition === "ERROR" \? \(\s*<p className="result-card-sentence">\{ERROR_SENTENCE\}<\/p>/,
    "an ERROR receipt lost its fixed honest sentence");
  assert.match(chat, /card\.disposition !== "ERROR" && wroteRecords \? \(\s*<section className="result-card-verification">/,
    "an ERROR receipt can render the completed-verification facts section");

  // The three marks are re-pointed, not relaxed: a disc, a bar and a doubled
  // outline. Their exact pixel sizes moved by a point when the receipt was
  // redrawn, so the assertions below bind to the SHAPE — round, flat, hollow —
  // which is what survives a monochrome reading, rather than to a width that
  // says nothing about whether the three can be told apart.
  const done = surfaceRule(".rp-conversation .result-card-done::before");
  const stopped = surfaceRule(".rp-conversation .result-card-stopped::before");
  const error = surfaceRule(".rp-conversation .result-card-error::before");
  assert.match(done, /border-radius:\s*50%/u, "DONE has no circle mark beside its explicit status word");
  assert.match(done, /background:\s*currentColor/u, "the DONE circle is not filled");
  assert.match(stopped, /height:\s*2px/u, "STOPPED has no bar mark beside its explicit status word");
  assert.match(stopped, /border-radius:\s*0/u, "the STOPPED bar is rounded into the DONE disc");
  assert.match(error, /border:\s*2px double currentColor/u,
    "ERROR has no double-outline mark beside its explicit status word");
  assert.match(error, /background:\s*transparent/u, "the ERROR mark is filled, so it reads as DONE");

  // The three must actually DIFFER from one another, not merely each exist.
  // Three identical marks would satisfy every assertion above.
  assert.notEqual(done, stopped, "DONE and STOPPED draw the same mark");
  assert.notEqual(stopped, error, "STOPPED and ERROR draw the same mark");
  assert.notEqual(done, error, "DONE and ERROR draw the same mark");
});

test("verified facts and disclosures use ruled hierarchy with visible focus", () => {
  const facts = surfaceRule(".rp-conversation .result-card-facts");
  assert.ok(facts.includes("list-style: none") && facts.includes("padding: 0"),
    "verified facts still read as one undifferentiated bullet block");
  const claim = surfaceRule(".rp-conversation .result-card-claims");
  const request = surfaceRule(".rp-conversation .result-card-request-context");
  for (const declaration of [claim, request]) {
    assert.ok(declaration.includes("border: 0") && declaration.includes("background: transparent"),
      "a secondary receipt disclosure still paints a nested card");
    assert.ok(declaration.includes("border-top: 1px solid"),
      "a secondary receipt disclosure has no clean paper rule");
  }

  // The focus ring is the constitution's 3px in `--rp-focus` at a 2px offset
  // now, not the retired 2px garden cyan. That is a Rewritten disposition with
  // its reason: one focus ring everywhere is the whole point of drawing it.
  const focus = surfaceRule(".rp-conversation .result-card details > summary:focus-visible");
  assert.match(focus, /outline:\s*3px solid var\(--rp-focus\)/u,
    "native receipt disclosures lost their visible keyboard focus");
  assert.match(surfaceRule(".rp-conversation .result-card-folded:focus-visible"),
    /outline:\s*3px solid var\(--rp-focus\)/u,
    "an older folded receipt has no unmistakable keyboard focus");

  const evidenceHeading = surfaceRule(".rp-conversation .result-evidence-heading");
  assert.ok(evidenceHeading.includes("flex-wrap: wrap"),
    "the checked-picture heading can overflow a compact receipt");
  const evidenceLocal = surfaceRule(".rp-conversation .result-evidence-local");
  assert.ok(evidenceLocal.includes("background: transparent") && evidenceLocal.includes("border-radius: 0"),
    "the local-evidence note still reads as a nested status pill");
  assert.ok(!surfaceRule(".rp-conversation .result-card-path").includes("opacity:"),
    "the small records path is faded below readable contrast");
});

test("the receipt's request rows wear the ONE shared provenance rule set", () => {
  // Slice 6 wrote one intent-row rule set for the dispatch checkpoint and the
  // operational papers, and left the receipt's near-identical copy alive in
  // `app.css` because that copy sat at (0,3,0) and outranked it. Slice 6's own
  // sheet asked Slice 7 to DELETE that copy rather than port it. This test is
  // what makes the deletion checkable rather than a claim.
  assert.ok(!css.includes("result-card-request-body .task-intent"),
    "the receipt still carries its own copy of the intent rows, so it and the checkpoint can drift apart");
  const shared = surfaceRule(".rp-conversation .task-intent-row");
  assert.ok(shared.includes("border-radius: 0") && shared.includes("background: transparent")
    && shared.includes("border-left:"),
  "expanded request attribution still paints a rounded tile inside the receipt");
  // The receipt's rows must actually REACH that rule: it is (0,2,0) and there
  // must no longer be a more specific one competing with it anywhere.
  assert.ok(chat.includes('className="result-card-request-body"'),
    "the receipt no longer renders the element the shared rule set dresses");
});

test("the receipt adds no new decorative motion", () => {
  // RE-POINTED by Task 267. The block moved to the conversation's own sheet, so
  // the slice being audited moved with it. BOTH markers assert they were found:
  // the retired version of this test took two bare `indexOf` results, and a -1
  // start with a -1 end yields an empty string that satisfies a `doesNotMatch`
  // while reading nothing at all.
  const start = surfaces.indexOf("/* ------------------------------------------------ the result receipt */");
  const end = surfaces.indexOf("/* ---------------------------------------------------------- evidence */", start);
  assert.notEqual(start, -1, "the receipt's section in surfaces.css cannot be found");
  assert.ok(end > start, "the receipt's section has no end marker after it");
  const block = surfaces.slice(start, end);
  assert.ok(block.length > 2000, "the receipt's section is implausibly short, so this proves nothing");
  assert.doesNotMatch(block, /(?:animation|transition)\s*:/u,
    "the receipt style block introduces decorative motion");
  assert.doesNotMatch(block, /@keyframes/u, "the receipt style block declares its own animation");
  // The lookbehind is load-bearing, and this test found out why the hard way:
  // a bare `transform:` also matches inside `text-transform: uppercase`, which
  // the receipt legitimately uses on its eyebrow. That is the same false
  // positive the constitution names when it insists this check is written with
  // a real scanner rather than a naive word boundary.
  assert.doesNotMatch(block, /(?<![a-z-])transform:\s*(?!none)/u,
    "the receipt style block introduces a transform on a container that holds controls");
});
