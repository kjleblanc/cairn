# Task 242 brief - bound the briefing's work log so Cairn can talk about Cairn

**Lane:** worktree `.claude/worktrees/keen-hawking-b5dfb8`, branch
`claude/keen-hawking-b5dfb8`. **Base commit:** `6baf3c0`.

Ordinary Chat currently refuses to send on the Cairn project itself with "Cairn
did not send this because the project briefing and conversation together are
too large." This blocks the owner using Cairn on Cairn, and it blocks Slice 5
of `docs/superpowers/plans/2026-08-14-cairn-gauntlet-restoration.md`, which
cannot run while the briefing cannot be sent.

## The measurement this brief rests on

Taken in this worktree at `6baf3c0`, by calling the real `assembleBriefing`
against this repository:

```text
CONSTITUTION                    7,628
briefing                      212,134
                              -------
total                         219,762   of PROMPT_CHAR_LIMIT 200,000
```

That is with an empty conversation, so no message can be sent at all. The
work-log section is 133,267 of the briefing's 212,134 characters - 63% of it.
Every other section together is 78,867 and each is capped: PROJECT.md and the
three recent records clip to `maxRecordChars`, the file tree truncates at
`maxTreeEntries`, and selected file contents are bounded to 8 files, 8,000
characters each and 32,000 total. The work log is the only unbounded section
(`app/src/main/conductor/context.ts:604`), and it grows by one row per
completed task forever.

## Owner decisions taken before this brief was claimed

- **Two tiers under one hard cap.** The newest rows keep their full summary
  until a character budget is spent; every older row survives as a one-line
  index carrying task, date, and outcome only. Chosen over clipping every
  row's summary, which does not bound the section (it grows about 250
  characters per task and would refuse again around task 600), over keeping
  only the newest N rows, which would erase all knowledge that tasks 001-215
  happened, and over a separately maintained digest file, which nothing in the
  contract obliges anyone to keep true.
- **The log's budget is 20,000 characters of full detail.** The section then
  totals about 27,000 against today's 133,267, leaving roughly 90,000
  characters for the conversation itself.

## Design choices recorded before the work

**The budget is counted in characters, not rows.** Rows range from about 100
characters to 4,593 (task 218); summaries have a median of 345, a 90th
percentile of 1,248, and a maximum of 4,551. A row count would therefore buy an
unpredictable size. The number of rows shown in full floats with the budget.

**The index tier has no summary column, by construction.** The constitution
tells the conductor "Never attribute to a source a fact that source cannot
contain" (`app/src/main/conductor/constitution.ts:116`) and names the work log
as readable evidence. Once older rows lose their summaries, a conductor could
cite "the log says" for a summary it never saw; the Task 083 eval already
recorded citation honesty failing on its own motivating scenario. So the guard
is structural rather than a note in prose: index rows carry three columns and
no summary field, under their own sub-heading, beside a stated count of rows
shown in full, shown as index only, and omitted. There is no column to
hallucinate from. This is also the only route by which the conductor could
recover a dropped summary: `isAlreadyBriefed`
(`app/src/main/conductor/context.ts:341`) excludes `docs/ai-work/LOG.md` from
selected file contents, and the conductor has no tool to read a file on
request, so what the section drops is genuinely gone.

**The newest row always survives, clipped if it must be.** If a single row
exceeds the whole detail budget, it is included truncated and visibly marked
rather than demoted to the index. Losing the most recent task would be the
worst outcome of a fix meant to preserve recent memory.

**Order stays chronological**: the index tier first, then the full tier, so the
section reads oldest to newest like the log itself and the most recent work
sits closest to the conversation.

**`CONSTITUTION_VERSION` stays `conductor-v8`.** The section describes itself
in code-assembled briefing text, so the constitution needs no amendment;
bumping it would invalidate the eval baselines for an unrelated reason.

## Requested visible outcome

