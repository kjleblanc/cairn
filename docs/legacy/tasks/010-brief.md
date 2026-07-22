# Task 010 — brief

## Lane: Standard · Mode: Draft

**Why Standard:** this is one visible desktop-app feature, but it spans the saved
model controls, a new provider-aware chooser state, mock-mode isolation, styling,
and an end-to-end regression test. That is more than one small local edit. It adds
no dependency, login, real provider, public interface, or live external effect, so
it does not cross into High-Stakes work.

**Why Draft:** the owner chose the direction — a provider-aware model-and-effort
chooser — but has not yet judged its exact layout or interaction. This task builds
one safe candidate to try. It must not document the candidate as Cairn's final
design and must not turn the OpenAI preview into a real provider. A later Final
task may adopt the exact UI the owner keeps; real OpenAI/Codex execution remains a
separate High-Stakes task.

## Visible outcome

Today the Model field is a text input backed by a browser `datalist`. The source
contains seven Claude choices, but the browser filters suggestions using the
field's saved value. When `claude-fable-5` is selected, opening the suggestions can
therefore look as if Fable is the only choice.

After this task, the project dashboard has one compact **Model & effort** summary
with a **Change** button. Change opens an inline chooser with staged choices and
explicit **Cancel** / **Use this setup** actions:

1. **Provider**
   - `Anthropic (Claude Code)` is the real, existing provider.
   - In `CAIRN_MOCK=1` only, `OpenAI (Codex / ChatGPT account)` can be selected as a
     plainly labelled **mock preview — not connected**.
   - Outside mock mode, the OpenAI row remains visible for context, but it is
     disabled and says that no OpenAI provider is connected in this Draft.
2. **Model**
   - A blank search shows every model in the selected provider's catalog regardless
     of the currently selected model. Searching narrows that explicit list; the
     selected value never acts as the search filter.
   - Model rows lead with a beginner-friendly name and one short description, with
     the exact model id shown quietly underneath.
   - The Anthropic list contains all seven already accepted Cairn picks:
     `claude-fable-5`, `claude-opus-4-8`, `claude-opus-4-7`,
     `claude-opus-4-6`, `claude-sonnet-5`, `claude-sonnet-4-6`, and
     `claude-haiku-4-5`.
   - The OpenAI side uses a clearly local mock fixture large enough to judge the
     design: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, and
     `gpt-5.3-codex-spark`. These are preview data, not a documented promise or a
     hardcoded future live catalog.
   - The current free-text ability is preserved under an **Advanced: specific model
     ID** disclosure. A custom Anthropic id behaves as it does today. A custom
     OpenAI id is mock-session-only.
3. **Thinking effort**
   - `Automatic — the model decides` is always first and means Cairn sends no
     effort override, exactly like today's blank/default choice.
   - Only effort levels supported by the staged model are shown. The local fixture
     may use `low`, `medium`, `high`, `xhigh`, `max`, and, for the OpenAI preview
     models that advertise it, `ultra`.
   - A model with no selectable effort shows one plain sentence instead of useless
     buttons: `This model manages thinking effort automatically.`
   - If a model change makes the staged effort invalid, the chooser resets the
     staged value to Automatic and explains that reset before anything is applied.
4. **Apply and cancel**
   - Changes remain staged until **Use this setup**. **Cancel** leaves the active
     setup, storage, and engine untouched.
   - Applying Anthropic uses the existing `cairn-model` / `cairn-effort`
     localStorage keys and the existing `taskSetModel` / `taskSetEffort` bridge.
     Blank/Automatic keeps today's default (`claude-opus-4-8`) and no-effort rule.
   - Applying OpenAI is allowed only while the app is actually in mock mode. It may
     hand the preview id and effort to the existing provider-neutral MockEngine so
     an offline task echoes them, but it must not add an OpenAI engine or make any
     external call.
   - The OpenAI preview selection is kept only in `sessionStorage` for that mock app
     window. It must never overwrite `cairn-model` or `cairn-effort`, survive an app
     restart, or be available to a non-mock run.

The compact summary always states the active provider, friendly model name, exact
id, and effort. The cost note becomes provider-neutral: `Price and speed depend on
the model. More thinking effort can take longer and cost more.`

## The strict mock boundary

This task previews provider-aware selection; it does **not** add provider support.
The renderer learns whether `CAIRN_MOCK=1` from a boolean returned by the existing
preflight IPC. OpenAI preview data is selectable only when that boolean is true.
No renderer-supplied flag may turn mock mode on, and no model-name prefix may be
used to infer or route a provider.

The existing real engine remains Claude-only. `core/src/agents.ts`, its
`SdkEngine`, `pickEngine`, tool gates, prompts, and approval/reviewer protections
are unchanged. In a non-mock app, the only setup that can be applied is Anthropic.
There is no OpenAI package, API call, subprocess, login check, key field, fallback,
or hidden activation path.

