# Task 078 — Report

Phase 3 Task 12: constitution v2. Three rules added, the task-block schema
widened by one field, the version constant bumped to `conductor-v2`, and one
carried copy fix on the push refusal. No `core/` changes, no renderer changes.

## What the conductor is now told

Verbatim, as the owner approved them:

- **Data fidelity**, in the Proposing-a-task paragraph — "Anything the owner
  supplies that the task needs — numbers, names, exact wording — goes into
  details verbatim; if it does not fit, ask. Never invent values."
- **Citation honesty**, in the Honesty paragraph — "Never attribute to a source
  a fact that source cannot contain: you see records, a git summary, and file
  names — never file contents — so any claim about what code contains is your
  inference and must be said as one."
- **Result commentary**, a new Results paragraph between Proposing a task and
  Format — "When a run finishes, the envelope posts the result card. State
  result facts only with their source in view — the card or the records in your
  briefing — and name which. A result fact found in neither is not yours to
  state."

The `cairn-task` block schema gains one line, on the line after `outcome`:
`"details": "<owner-supplied specifics carried verbatim, if any>"`. The parser
already accepted `details` (repo task 062) and the dispatch path already
carried it verbatim into the confirmed card and the worker prompt (repo tasks
061, 063); this is the first thing that tells the model the field is there.

Placement notes. Citation honesty sits immediately after "name the source", so
naming a source and being able to name it honestly read as one rule, and
directly before the existing "When you are inferring, say 'I'd guess'" — which
is the idiom the new sentence tells it to use. Data fidelity sits after the
"verifiable by looking" sentence, where the block's fields are being explained.
The Honesty paragraph was re-wrapped (whitespace only, no word changed) so the
inserted sentence does not leave a one-word line.

## The failures each rule closes

Each is a thing this project watched happen, not an abstraction:

- Repo task 055, the first real milestone run: the owner supplied word counts
  74, 477 and 256; they were dropped from the card, and the worker invented
  65,252 / 95,356 / 168,000 rather than reporting that it had none.
- The first eval run, `docs/superpowers/evals/conductor-v0.md`: scenario 3
  scored `partial` for citing "the log" for a file-content fact the briefing
  cannot carry. The claim was true; the citation was invented.
- Tasks 8 and 9 of this phase: the envelope authors the result card and the
  conductor gets one comment turn on it. `COMMENTARY_INSTRUCTION` in
  `service.ts` already says this per-turn; the constitution now says it always,
  so the rule does not depend on one message surviving in one prompt.

## TDD evidence

RED first, all six failures at the assertion level, no compile errors — 75
tests, 69 pass, 6 fail:

```
✖ constitution version is pinned
  AssertionError: Expected values to be strictly equal:
    actual: 'conductor-v1', expected: 'conductor-v2'

✖ constitution keeps: ""details": "<owner-supplied specifics ca…"
  AssertionError: missing load-bearing text: "details": "<owner-supplied specifics carried verbatim, if any>"

✖ constitution keeps: "Anything the owner supplies that the tas…"
  AssertionError: missing load-bearing text: Anything the owner supplies that the task needs — …

✖ constitution keeps: "Never attribute to a source a fact that …"
  AssertionError: missing load-bearing text: Never attribute to a source a fact that source cannot contain: …

✖ constitution keeps: "When a run finishes, the envelope posts …"
  AssertionError: missing load-bearing text: When a run finishes, the envelope posts the result card. …

✖ the shape refusal says the limit is Cairn's, and still names no target
  AssertionError: The input did not match the regular expression /Cairn sends only/. Input:
    'Cairn did not run this push. The commit or branch it named was not in
     the form Cairn sends to git, so nothing was published.'
```

The four constitution pins use v1's own idiom — `CONSTITUTION` flattened to
single spaces, one generated test per line, `FLAT.includes(line)` — so the
line-wrapping of the template literal is not what is being tested. They pin
whole sentences rather than fragments: a paraphrase that kept a fragment would
otherwise pass while losing the rule.

## The carried copy fix

`REFUSED_SHAPE` in `app/src/main/push.ts` now reads:

> Cairn did not run this push, so nothing was published. Cairn sends only a
> plain commit id and a branch name that starts with a letter or a number and
> is made of letters, numbers, dots, dashes, underscores, and slashes. A branch
> name git accepts can still be outside that: the limit is Cairn's, not a
> problem with this project.

The leading-character clause is not decoration: `_foo` is a branch name git
accepts and `REF_COMPONENT` refuses, so a sentence that named only the
character set would be false for it. What the sentence still simplifies is the
three suffix rules (`..`, a `.lock` ending, a trailing `/` or `.`) — git
rejects all three itself, so no name that reaches an owner's repository can be
refused by them alone.

The old sentence said the target "was not in the form Cairn sends to git",
which reads as though the owner's repository were malformed. It is not:
`REF_COMPONENT` is stricter than git's own `check-ref-format`, the panel's
branch comes from `@{u}`, and a legal `issue#42`, `feat+x` or non-ASCII branch
lands here through no fault of the owner. Task 077's report disclosed the
narrowing as a limitation; the owner-facing sentence now discloses it too.

No test pinned the old string — checked by grep across the repo before
changing it; the new one is now pinned, together with the two properties that
must survive any later rewording: it still says nothing was published, and it
still repeats no part of the target (that string came from outside the main
process). The refusal itself and its `kind: "refused"` are unchanged, so
`ipc.ts`'s logging of the refused target and the renderer's git-words label
are both untouched.

## Verification

Run through `npm run test:smoke`, which rebuilds all three bundles before
Playwright — per task 075's stale-bundle finding. The smoke run below was
taken after the last source edit, not before it.

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **75 / 75** (70 before, 5 new).
- `npm run test:smoke` (app; builds, then Playwright) — **39 passed**.
- `cd core && npm test` — **104 / 104**. No `core/` changes.

Files touched: `app/src/main/conductor/constitution.ts`,
`app/src/main/push.ts`, `app/tests-unit/constitution.test.ts`,
`app/tests-unit/push.test.ts`, `docs/ai-work/LOG.md`,
`docs/ai-work/tasks/078-brief.md`, `docs/ai-work/tasks/078-report.md`.

## Limitations and remaining human judgment

- A constitution rule is an instruction to a model, not a guarantee. These
  three sentences are proved present, and nothing here proves any body obeys
  them. Only an eval run shows that, and the code paths that do enforce
  something — the details channel, the envelope-authored card, the
  system-role card mapping — were built in earlier tasks and are unchanged.
- The v1 row in `docs/superpowers/evals/conductor-v0.md` (OpenRouter
  moonshotai/kimi-k2, 2026-07-24) is now **historical**: it scored a
  constitution that no longer exists, and the partial it recorded is the exact
  failure the citation-honesty rule was written to close. A v2 run costs real
  money and needs the owner's explicit go, so none was made here and the table
  is left as written rather than annotated by a task that ran nothing. The
  eval document's scenarios do not yet exercise the two newer rules — a
  details-bearing request and a comment turn on a posted result card — so a v2
  run may want scenarios for them; that is the owner's call.
- The `details` schema line tells the model the field exists; whether a given
  body fills it under pressure is likewise an eval question.
- Milestone movement: NO.

Disposition: DONE
