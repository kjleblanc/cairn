# Task 002 — brief

## Lane: Standard · Mode: Final

**Why Standard (not Tiny):** the fix is small, but it changes the one shared helper
(`events()` in `cli/src/flows/task.ts`) that every agent role — definer, builder,
reviewer, direction — streams its live status line through. A mistake there would
affect all four, so it needs a new tested helper and careful checking. That
uncertainty moves the work up to Standard. It is **not** High-Stakes: nothing here
touches dependencies (the spinner library stays exactly as it is), stored-data
formats, security, payments, deployment, or any outside service — it is a
self-contained terminal-rendering bug fix in the CLI, covered by unit tests.

**Why Final (not Draft):** there is a single correct behaviour to implement (the live
status line must never grow wider than the terminal, so it can never wrap and flood).
This is a straight bug fix meant to become the CLI's real behaviour, not a candidate
to park for the owner to choose between.

## The visible outcome

Today, during a real `cairn task` — most reliably at the **Verify** step, while the
fresh reviewer is streaming its thoughts — the terminal can fill with hundreds of
copies of the same clipped line, scrolling forever, for example:

```
●  The diff is exactly within the brief's boundary: `isCairnProject` rewritte
●  The diff is exactly within the brief's boundary: `isCairnProject` rewritte
●  The diff is exactly within the brief's boundary: `isCairnProject` rewritte
… (repeating, filling the screen)
```

After this task, that same run will show a single live status line that updates in
place — the spinner animates on one row and is replaced, never stacked — no matter how
narrow the console window is.

Nothing else about the loop changes: the owner still sees a readable, live one-line
summary of what the AI is doing at each step.

## Why this happens (the root cause the fix must remove)

The status line is drawn by the spinner from `@clack/prompts`. Each animation frame it
emits "jump to the start of the line, erase it, redraw" — which only works while the
line fits on **one** physical row. The spinner counts rows by counting newline
characters in its message; it never asks how wide the terminal is. Cairn currently
feeds it a line up to 76 characters long (`first.slice(0, 76)` in the `onText`
handler), plus the spinner's own 3-character prefix — about 79 columns. In a console
window narrower than that (the one in the bug report is clipped mid-word at
"rewritte"), the line **wraps** onto a second row. The spinner's "jump to start of
line" then lands at the start of the *wrapped* row, its erase misses, and every frame
(roughly 8–12 per second) leaves a fresh copy marching down the screen.

The library's row-miscount is not something this task changes. The controllable cause
on Cairn's side is that it hands the spinner a line long enough to wrap. Keeping the
line inside the terminal's width removes the wrap, and with it the flood.

## How it moves the current milestone

The milestone is: *a real-model `cairn task` completes an improvement to Cairn itself,
end to end.* This bug strikes during the reviewer step of a real `cairn task`, so it
directly threatens that milestone — a run that floods the screen has not completed
cleanly end to end. Fixing it is a concrete, real improvement to Cairn's own CLI,
carried through the full Define → Build → Verify → Decide loop, and it removes a
frightening, confusing failure for the very beginners Cairn is built for. The builder's
report will give the honest YES / NO / UNCLEAR call on milestone movement.

## What may change

- `cli/src/ui.ts` — add one small exported helper, `spinnerLine(raw, columns?)`, that
  turns any agent text into a safe status line: collapse every run of whitespace
  (including newlines) to a single space, trim it, and cut it so that the finished
  line — including the spinner's own prefix — cannot reach the terminal's width. When
  the width is unknown, assume a standard 80 columns. Existing exports in this file are
  unchanged.
- `cli/src/flows/task.ts` — route **both** live-status callbacks (`onText` and
  `onTool`) through `spinnerLine(..., process.stdout.columns)` instead of the current
  hardcoded `.slice(0, 76)` / `.slice(0, 60)`. No other behaviour in this file changes:
  the same steps run in the same order, the spinner still shows a live one-line status.
- `cli/test/ui.test.ts` — a new test file proving the fix's core promise: for a range
  of terminal widths (a narrow 40, the bug's ~72, a standard 80, a wide 120, and an
  unknown/undefined width) `spinnerLine` never returns a line that — once the spinner
  prefix is added — would reach that width, and it never contains a newline. One test
  uses the exact flooding string from the bug report at a 72-column width as a
  regression guard.