The existing behavior whereby the app can rebuild its chosen engine between steps
of an open Cairn task is also out of scope. This Draft is judged by choosing before
starting one offline mock task. Locking one provider/model/effort tuple for an
entire task belongs in the later provider-engine High-Stakes work; this task must
not widen into that refactor.

## How this moves the current milestone

The milestone is: *a real-model `cairn task` completes an improvement to Cairn
itself, end to end.* This candidate removes a concrete obstacle in front of that
run: the owner can actually see the complete Claude pick-list and understand the
model/effort combination before starting. The OpenAI half is deliberately only a
mock preview, so this task does not prove or activate a second real-model path. The
report must distinguish the visible chooser improvement from that remaining work
and record milestone movement as `YES` only if the completed, judgeable Claude
selector is real progress; otherwise `UNCLEAR`.

## What may change

Only these files or narrowly described additions may change:

- `app/src/shared/ipc.ts` — add a read-only `mock` boolean to `Preflight`; no new
  provider or task-execution IPC.
- `app/src/main/ipc.ts` — return that boolean from the existing preflight check,
  derived only from `process.env.CAIRN_MOCK === "1"`.
- `app/src/renderer/App.tsx` — remember the preflight mock boolean and pass it to
  the dashboard; no task-walk or engine changes.
- `app/src/renderer/screens/Dashboard.tsx` — pass the boolean into the existing
  Model & effort component; placement beside Start a task stays unchanged.
- `app/src/renderer/components/ModelEffort.tsx` — replace the native datalist
  interaction with the compact summary and staged chooser described above while
  preserving the existing Anthropic apply path.
- Up to **two** new small files under `app/src/renderer/components/` — only if
  useful to separate the chooser UI from its local model/capability fixture. No
  new package or generated code.
- `app/src/renderer/app.css` — only the styles needed for the summary, expanded
  chooser, model rows, disabled preview state, and responsive layout.
- `app/tests/model-effort.spec.ts` — one new Playwright regression file using a
  temporary Electron profile and mock mode.
- `docs/ai-work/tasks/010-report.md` — the build report.

Ignored build output under `app/.vite/**` may be regenerated by declared checks
but is not committed.

## What must not change

- **No real OpenAI provider.** No OpenAI/Codex SDK or CLI invocation, app-server,
  API endpoint, key, login, credential read, provider discovery, or model call.
- **No dependency or package-file change.** No `package.json`, lockfile, install,
  upgrade, patch, or copied external code.
- **No core or CLI change.** Everything under `core/` and `cli/` remains untouched,
  including the default model, effort resolver, MockEngine, SdkEngine, gates,
  prompts, and CLI help.
- **No real-provider behavior change.** Outside mock mode, a GPT/OpenAI preview id
  cannot be applied, persisted, sent through IPC as an active model, or silently
  translated/fallen back to Claude. Existing Anthropic custom ids, blank default,
  and effort application still work.
- **No stored-data migration.** Existing `cairn-model` and `cairn-effort` meanings
  stay unchanged. OpenAI preview state is mock-window `sessionStorage` only; no new
  durable project or app data format.
- **No provider catalog claim.** The five OpenAI fixture rows are not copied into
  guides, CLI help, defaults, or public product claims. No runtime network lookup is
  added. Dynamic, account-aware catalogs belong to later provider work.
- **No task-configuration refactor.** Do not add run snapshots, provider factories,
  provider registries, or cross-provider tool-policy code in this Draft.
- **No workflow or public-document change.** `AGENTS.md`, `MAINTAINERS.md`,
  `CONTRACT-TEMPLATE.md`, `README.md`, `GETTING-READY.md`,
  `EVERYDAY-WORKFLOW.md`, `HIGH-STAKES.md`, `cairn.html`, and `CHANGELOG.md` remain
  untouched.
- **No file deletion, move, or rename.** No push, deployment, message, external
  write, paid call, or broad staging.

## Modified or untracked work that stays untouched

At definition time the branch is `main`, five commits ahead of `origin/main`, with:

- modified `docs/ai-work/LOG.md`;
- untracked `docs/ai-work/tasks/007-approval.json`;
- untracked `docs/ai-work/tasks/008-approval.json`;
- untracked `docs/ai-work/tasks/009-approval.json`.

These are protected owner/project history. The builder must not clean, reset,
stash, overwrite, delete, move, stage, or commit them. It must re-run full Git
status before building and stage only task 010's explicitly named files if the
task reaches a safe success commit.

## What the owner will personally see or try

Everything is offline and costs $0. Close any older Cairn window, then from `app/`
run `set CAIRN_MOCK=1` followed by `npm start` and open a project dashboard.

