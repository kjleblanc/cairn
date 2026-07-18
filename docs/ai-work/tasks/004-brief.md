# Task 004 — brief

## Lane: Standard · Mode: Draft

**Why Standard (not Tiny):** today the model is fixed by a single line in the engine —
`const MODEL = process.env.CAIRN_MODEL || "claude-opus-4-8";` in `core/src/agents.ts`,
read once when the file loads. "Being able to select the model" means threading a
choice from a place a person can set it (the CLI, the app) all the way down into that
engine, and it touches three packages at once — `core` (the engine), `cli` (a run
flag), and `app` (a settings field wired through IPC). More than one area, a new
capability, and a real seam to add: that is squarely Standard, not a one-line reversible
tweak.

**Why not High-Stakes:** this adds **no** dependency, changes **no** stored-data format
or migration, and does **not** touch a security boundary — the per-role tool gates and
the `canUseTool` policy in `agents.ts` stay exactly as they are. It is additive and
opt-in: when nobody selects a model, Cairn behaves byte-for-byte as it does today. The
one thing to say plainly, in beginner words, is **money**: whichever model you point
Cairn at is the one the paid Anthropic API is billed for, and different models cost
different amounts per run. This task does not spend money by itself and needs no new
approval to spend it — running any `cairn task` already calls the paid API today — but
the owner should know that picking a bigger model makes each real run cost more.

**Why Draft (not Final):** the owner asked for the *capability*, not for a specific
shape. There are genuinely different designs — a CLI flag only, an app Settings field, a
per-project saved default, a fixed pick-list of models, or a free-text identifier — and
the right pick-list depends on which model names are currently valid, which is the
owner's call. So this task builds one small, working candidate of "select the model"
for the owner to judge. It deliberately keeps today's model as the untouched default, so
the candidate can be judged and thrown away or kept without having changed how Cairn
already runs. If the owner likes the shape, a later **Final** task names the exact
surfaces and the exact model list, wires it into the written guides, and makes it Cairn's
documented behaviour. This Draft does none of that documentation work.

## The visible outcome

Right now there is no way to choose the model from inside Cairn. The only lever is an
environment variable (`CAIRN_MODEL`) that has to be set in the shell *before* launch,
and nothing on screen ever tells you which model is running.

After this task, the owner can **pick the model in two ordinary places** and **see which
model is in use**, without editing code or setting an environment variable:

1. **In the CLI:** `cairn task --model <model-id>` runs the loop against that model, and
   the run prints one plain line naming the model in use (for example, `Using model:
   <model-id>`). Run `cairn task` with no flag and everything behaves exactly as it does
   today — same default model, same output.
2. **In the app:** Settings gains a small **Model** field. Whatever the owner sets there
   is remembered (like the existing Theme and Sound settings) and used for the next task
   run, and the active model is shown. Leave it untouched and the app behaves exactly as
   today.

Because this is a **Draft**, "no selection" always falls back to the current default, so
the candidate never quietly becomes Cairn's new default model.

## How it moves the current milestone

The milestone is: *a real-model `cairn task` completes an improvement to Cairn itself,
end to end.* To do that end-to-end run, the maintainers need to aim the loop at the
exact real model they intend to use — and to see, on screen, that it is the one running.
This task removes the "you can't choose or even see the model" blocker sitting in front
of that milestone. On its own it is plumbing, not a visible product feature for a
beginner, so the builder should expect to report **Milestone movement: NO or UNCLEAR**
and say so honestly; its value is that it clears the path for the milestone run.

## What may change

- **`core/src/agents.ts`** — introduce a small, testable seam so the model is no longer
  a frozen module-load constant:
  - a pure resolver (for example `resolveModel(explicit?: string): string`) that returns
    the explicitly chosen model when one is given, otherwise `process.env.CAIRN_MODEL`,
    otherwise the existing built-in default string **kept exactly as it is today**;
  - a way to hand `SdkEngine` a chosen model (e.g. via its constructor and/or
    `pickEngine`), so a selection made in the CLI or app reaches the `model:` option
    passed to `query(...)`. The `canUseTool` gate, the role tool-policies, the report
    lockout, the `maxTurns`, and the prompts in this file are **unchanged**.
