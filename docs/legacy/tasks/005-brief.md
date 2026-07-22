# Task 005 — brief

## Lane: Standard · Mode: Final

**Why Standard (not Tiny):** this touches many areas at once — four written guides, the app's
Settings screen, the CLI, and the core engine's option seam — and it turns a Draft candidate
into the project's documented behaviour while adding one small, owner-specified control
(effort). That is far more than one small, obvious, reversible edit, so it takes the full
loop, not a `Tiny change:`.

**Why not High-Stakes:** it adds **no** dependency, changes **no** stored-data format or
migration, touches **no** security boundary (the per-role tool gates and `canUseTool` policy
in `core/src/agents.ts` stay exactly as they are), spends **no** money by itself, and deploys
nothing. Every code change threads one more optional string through a seam that task 004
already built and the owner already accepted; every doc change is reversible text. The one
thing to name plainly, in beginner words, is **money**: whichever model and effort Cairn is
pointed at is what the paid Anthropic API bills — a bigger model, and a higher effort level,
each make a real run cost more. This task makes no paid call.

**Why Final (not Draft):** the owner already judged task 004's shape and kept it — the work
log records task 004 as `DONE / accept`. The owner has now also named, exactly, in the chat
that defined this task: the model pick-list (all current Claude models, Fable included), the
removal of the "any AI product" neutrality stance, and an effort control shaped like the
accepted model control (a CLI flag and an app Settings choice, default unchanged when nothing
is chosen). The contract requires a Final task to name exactly what was chosen; this brief
does, below. Nothing here is an open design candidate awaiting judgement — it integrates
results the owner has already chosen. (If the owner would rather judge the effort control as
a separate Draft first, say so and this brief will be split; as written, it is one Final task.)

## The result being adopted, named exactly

**Kept from task 004, not rebuilt:**

- **`core/src/agents.ts`** — `resolveModel(explicit)` returns the explicit choice if given,
  else `CAIRN_MODEL`, else the built-in `DEFAULT_MODEL = "claude-opus-4-8"`. Blank or
  whitespace counts as "no choice". This resolver, the default string, and the way the model
  reaches the SDK's `query(...)` options stay exactly as they are.
- **The CLI** — `cairn task --model <id>` (and `--model=<id>`) runs against that model and
  prints `Using model: <id>`; no flag means today's default. Parsing and behaviour unchanged.
- **The app** — Settings has a **Model** field saved in `localStorage["cairn-model"]`,
  applied on open, carried through one IPC call, showing the active model, with a cost note.
  Its persistence, IPC, active-model line, and cost note stay intact.

**Chosen by the owner for this task:**

1. **The model pick-list is all current Claude models**, offered as picks while the field
   still accepts any typed id (see the list below).
2. **The "any AI product" neutrality stance is removed.** Cairn openly builds on Claude:
   its CLI and desktop app run on the Claude Agent SDK, and the docs may name current Claude
   models. The owner's clarified intent: the old neutrality line existed to protect the
   user's freedom of choice — that freedom now lives in the model field itself (type any
   id you want), not in the docs pretending no product exists.
3. **An effort control**, shaped like the accepted model control: `cairn task --effort
   <level>` in the CLI and an **Effort** choice in app Settings, with the model's five named
   levels; nothing chosen means exactly today's behaviour (no effort option sent to the SDK).

## The model pick-list (confirmed by approving this brief)

Every id below is real and current, taken from Anthropic's current model reference (cached
2026-06-24) — none is guessed. The field stays free-text: any id can be typed, blank means
the built-in default, and the current default is shown. The picks, most capable first:

| Pick | What it is | Rough price per 1M tokens (in / out) |
|---|---|---|
| `claude-fable-5` | Anthropic's most capable model. | $10 / $50 |
| `claude-opus-4-8` | **The current default.** Most capable Opus-tier model. | $5 / $25 |
| `claude-opus-4-7` | Previous Opus. | $5 / $25 |
| `claude-opus-4-6` | Older Opus. | $5 / $25 |
| `claude-sonnet-5` | Balanced — near-Opus quality at lower cost. | $3 / $15 |
| `claude-sonnet-4-6` | Previous Sonnet. | $3 / $15 |
| `claude-haiku-4-5` | Fastest and cheapest, for simpler work. | $1 / $5 |

(`claude-mythos-5` is excluded: it is invitation-only and not generally usable.)

The **full list lives in two live surfaces** — the app's Model field (as a suggestions
dropdown) and the CLI help — so there is one place to update when models change. The written
guides name the default and say the field offers the current Claude models and accepts any
model id, without duplicating the whole table. (If the owner wants the full table in the
guides too, say so before approving.)

