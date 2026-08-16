# Task 242 report - bound the briefing's work log so Cairn can talk about Cairn

**Lane:** worktree `.claude/worktrees/keen-hawking-b5dfb8`, branch
`claude/keen-hawking-b5dfb8`. **Base commit:** `6baf3c0`. **Brief claimed at:**
`2299cad`.

## Outcome

The briefing's work-log section is now carried in two tiers under two caps
instead of reproducing every row of `docs/ai-work/LOG.md` in full. On this
repository the section fell from 133,267 characters to 25,647, and the
constitution plus the briefing fell from 219,762 characters to 105,760 against
a 200,000 limit - from 19,762 over, with an empty conversation, to 94,240
characters of room for one.

## What actually changed

- **`app/src/main/conductor/context.ts`** - added `maxLogDetailChars` and
  `maxLogIndexChars` to `BriefingCaps` (both 20,000 in `DEFAULT_CAPS`); added
  the exported `BRIEFING_CHAR_BUDGET` (130,000) and `CONVERSATION_CHAR_FLOOR`
  (50,000); added `workLogSection()`; and replaced the unbounded `logLines`
  map in `assembleBriefing` with a call to it. The section heading changed
  from `## Work log (task | date | outcome | summary | milestone moved)` to
  `## Work log`, because the column shape now differs per tier and is stated
  on each tier's own sub-heading.
- **`app/tests-unit/context.test.ts`** - added five tests and three fixture
  helpers (`logRow`, `withLogRows`, `workLogSection`).
- **`docs/ai-work/tasks/242-brief.md`** - committed alone at `2299cad`.
- **`docs/ai-work/tasks/242-report.md`** - this file.
- **`docs/ai-work/LOG.md`** - one appended row.

Nothing else was touched. `promptTooLarge`, `PROMPT_CHAR_LIMIT`, both
constitutions and their version constants, the contract and its mirrors, and
every package version are unchanged, as the brief required.

## How the section is built

Rows are walked from the newest end, kept in full while `maxLogDetailChars`
lasts. Everything older becomes `| task | date | outcome |` under its own
sub-heading, dropping from the oldest end if `maxLogIndexChars` is ever
reached. The section opens by stating how many rows are in full, how many are
index only, and how many were omitted.

The index tier has no summary column by construction rather than by
instruction. The constitution tells the conductor never to attribute to a
source a fact that source cannot contain
(`app/src/main/conductor/constitution.ts:116`), and `isAlreadyBriefed`
(`app/src/main/conductor/context.ts:341` before this change) keeps `LOG.md`
out of selected file contents, so a dropped summary is unreachable rather than
merely absent. A missing column cannot be misread; a note asking for restraint
could be.

The newest row is never demoted or dropped. A row that alone exceeds the whole
detail budget is cut to fit and marked `...(summary truncated)`, because
losing the most recent task would defeat a cap meant to protect recent memory.

## Check results

Unless stated otherwise, run from `app/` after
`npx tsc -p tsconfig.unit.json`:

```text
node --test dist-unit/tests-unit/context.test.js
```

That file is 23 tests, 23 passing, 0 failing: the 18 that existed before, plus
the 5 below.

- **`c1` - the section stays inside its budget as records accumulate.**
  PASS. Test "a work log that grows without bound stays inside the briefing
  budget (c1, c2)", 5,000 rows of ~2,000-character summaries. Red first: the
  section measured **10,127,960** characters before the change.
- **`c2` - the whole briefing stays inside `BRIEFING_CHAR_BUDGET`.** PASS,
  same test. Red first at **10,140,097** characters.
- **`c3` - the budget leaves room for a conversation.** PASS. Test "the
  briefing budget leaves a conversation room inside the prompt limit":
  7,628 + 130,000 + 50,000 = 187,628 against the 200,000 limit, asserted for
  both `CONSTITUTION` and `QUALITY_CONSTITUTION`.
  **This check never went red**, because it is arithmetic over constants this
  task introduced. Rather than trust it, I proved it can fail: mutating
  `BRIEFING_CHAR_BUDGET` to 145,000 in the compiled output failed this test
  and only this test.
- **`c4` - recent rows keep summaries, older rows do not pretend to.** PASS,
  400-row fixture: the newest summary appears, an index-only row's summary
  appears nowhere in the briefing, its index line appears, and the stated
  counts equal the rows actually rendered. Red first. Mutation check:
  overstating the full-row count by one failed this test.
- **`c5` - an over-budget newest row is shown truncated and marked.** PASS.
  Red first - the 60,000-character row was carried whole. Mutation check:
  removing the "newest row always survives" branch failed this test.
- **`c6` - every capped section at its ceiling.** PASS. A fixture with a
  5,000-row log, a ~56,000-character PROJECT.md, three ~48,000-character
  record pairs, and 400 source files of ~20,000 characters each assembles to
  no more than 130,000 characters. Red first at 10,140,097. No other section
  needed a cap.
