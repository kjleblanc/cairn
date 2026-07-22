# Task 008 — report

## Result (plain language)

Two-way talk now works at the Define and Approve steps, in the desktop app and
the CLI, powered by the shared engine. This is a Draft — one candidate design
for you to judge.

1. **The AI can ask you questions while writing the brief.** The definer — and
   only the definer — gets an "ask the owner" ability. The run pauses, the
   question appears (an amber card in the app; a typed prompt in the CLI), and
   your answer flows back into the same run. At most 3 questions per run,
   counted in code. Skipping, leaving it blank, cancelling, or a broken channel
   all resolve the same way: the AI is told "No answer — use your best judgment
   and write the assumption into the brief," and the run continues. The
   question card carries the standing note that Cairn never needs a password or
   key typed there. Builder, reviewer, and direction runs have no ask ability —
   denied in code even if one is ever wired by mistake.
2. **You can ask questions or request changes before approving.** Next to
   "Approve this exact brief" there is now an "ask a question or request a
   change" box (in the CLI, a three-way choice: approve / ask-or-change / not
   now). Your message goes to a fresh definer-role turn: a question gets a
   plain answer and the brief stays untouched; a change request revises the
   brief file, and the new version is shown to you again. You can go as many
   rounds as you like. The engine refuses a refine the moment an approval is on
   file, so approval still locks exactly the text on screen — the existing
   hash record proves it.
3. **Everything downstream is unchanged.** Build, review, direction check,
   resume, the approval file's shape, and the one-agent-at-a-time rule all work
   exactly as before. A skin that wires nothing behaves exactly as before this
   task existed.

**One design judgment, disclosed.** In mock (demo) mode an unattended run must
finish on its own, so an *untouched* question card skips itself after 10
seconds. I found a flaw in the halfway version of this: the skip timer ran in
the app's engine room regardless, so an owner still typing at 30 seconds would
have been cut off and their answer silently ignored — the exact "answering does
nothing" failure the brief forbids. The self-skip now lives in the card itself
and is cancelled by your first click or keystroke; the engine room keeps only a
3-minute last-resort backstop. Real-model runs have no timer at all — the
question waits for you, with Skip always available.

## An honest note: this task was built across two sessions

When this build session started, the working tree already held roughly 430
lines of uncommitted changes — a previous builder session for this same task
had been interrupted partway. Before touching anything I verified: the brief's
SHA-256 matched the approval record exactly (`e33f5080…`), and every modified
file sat inside this brief's allowed list. I read the whole existing diff hunk
by hunk, judged it a faithful partial build of this brief (core channel, CLI
flow, app engine-room bridge, tests), and completed it rather than duplicating
it: the app's screens, the auto-skip fix above, the new app spec, and all
checks are from this session. The report describes the combined result, and
the reviewer should treat all of it as one builder's work to verify.

## Files changed

- `core/src/agents.ts` — optional `onAsk` channel on `RunEvents`; the
  `makeAskOwner` gatekeeper (definer-only, 3-question cap, skip fallback, never
  throws); the real engine mounts the definer-only `ask_owner` tool; the tool
  gate denies asking for every other role; the mock definer asks one question
  when wired and handles refine turns.
- `core/src/steps.ts` — new `refineBrief` step; refuses without a brief and
  after approval. Existing steps unchanged in signature.
- `core/src/prompts.ts` — the definer prompt mentions asking only when a
  channel is wired (otherwise byte-identical to before); new refine prompt.
- `core/src/index.ts` — **no edit needed**: it already re-exports everything.
- `core/test/agents.test.ts`, `core/test/steps.test.ts` — 12 additive tests.
- `cli/src/flows/task.ts` — the question pauses the spinner and asks at the
  terminal (Enter with nothing, or Esc, skips); the approval step is now
  approve / ask-or-change / not-now, looping through refine rounds and
  re-showing the brief, costs shown as before. `cli/src/ui.ts` — no edit needed.
- `app/src/main/tasks.ts` — the ask bridge over IPC with the skip guarantees
  above; the refine handler; one agent at a time kept.
- `app/src/shared/ipc.ts`, `app/src/preload.ts` — the matching types and
  exposed calls, added alongside what exists.
- `app/src/renderer/screens/Wizard.tsx` — the question card during defining;
  the ask-or-change box at approve (hidden once approved); resume path intact.
- `app/src/renderer/components/QuestionCard.tsx` — **new**; the one allowed
  component (answer, skip, and the touch-cancelled demo self-skip).
- `app/src/renderer/app.css` — four small rules. `app/src/renderer/api.ts` —
  no edit needed.
- `app/tests/ask.spec.ts` — **new**; the one allowed test file (two tests). It
  snapshots and restores the machine's real remembered-projects file, so it
  leaves no trace in your app.
- `docs/ai-work/tasks/008-report.md` — this report.

`app/tests/smoke.spec.ts` and `app/tests/projects.spec.ts` were **not** edited
(verified in the diff). Your uncommitted `docs/ai-work/LOG.md` decision rows
(005–007), `docs/ai-work/tasks/007-approval.json`, and the three unpushed
commits were left exactly as found. Nothing was pushed, installed, or sent
anywhere.