1. With Fable selected, click **Change**. Success: all seven Claude rows are still
   visible when search is blank; Fable is selected but is not the only suggestion.
2. Search for `sonnet`, select a Sonnet model, choose a supported effort, and use
   the setup. Success: the compact summary updates and an offline mock task echoes
   the chosen model and effort.
3. Open Change again, switch to the labelled OpenAI mock preview, inspect its model
   list, and move between models with different effort ranges. Success: the effort
   choices update to match; unsupported choices never remain selected.
4. Press Cancel after changing staged values. Success: the compact summary and the
   next mock run still use the previously active setup.
5. Apply an OpenAI preview in mock mode, close the app, then reopen. Success: the
   preview did not replace the durable Claude selection; Cairn returns to the saved
   Anthropic setup.

Failure looks like: only Fable remains visible; model selection itself filters the
list; raw ids are the only explanation; Cancel changes the engine; an invalid effort
remains selected; an OpenAI preview leaks into `cairn-model` / `cairn-effort`; or any
real provider/network setup appears.

The owner is judging the layout, wording, density, search, and effort interaction.
Automated checks cannot decide whether the chooser feels clear enough for a
beginner.

## Checks the AI will run

All checks are offline, in mock mode, with no real model call:

1. `app/ npm run typecheck` — no TypeScript errors.
2. `app/ npm run build:vite` — main, preload, and renderer bundles build.
3. `app/ npx playwright test` — every existing app test plus the new regression
   spec passes.
4. The new `model-effort.spec.ts` uses its own temporary project and Electron user
   profile, then proves:
   - saved Fable plus a blank search still renders all seven Claude options;
   - search is independent from selection;
   - staged Cancel makes no IPC/storage-visible change;
   - applying Anthropic retains the existing durable keys and the mock run echoes
     its model/effort;
   - OpenAI is visibly labelled mock-only, its fixture models change the available
     effort levels, and a mock run can echo the preview id without a real call;
   - applying an OpenAI preview leaves durable `cairn-model` and `cairn-effort`
     byte-for-byte as they were before the preview;
   - the temporary profile and project are removed or restored by the test, leaving
     the owner's Cairn data untouched.
5. Inspect the actual `git diff` and full `git status`: only allowed task files
   changed, package files/core/CLI/public docs are untouched, and all protected
   starting work is still present and unmodified.
6. One manual mock-app pass through the five owner steps above, reported honestly
   as a visual/interaction observation rather than automated proof.

These checks prove the local candidate behaves as named and that the OpenAI rows are
confined to an offline mock session. They cannot prove the design feels good, that
the fixture is a complete future provider catalog, or that any OpenAI model can run
Cairn. No live-provider claim may be made in the report.

## What DONE requires

All of the following must hold:

1. The Fable regression is fixed: all seven existing Claude choices remain
   discoverable with Fable selected.
2. The compact summary and staged provider/model/effort chooser match the visible
   outcome, use beginner-first language, and preserve the advanced custom-id path.
3. Effort choices are model-specific; Automatic is always available; invalid staged
   effort is visibly reset before apply.
4. Anthropic's existing real selection/default/storage/IPC behavior remains intact.
5. OpenAI is selectable only in actual mock mode, clearly says it is not connected,
   uses no external provider, and cannot persist into or reach a real run.
6. No dependency, core, CLI, public guide, contract, default, security gate, or task
   workflow changes; protected starting work is untouched.
7. Every declared check passes, the owner has exact try-it steps, and the report
   states the Draft's limits without implying real OpenAI support.

## What forces STOPPED

- **`MOCK_BOUNDARY_LEAK`** — an OpenAI preview value can enter durable Claude keys,
  survive restart, appear in non-mock active state, or require any real provider,
  network, credential, or engine change. Stop rather than weaken the boundary.
- **`CHOOSER_REGRESSION`** — the candidate cannot preserve current Anthropic
  custom/default/apply behavior while fixing the Fable list inside the allowed
  files.
- **`CHECK_FAILED`** — typecheck, build, the full Playwright suite, isolation test,
  or final diff/status inspection fails and cannot be corrected inside this brief.
- **`SCOPE_CONFLICT`** — a required solution needs core, CLI, dependencies, a stored
  migration, task-run locking, or any file not allowed above.

A STOPPED task gets no success commit. The state is preserved exactly and the
report names the stable blocker.

## Actions that need separate approval

**None are planned or authorized.** This task must not install anything, access the
network, use or inspect credentials, make a real or paid model call, spend money,
deploy, push, send messages, delete or move files, or write to an external service.
All provider data is local fixture data and every run/check uses `CAIRN_MOCK=1`.

If completion would require any such action, or anything beyond the allowed files,
the builder must stop and ask rather than proceed.