- **`c7` - the real Cairn briefing now fits.** PASS, measured by calling the
  compiled `assembleBriefing` against this worktree:

  | | before | after |
  |---|---|---|
  | work-log section | 133,267 | 25,647 |
  | whole briefing | 212,134 | 98,132 |
  | constitution + briefing | 219,762 | 105,760 |
  | room left for a conversation | -19,762 | 94,240 |

  The section now reads: `Rows: 235 total - 19 rows in full, 216 as index
  only, 0 omitted.` These figures move slightly as commits land, because the
  briefing also carries Git state and the three most recent records.

- **`c8` - nothing else regressed.** PASS, by before-and-after comparison
  rather than by assertion. I ran the whole emitted unit suite (83 files) at
  the pre-change code and again with the change, and diffed the failure sets:
  **18 failures before, 18 after, no difference in either direction.** Output
  is at `%TEMP%\unit-before.txt` and `%TEMP%\unit-after.txt`.

  To take the baseline I copied my two modified files to the session
  scratchpad, restored them with `git checkout --` by exact path, measured,
  and copied them back; the working tree was never cleaned, reset, or stashed.

  `npx tsc --noEmit` reports 3,655 errors, **0 of which name either file this
  task touched**; 2,875 are `TS7026` JSX errors from absent React types.

## A limitation of this worktree, stated plainly

This worktree has no `node_modules`, and Node resolution falls through to the
repository root's partial install of 8 packages. `react`, `electron`, and a
built `core/dist` are therefore absent. Consequently:

- `npm run test:unit -w cairn-app` **cannot complete here**, because it is
  `tsc ... && node --test ...` and the typecheck fails on the missing types.
  I ran the emitted test output directly instead, which is why `c8` is a
  before-and-after diff rather than a green suite.
- All 18 failures in both runs are environmental or already known: 7 test
  files cannot find `core/dist/src/main-pending.js`, one cannot find `react`,
  one cannot find `electron`, and the named test failures are the
  pre-existing `builderlivetransport` reds from Task 211 and the Task 232
  selection refusal that Task 236 diagnosed.

Installing dependencies is on the concrete-risk list, so I did not. The main
checkout does have `app/node_modules` (360 entries), so **`npm run test:unit
-w cairn-app` should be re-run there before this branch lands**, where it can
actually complete. I did not run the Core serial suite: this change is
confined to `app/`, and `core/` is neither touched nor built here.

## How to try it

Open Cairn on the Cairn project itself, start an ordinary Chat conversation,
and send a message. It should send. Before this change it refused with "Cairn
did not send this because the project briefing and conversation together are
too large."

To see the numbers rather than the behaviour, from `app/`:

```text
npx tsc -p tsconfig.unit.json
node --test dist-unit/tests-unit/context.test.js
```

## Landed on main, and re-verified there

**Added by the landing lane on 2026-08-15**, at the owner's decision, after
this branch had sat unmerged while `main` advanced through tasks 243-246. The
checks below were run in the **main checkout**, which unlike this task's own
worktree has `app/node_modules` and can complete them - the gap this report's
"A limitation of this worktree" section asked a later reader to close.

**The command this report asks for cannot work.** `c8` and the section above
name `npm run test:unit -w cairn-app`. `app` is not a workspace here - the root
`package.json` declares only `core` and `cli` - and the app package is named
`cairn-desktop`, so npm answers `No workspaces found: --workspace=cairn-app`.
Run it from `app/` instead. This is a defect in the report's instructions, not
in the change; nothing about the result depends on it.

### The measurement, retaken on today's main

`c7`'s figures are restated rather than trusted, because the log grew by four
tasks while the branch waited. Both were measured by calling the real
`assembleBriefing` against this repository, once with the change reverted and
once with it applied:

| | Before | After |
|---|---|---|
| `CONSTITUTION` | 7,628 | 7,628 |
| briefing | 230,620 | **110,925** |
| of which the work-log section | 145,403 | **26,047** |
| **total against `PROMPT_CHAR_LIMIT` 200,000** | **238,248 - over by 38,248** | **118,553 - 81,447 to spare** |

The section states its own counts: `Rows: 240 total - 9 rows in full, 231 as
index only, 0 omitted.`

**Nine rows in full, not the nineteen this report predicted.** That is this
report's own limitation arriving early rather than a new defect: summaries have
gone on growing, and tasks 243-246 are large. The budget remains a constant in
`DEFAULT_CAPS` and remains cheap to revisit; the owner was shown this figure
before approving the merge and chose to land the constant as written.

### Nothing else moved

| Check, run in the main checkout | Result |
|---|---|
| `npm run typecheck` (root) | **PASS**, 26s |
| `npm run build` (root) | **PASS**, 13.5s |
| `npm run test:unit` from `app/`, **baseline** without this branch | 935 tests, **924 pass**, 9 fail, 2 skipped |
| `npm run test:unit` from `app/`, **with** this branch | 940 tests, **929 pass**, 9 fail, 2 skipped |
| the two failure sets, sorted and diffed | **identical** |
| the contract's settle check, rerun on merged `main` | 940 tests, **929 pass**, 9 fail, 2 skipped - failure set identical again |

