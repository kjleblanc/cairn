# Task 008 — brief

## Lane

**Standard.** One reason: this touches the shared engine, the CLI, and the desktop
app — several areas, so bigger than a Tiny change; but it adds no dependency, changes
no stored file format, touches no network or security boundary, and the hash-locked
approval gate keeps its exact meaning, so it is not High-Stakes.

## Draft or Final

**Draft.** The owner asked Cairn to "come up with a solution" for two-way questions
during the loop — the owner has not yet chosen a design. This task builds one
candidate design, working end to end in mock mode, for the owner to judge. Accepting
it later means recording this task's result as the chosen design; extending the same
pattern to other points of the loop would be new tasks that name it.

## The problem, in plain language

When Cairn runs through chat, questions flow both ways naturally — it is a chat. But
when Cairn runs through the CLI or the desktop app, every AI session is one-shot: the
AI's words stream out, and nothing can be sent in. Today:

- the AI writing a brief cannot ask the owner anything — even when one answer
  (especially while brainstorming) would make the brief much better; and
- the owner looking at a drafted brief cannot ask the AI anything or request a
  change — the only moves are "approve exactly this" or cancel and start over,
  paying for a whole new run.

## The visible outcome

Two-way talk at the Define and Approve steps, in both the desktop app (`app/`) and
the CLI (`cli/`), powered by the shared engine (`core/`):

1. **The AI can ask the owner questions while writing the brief.** The definer gets
   one new ability: "ask the owner." When used, the run pauses, the question appears
   (a question card in the app; a typed prompt in the CLI), the owner answers — or
   skips — and the answer flows back into the same run. At most **3 questions per
   run**. Skipping or cancelling never hangs or kills the run: the AI is told "no
   answer — use your best judgment and write the assumption into the brief." The
   question box carries a standing plain note that Cairn never needs a password or
   key typed here.
2. **The owner can ask questions or request changes before approving.** At the
   approval step, alongside "Approve this exact brief," a message box appears: *ask
   a question or request a change*. The message goes to a fresh definer-role turn
   that reads the current brief and either answers in plain words or revises the
   brief file — allowed, because nothing is locked until approval. The updated brief
   is shown again, and the owner can go another round or approve. **Approval always
   locks exactly the brief text on screen at that moment** — the existing hash
   approval already guarantees this.
3. **Everything downstream stays exactly as it is.** The builder, the reviewer, and
   the direction check get no question ability and no incoming-message channel in
   this Draft. A message sent into a running build could blur the frozen-brief
   boundary — if that is ever wanted, it is a separate task with its own thinking.

