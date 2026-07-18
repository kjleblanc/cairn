# Task 004 — report

## Result (plain language)

The "choose the model" feature is **built and working**, and I verified it end to end
with real, offline commands. You can now pick which AI model Cairn uses in two ordinary
places, and see which one is active:

- **In the terminal:** `cairn task --model <id>` runs the loop against that model and
  prints one line, `Using model: <id>`, at the start. Run `cairn task` with no flag and
  it behaves exactly as before (`Using model: claude-opus-4-8`, the built-in default).
- **In the app:** Settings has a new **Model** box. Type a model id and it is remembered
  (like Theme and Sound), passed into the next run, and the active model is shown. Clear
  the box and you are back to today's default.

Nothing about *what each role is allowed to do* changed — only *which model runs*. When
no model is chosen, Cairn behaves byte-for-byte as it did before.

**However, this task is STOPPED, not DONE**, because of one declared check that is red:
the app's Playwright **smoke test** fails in this environment. Importantly, it fails for
a reason that has **nothing to do with the model feature** — the app takes about **5.9
seconds** to show its first button here, and that smoke test only waits **5 seconds**
before giving up. The button does appear; the test just gives up one second too early on
this (slower) machine. Task 003's report recorded this same smoke test running in "~3 s"
on the machine where it was written, so this is a pre-existing timing fragility exposed
by a slower environment, not a regression from task 004.

Per the contract, a required check that fails means STOP honestly rather than paper over
it — and the fix (giving the smoke test a longer wait) lives in a file this brief did not
authorize me to change, so I did not widen scope. See "What forces STOPPED" below and the
clear, low-risk next step in "What still needs a human check".

## A note on the starting state (honesty)