Five more tests and five more passes: this task's `c1`-`c6`. The nine failures
are the pre-existing Task 224/231/233 Builder machinery, named individually in
Task 245's report, and they moved in neither direction.

### Two things the landing had to decide

**The merge was clean, and its log row was then moved.** `LOG.md` carries
Git's union merge attribute, so the merge appended this task's row after 246.
`parseLog` does no sorting, so position in the file *is* recency - and this
task's own new section reads the newest rows from the end. Left alone, Task 242
would have presented itself to the conductor as the project's most recent work
and spent detail budget as such. The row was moved to its number in a separate
commit; its text is untouched, proved by sorting both versions and diffing.

**The heading change has no other consumer.** This task replaced
`## Work log (task | date | outcome | summary | milestone moved)` with
`## Work log`. A search across `app`, `core`, and `cli` finds that string only
in `context.ts` itself; the constitution refers to the work log in prose, never
by heading.

## Limitations and remaining human judgment

- **`c9` was the owner's, and on 2026-08-16 they answered it: it sent.** Their
  words: *"it sent, message went through fine"*. Cairn can be talked to about
  its own repository again, which is what this task existed for and what Slice
  5 requires.

  It took two attempts. The first never reached the briefing at all - Git
  refused the project folder on ownership grounds, for reasons that had nothing
  to do with this task and are recorded in Task 247. Once that was cleared, the
  message sent on the first try.
- The conductor can no longer read what tasks 001-215 contained. It still
  knows they exist, their dates, and their outcomes, and the section tells it
  in plain words that it is not a source for their contents. Whether that
  trade is right in practice is a judgment the first few real conversations
  will inform.
- The 20,000-character detail budget buys 19 rows today. Recent summaries have
  been growing - tasks 216, 217, and 218 are 2,939, 4,526, and 4,593
  characters - so if that trend continues the number of rows held in full will
  fall. The budget is a constant in `DEFAULT_CAPS` and is cheap to revisit.
- `BRIEFING_CHAR_BUDGET` is 130,000 against a measured 98,132, so there is
  about 32,000 characters of headroom before the test starts failing on
  ordinary growth. That is deliberate: the test should fail while there is
  still room to act, not once Chat is already broken.

## Disposition

**Disposition: DONE — every machine check passes, the fix is verified by
measurement, and on 2026-08-16 the owner confirmed `c9` in the running app:
"it sent, message went through fine".**

The paragraphs below were written while `c9` was still outstanding and are left
as they were; this task was STOPPED for a day and is now closed. Its `LOG.md`
row also predates the answer and says STOPPED, corrected in the same commit as
this line - see Task 247's report for why that correction was made rather than
left, and what it costs.

This is not a failed run, and a later reader should not redo the work. Checks
`c1`-`c8` pass with their real output recorded above, and the briefing on this
repository now measures 105,760 characters against the 200,000 limit where it
measured 219,762 before. STOPPED is the honest value only because this task's
brief defined DONE as `c1`-`c8` plus the owner's own confirmation that a real
message sent, and said in terms that a passing fixture is not DONE for `c9`.
The owner has not withdrawn that check; they have deferred it.

**To close this out:** the owner sends one ordinary Chat message on the Cairn
project from a checkout carrying this branch. If it sends, `c9` holds and a
short follow-up task can record that and move this to DONE. If it does not,
the reason will be a new defect rather than this one, because the prompt now
fits with 94,240 characters to spare.

**Landing update, 2026-08-15.** The branch is now merged to `main`, so "a
checkout carrying this branch" means the ordinary main checkout. The headroom
figure is now 81,447 characters rather than 94,240, measured above. The app
token was released for the owner's attempt. Exact steps:

1. Close any Cairn window that is already open - the app, its end-to-end tests,
   and the owner's own use share one profile.
2. Start Cairn from the main checkout and open **this repository** as the
   project.
3. Start an ordinary Chat conversation and send any message.
4. It should send. Before this change it refused with "Cairn did not send this
   because the project briefing and conversation together are too large."

If it sends, `c9` holds and this task is DONE. If it refuses, record the exact
refusal text: this change moved the briefing from 38,248 characters over the
limit to 81,447 under it, so a refusal now would be a different defect.

A second thing is worth the owner's eye during that same attempt, and it is
this task's real judgment call rather than a check: as the log stands today the
conductor reads full summaries for tasks **238 to 246** and nothing more.
Everything up to and including task **237** survives as number, date, and
outcome only. It knows those tasks happened and how they ended, and the section
tells it in plain words not to claim more. Whether that trade is right is what
the first real conversation on this repository will show.

The milestone does not move here. Slice 5 is unblocked by this task, not
started by it.