Ordinary Chat sends successfully on the Cairn project itself. The assembled
briefing carries a work-log section that states, in plain words, how many rows
it shows in full, how many it shows as index only, and how many it omitted; the
most recent tasks keep their summaries; every older task is still listed by
number, date, and outcome; and the section stays inside a fixed budget however
many tasks the project completes.

A test fails when the briefing exceeds its budget, so this cannot silently
return.

## Boundary of intent

- Every other briefing section keeps its current behaviour and its current
  caps. Only the work-log section changes.
- `promptTooLarge` and `PROMPT_CHAR_LIMIT`
  (`app/src/main/conductor/transports/types.ts:108`) are unchanged. They remain
  the last-resort refusal; this task stops the briefing reaching them.
- `CONSTITUTION`, `QUALITY_CONSTITUTION`, and both version constants are
  unchanged.
- `AGENTS.md`, `CONTRACT-TEMPLATE.md`, and the contract mirrors are untouched;
  this is app code, not the contract. Package versions stay at 0.8.0.
- `docs/ai-work/LOG.md` keeps every row in full. This task changes what the
  briefing carries, never what the project records.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment.
- Do not touch `app/src/main/builderlivetransport.ts`. Its nine failing unit
  tests and the red `cairn-cli` build from Task 211 are pre-existing and not
  this task's.

## Checks

1. **`c1` - the work-log section stays inside its budget as records
   accumulate.** Against a fixture whose log holds 5,000 rows of 2,000-character
   summaries, the section is no larger than its detail and index caps plus its
   own headings. Red first: this fails before the change.
2. **`c2` - the whole briefing stays inside `BRIEFING_CHAR_BUDGET`.** The same
   pathological fixture assembles to no more than 130,000 characters. Red
   first.
3. **`c3` - the budget leaves room for a conversation.**
   `CONSTITUTION.length + BRIEFING_CHAR_BUDGET + 50_000 <= PROMPT_CHAR_LIMIT`,
   naming a 50,000-character conversation floor. This is the assertion whose
   absence let this defect ship: nothing tied the briefing's size to the limit
   it must live inside.
4. **`c4` - the newest rows keep their summaries and the oldest do not pretend
   to.** With a large log: the newest row's summary appears; an ancient row's
   summary does not appear anywhere in the briefing; that ancient row's index
   line does appear; and the counts the section states match the rows it
   actually rendered.
5. **`c5` - a single row larger than the whole detail budget is still shown,
   truncated and marked.** It is not demoted to the index and not dropped.
6. **`c6` - every capped section together stays inside the budget.** A fixture
   maxing out PROJECT.md, all three recent records, the file tree, selected
   file contents, and the log at once assembles inside
   `BRIEFING_CHAR_BUDGET`. If this fails, another section needs a cap; that is
   the same defect and its fix is in scope.
7. **`c7` - the real Cairn briefing now fits.** `assembleBriefing` run against
   this repository, plus `CONSTITUTION`, totals well inside
   `PROMPT_CHAR_LIMIT`. The report states the measured before and after.
8. **`c8` - nothing else regressed.** `npm run test:unit -w cairn-app` and
   `npm run typecheck -w cairn-app`, each named with its exact command and its
   real result, with the nine pre-existing Builder failures identified as
   pre-existing rather than absorbed.
9. **`c9` - the owner sends a real message in ordinary Chat on the Cairn
   project and it goes.** Only the owner can answer whether Cairn is usable on
   Cairn again; the machine checks cannot.

## DONE and STOPPED

**DONE** means checks `c1`-`c8` pass with their real output recorded, and `c9`
carries the owner's own confirmation that a message sent. A passing fixture is
not DONE for `c9`.

**STOPPED** means the budget cannot be met without dropping evidence the
conductor demonstrably needs; or `c6` uncovers an unbounded section whose fix
would change another section's meaning; or the compaction cannot be made
citation-safe without amending the constitution, which is the owner's decision
and a separate task.

The milestone does not move here. Slice 5 is unblocked by this task, not
started by it.