## Commands run and their real results

All offline on this machine; no real model call, no money, nothing installed.
(The PowerShell command runner's permission layer failed with the same internal
error task 007 reported, so commands ran through the Bash runner.)

1. `core/ npm test` → **46 tests pass, 0 fail**, including: the 3-question cap
   (the 4th ask never reaches the owner), the skip fallback (null, blank, and
   thrown answers all resolve — never a hang, never a crash), the ask ability
   existing for the definer only, builder/reviewer/direction never asking even
   when wired, and refineBrief revising / answering / refusing after approval.
2. `cli/ npm run build` → clean. `cli/ npm test` → **16 tests pass, 0 fail**.
3. `app/ npm run typecheck` → clean (run again after the last file; the config
   includes the tests). `app/ npm run build:vite` → all three bundles built.
4. `app/ npx playwright test` → **6 passed (1.2 m)**: the two new tests
   (answer → brief → ask round → change round → approve, with the recorded
   approval hash equal to the SHA-256 of the final brief file; and skip →
   assumption written, run alive) plus, unchanged, the three project tests and
   the smoke test. The smoke test never touches the question card, so it also
   proves the untouched-card self-skip: it passed in 19.2 s — its old ~9 s
   plus the intended 10-second skip, well inside its 60-second budget.
5. `git diff` and `git status` inspected in full → only the files listed above
   changed; the LOG.md diff is exactly your three decision rows.
6. Extra, beyond the brief's list: a scripted end-to-end run of the real CLI
   (`cairn task --mock`) in a throwaway folder, driven by timed keystrokes.
   The transcript shows the whole shape: the question asked and answered at
   the terminal with the no-password note; an ask-or-change round revising the
   brief ("Revision (mock)" in the file); "Approval recorded (brief locked:
   f4d4ecc7a899…)" — and that hash **matches** the final revised brief file
   byte for byte; then the mock build, DONE, and a closed task. The repo's own
   git status was identical before and after.

## How you can see or try it (offline, $0)

Close any open Cairn Desktop window first — an old window runs old code. Then
from the repo root: `cd app`, then `set CAIRN_MOCK=1`, then `npm start`.

- **Success looks like:** start a task; while the brief is being written an
  amber question card appears and waits; type an answer (take your time — as
  long as you have touched the card it will not skip itself) or click Skip;
  the brief appears and, in mock mode, carries your exact answer. Below the
  Approve button, type a change request such as "Please also cover the demo
  note" — the revised brief is shown again with a "read it again" note. Type a
  question ending in "?" — you get an answer and the brief does not change.
  Approve, and the build runs exactly as before. For the terminal: make an
  empty folder, run `cairn init` there, then `cairn task --mock` — the same
  shape at the terminal, with the choice approve / ask-or-change / not now.
- **Failure looks like:** no question ever appears; your answer does nothing;
  skipping kills the run; a change request never re-shows a revised brief; or
  a build or review run starts asking questions.

## What still needs a human check

1. **Your own hands on both flows** — the scripted passes prove the machinery;
   only you can say whether the question card, the pacing, and the
   ask-or-change round feel right. That judgment is the point of a Draft.
2. **The 10-second demo self-skip** — generous enough? Only a human watching
   the card can say.
3. **The real-model experience** — see limitations below.

## Limitations and remaining uncertainty

- **The real-model path is wired but untested.** Everything proven above ran
  in mock mode — the brief allowed nothing that spends money. The real engine
  mounts the ask tool through the Claude Agent SDK's in-process tool support
  (the SDK and its helper both resolve here; nothing was installed), and if
  mounting ever fails the run proceeds exactly as today, just without
  questions — but no real-model question round has actually been run. The
  first real-model define after this task should be watched with that in mind.
- **A real model may simply not ask.** The prompt says it *may* ask up to 3
  questions when one would help; a model can legitimately write the brief
  without asking. The cap and skip guarantees are enforced in code either way.
- **The CLI transcript came from piped keystrokes**, not a human at a real
  terminal; terminals differ in small ways. The app path is covered by real
  scripted UI tests.
- Evidence proves the named checks ran and passed; it cannot prove the feature
  feels right, and it cannot prove the SDK's live behavior offline.
- `docs/ai-work/tasks/008-approval.json` (the CLI's approval record for this
  task) stays uncommitted: the contract names the commit's contents as brief,
  implementation, and report, and task 007's approval file was likewise left
  untracked. Tasks 004 and 006 committed theirs — the owner may want one
  consistent rule some day.

## Milestone movement

YES — the milestone is "a real-model cairn task completes an improvement to
Cairn itself, end to end." This task is a real improvement to Cairn — it
removes a known reason tasks stall (briefs built on guesses, approvals
abandoned because one question had no way to be asked) — and it was defined,
hash-approved, and built through Cairn's own gated tooling with a real model,
with the checks green and the paperwork honest. As with task 007, the loop's
last step — your decision — is what closes it end to end. One wrinkle for the
record: the build needed two sessions because the first was interrupted; the
gates held across the gap, which is itself evidence the workflow protects
against exactly this.

Disposition: DONE