**How this moves the current milestone** ("a real-model cairn task completes an
improvement to Cairn itself, end to end"): this task is itself an improvement to
Cairn, defined and built through Cairn's own tooling — and it removes a real reason
tasks stall (briefs built on guesses, approvals abandoned because one question had no
way to be asked). The report must record honestly whether it completed that way.

## What may change

Only these files:

- `core/src/agents.ts` — an optional "ask the owner" channel on `RunEvents` (a
  callback returning the answer); the definer-only ask tool in both the real engine
  and the mock engine; the 3-question cap and the skip fallback. The mock definer
  asks one question when the channel is wired, so the whole feature is visible at $0.
- `core/src/steps.ts` — one new pre-approval step (for example
  `refineBrief(root, taskNumber, message, …)`) that runs a follow-up definer-role
  turn against the current, not-yet-approved brief. Existing steps keep their
  signatures; additions only.
- `core/src/prompts.ts` — the definer prompt learns it may ask; a new refine prompt.
- `core/src/index.ts` — export the new step and types.
- `core/test/agents.test.ts` and `core/test/steps.test.ts` — additive tests only.
- `cli/src/flows/task.ts` — pause the spinner to ask the owner's answer; the
  approval step offers approve / ask-or-change / not now, looping through refine and
  re-showing the brief, with the per-round cost shown as today.
- `cli/src/ui.ts` — only if a small label is needed.
- `cli/test/` — additive test edits or at most one new test file.
- `app/src/main/tasks.ts` — bridge the ask channel over IPC (send the question,
  wait for the renderer's answer); a new refine handler. The one-agent-at-a-time
  rule stays.
- `app/src/shared/ipc.ts`, `app/src/preload.ts`, `app/src/renderer/api.ts` — the
  matching types and exposed calls, added alongside what exists.
- `app/src/renderer/screens/Wizard.tsx` — the question card during "defining"; the
  ask-or-change box at "approve". The resume path keeps working.
- At most **one new** small component under `app/src/renderer/components/`.
- `app/src/renderer/app.css` — small style rules only.
- At most **one new** test file under `app/tests/` — additive only.
- `docs/ai-work/tasks/008-report.md` — the report (new file).

## What must not change

- **The approval gate.** Approval is recorded only when the owner approves, over the
  exact final brief text, hash-locked as today; nothing builds without it. The shape
  of the approval file (`NNN-approval.json`) does not change. No chat answer ever
  widens an approved brief.
- **Role boundaries.** Builder, reviewer, and direction runs get no ask tool and no
  incoming messages; the definer still may write only its own brief file; the
  reviewer's report lockout and all existing tool gates keep working. The new
  `RunEvents` field is optional — a skin that wires nothing behaves exactly as today.
- **The contract and every public document.** `AGENTS.md`, `CONTRACT-TEMPLATE.md`,
  `CHANGELOG.md`, `MAINTAINERS.md`, all guides, `cairn.html`, `index.html`, and the
  synced `core/assets/contract.md` / `cli/assets/contract.md` (never hand-edited).
  This task adds runtime capability only; the workflow's rules, commands, and names
  do not change. If a contract change turns out to be required, stop — that is a
  separate lockstep job.
- `app/tests/smoke.spec.ts` and `app/tests/projects.spec.ts` — must pass
  **unchanged**.
- Everything accepted in tasks 004–007: the model and effort dials, `CAIRN_OPEN`,
  the remembered-projects file shape, project switching, and all app files not named
  above.

## Pre-existing work that stays untouched

Git status at definition time: branch `main`, **three local commits not yet pushed**
(never push — pushing needs its own approval), **one unstaged modification to
`docs/ai-work/LOG.md`** (the owner's task 007 decision row), and **one untracked
file `docs/ai-work/tasks/007-approval.json`**. Leave all of these exactly as found —
never stage broadly, revert, or fold them into this task's commit; commit only this
task's named files, staged by name.

## What the owner will personally see or try

Offline, $0. Close any open Cairn Desktop window first (an old window runs old
code). Then from the repo root: `cd app`, then `set CAIRN_MOCK=1`, then `npm start`,
and start a task.

Success looks like: while the brief is being written, a question card appears and
waits; your answer (or a skip) lets the run finish; the brief appears with an "ask a
question or request a change" box next to Approve; typing a change request produces
a revised brief shown again for approval; approving then building works exactly as
before. In the CLI, `cairn task --mock` walks the same shape at the terminal. With a
real model later, each question-and-answer round is one normal model call, with its
cost shown as today — mock mode spends nothing.

Failure looks like: no question ever appears; answering does nothing or the run
hangs forever; skipping kills the run; the change request never re-shows a revised
brief; approval locks text different from what is on screen; or a builder or
reviewer run starts asking questions.

## Checks the AI will run

All offline; none calls a real model or spends money:

1. `core/ npm test` — must pass, including new additive tests for: the 3-question
   cap, the skip fallback (a run never hangs or dies unanswered), the ask tool
   existing for the definer only, and the refine step revising a brief.
2. `cli/ npm run build` and `cli/ npm test` — clean and passing.
3. `app/ npm run typecheck` — clean; `app/ npm run build:vite` — builds.
4. `app/ npx playwright test` — all pass: the unchanged `smoke.spec.ts` and
   `projects.spec.ts`, plus at most one new additive spec driving mock mode end to
   end: question → answer → brief; ask-or-change → revised brief → approve; and the
   recorded approval hash matches the final shown text.
5. Inspect the actual `git diff` — only the named files changed.

## DONE requires

All five checks pass; both directions work in mock mode in the app and the CLI; a
skipped question never hangs or kills a run; approval provably locks the final shown
brief text; builder, reviewer, and direction runs are provably question-free; and no
file outside the allowed list changed.

## STOPPED if

- A declared check fails and cannot be fixed inside the allowed files —
  `STOPPED — CHECK_FAILED`.
- The Claude Agent SDK cannot support a pause-and-wait question in a way that can
  never hang — `STOPPED — SDK_LIMIT`.
- The solution turns out to need a protected file, a contract or document change, a
  stored-format change, or edits to the protected test files —
  `STOPPED — SCOPE_CONFLICT`.

## Actions needing separate approval

None planned. This task must not install anything, add any dependency, use the
network, use credentials, spend money, deploy, push, send messages, delete or move
files, or write to any external service. Mock mode costs nothing; with a real model,
a question round is the same kind of paid model call the owner already accepts when
running a real task — no new category of spending. If any listed action turns out to
be needed after all, stop and ask.
