# Task 010 — report

## Result (plain language)

The Fable-only selector problem is fixed, and the dashboard now has one
provider-aware **Model & effort** Draft for the owner to judge.

- The closed card is a compact, truthful summary: active provider, friendly
  model name, exact model id, and resolved thinking effort, followed by one
  neutral price/speed note.
- **Change** opens explicit staged choices for provider, model, and effort.
  Blank search shows all seven accepted Claude rows even when Fable is selected;
  typing in Search narrows that list independently. The old free-text path is
  still available under **Advanced: specific model ID**.
- Effort choices follow the staged model. Automatic is the blank/no-override
  choice; Haiku's automatic-only case is a sentence rather than useless
  buttons; changing to a model that cannot use the staged effort visibly resets
  it before apply.
- **Cancel** makes no IPC or storage change. **Use this setup** applies model and
  effort sequentially, then saves only after both calls succeed.
- Anthropic remains Cairn's only real provider. Its existing localStorage keys,
  custom-id path, blank default, IPC bridge, Claude engine, and environment
  fallbacks remain the real path. The summary now reports the values that the
  engine actually resolved, including environment-provided defaults.
- OpenAI is selectable only when the main process reports actual mock mode. Its
  five rows are plainly labelled local preview data, run only through the
  existing offline MockEngine, and live only in sessionStorage. They never write
  the durable Claude keys. A same-window renderer reload restores the preview to
  both the engine and summary; closing the app clears it. Outside mock mode the
  OpenAI row remains visible but disabled.
- A known OpenAI fixture id cannot be pasted through Anthropic's advanced field:
  it is rejected before IPC or durable storage. This closes a boundary hole
  found during the final skeptical audit.

This is still a **Draft**. It is a judgeable candidate, not the project's final
chooser and not real OpenAI support.

## Files changed

- `app/src/shared/ipc.ts` — adds the read-only `mock` boolean to preflight data.
- `app/src/main/ipc.ts` — returns that boolean from
  `process.env.CAIRN_MOCK === "1"`; no renderer flag or model name can enable it.
- `app/src/renderer/App.tsx` — remembers the preflight result, restores either
  the durable Anthropic setup or a same-window mock preview before the dashboard
  renders, and passes the mock boolean down.
- `app/src/renderer/screens/Dashboard.tsx` — passes the boolean to the existing
  Model & effort card; its placement beside Start a task is unchanged.
- `app/src/renderer/components/modelCatalog.ts` — **new**; the seven accepted
  Claude rows, five explicitly local OpenAI preview rows, capability fixtures,
  friendly labels, and mock-session key names.
- `app/src/renderer/components/ModelEffort.tsx` — replaces the native datalist
  with the compact summary and staged chooser, while preserving Anthropic's
  existing storage and IPC meanings.
- `app/src/renderer/app.css` — styles the summary, provider choices, warning,
  searchable model rows, effort controls, actions, and narrow layout.
- `app/tests/model-effort.spec.ts` — **new**; one isolated Electron regression
  flow with its own temporary user/session profile and three temporary projects.
- `docs/ai-work/tasks/010-brief.md` — the approved brief, unchanged; SHA-256
  `CD03A4E2076D3CDF7D9577D2994EBB65F1969F866189553A18E5DDBCF58448C5`.
- `docs/ai-work/tasks/010-report.md` — this report.

Verified untouched: `app/src/preload.ts`, all package files, everything under
`core/` and `cli/`, every public guide/contract/default/security gate, and all
task-walk behavior. The owner's modified `docs/ai-work/LOG.md` and untracked
`007/008/009-approval.json` files remain present, unstaged, and uncommitted.
Nothing was installed, fetched, pushed, deployed, sent, or run against a real
provider.

## Commands run and their real results

All product checks were offline. Every Electron task run used `CAIRN_MOCK=1`.

1. Orientation and approval check: full status, project memory, recent report,
   and brief were read. `Get-FileHash` returned the SHA-256 above before and
   after the build, so the approved brief did not change.
2. `app/ npm.cmd run typecheck` → **clean**, including the new test. The first
   spelling, `npm run typecheck`, was stopped by Windows' PowerShell script
   policy before npm or the project ran; using `npm.cmd` ran the declared check.
3. `app/ npm.cmd run build:vite` → **all three bundles built** (main, preload,
   renderer). The first sandboxed attempt could not let esbuild inspect required
   parent-path metadata; the approved local rerun used the already-installed
   toolchain, made no network request, and passed. The final build after audit
   fixes also passed.
4. `app/ npx.cmd --no-install playwright test tests/model-effort.spec.ts` →
   **1 passed (7.1 s), 0 failed** on the final code. The test proves:
   - environment-resolved model and effort appear in the active summary;
   - saved Fable plus blank search renders all seven exact Claude ids, while
     `sonnet` narrows the list to two independently of selection;
   - a fixture GPT id is rejected through Anthropic's custom path before IPC or
     storage, and Cancel leaves both storage and the next mock echo on Fable;
   - Anthropic Sonnet/high writes the existing exact durable keys and the mock
     run echoes that exact tuple;
   - the OpenAI warning and all five fixture ids are visible; switching from an
     Ultra-capable model to one without Ultra resets visibly to Automatic;
   - OpenAI apply changes no localStorage byte, writes only the three session
     keys, survives a renderer reload consistently, and its next offline mock
     run echoes the GPT id and effort;
   - a full Electron close/relaunch has no preview session value and returns to
     a seeded durable Anthropic setup;
   - both Electron `userData` and `sessionData` are inside the temporary root,
     setup/launch failures close safely, and final cleanup proves that root is
     gone.