## The effort control (confirmed by approving this brief)

- **Levels:** `low`, `medium`, `high`, `xhigh`, `max` — the five named levels of the
  installed Claude Agent SDK, whose query options already carry `effort?: 'low' | 'medium' |
  'high' | 'xhigh' | 'max'` right beside the `model` option the engine sets today (verified
  in the installed SDK's type declarations; this is wiring, not a new dependency).
- **CLI:** `cairn task --effort <level>` (and `--effort=<level>`), mirrored on `parseModel`'s
  pattern. A value outside the five levels prints one plain line explaining the valid choices
  and stops before any run — never a half-configured run. The active choice is printed at the
  start of the run alongside the model line.
- **App:** Settings gains an **Effort** choice (the five levels plus "Default") next to the
  Model field, persisted like the other settings, carried through the same minimal IPC
  pattern as the model, with the active choice shown.
- **Default:** nothing chosen — no flag, no setting, blank — means **no effort option is
  sent at all**, so Cairn behaves byte-for-byte as it does today. `CAIRN_EFFORT`, if set in
  the environment, is the middle fallback, mirroring `CAIRN_MODEL`.
- **Mock mode:** the mock engine echoes the chosen effort next to the model echo, so the
  whole control demos offline for $0.
- **Honest limit:** not every model supports every level (for example, smaller models
  support fewer). The SDK downgrades unsupported levels on real runs; the checks here can
  only prove the choice *flows through* — only a real, paid run proves how a given model
  honours a given level.

## Removing the neutrality stance, named exactly

Five places carry the "any AI product" stance today; each is edited as follows. The
**contract is not one of them** — `AGENTS.md` and `CONTRACT-TEMPLATE.md` contain no such
language, so there is **no contract change, no version bump, and no `CHANGELOG.md` entry**.

1. **`MAINTAINERS.md`** (design rule 7) — drop "or ties to a specific language or AI
   product". Keep everything else in the rule: no personal names, private history, product
   code, or external dependencies in public artifacts; the app stays self-contained (no
   CDNs, no network requests, no analytics; user data only in localStorage). Add one plain
   sentence: Cairn builds on Claude — the CLI and app run Claude models, and docs may name
   current Claude model ids.
2. **`docs/ai-work/PROJECT.md`** (Out of scope line) — remove "anything that ties the
   written protocol to a single AI product" from the out-of-scope list. Nothing else in the
   file changes.
3. **`README.md`** (~lines 96–102) — rephrase the "work with any AI" claims: Cairn is built
   on Claude; the written workflow's commands can still be pasted into other file-editing AI
   agents, but Claude Code is the first-class, recommended path.
4. **`GETTING-READY.md`** (the "AI coding agent" section) — recommend Claude Code as the
   agent Cairn is built for, keeping the honest note that the written commands also work in
   similar tools.
5. **`cairn.html`** (the onboarding "1 · An AI coding agent" card) — same change as
   GETTING-READY, in the app's voice. The sentence "Cairn doesn't care which you pick" is
   removed.

The historical `CHANGELOG.md` text is history and is **not** edited.

## The visible outcome

After this task:

1. A beginner reading **`EVERYDAY-WORKFLOW.md`** finds a short note that Cairn's CLI and app
   let you choose the Claude model and effort level, naming the default, with the plain cost
   note that a bigger model — or a higher effort — bills more per real run.
2. **`cairn.html`** carries the same mention and cost note, and its onboarding card now
   recommends Claude Code.
3. **App Settings → Model** offers all current Claude models as picks (Fable included),
   shows the default, still accepts any typed id; **Settings → Effort** offers the five
   levels plus Default.
4. **`cairn help`** names the default model, the picks, and the `--effort` flag;
   `cairn task --mock --model claude-fable-5 --effort low` announces both choices, offline,
   for $0.
5. The docs no longer claim Cairn "doesn't care" which AI you pick — they say plainly that
   it is built on Claude, while the model field keeps the choice in the owner's hands.

## How it moves the current milestone

The milestone is: *a real-model `cairn task` completes an improvement to Cairn itself, end
to end.* This task documents and finalises the controls that run sits behind — but it does
not itself perform a paid run, so the builder should expect to report **Milestone movement:
NO or UNCLEAR** and say so honestly. After it, the milestone run is one owner command away,
with the model and effort both visible and chosen on purpose.

## What may change

Docs and stance:

- **`MAINTAINERS.md`** — rule 7 edit named above.
- **`docs/ai-work/PROJECT.md`** — the out-of-scope line edit named above.
- **`README.md`**, **`GETTING-READY.md`** — the rephrasing named above.
- **`EVERYDAY-WORKFLOW.md`** — a short "choosing the model and effort" note with the cost
  line, happy-path first, no full model table.
- **`cairn.html`** — the onboarding card edit, plus a small note about choosing the model
  and effort (daily deck or another fitting spot), in the app's existing voice and styling.
  If this file is edited, verify its embedded `text/plain` contract block still matches
  `CONTRACT-TEMPLATE.md` byte-for-byte (the contract is not being changed).

Code (mirroring task 004's accepted seam; smallest change that carries one more string):

- **`core/src/agents.ts`** — a pure `resolveEffort(explicit?)` beside `resolveModel`
  (explicit wins; `CAIRN_EFFORT` next; else undefined = send nothing); engines accept an
  optional effort via constructor; `pickEngine(mock, model, effort)` threads it; `SdkEngine`
  passes it into the existing `query(...)` options only when set; `MockEngine` echoes it.
  The `canUseTool` gate, role tool-policies, report lockout, `maxTurns`, and prompts are
  **unchanged**.
- **`cli/src/flows/task.ts`**, **`cli/src/index.ts`** — `parseEffort` beside `parseModel`;
  validate against the five levels with a plain one-line message on anything else; print the
  active effort when chosen; list `--effort` in help; name the default model and the picks
  in help.
- **`app/src/renderer/screens/Settings.tsx`** — a `<datalist>` of the confirmed model picks
  on the existing Model input (default shown, free text kept); an **Effort** choice (five
  levels + Default) persisted in `localStorage`, applied like the model.
- **`app/src/main/tasks.ts`**, **`app/src/preload.ts`**, **`app/src/shared/ipc.ts`** —
  carry the effort choice through, mirroring the model's minimal IPC path.
- **New unit tests** in the existing `core/test/agents.test.ts` and a small CLI test file —
  `resolveEffort` precedence, `parseEffort` (both flag forms, invalid values, blank), and
  the mock echo. If a new CLI test file must be registered, the `cli/package.json` test
  script line may gain that filename — nothing else in any `package.json` changes.
- **Rebuilt output** under `core/dist/**`, `cli/dist/**`, `app/.vite/**` and the synced
  `cli/assets/contract.md` may be regenerated by the build. These are git-ignored and are
  **not** committed.

## What must NOT change

- **Task 004's implementation is kept, not rebuilt.** `resolveModel`, `DEFAULT_MODEL =
  "claude-opus-4-8"` (not edited or replaced), `--model` parsing and output, the app Model
  field's persistence and IPC, and the active-model display stay exactly as they are.
- **No choice still means today's behaviour, byte-for-byte.** No flag, no setting, blank
  fields: same default model, no effort option sent, same output.
- **No dependency change.** Nothing added, removed, upgraded, forked, or patched — the
  effort option already exists in the installed SDK.
- **The security gates stay identical.** The `canUseTool` policy, per-role tool allow/deny
  lists, the reviewer's report lockout, and the hash-locked approval gate are untouched.
- **The loop is unchanged.** Define → Build → Verify → Decide, its order, its prompts, and
  the mechanical Direction Gate all behave exactly as today.
- **The contract is unchanged.** `CONTRACT-TEMPLATE.md` and `AGENTS.md` are not touched: no
  version bump, no `CHANGELOG.md` entry, and `cairn.html`'s embedded contract block must
  still match the template byte-for-byte.
- **No invented model ids.** Only the seven ids named in this brief (plus the existing
  default) may be written anywhere.
- **No log writes during the build.** `docs/ai-work/LOG.md` and `docs/ai-work/PILOT.md` are
  written only at the **Decide** step, never by the build.
- **No file deleted, moved, or renamed**, and nothing changed outside the files declared
  above and this task's own `docs/ai-work/tasks/005-*` files.

## Modified or untracked work that stays untouched

At the time this brief is written, `git status` reports a **clean working tree** on `main`.
The builder must re-run `git status` at the start of the build and treat whatever it finds
modified or untracked as protected: not cleaned, reset, stashed, overwritten, moved,
deleted, or broadly staged. Staging is by explicit filename only, never `git add -A`.

## What the owner will personally see or try (offline, $0)

1. **The guides:** `EVERYDAY-WORKFLOW.md` and `cairn.html` carry the model-and-effort note
   with the cost line; `README.md`, `GETTING-READY.md`, and the `cairn.html` onboarding card
   now say Cairn is built on Claude; `MAINTAINERS.md` rule 7 and `PROJECT.md` no longer
   forbid naming it.
2. **The app, offline:** in `app/`, set `CAIRN_MOCK=1` and `npm start`; open Settings. The
   Model field's dropdown offers the seven picks with the default shown; the Effort choice
   offers the five levels plus Default; choices persist across close/reopen; clearing
   returns to defaults; typing a custom model id still works.
3. **The CLI, offline:** `cairn help` names the default, the picks, and `--effort`;
   `cairn task --mock --model claude-fable-5 --effort low` announces both; `cairn task
   --mock --effort silly` prints one plain line naming the five valid levels and stops;
   `cairn task --mock` behaves exactly as today.
4. **A real, paid run stays yours to make.** Only your own `cairn task --model <id>
   --effort <level>` proves a live combination works, and it bills the paid API. Fable is
   the priciest pick, higher effort spends more thinking tokens per run, and Fable also
   requires the Anthropic account to allow standard (30-day) data retention.

## The checks the AI will run

All checks are **offline** — none calls a real model or spends money:

- `npm test` at the root and in `core/` and `cli/`, including the new `resolveEffort` /
  `parseEffort` / mock-echo tests, with every existing test still green.
- `npm run typecheck` and `npm run build`/`build:vite` where they exist (root, `core/`,
  `cli/`, `app/`) compile with no errors.
- The app Playwright smoke test (`app/tests/smoke.spec.ts`) still passes end to end.
- A byte-for-byte check that `cairn.html`'s embedded `text/plain` contract block still
  equals `CONTRACT-TEMPLATE.md`.
- A recorded before/after in the report, from real command output (not memory): the guide
  notes, the onboarding-card change, the Settings picks and Effort choice, the CLI help
  line, the mock run announcing model and effort, and the invalid-effort message.

**What these checks can and cannot prove:** they prove the docs changed as named, the picks
and effort control are present, a chosen model and effort flow through Cairn's own code to
the point they are handed to the SDK, and the default path is unchanged. They do **not**
prove any real model id is valid, how a model honours an effort level, or that a live paid
run succeeds — only the owner's optional real run can show that.

## What DONE requires

All of these must hold, verified against real command output (not memory):

1. The five neutrality edits are made exactly as named; no other doc meaning changes.
2. `EVERYDAY-WORKFLOW.md` and `cairn.html` each carry the model-and-effort note with the
   plain cost line.
3. The app Model field offers exactly the seven confirmed picks, shows the default, and
   still accepts any typed id; the Effort choice offers the five levels plus Default; both
   persist and both reach a task run; task 004's behaviour is otherwise intact.
4. The CLI: help names the default, the picks, and `--effort`; `--model` behaves exactly as
   before; `--effort` accepts only the five levels and fails plainly otherwise; chosen
   values are printed at run start and echoed in mock mode.
5. With nothing chosen, behaviour is byte-for-byte today's: same default model, no effort
   sent, same output.
6. No dependency changed; contract, `AGENTS.md`, and `CHANGELOG.md` untouched;
   `cairn.html`'s embedded contract block still matches the template; nothing outside the
   declared files changed; modified/untracked work untouched.
7. All declared checks (tests, typecheck, build, smoke, contract-block match) are green.

## What forces STOPPED

- **`EFFORT_UNWIRABLE`** — the effort option cannot be threaded from flag/setting to the
  SDK's query options without changing the tool gates, the loop order, or a dependency.
- **`APP_SCOPE_BALLOONS`** — the app's effort choice turns out to need more than a Settings
  control plus carrying one string through IPC (new screens, view-machine changes, or a
  stored-data migration). Stop rather than widen; the finished parts stand, and the report
  says exactly what remains.
- **`CONTRACT_SYNC_BREAKS`** — a `cairn.html` edit would leave its embedded contract block
  no longer matching `CONTRACT-TEMPLATE.md`, and it cannot be reconciled inside this
  brief's boundary.
- **`BUILD_OR_TESTS_FAIL`** — the build, typecheck, tests, or smoke test cannot be made
  green within this brief's boundary.

A STOPPED task gets no success commit; the state is preserved exactly and reported with its
stable blocker name.

## Actions that need separate approval

**None are taken in this task.** It installs nothing, uses no network, needs no credentials,
moves no money, deploys nothing, sends no messages, and deletes or moves no files. It makes
**no real (paid) model call** — every check runs offline. If the builder finds that
finishing the work would require any of those actions, it must **stop and ask first**.

> Plain-language note on cost, not an approval gate: these controls let the owner point
> Cairn at any model at any effort. A real run bills the chosen model at its own price —
> from `claude-haiku-4-5` (cheapest) up to `claude-fable-5` (priciest) — and a higher
> effort level spends more tokens on thinking, so it costs more per run too. Running tasks
> already spends money today; this task only makes both dials visible and easy to set.