- `cli/package.json` — add `dist/test/ui.test.js` to the existing `test` script so the
  new tests actually run. This is a script-line change only; **no dependency is added,
  removed, or upgraded.**
- Rebuilt output under `cli/dist/**` (and `cli/assets/contract.md`) may be regenerated
  by the build step. These are git-ignored artefacts and are **not** committed.

## What must NOT change

- **No dependency change.** `@clack/prompts` stays at its current version; the fix does
  not patch, fork, or replace the library. It only controls the text Cairn gives it.
- The order and behaviour of the task loop in `task.ts` — Define → Build → Verify →
  Decide, the approval gate, the role tool-policies in `agents.ts`, the prompts, and
  the gate logic in `gates.ts` — all stay exactly as they are.
- The build must not touch `docs/ai-work/LOG.md` or `docs/ai-work/PILOT.md`. Those are
  written only at the **Decide** step (`My decision for task 002: …`), never during the
  build.
- Any file outside `cli/` — no edits to the contract (`AGENTS.md`), the other docs, or
  the app (`cairn.html`). No file deleted, moved, or renamed.
- The git-ignored build artefacts (`cli/node_modules/`, `cli/dist/`,
  `cli/assets/contract.md`) are touched only as normal build output, never by hand.

## Modified or untracked work that stays untouched

`git status` shows one modified file: `docs/ai-work/LOG.md` (it carries an uncommitted
task-001 row) and the branch is 3 commits ahead of `origin/main`. That modified
`LOG.md`, and anything else the builder finds modified or untracked at build time, must
be left exactly as-is — the build changes none of it. The builder must re-check
`git status` at the start and protect whatever is there.

## What the owner will personally see or try

1. **The flood is gone.** Make your console window narrow (say ~70 columns), then run a
   task through to the Verify step: `node cli/dist/src/index.js task`. As the reviewer
   streams, the status line stays a single row that updates in place — no scrolling wall
   of repeated lines. (The report will give exact copy-paste steps, including an
   offline way to see it without a model call.)
2. **Normal behaviour intact.** The live status line still appears and still shows a
   readable summary of the current step; nothing else about the loop looks different.

## The checks the AI will run

- `npm run build` inside `cli/` — the TypeScript compiles with no errors.
- `npm test` inside `cli/` — all existing tests pass, plus the new `ui.test.ts` tests
  (the status line never reaches the terminal width, newlines are collapsed, an unknown
  width is handled).
- A direct before/after demonstration recorded in the report: feed the exact flooding
  string through the old path and the new `spinnerLine` at a simulated 72-column width,
  and show in real numbers that the old line (with prefix) exceeds 72 columns and would
  wrap, while the new line fits on one row.

These checks prove the status line can no longer grow wide enough to wrap, which is the
mechanism behind the flood. They cannot fully reproduce a live terminal's wrapping
inside an automated test; the report will state that limit plainly and lean on the
width invariant plus the manual narrow-window run for the rest.

## What DONE requires

All of these must hold, verified against real command output (not memory):

1. For terminal widths 40, 72, 80, 120, and unknown/undefined, `spinnerLine` returns a
   line whose length plus the spinner's 3-column prefix stays strictly inside that
   width, and that contains no newline — proven by the new tests.
2. Both `onText` and `onTool` in `task.ts` produce their status text through
   `spinnerLine`; the hardcoded 76- and 60-character slices are gone.
3. `npm run build` succeeds and `npm test` passes, including the new tests, with every
   existing test still green.
4. Nothing outside the declared files changed; the uncommitted `LOG.md` row and any
   other modified/untracked work are untouched.

## What forces STOPPED

- **`WRAP_UNPREVENTABLE`** — bounding the status line to the terminal width inside
  `ui.ts` / `task.ts` cannot prevent the wrap-flood without either changing the
  dependency or removing the live status line entirely (both outside this brief).
- **`BUILD_OR_TESTS_FAIL`** — the build or the test suite cannot be made green within
  this brief's boundary.

A STOPPED task gets no success commit; the state is preserved exactly and reported.

## Actions that need separate approval

**None.** This task installs nothing (the spinner library is already present), uses no
network, needs no credentials, moves no money, deploys nothing, sends no messages,
deletes or moves no files, and writes to no external service. All work is local edits
plus the local build and test commands. If any of that turns out to be needed, the
builder must stop and ask first.