- **`cli/src/index.ts` and/or `cli/src/flows/task.ts`** — parse an optional
  `--model <id>` (and/or `--model=<id>`) flag, thread it into `pickEngine`/the engine,
  and print the active model once at the start of the run. List the flag in the `help`
  output. No change to the order or behaviour of the Define → Build → Verify → Decide
  loop.
- **`core/src/agents.ts` and/or the mock path** — make the **active model visible in
  mock mode** (echo it in the mock engine's status text) so the owner and the tests can
  confirm a selection flows through **without any paid model call**.
- **`app/src/renderer/screens/Settings.tsx`** — add a small **Model** field that reads
  and writes a value in `localStorage` (matching the existing theme/sound pattern).
- **`app/src/main/tasks.ts`** (and, only if strictly needed, `app/src/main/preload`,
  `app/src/shared/ipc.ts`) — pass the owner's chosen model from the renderer into the
  engine used for a run, so a task run uses the selected model. Keep the change to the
  minimum needed to carry one string through.
- **New unit tests** — a `core` test for `resolveModel` (explicit wins; env is the next
  fallback; the built-in default is last; the default string is unchanged) and a `cli`
  test that `--model <id>` is parsed and carried through. The existing app Playwright
  smoke test must stay green.
- **Rebuilt output** under `core/dist/**`, `cli/dist/**`, `app/.vite/**` and the
  synced `cli/assets/contract.md` may be regenerated by the build. These are
  git-ignored artefacts and are **not** committed.

## What must NOT change

- **No dependency change.** Nothing added, removed, upgraded, forked, or patched.
- **The security gates stay identical.** The `canUseTool` policy, per-role tool
  allow/deny lists, the reviewer's report lockout, and the hash-locked approval gate in
  `core/src/gates.ts` and `core/src/agents.ts` are untouched. This task moves *which
  model runs*, never *what a role is allowed to do*.
- **The loop is unchanged.** Define → Build → Verify → Decide, its order, its prompts,
  and the mechanical Direction Gate all behave exactly as today.
- **The default is preserved.** With no `--model` flag and no app Model setting, the
  resolved model is exactly what it is today (`CAIRN_MODEL` if set, else the current
  built-in default string, kept verbatim). The current default string is **not** edited,
  "corrected", or replaced by this task.
- **No invented model identifiers.** The builder cannot reach the network here, so it
  must not guess at or hardcode model names it cannot verify. Any preset offered must be
  only the existing default (or an id already present in the codebase / SDK types);
  otherwise the field accepts a model id the owner types, with the current default shown.
- **No documentation or contract change.** `AGENTS.md`, `MAINTAINERS.md`, the public
  guides, `cairn.html`, and its embedded copies are **not** touched — documenting this
  feature is Final work, out of scope for this Draft.
- **No log writes during the build.** `docs/ai-work/LOG.md` and `docs/ai-work/PILOT.md`
  are written only at the **Decide** step, never by the build.
- **No file deleted, moved, or renamed**, and nothing changed outside `core/`, `cli/`,
  `app/`, and this task's own `docs/ai-work/tasks/004-*` files.

## Modified or untracked work that stays untouched

At the time this brief is written, `git status` reports a **clean working tree** on
`main`, 23 commits ahead of `origin/main`. There is no uncommitted work to protect right
now — but the builder must re-run `git status` at the start of the build and treat
whatever it finds modified or untracked as protected: it must not be cleaned, reset,
stashed, overwritten, moved, deleted, or broadly staged. Staging is by explicit filename
only, never `git add -A`.

## What the owner will personally see or try

1. **Offline, no money spent (the main demo):** with the mock engine, set a model and
   watch it appear. For example, run the CLI in mock mode with a made-up id
   (`cairn task --mock --model demo-model-x`) and see the run announce that model and
   echo it in its status; run `cairn task --mock` with no flag and see the normal
   default. Because `--mock` makes no AI call, this proves selection works for **$0**.
2. **In the app (offline):** open Settings, set the **Model** field, and confirm the
   value is remembered after closing Settings; the active model is shown, and clearing
   the field returns to today's default behaviour. (With `CAIRN_MOCK=1` this needs no
   paid call.)
