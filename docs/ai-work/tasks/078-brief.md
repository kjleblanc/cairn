# Task 078 — Brief

Requested visible outcome: Phase 3 Task 12 — constitution v2. Cairn's system
prompt gains three rules, each written from a failure this project actually
watched happen, and the task block it emits gains the `details` field the
Phase 3 channel already carries. `CONSTITUTION_VERSION` becomes
`conductor-v2`.

The rule sentences are owner-approved spec text, reproduced character for
character and pinned verbatim by tests. No `core/` changes.

## The three failures the rules close

- **Data fidelity.** In the first real milestone run (repo task 055) the owner
  supplied three word counts — 74, 477, 256. The conductor dropped them from
  the card, and the worker invented plausible replacements (65,252 / 95,356 /
  168,000) rather than saying it had none. Phase 3 tasks 3 to 5 built the
  `details` channel so owner-supplied specifics ride verbatim from chat to the
  worker prompt. Nothing had yet told the conductor that channel exists.
- **Citation honesty.** The first eval run (`docs/superpowers/evals/conductor-v0.md`,
  OpenRouter moonshotai/kimi-k2, 2026-07-24) scored a partial on scenario 3 for
  "the log shows the page title still says something else" — a file-content
  fact cited to the log, which cannot contain one. The claim happened to be
  true; the citation was invented. The briefing carries records, a git summary
  and file names, never file contents.
- **Result commentary.** Tasks 8 and 9 gave the envelope the result card and
  the conductor exactly one comment turn on it. The card and the briefing are
  the only sources that turn has; anything else it might say about a run is not
  its to state.

## Carried fix from Task 11's closing review

`push.ts`'s malformed-target refusal read "The commit or branch it named was
not in the form Cairn sends to git, so nothing was published." That is
backwards about whose limit it is. `REF_COMPONENT` is stricter than git's own
`check-ref-format`, so a perfectly legal branch — a non-ASCII name, `issue#42`,
`feat+x` — reaches this refusal through no fault of the owner's repository,
and the panel's branch comes straight from `@{u}`. Reword so Cairn owns the
limit. Keep the refusal, name no target.

## Checks that will show it holds

- `CONSTITUTION_VERSION === "conductor-v2"`.
- Each of the three rule sentences, and the `details` schema line, present
  verbatim in `CONSTITUTION` — pinned with v1's own idiom (whitespace-flattened
  `includes`, one test per line), whole sentences rather than fragments, so a
  paraphrase cannot pass.
- The existing v1 pins and the no-emoji/no-exclamation-mark check still pass.
- The shape refusal says the limit is Cairn's, still says nothing was
  published, and still repeats no part of the target.
- `npm run typecheck`, `npm run test:unit`, `npm run test:smoke` (the
  rebuilding path), and `cd core && npm test` — all green.

DONE means: the conductor is told, in its own constitution, to carry the
owner's data verbatim, to cite only what a source can contain, and to comment
on a result only from the card or the records — and the push refusal no longer
blames the owner's repository for Cairn's narrower rule.

STOPPED means any rule sentence differs from the approved text, or a check
above is not green.
