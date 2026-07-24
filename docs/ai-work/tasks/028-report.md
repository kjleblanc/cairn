# Task 028 — Report

What changed:

- **Fix 1 — chat must never dirty the project's worktree.**
  `app/src/main/conductor/store.ts`: removed `ensureCairnIgnored` (which
  wrote `/.cairn/` into the project's tracked `.gitignore`) and added
  `ensureCairnExcluded(root)`. It resolves the project's git-common-dir via
  `git rev-parse --git-common-dir` (so a worktree checkout shares the main
  repo's exclude file, per the spec's Connect-flow-adjacent git-handling
  convention already used in `context.ts`'s `gitSummary`), creates
  `<git-common-dir>/info/` if missing, and appends `/.cairn/` to
  `<git-common-dir>/info/exclude` with the same append-once semantics as
  before. A project with no git repository (the `git rev-parse` call throws)
  returns `false` and touches nothing — no `.gitignore` fallback is ever
  created. `app/src/main/conductor/service.ts`: updated the import and the
  one call site in `send()` from `ensureCairnIgnored` to
  `ensureCairnExcluded`.
- **Fix 2 — the disclosure now names everything that flows.**
  `app/src/main/conductor/service.ts`'s `conductorConsentCard` `data` string
  gained the clause `a summary of recent saved changes (the branch name and
  latest commit titles),` between "recent briefs and reports)" and "and
  project file names" — naming the git summary `context.ts` has always sent.
  `CONTRACT-TEMPLATE.md`, `AGENTS.md`, and `cairn.html`'s `id="src-contract"`
  embed each gained the matching clause `a summary of recent saved changes,`
  in "The connected conductor" section's data-scope parenthetical, applied
  in MAINTAINERS' six-step order (template first, then `AGENTS.md` with its
  project-facts block untouched, then the `cairn.html` embed) and confirmed
  byte-for-byte equal directly (see Checks). No public guide (`README.md`,
  `EVERYDAY-WORKFLOW.md`, `PROJECT-KICKOFF.md`, `PROJECT-CONVERSION.md`)
  repeats this text, so none needed a change.
- **Fix 3 — oversized conversations fail honestly.**
  `app/src/main/conductor/client.ts`: added `PROMPT_CHAR_LIMIT = 200_000`
  and `export function promptTooLarge(messages: ChatTurnMessage[]): boolean`
  — sums `content.length` across all messages, true when the total exceeds
  the limit. `app/src/main/conductor/service.ts`'s `runStream`: after
  assembling `messages` (constitution + briefing + history) and before
  building the request slot or calling `streamChat`, checks
  `promptTooLarge(messages)`; on true it emits one
  `{ kind: "error", message: "This conversation has grown past what Cairn
  can safely send. Start a new conversation — the project records keep what
  matters." }` delta and returns without any network call or additional
  persisted turn (the `finally` block still releases the per-dir
  controller). **Ordering chosen:** the check runs *after* the owner's own
  turn is already persisted (which `send()` does synchronously before
  `runStream` is even scheduled) and *before* any cairn-turn is written or
  the provider is called. This keeps the record truthful on both sides: the
  owner's message they actually sent stays in the transcript exactly as
  typed, and no fabricated assistant reply is ever written for a turn Cairn
  never really answered — the same pattern the existing `ConductorHttpError`
  branch already uses (no `appendTurn` on a failed turn). The Playwright
  suite is unaffected: every fixture conversation in
  `app/tests/fixtures/fake-conductor.mjs` is a few hundred characters, far
  under the 200000-character limit.
- **Fix 4 — a corrupted `conductor.json` reads as not connected.**
  `app/src/main/conductor/keystore.ts`'s `readConnection` gained an
  `isParsableUrl` check (`try { new URL(value); return true } catch { return
  false }`) applied to the stored `baseUrl` before returning a
  `StoredConnection`; an unparseable `baseUrl` now returns `null`, the same
  outcome as a missing file or a JSON/type mismatch. This closes the path
  where `status()`'s unguarded `new URL(conn.baseUrl).host` could throw,
  which would have made the `conductor:status` IPC handler (it has no
  try/catch) reject instead of resolve, potentially hanging the home screen
  instead of falling through to the connect card. The docstring was
  extended to say so.
- **Version 0.1.0 → 0.1.1** in `CONTRACT-TEMPLATE.md` line 3, `AGENTS.md`
  line 3, `cairn.html` (eyebrow line 43 + embed's own "What this is" line),
  `core/package.json`, `cli/package.json`, `app/package.json`. Ran `npm
  install` at the repo root and in `app/`, refreshing `package-lock.json`
  (2 lines: the `cli` and `core` workspace entries) and
  `app/package-lock.json` (3 lines) — version fields only, confirmed with
  `git diff --stat`. Hand-edited `cli/package-lock.json`'s two version
  fields (lines 3 and 9), the same pattern Task 027 used, since that
  lockfile isn't regenerable from this repo layout.
- **Rebuilt core** (`npm run build --workspace core`), regenerating the
  gitignored `core/assets/contract.md` from the amended, re-versioned
  template; `app/resources/contract.md` (also gitignored) regenerates in
  turn from `app/scripts/copy-assets.mjs` during `build:vite`.
- **`CHANGELOG.md`**: new top entry `## 0.1.1 — the disclosure tells the
  whole truth — 2026-07-23`, honestly describing all four fixes (the
  under-disclosed git summary now named; `.cairn` exclusion moved out of the
  worktree into `.git/info/exclude` and why, referencing the Task 010/011
  poisoning class it prevents; oversized conversations failing in plain
  words instead of a false retry suggestion; a corrupted connection file now
  reading as not connected instead of hanging). Closes with "Added no
  dependency" per the existing convention.
- **Tests.** `app/tests-unit/store.test.ts` fully rewritten for
  `ensureCairnExcluded`: append-once (`.git/info/exclude gains /.cairn/
  exactly once`), created-when-missing (removes the `info/` directory `git
  init` normally seeds with a commented template first, so the test
  actually exercises the create path, then confirms both the directory and
  the line), no-git no-op (`ensureCairnExcluded` on a bare temp dir with no
  `.git` returns `false`, creates no `.gitignore`, creates no `.git`, and
  leaves the directory empty), and the requested REGRESSION test — a real
  git repo with a committed `.gitignore` and a tracked file, where calling
  `ensureCairnExcluded` leaves the tracked `.gitignore` byte-identical and
  `git status --porcelain` completely empty afterward.
  `app/tests-unit/client.test.ts`: added a `promptTooLarge` boundary test —
  exactly at `PROMPT_CHAR_LIMIT` is false, one character over is true,
  content summed across multiple messages crossing the limit is true, and
  an empty message array is false. `app/tests/conductor.spec.ts`: the "full
  loop" scenario's exact-changed-files assertion dropped `"?? .gitignore"`
  (chat no longer creates one). The "conversation persists across a
  relaunch" scenario now asserts `.gitignore` does **not** exist, that
  `.git/info/exclude` contains `/.cairn/`, and — the requested
  strengthening — that `git status --porcelain` in the temp project is
  **completely empty** (`toBe("")`) after connecting and chatting, not just
  free of `.cairn` mentions. No Playwright test asserted the old consent
  card text verbatim (the one existing assertion is `/What may flow/`, a
  label substring that didn't change), so nothing else needed updating
  there.

Checks run (all real, this session):

- Root `npm test` — **core 51/51** (including `contract mirrors match the
  canonical template`, now proving equality at 0.1.1) **+ cli 9/9**.
- `cd app && npm run typecheck` — clean.
- `cd app && npm run test:unit` — **40/40 pass** (grew from 37: +2 store
  tests net, +1 `promptTooLarge` test).
- `cd app && npm run build:vite` — clean build (main, preload, renderer);
  `resources/contract.md synced from core` confirms the regenerated,
  re-versioned asset flowed through.
- `cd app && npx playwright test` — **20/20 pass**: `away.spec.ts` (1),
  `conductor.spec.ts` (7, including the two rewritten assertions),
  `projects.spec.ts` (3), `routing.spec.ts` (7), `serial.spec.ts` (1),
  `smoke.spec.ts` (1).
- Direct byte-for-byte check (Node, EOL-normalized) that `cairn.html`'s
  `id="src-contract"` script block equals `CONTRACT-TEMPLATE.md` — equal,
  run after the version and disclosure edits landed.
- `git diff --stat` on `package-lock.json`, `app/package-lock.json` after
  `npm install` — 2 and 3 lines changed respectively, version fields only.
- `git status --porcelain` on the repo itself before staging — matches
  exactly the file list in "What changed" plus this task's own new record
  files.

How to try it:

```
git clone https://github.com/kjleblanc/cairn.git
cd cairn
npm ci && npm test
cd app && npm ci && npm run build:vite && npm start
```

On a governed project, chat with Cairn's conductor as before; the connect
card's "What may flow" text now names the git summary explicitly, and
sending messages no longer touches the project's `.gitignore` — check
`.git/info/exclude` after a send instead, and `git status --porcelain` in
the project stays empty throughout a normal conversation. Pasting well over
200000 characters of conversation content (or scripting many long turns)
now surfaces "This conversation has grown past what Cairn can safely send.
Start a new conversation — the project records keep what matters." instead
of a provider-shaped retry suggestion; the offline fixture body doesn't
exercise this path since its fixture messages are tiny, so this is easiest
to see by reading `promptTooLarge` and its unit test directly. Corrupting
`conductor.json`'s `baseUrl` field to a non-URL string (in the app's real
per-user `conductor.json`, e.g. `{"baseUrl":"not a url","model":"m",
"keyB64":"..."}`) and relaunching now shows the connect card instead of a
stuck or erroring home screen.

Limitations:

- Fix 4 has no automated regression test. `keystore.ts` imports `electron`
  directly (`app`, `safeStorage`), and this repo's `test:unit` runs under
  plain `node --test`, not Electron — there is no existing Electron-mock
  harness for main-process modules that touch `electron` APIs, and building
  one is out of this task's scope. The fix is small and directly traceable
  (one added `isParsableUrl` guard ahead of one existing return), and its
  effect is implicitly covered whenever any `conductor.spec.ts` scenario
  boots successfully with a real (valid) stored connection, but no test
  here specifically exercises a malformed `baseUrl`.
- `promptTooLarge`'s 200000-character threshold is a coarse, provider-
  agnostic proxy for a token budget (roughly optimistic — real tokenizers
  vary), chosen because no per-provider tokenizer is wired in yet; it is
  conservative enough to fire well before most providers' own context
  limits for the models Cairn's briefing targets, but is not a precise
  token count.
- The four fixes are corrections to already-built behavior (Tasks 018–027);
  none of them touch the constitution, task-block parsing, the proposed-task
  card, dispatch, or the serial/offline/Codex adapters, and none move the
  milestone.

Self-review: read the spec's "Connect flow and standing consent" section and
MAINTAINERS.md's "Contract changes" six-step procedure before starting.
Confirmed `AGENTS.md` differs from `CONTRACT-TEMPLATE.md` only in the
project-facts block (`diff` after editing both). Confirmed the `cairn.html`
embed is byte-identical to `CONTRACT-TEMPLATE.md` with a direct Node script,
matching what `core/test/contract-mirrors.test.mjs` also asserts. Searched
the whole repo for other hand-written copies of the old consent-card
sentence or the old `.gitignore`/`ensureCairnIgnored` behavior before
declaring Fixes 1 and 2 complete — found and updated every source-of-truth
occurrence (`service.ts`, `CONTRACT-TEMPLATE.md`, `AGENTS.md`,
`cairn.html`), left historical spec/plan documents under `docs/superpowers/`
untouched as point-in-time design records, consistent with MAINTAINERS'
"history belongs in the changelog" writing rule. Discovered mid-implementation
that `git init` seeds `.git/info/exclude` with a commented template on this
machine's git — adjusted the "created when missing" unit test to actually
remove that template first, so it tests the real create path instead of a
false premise. Confirmed `git status --porcelain` is empty in this repo's
own working tree is not applicable here (this task itself has real staged
changes), but is exactly what the rewritten Playwright scenario 3 and the
new store-level regression test both prove for a *project* Cairn talks to.

Recorded future work (carried forward verbatim, not evaluated or
prioritized in this task):

- test:unit flat glob Node-20 edge
- taskblock boundary tests
- context.ts unused import + untested caps
- client chunk-split/decoder-flush/abort tests
- store skip-branch/broad-catch tests
- main-side disconnect-abort guarantee
- destroyed-webContents send rejection
- done-beats-stop flicker
- vacuous cairn-task assertion
- try/finally around app.close suite-wide
- streaming shows raw fence until done
- empty-abort orphan turn
- clearConnection swallowed failure
- bare-array IPC returns for conversations/turns
- unused TaskBlock.notes
- http:// base URL cleartext nudge
- body-pill visibility outside chat
- conversation id 1000 rollover
- new-project boot lands on Dashboard
- full Codex-lane chat-first Playwright scenario

Milestone movement: NO

Disposition: DONE
