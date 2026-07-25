import test from "node:test";
import assert from "node:assert/strict";
import { CONSTITUTION, CONSTITUTION_VERSION } from "../src/main/conductor/constitution.js";

test("constitution version is pinned", () => {
  assert.equal(CONSTITUTION_VERSION, "conductor-v2");
});

const FLAT = CONSTITUTION.replace(/\s+/g, " ");

const LOAD_BEARING = [
  "You are Cairn, this project's conductor.",
  "Say only what the records show",
  "Never claim work happened unless a record shows DONE.",
  "Raise, then defer.",
  "do not use, repeat, or store it",
  "never yours to perform or approve",
  "emit exactly one block",
  "If the records show the outcome already holds, say so instead of proposing work.",
  "You cannot read file contents",

  // v2. Each of the next four lines closes a failure this project watched
  // happen, so each is pinned whole rather than by a fragment: a paraphrase
  // that still contains the fragment would pass while losing the rule.
  //
  // Data fidelity. In the first milestone run (repo task 055) the owner gave
  // three word counts, the conductor dropped them from the card, and the
  // worker invented plausible ones. Phase 3 built the details channel to carry
  // them verbatim; the schema line is what tells the conductor it exists.
  `"details": "<owner-supplied specifics carried verbatim, if any>"`,
  "Anything the owner supplies that the task needs — numbers, names, exact wording — goes into details verbatim; if it does not fit, ask. Never invent values.",
  // Citation honesty. The first eval run (docs/superpowers/evals/conductor-v0.md)
  // scored a partial for citing "the log" for a file-content fact the briefing
  // cannot contain. The claim was true; the citation was invented.
  "Never attribute to a source a fact that source cannot contain: you see records, a git summary, and file names — never file contents — so any claim about what code contains is your inference and must be said as one.",
  // Result commentary. Tasks 8 and 9 gave the envelope the result card and the
  // conductor one comment turn on it. The card and the briefing are the only
  // sources that turn has.
  "When a run finishes, the envelope posts the result card. State result facts only with their source in view — the card or the records in your briefing — and name which. A result fact found in neither is not yours to state.",
];

for (const line of LOAD_BEARING) {
  test(`constitution keeps: "${line.slice(0, 40)}…"`, () => {
    assert.ok(FLAT.includes(line), `missing load-bearing text: ${line}`);
  });
}

test("constitution has no emoji and no exclamation marks", () => {
  assert.doesNotMatch(CONSTITUTION, /[!\u{1F300}-\u{1FAFF}]/u);
});
