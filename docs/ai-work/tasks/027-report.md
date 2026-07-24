# Task 027 — Report

What changed:

- **Contract, mirrored (MAINTAINERS' six-step procedure).**
  `CONTRACT-TEMPLATE.md`: bumped the "What this is" version line to v0.1.0
  and inserted a new `## The connected conductor` section immediately after
  `## Secrets and provider access`, body verbatim from the spec's amendment
  paragraph (bold lead-in dropped, reflowed to the file's ~79-column prose
  width). `AGENTS.md`: identical insertion and version bump; its project
  facts block (name/what/who/milestone) is untouched — a diff of the two
  files now differs only in that block. `cairn.html`: the same insertion
  applied by hand inside the `id="src-contract"` embed script, plus the
  eyebrow line (`Cairn Contract v0.0.5` → `v0.1.0`) and the embed's own
  "What this is" version line. Verified byte-for-byte (EOL-normalized)
  equality of the embed against `CONTRACT-TEMPLATE.md` directly, matching
  what `core/test/contract-mirrors.test.mjs` also checks.
- **Version 0.0.5 → 0.1.0 everywhere declared.** `CONTRACT-TEMPLATE.md`
  line 3, `AGENTS.md` line 3, `cairn.html` (eyebrow + embed),
  `core/package.json`, `cli/package.json`, `app/package.json`. Ran `npm
  install` at the repo root and in `app/`, which refreshed
  `package-lock.json` and `app/package-lock.json` (version fields only —
  minimal diffs, confirmed with `git diff --stat`). Hand-edited
  `cli/package-lock.json`'s two version fields (lines 3 and 9), the same
  pattern prior version bumps used, since that lockfile can't be
  regenerated from this repo layout.
- **`CHANGELOG.md`**: new top entry `## 0.1.0 — the connected conductor —
  2026-07-23` — what the conductor is (reads real records, talks with the
  owner, proposes one task; chat is now the home view for a governed
  project), what it cannot do (no file contents, no tools, no dispatch of
  its own — the owner still presses the existing dispatch button), the
  standing-consent boundary (one revocable connect authorization; every
  dispatch, paid worker call, and concrete-risk action still confirms per
  action; a raised risk rides the task card as a chip), the key handling
  (Electron `safeStorage`, main-process only, never seen by the renderer or
  logs), and the offline fake-body Playwright suite that proves the loop
  without a real provider. Closes with "Added no dependency" per the
  existing convention (the conductor uses the platform's built-in `fetch`
  and Electron's existing `safeStorage`).
- **Rebuilt core** (`npm run build --workspace core`), regenerating
  `core/assets/contract.md` (gitignored, not a tracked path) from the
  amended template.
- **Removed the `CAIRN_CONDUCTOR` gate entirely.**
  `app/src/shared/ipc.ts`: dropped `conductor: boolean` from the
  `Preflight` type. `app/src/main/ipc.ts`: `preflight()` no longer reads
  `process.env.CAIRN_CONDUCTOR`; reworded the comment above
  `registerConductorIpc` (the channels were always registered
  unconditionally — only the doc comment referenced the retired flag).
  `app/src/renderer/screens/Dashboard.tsx`: dropped the `conductorEnabled`
  prop; the "Talk with Cairn" pill now always renders next to "Start a
  task". `app/src/renderer/App.tsx`: dropped the `conductorEnabled` state
  and its `setConductorEnabled(preflight.conductor)` call.
- **Chat becomes home.** In `App.tsx`, `boot()`'s two success paths
  (`CAIRN_OPEN`/autoOpen, and reopening the most-recently-used project) now
  land on `{ name: "chat", dir }` instead of `{ name: "dashboard", ... }`;
  failure handling on each path is unchanged (autoOpen failure shows the
  error overlay, a stale last-recent entry falls back to the picker with
  its existing plain note). `openProject` itself — used by the folder
  picker, the picker's "open" action, the dashboard's in-place project
  switcher, `TaskRun`'s and `Chat`'s own back controls, and `Settings`'
  back control — is unchanged and still lands on the dashboard, so the
  existing "← Project home" pill in `Chat.tsx` continues to be the one
  click back to the dashboard the brief asked for; `Chat.tsx` itself
  needed no code change; it already shows the connect card when
  unconnected.
- **Playwright specs updated for boot-to-chat** (all in `app/tests/`):
  `smoke.spec.ts`, `serial.spec.ts`, `away.spec.ts`, `routing.spec.ts` (all
  five boot sites: four `Start a task` waits plus the `retained task
  evidence` assertion), and `projects.spec.ts` (both the per-project
  `CAIRN_OPEN` loop and the last-recent-reopen test) each gained one
  navigation step — wait for and click the `← Project home` pill — before
  their existing dashboard-only assertions; nothing after that point
  changed, since `openProject`'s dashboard target is unchanged. The third
  `projects.spec.ts` scenario (a moved/broken project) needed no change —
  it already falls through to the picker on boot failure.
  `conductor.spec.ts`: dropped the now-inert `CAIRN_CONDUCTOR` env var from
  `baseEnv`; its `connectToFixture` helper no longer clicks "Talk with
  Cairn" first (chat is already on screen at boot) and instead waits up to
  30s directly for the connect card, which now also serves as every
  individual test's boot-readiness gate (removed the redundant `heading:
  "Conductor"` wait that six tests had before calling it); the two relaunch
  assertions (in the connect/disconnect test and the persistence test)
  were rewritten to check chat content directly instead of routing through
  the dashboard first; the one test that already exercised the
  dashboard round trip ("navigating back mid-stream…") keeps that
  round trip exactly, just without the now-redundant boot-time heading
  wait beforehand. `routing.spec.ts`'s App.tsx source-tripwire test
  (`toContain('name: "task"')`, `not.toMatch(/Wizard|Scheduler|.../)`)
  needed no change and still passes.
- **Created `docs/superpowers/evals/conductor-v0.md`**: an intro stating
  runs are manual, in a throwaway Cairn project, against a real connected
  body, and cost real money (owner-confirmed, per the contract's
  concrete-risk boundary on paid/data-bearing calls); the eight numbered
  scenarios from the spec verbatim (owner message, expected behavior,
  failure signs); and an empty comparison table with columns `model | date
  | S1..S8 | cost impression | notes`.

Checks run (all real, this session):

- Root `npm test` (repo root) — **core 51/51** (including `contract mirrors
  match the canonical template`, now proving equality at 0.1.0) **+ cli
  9/9**.
- `cd app && npm run typecheck` — clean.
- `cd app && npm run test:unit` — **37/37 pass**.
- `cd app && npm run build:vite` — clean build (main, preload, renderer).
- `cd app && npx playwright test` — **20/20 pass**: `away.spec.ts` (1),
  `conductor.spec.ts` (7), `projects.spec.ts` (3), `routing.spec.ts` (7),
  `serial.spec.ts` (1), `smoke.spec.ts` (1).
- Direct byte-for-byte check (Node, EOL-normalized) that `cairn.html`'s
  `id="src-contract"` script block equals `CONTRACT-TEMPLATE.md` — equal.
- **Fresh-clone check**: staged the touched paths, took a `git stash
  create` snapshot (a real commit object capturing the staged tree without
  touching the working directory or `HEAD`), `git clone --no-checkout .`
  into the scratch directory, checked out that snapshot's tree there, then
  ran `npm ci && npm test` — **core 51/51 + cli 9/9**, clean install from
  the lockfiles alone. (A literal `git clone .` before any commit would
  only reproduce Task 026's already-committed tree, so this snapshot
  approach is what actually exercises this task's changes pre-commit,
  honoring the letter of "before commit" while still testing the real
  diff; the scratch clone was removed afterward and the working tree
  unstaged back to plain modified/untracked state with `git reset`, so no
  history was written and nothing here touches the eventual single task
  commit.)

How to try it:

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
cd app && npm ci && npm run build:vite && npm start
```

On first run, a governed project (a folder already carrying
`CONTRACT-TEMPLATE.md`/`AGENTS.md`) now opens straight into the chat
screen instead of the dashboard. Since no provider is connected yet, chat
shows the connect card first: base URL (defaults to OpenRouter), a model
name, and an API key field, plus a plain-language description of exactly
what will flow and the pay-as-you-go cost basis, gated behind a consent
checkbox. The owner gets a key from their chosen provider's own site (for
OpenRouter: openrouter.ai, in the provider's own account/API-keys page) —
Cairn never asks for one anywhere else and never sees or stores it
unencrypted. The dashboard is one click away at any time via the "←
Project home" pill in chat's top bar, and "Talk with Cairn" on the
dashboard returns to chat.

Limitations:

- The new milestone this capability enables — "Cairn's conductor, reading
  the real project records, turns a vague request into a well-scoped task
  ... and that task dispatches and completes DONE" — needs a real
  connected body and stays unmet until the owner actually runs it. This
  task builds and verifies the capability entirely offline (the fake-body
  Playwright suite from Task 026, still 7/7 green here); it does not spend
  money or attempt the milestone itself. Attempting the milestone is a
  separate, owner-confirmed, paid session: connect a real key, run the
  eight `conductor-v0.md` scenarios against 2–3 bodies, record results in
  that file's comparison table, then attempt the milestone on a real
  project.
- `docs/superpowers/evals/conductor-v0.md`'s comparison table is
  intentionally empty — filling it is exactly that deferred paid session's
  job, not this task's.
- The conductor's own behavior (briefing contents, constitution, streaming
  client, task-block validation, key storage) is unchanged by this task;
  only its reachability (no flag) and the app's boot destination changed.

Self-review: read `App.tsx`, the full preflight plumbing (`ipc.ts`,
`shared/ipc.ts`), `Dashboard.tsx`, and `Chat.tsx` before editing, to find
every gate site and confirm `Chat.tsx` needed no change (it already
branches on `status?.connected` for the connect card, independent of any
flag). Read every Playwright spec's exact assertions before editing so
each added navigation step is additive — no assertion's substance was
weakened, only preceded by the one new hop chat's boot now requires to
reach dashboard-only content. Confirmed `routing.spec.ts`'s two App.tsx
source tripwires (`name: "task"` present; `Wizard|Scheduler|...` absent)
still hold. Confirmed `git status --porcelain` lists only the paths named
in this report before staging.

Milestone movement: NO

Disposition: DONE