5. `app/ npx.cmd --no-install playwright test` → **9 passed (2.5 m), 0 failed**:
   the final chooser regression plus all existing question, away-state, project,
   and full-loop smoke tests. The repeated `fatal: not a git repository` lines
   are expected stderr from scaffolding disposable Cairn folders with no Git
   repository; they did not fail a test or touch this repository.
6. Manual visual pass: a separate passing isolated run captured and I inspected
   the real Electron window at Cairn's 1100×760 size with the OpenAI chooser
   expanded and again after apply. The active/staged distinction was legible;
   provider → model → effort read in order; the preview warning stood out; all
   rows and effort buttons fit cleanly; and the compact applied summary plainly
   showed both `mock preview` and `your saved Claude setup is untouched`.
7. Final skeptical audit: an independent read-only pass first found five edge
   cases (custom GPT boundary, renderer reload, resolved defaults, custom-id
   visibility/accessibility, and failure cleanup). All were fixed. Its re-audit
   reported all five resolved and no new blocker or high-severity finding.
8. `git diff --check`, the complete allowed-file diff, full `git status`, and a
   forbidden-scope `git diff --exit-code` were inspected → no whitespace error;
   no core, CLI, package, public-document, contract, or protected-work change.

During development, the first sandboxed Electron launch was denied by the local
process boundary, and two early UI assertions were too exact for lines that also
contained a default prefix or preview badge. The approved local reruns exposed
the real DOM text, those selectors were corrected, and the final isolated and
full results above are the results for the final code.

## How the owner can see or try it (offline, $0)

Close any older Cairn window first. In PowerShell, from the repository root:

```powershell
cd app
$env:CAIRN_MOCK = "1"
npm.cmd start
```

Open a project dashboard, then try the five brief steps:

1. If needed, choose Fable and apply it. Open **Change** again with Search blank.
   Success: Fable is selected and all seven Claude rows remain visible.
2. Search `sonnet`, choose a Sonnet and supported effort, then **Use this setup**.
   Start an offline task. Success: the compact summary and activity echo show
   that exact model and effort.
3. Open Change, select the **Mock preview · not connected** OpenAI row, choose
   Sol + Ultra, then Luna. Success: Ultra disappears, Automatic becomes selected,
   and the reset explanation appears before apply.
4. Change several staged values and press **Cancel**. Start another offline task.
   Success: the prior compact summary and mock echo are unchanged.
5. Apply an OpenAI preview, close the entire app, then run `npm.cmd start` again.
   Success: Cairn returns to the saved Anthropic setup; no GPT id replaced either
   durable Claude key.

Failure looks like only Fable being listed, selection filtering Search, Cancel
changing the next run, an unsupported effort remaining selected, a GPT preview
entering durable Claude storage, OpenAI being selectable without mock mode, or
any login/key/network/provider setup appearing.

## What still needs a human check

1. **The Draft judgment:** whether the wording, density, warning, search, row
   descriptions, and staged interaction feel clear enough for a complete
   beginner. Automated checks cannot decide taste.
2. **The real `npm start` close/reopen gesture:** the built `file://` Playwright
   harness reliably proved session clearing but does not reliably flush
   localStorage across process restarts. It therefore reseeded the already-proven
   durable Claude bytes before checking the return view. The real dev app uses a
   persistent localhost origin; step 5 above is the owner's one-minute check.
3. **A later real-Claude confirmation:** this task intentionally made no paid or
   external call. The Anthropic route is the unchanged existing engine/IPC path,
   but only an explicitly authorized future real run can confirm a selected model
   works for the owner's account.

## Limitations and remaining uncertainty

- The five OpenAI rows and their effort capabilities are local preview fixtures,
  not a current provider catalog, compatibility promise, login, or engine.
- No OpenAI SDK, CLI, app server, API, credential, fallback, subprocess, or
  provider discovery exists. A future real provider remains separate
  High-Stakes work.
- The existing behavior that can rebuild a selected engine between steps of an
  open task is unchanged. This Draft is for choosing before a task, exactly as
  approved; locking one tuple for a whole run remains later work.
- The non-mock disabled row and guard are established by the main-process boolean,
  code path, and mock boundary regression. No non-mock app was launched during
  checks because the brief authorized only offline mock checks and no credential
  inspection or real-provider activity.
- Evidence proves the named local checks passed. It cannot prove this Draft feels
  right or that any OpenAI model can run Cairn.

## Milestone movement

YES — the current milestone is a real-model Cairn task completing an improvement
to Cairn itself end to end. This Draft makes the already-real Claude path
practically usable: Fable no longer hides the other six accepted choices, and the
owner can understand the exact model/effort combination before the milestone run.
The OpenAI half contributes only a safe design checkpoint and is not counted as
real provider progress.

Disposition: DONE
