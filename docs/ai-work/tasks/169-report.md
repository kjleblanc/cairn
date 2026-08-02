# Task 169 — Cairn speaks warmly, and says why a run stopped in words the owner can read

Base commit: `0cd51d2`

Brief commit: `1e5caa5`

## Outcome

Cairn is warmer, in the register the owner named, and four surfaces stopped
putting machine constants in front of them.

The voice moved to `conductor-v4`. Warmth now lives in rhythm — short delighted
sentences, noticing things, being glad the owner is here — and explicitly not in
catchphrases, verbal tics, or pet names. That exclusion is the load-bearing half
and is pinned whole: rhythm can go quiet when news is bad and leave Cairn
recognisable, but a tic cannot, and a familiar flourish attached to an
unverified result reads to a beginner as a shrug. The cheer-steps-aside rule and
every honesty and boundary rule are byte-unchanged.

The stopped run now says why. Where the app read **"STOPPED — CANCELLED_BY_OWNER"**
it reads **"STOPPED — you stopped it yourself"**. The code is kept, demoted to a
quiet second line on the result card and to a parenthetical in the written
report, because it is a real fact useful to anyone debugging — it simply never
arrives alone.

Disposition: **DONE**

## The finding that mattered

The plan's final check was not a command. It was: *launch the app, reach a
STOPPED result card, and read the headline aloud.*

Every automated check passed — 198 unit, 151 core, typecheck, both builds — and
the app still said **"STOPPED — CANCELLED_BY_OWNER"** on screen.

The text in `app/shots/task-168-stopped-desktop.png` was never the result card.
It is the **run strip**, fed by the `Result` activity that `core/src/serial.ts`
emits, and six emit sites interpolated the raw code. The card fix and the report
fix were both real, both correct, and both invisible at the place the owner
actually looks.

Two details worth keeping:

- The DONE emit at `serial.ts:1333` already read as a sentence — *"DONE — one
  real Codex Exec task completed and was verified."* The STOPPED emits were the
  odd ones out **within the same file**. The happy path looked fine, which is
  why the inconsistency survived.
- Steps 3 and 4 were not wasted. The card and the report are separate surfaces
  and both had the defect. The plan was incomplete, not wrong.

## What changed

- `conductor-v4`: the Voice paragraph rewritten to the owner's register, three
  new sentences pinned verbatim, header comment extended. Every v2 honesty rule
  and the v3 cheer-steps-aside rule untouched.
- The plain-words rule grew past chat: outcomes, details, and notes now obey it,
  and "never put a code, a constant, or a file-format word in front of the owner
  without a plain sentence saying what it means" is pinned.
- `app/src/shared/stopwords.ts` (new): thirteen codes — the ten `SerialStopReason`
  values plus three app-side closes — each with one plain clause. Lives in
  `shared/` rather than core because all five renderer imports of `@cairn/core`
  are type-only and this must not become the first runtime one; the built bundle
  was checked and contains no core runtime code.
- `Chat.tsx`: the result card headline leads with the plain clause; the code
  drops to its own quiet line.
- `core/src/records.ts`: `stopReasonInPlainWords`, and `stoppedParagraph`
  rewritten. `SerialStopReason` imported type-only — `serial.ts:8` already
  imports this module as a value, so a runtime import back would cycle.
- `core/src/serial.ts`: six `Result` emit sites now say why instead of naming a
  code. The strip carries the clause alone; the code is one glance below on the
  card.
- Eval scenarios 11 and 12 added with written pass/fail bars, plus `S11`/`S12`
  columns. **Not run.**

## Checks and real results

All output was observed in this task's terminal.

1. `npm.cmd run typecheck` from `app/` — exit 0, no output. ✓
2. `npm.cmd run test:unit` from `app/` — **198 pass, 0 fail**, including seven
   new `stopwords.test.ts` cases and five new constitution pins. ✓
3. `npm.cmd run build:vite` and `build:lab` from `app/` — both clean. ✓
4. `npm test` from `core/` — **151 pass, 0 fail**. ✓
5. **The mirror test was verified to actually fail.** Diverging one word in the
   app's copy produced `app/src/shared/stopwords.ts disagrees with core about
   CANCELLED_BY_OWNER: core says "you stopped it yourself"`; restoring it went
   green. A guard that cannot fail is not a guard. ✓
6. Red-first throughout: every step ran its test before its implementation and
   the failure text was read, not assumed. ✓
7. `git diff --check` — no output. Working tree clean. ✓
8. Eval diff inspected: row count unchanged at two, both existing rows
   byte-identical once their two new empty cells are removed, `S11`/`S12` empty.
   **No run was made and no result invented.** ✓
9. **Looked at it.** Captured the live STOPPED card at desktop size and read it.
   First capture still said "STOPPED — CANCELLED_BY_OWNER" — that is what found
   the run strip. After the fix it reads "STOPPED — you stopped it yourself".
   The temporary capture line was removed before committing. ✓

App token held for every E2E run (`%TEMP%\cairn-app-token`) and **released**.
Isolated throwaway profiles, fakes only. **No real model call, no paid call, no
credential, and no eval run.**

## Limitations and remaining judgment

**The Playwright suite is not fully green on this machine, and was not before
this task.** Three failures are stable and were proven pre-existing:

- `away.spec.ts:18` expects the text *"does not transform legacy"*, which
  **Task 161 (`c3a9cc5`) removed from the app** without updating the test.
  `git log -S` confirms it.
- `routing.spec.ts:328` and `routing.spec.ts:385` fail **identically with this
  task's source changes reverted to `84abc91`** — verified by reverting,
  rebuilding, and re-running. 385 is the documented "a real codex may exist on
  this machine's PATH" caveat from `HANDOFF-level3a.md`.

A further rotating set (`conductor.spec.ts:538` / `:801`,
`routing.spec.ts:159` / `:354`) differs between full runs and **passes in
isolation**, alongside `EPERM` errors removing temp profiles — contention, not
correctness. None of the failures assert any string this task changed.

**A fifth surface still carries raw codes.** `core/src/serial.ts` emits five
`Check`-stage activities reading `Stopped safely: <CODE>.` (lines 1218, 1252,
1385, 1420, 1464), shown on the run screen. It is the same defect and the same
one-line fix, but it is outside this task's stated boundary — the brief named
the card and the report — and `routing.spec.ts:270` pins the current wording.
It should be claimed as its own task rather than smuggled in here.

**The voice change is unmeasured.** Scenarios 11 and 12 exist as written bars
only. Whether v4 actually reads warmer, and whether it stays plain under
pressure, needs a paid eval run and the owner's explicit go.

## How to try it

Reach a STOPPED result in the app — dispatch a task and press "Stop this task".
The run strip and the card both say *"STOPPED — you stopped it yourself"*, with
`Code: CANCELLED_BY_OWNER` beneath the card headline. Read it as someone who
does not know what "unverified" means; that is the bar this task was set.

Milestone moved: **NO**