The brief said the working tree was **clean** when it was written. When I started the
build, `git status` already showed a **complete candidate implementation** of task 004
sitting uncommitted in the working tree (a prior session's build), plus the untracked
`004-brief.md` and `004-approval.json`. I did **not** rewrite it from scratch. I treated
it as the candidate to verify: I read the full diff against the brief, confirmed the
approval hash still matches the brief byte-for-byte
(`sha256 0cab6b54…03049`), ran every declared check against it, and recorded the real
results below.

The same working tree **also** contained **unrelated debugging work** left by that prior
session, which I protected and did **not** touch, run into the commit, or delete:

- `app/src/renderer/App.tsx` — besides the one legitimate task-004 line (apply the saved
  model on startup), its `boot()` function is wrapped in a `try/catch` full of
  `console.log("DBG …")` timing probes. That instrumentation is **not** part of task 004.
- `app/tests/_debug.spec.ts` (untracked) — a "time-to-visible" probe measuring app
  startup speed. Also **not** part of task 004.

These two are exactly the tools someone uses to investigate a slow/flaky startup — the
very thing that makes the smoke test fail here. I left them untouched as protected work.

## Files changed (the task-004 implementation in the working tree)

Model feature — matches the brief:

- `core/src/agents.ts` — new `export const DEFAULT_MODEL = "claude-opus-4-8"` (the old
  default string, kept verbatim) and a pure `resolveModel(explicit?)`: explicit choice
  wins, else `CAIRN_MODEL`, else `DEFAULT_MODEL`; blank/whitespace counts as "no choice".
  `SdkEngine` and `MockEngine` take the model via constructor; `pickEngine(mock, model)`
  threads it; the mock engine echoes `Using model: <id> (mock)`. The `canUseTool` gate,
  role tool-policies, report lockout, `maxTurns`, and prompts are unchanged.
- `core/package.json` — adds the new `dist/test/agents.test.js` to the test runner.
- `cli/src/flows/task.ts` — new pure `parseModel(args)` (`--model <id>` and `--model=<id>`,
  ignores a missing/blank value or a following flag); prints `Using model: …`; threads the
  choice into `pickEngine`.
- `cli/src/index.ts` — reads `--model`, passes it to `taskFlow`, and lists the flag in `help`.
- `cli/package.json` — adds `dist/test/model.test.js` to the test runner.
- `app/src/main/tasks.ts` — a `task:setModel` IPC handler that rebuilds the engine with the
  chosen model and returns the resolved active model.
- `app/src/preload.ts`, `app/src/shared/ipc.ts` — expose `taskSetModel(model)`.
- `app/src/renderer/screens/Settings.tsx` — the **Model** field (reads/writes
  `localStorage["cairn-model"]`, applies on open, shows the active model).
- `app/src/renderer/App.tsx` — **one** task-004 line: apply the saved model on startup.
  (This file also holds the unrelated `DBG` debug block described above.)

New tests — match the brief:

- `core/test/agents.test.ts` — `resolveModel` precedence + the default string is unchanged
  + the mock engine echoes the chosen model.
- `cli/test/model.test.ts` — `parseModel` reads both flag forms, ignores absent/blank/next-flag.

Not committed (see Disposition): I made **no** commit (STOPPED tasks get none). The only
file I added is this report.

## Commands run and their real results

All offline. None called a real model or spent money.

- `core/ npm test` → **28 passed, 0 failed** (includes the four new `resolveModel`/mock tests).
- `cli/ npm test` → **10 passed, 0 failed** (includes the five new `parseModel` tests); `tsc` build clean.
- root `npm test` (workspaces) → **green** (core + cli).
- `app/ npm run typecheck` (`tsc --noEmit`) → **clean, no errors**.
- `app/ npm run build:vite` → **built OK** (main, preload, renderer bundles).
- `app/ npx playwright test tests/smoke.spec.ts` → **FAILED**: `getByRole('button', { name:
  'Start a task' })` not visible within the default 5000 ms. (Diagnosis below.)
- Diagnosis probe `app/ npx playwright test tests/_debug.spec.ts` (the pre-existing
  time-to-visible probe), three runs → button visible at **5943 ms, 5980 ms, 5797 ms** —
  it always appears, just after the smoke test's 5 s cutoff.

Recorded before/after (real output):

```
resolveModel()           => "claude-opus-4-8"      (no choice, no CAIRN_MODEL -> default)
resolveModel("")         => "claude-opus-4-8"      (blank = no choice)
resolveModel("   ")      => "claude-opus-4-8"      (whitespace = no choice)
resolveModel("my-model-id") => "my-model-id"       (explicit wins)
DEFAULT_MODEL            => "claude-opus-4-8"       (unchanged)

CAIRN_MODEL=env-model, resolveModel()          => "env-model"      (env is the middle fallback)
CAIRN_MODEL=env-model, resolveModel("explicit-wins") => "explicit-wins"

MockEngine(pickEngine(true,"demo-model-x")) status echo => "Using model: demo-model-x (mock)"

cairn task --mock --model demo-model-x  =>  "Using model: demo-model-x"
cairn task --mock                       =>  "Using model: claude-opus-4-8"
cairn help                              =>  "... · --model <id> (choose the AI model; default: the built-in model)"
```

## How the owner can see or try the result (offline, $0)

From the repo root (`C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework`):

1. **Terminal, with a made-up model, no money spent:**
   - `node cli/dist/src/index.js task --mock --model demo-model-x` → the intro prints
     `Using model: demo-model-x`. (Press Ctrl+C at the first question; the point is the
     model line.)
   - `node cli/dist/src/index.js task --mock` → prints `Using model: claude-opus-4-8`
     (today's default). Both are offline (`--mock` makes no AI call).
   - `node cli/dist/src/index.js help` → the `--model <id>` flag is listed.
2. **The resolver, directly:** in `core/`, run
   `node --input-type=module -e "import {resolveModel} from './dist/src/agents.js'; console.log(resolveModel(), '/', resolveModel('demo-x'))"`
   → prints `claude-opus-4-8 / demo-x`.
3. **The app (offline):** `cd app`, then `set CAIRN_MOCK=1` and `npm start`. Open Settings
   → the **Model** box; type `demo-model-x`, click elsewhere; "Active model" updates to
   `demo-model-x`; close and reopen Settings and the value is still there; clear the box to
   return to the default. (This uses the current working-tree code, which is not committed.)

Success looks like: the model you typed shows up in the `Using model:` line / the Active
model text. Failure looks like: the line always says `claude-opus-4-8` no matter what you
choose.

## What still needs a human check / decisions for the owner

1. **The blocker is small and low-risk to clear.** The app smoke test needs to wait a little
   longer for the first paint on slower machines. That is a one-line change to
   `app/tests/smoke.spec.ts` (give the first `toBeVisible` a longer timeout, e.g. 30 s, like
   the existing debug probe already uses). That file is **outside** this brief's authorized
   files, so I did not touch it. This is a good candidate for a **`Tiny change:`** or a
   small follow-up task, after which the model feature can be committed cleanly.
2. **The unrelated debug work.** `app/src/renderer/App.tsx` still carries the `DBG` timing
   logs and `app/tests/_debug.spec.ts` still exists. Decide whether to keep them (ongoing
   startup-speed investigation) or remove them. Because they sit in the same file as one
   task-004 line, they are tangled together; a clean follow-up would separate "remove debug
   cruft" from "commit the model feature".
3. **A real, paid run is yours to make, not mine.** The automated checks here **never**
   called a real model. Whether any specific real model id (e.g. the current default) is
   valid, and whether a live paid run succeeds, can only be shown by your own
   `cairn task --model <real-id>` run, which bills the paid API. A bigger model costs more
   per run.
4. **Fresh-context review.** If you want an independent check, `Review task 4.` in a brand-new
   chat.

## Limitations and remaining uncertainty

- I did **not** run the app's smoke test to green; I could only make it green by editing a
  file the brief did not authorize, so I stopped instead.
- I attributed the smoke failure to environmental startup latency using strong evidence
  (stable ~5.9 s time-to-visible; the boot path in mock mode is Electron launch + bundle +
  React + `openProject`, none of which task 004 touches; task 004 adds only one fire-and-
  forget IPC call that cannot block first paint; task 003 recorded the same test at ~3 s;
  and the prior session had already left "time-to-visible" debug tooling). I attempted to
  confirm this by building the pre-task-004 (HEAD) renderer in an isolated throwaway git
  worktree, but that build needs a compiled `@cairn/core` the worktree lacked, so I stopped
  that side-check rather than install anything. My attribution therefore rests on the
  evidence above, not on a direct HEAD smoke run.
- The passing checks prove the selected model **flows through Cairn's own code** to the
  point it is handed to the SDK, and that the default is unchanged when nothing is chosen.
  They do **not** prove any real model id is valid or that a live run works — only your own
  paid run can.

## Milestone movement

NO — as the brief predicted, this is plumbing that clears the "you can't choose or even see
the model" blocker in front of the milestone, not a visible feature for a beginner. It does
not move the milestone by itself, and it is currently blocked from being finished by the
unrelated smoke-test timing issue.

Disposition: STOPPED — BUILD_OR_TESTS_FAIL

---

## Addendum — 2026-07-18: finished after the blocker was cleared

The owner decided to finish this task rather than leave it STOPPED. Three things
happened, in this order, all outside the original brief's file list and recorded here
honestly:

1. **The blocking check was fixed as a test-only change.** `app/tests/smoke.spec.ts`
   now gives the first "Start a task" button up to 30 seconds to appear (it previously
   allowed 5 s; this machine measured ~5.9 s). One line plus a comment, committed on its
   own before the feature commit.
2. **The unrelated debug instrumentation was removed.** `boot()` in
   `app/src/renderer/App.tsx` was restored to its original body — the `DBG` timing logs
   and their try/catch came out; the one task-004 line (apply the saved model on
   startup) stayed — and the untracked probe `app/tests/_debug.spec.ts` was deleted.
   The slow-startup finding itself (~5.9 s to first paint here) stays recorded above.
3. **Every declared check was re-run, and all are green** (real output, offline, $0):
   - `core/ npm test` → **28 passed, 0 failed**
   - root `npm test` (workspaces, includes `cli`) → **10 passed, 0 failed**
   - `app/ npm run typecheck` → **clean**
   - `app/ npm run build:vite` → **built OK**
   - `app/ npx playwright test tests/smoke.spec.ts` → **1 passed** (1.4 s on this run;
     the longer wait guards the slow case)
   - `cairn task --mock --model demo-model-x` → `Using model: demo-model-x`;
     `cairn task --mock` → `Using model: claude-opus-4-8`; `help` lists `--model <id>`.

One correction to the trail: the uncommitted LOG row for 004 read
`STOPPED / accept / "test" / milestone YES` — placeholder data from trying the app's
decision screen. It contradicted this report and was replaced, before any commit, with
a row matching the real outcome (DONE, milestone moved NO).

Still true after the addendum: no real (paid) model call was made, no real model id was
validated, and documenting the feature in the guides remains Final work for a later
task.

Final disposition: DONE