3. **Real run (optional, owner-run, costs money):** when the owner chooses, a real
   `cairn task --model <real-model-id>` uses that model end to end. This is the owner's
   own paid check — the builder does **not** perform it. The report will say plainly
   that the automated checks never call a real model.

The report will give exact copy-paste steps for the offline demos, and will describe
what success and failure look like in plain words.

## The checks the AI will run

All checks are **offline** — none calls a real model or spends money:

- `npm test` at the root and in `core/` and `cli/`, including the new `resolveModel` and
  `--model` tests, with every existing test still green.
- The app Playwright smoke test (`app/tests/smoke.spec.ts`) still passes end to end.
- `npm run typecheck` and `npm run build` where they exist (root, `core/`, `cli/`,
  `app/`) compile with no errors.
- A recorded before/after in the report: `resolveModel()` with nothing set returns the
  current default; `resolveModel("some-id")` returns `some-id`; and a `--mock` run shows
  the chosen id being carried through — shown as real command output, not from memory.

**What these checks can and cannot prove:** they prove a selected model *flows through*
Cairn's own code to the point where it is handed to the SDK, and that the default is
unchanged when nothing is selected. They do **not** prove that any particular real model
id is valid or that a live paid run succeeds — only the owner's optional real run can
show that. The report must state this limit plainly.

## What DONE requires

All of these must hold, verified against real command output (not memory):

1. `resolveModel` returns the explicit model when given, else `CAIRN_MODEL`, else the
   existing built-in default string **unchanged** — proven by unit tests.
2. `cairn task --model <id>` carries `<id>` into the engine and prints the active model;
   `cairn task` with no flag behaves exactly as today (same default, same output).
3. The app Settings **Model** field persists in `localStorage`, is passed into task
   runs, and shows the active model; an empty field means today's default behaviour; the
   Playwright smoke test stays green.
4. Selection is visible in **mock mode**, so the whole feature can be demonstrated with
   no paid model call.
5. The tool gates, role policies, loop order, prompts, and the approval/reviewer/
   Direction-Gate machinery are unchanged; no dependency changed; no docs/contract
   changed; nothing outside the declared files changed, and any modified/untracked work
   is untouched.
6. All declared checks (tests, typecheck, build, smoke) are green.

## What forces STOPPED

- **`SELECTION_UNWIRABLE`** — the chosen model cannot be threaded from a CLI flag / app
  setting down to the engine's `model:` option without changing the tool gates, the loop
  order, or a dependency.
- **`APP_SCOPE_BALLOONS`** — wiring the app's model choice cleanly turns out to need more
  than a Settings field plus passing one string through IPC (new screens, view-machine
  changes, or a stored-data migration). Stop rather than widen; the CLI-plus-core part
  can still stand as the judgeable candidate, and the report says exactly what the app
  needs.
- **`BUILD_OR_TESTS_FAIL`** — the build, typecheck, or test suites cannot be made green
  within this brief's boundary.

A STOPPED task gets no success commit; the state is preserved exactly and reported with
its stable blocker name.

## Actions that need separate approval

**None are taken in this task.** It installs nothing, uses no network, needs no
credentials, moves no money, deploys nothing, sends no messages, and deletes or moves no
files. It does **not** make a real (paid) model call — every check runs offline via the
mock engine and pure functions. If the builder finds that finishing the work would
require any of those actions, it must **stop and ask first** rather than proceed.

> Plain-language note on cost, not an approval gate: this feature lets the owner point
> Cairn at any model. When the owner later does a real run, that run bills the chosen
> model at its own price. Choosing a larger model costs more per run. Running tasks
> already spends money today; this task only lets you choose which model that spend
> goes to.
