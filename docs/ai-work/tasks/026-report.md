# Task 026 — Report

What changed:

- Created `app/tests/fixtures/fake-conductor.mjs` (116 lines). A bare
  `node:http` server listening on an ephemeral loopback port, exporting
  `start(): Promise<{ url, close }>`. `POST /v1/chat/completions` reads the
  request body, finds the last message with `role: "user"`, and scripts a
  reply from its `content` (checked in this priority order so overlapping
  substrings resolve predictably): `"garble"` → a `cairn-task` fence with an
  extra `"extra"` key (fails `taskblock.ts`'s allowed-key check, so it
  parses as plain text); `"twoconcerns"` → a fence with one `question` and
  one `risk` concern (added for the busy-chip scenario — the brief only
  specifies one risk concern for `"title"`); `"slowstream"` → four chunks at
  500 ms each (~2 s total, added for the mid-stream-navigation scenario, so
  there is a real window to click away before the reply finishes);
  `"title"` → a valid fence with one risk concern, exactly as specified;
  `"fail-key"` → the handler responds `401` with a small JSON error body
  before ever opening the SSE stream; anything else → a two-delta plain
  reply (`"Sure, "` + `"got it."`). Every streamed reply writes each delta
  as an OpenAI-shaped SSE frame (`{choices:[{delta:{content}}]}`), then a
  usage frame (`prompt_tokens: 20, completion_tokens: 9, cost: 0.00002`),
  then the literal `data: [DONE]\n\n` line, matching what
  `src/main/conductor/client.ts`'s `streamChat` parser expects. All
  scripting is deterministic — no randomness, same message always produces
  the same reply — and the only delay is the small fixed per-chunk sleep
  every reply carries, never a delay a test itself has to guess at.

- Created `app/tests/conductor.spec.ts` (311 lines, 7 tests, serial mode).
  Each test scaffolds its own temp governed project (same
  `initProject`-via-subprocess pattern as `smoke.spec.ts`/`serial.spec.ts`)
  and launches with `CAIRN_MOCK=1 CAIRN_CONDUCTOR=1 CAIRN_OPEN=<project>`.
  A file-scoped `beforeAll`/`afterAll` starts and stops one shared fixture
  server and snapshots/restores the app's real per-user `conductor.json`
  byte-for-byte (Electron resolves `userData` through the OS — the same
  constraint `projects.spec.ts` documents for the projects registry, so it
  can't be redirected into a temp dir from here); a `beforeEach` deletes
  that file so every test starts from a clean disconnected slate regardless
  of what an earlier test in the file left behind, making the 7 tests
  order-independent. The 7 scenarios:
  1. *Connect flow* — fills the connect card, asserts the "Connect" button
     stays disabled with every field filled until the consent checkbox is
     checked, connects, asserts the body pill shows `host · model`,
     disconnects, and asserts the connect card reappears — then closes and
     relaunches the same project and confirms the connect card still shows
     (the wipe survived a relaunch, not just the live screen).
  2. *Full loop* — sends `"Change the page title"`, gets the task card with
     one risk chip, asserts "Send to dispatch" is disabled, sets the risk
     chip aside (asserts the exact owner message this appends), asserts
     dispatch becomes enabled, sends to `TaskRun` (asserts the outcome
     textarea is prefilled), runs the offline mock adapter to a `DONE`
     result, then reads `docs/ai-work/tasks/001-report.md` and
     `docs/ai-work/LOG.md` off disk and diffs `git status --porcelain` in
     the temp project — same disk-truth style as `serial.spec.ts`.
  3. *Persistence* — sends a plain message, closes and relaunches on the
     same project, reopens Chat (still connected — the connection is
     app-level, not project-level) and asserts the prior turn is still
     there without resending anything; then asserts `.gitignore` contains
     `/.cairn/` and that `git status --porcelain` in the project mentions no
     `.cairn` path anywhere.
  4. *Malformed block* — sends `"garble"`, asserts the reply renders as
     plain text (`"Here's the plan."` visible), asserts zero `.task-card`
     elements, and asserts the raw fence text (`"cairn-task"`) never
     reaches the DOM.
  5. *Failure copy* — connects with a marked API key value, sends a message
     containing `"fail-key"`, asserts the exact plain-words message (`"The
     provider did not accept the key. Reconnect with a fresh key."`), then
     asserts the full page's `innerText` contains neither `"401"` nor the
     literal API key value used to connect.
  6. *Addition A* — sends a `"slowstream"` message, waits for the first
     visible partial-reply text, clicks "← Project home" (unmounting `Chat`
     mid-stream), returns to Dashboard, clicks back into Chat, sends a new
     message, and asserts it dispatches immediately with no "Cairn is
     already answering…" refusal.
  7. *Addition B* — sends `"twoconcerns"` to get a two-chip card (one
     question, one risk), answers the question chip, and while that reply
     is still streaming asserts the risk chip's "Set aside" button is
     disabled and its "Wait for Cairn to finish answering." hint is
     visible; once the stream ends, asserts it re-enables and resolves
     normally.

- Modified `app/src/renderer/screens/Chat.tsx` (Addition A, +8/-0 lines):
  added one `useEffect` whose cleanup calls
  `void cairn.conductorStop(dir)` when `inFlightRef.current` is non-null —
  placed right after the existing scroll-to-end effect. `inFlightRef` is a
  ref, so the cleanup always reads whatever was true at the exact moment of
  unmount rather than a stale value captured at mount time (the same
  reasoning already documented on `inFlightRef` itself for the delta
  handler). No other line in the file changed — the Stop button and "New
  conversation" paths that already called `conductorStop` are untouched.

Checks run (all real, this session, in `app/`):
- `npx playwright test tests/conductor.spec.ts` — **7/7 pass** (~16–19s).
- `npm run test:smoke` (which rebuilds `build:vite` first) — **20/20 pass**
  (the 13 pre-existing tests plus these 7); full list: `away.spec.ts` (1),
  `conductor.spec.ts` (7, new), `projects.spec.ts` (3), `routing.spec.ts`
  (7), `serial.spec.ts` (1), `smoke.spec.ts` (1).
- `npm run typecheck` — clean, no errors.
- `npm run test:unit` — **37/37 pass**, unchanged (no unit-tested module was
  touched by this task).

Verification of Addition A's necessity (not just its coverage): temporarily
reverted the `Chat.tsx` unmount effect, rebuilt, and reran scenario 6 alone
— it failed exactly as expected, with `"Cairn is already answering for this
project. Wait for that reply, or stop it first."` visible in the DOM after
the second send (the per-dir lock from the aborted-but-still-running
`slowstream` reply was never released). Restored the fix, rebuilt, and
confirmed all 7 tests pass again before proceeding. This is evidence the
scenario actually exercises the fix rather than passing vacuously.

How to try it:
```
cd app
npm run build:vite
npx playwright test tests/conductor.spec.ts --reporter=list
```
No network access or real provider account is needed — the fixture is the
only thing the app talks to. Each test launches a real Electron window
against a fresh temp governed project; watch it with `--headed` if you want
to see the connect card, chat bubbles, task card, and TaskRun flow live.

Limitations:
- The provider connection (`conductor.json`) lives in the real machine's
  per-user Electron `userData` folder, not something `CAIRN_OPEN` can
  redirect — every test in this file snapshots and restores that one file
  around itself (mirroring `projects.spec.ts`'s documented handling of
  `projects.json`), but it is still the one shared, real file on disk while
  the suite runs. `workers: 1` in `playwright.config.ts` keeps the whole
  suite serial, so this is safe in practice, but it means `conductor.spec.ts`
  cannot safely run in parallel with itself or with a hand-run instance of
  the app on the same machine.
- Like every other spec in this suite (`smoke.spec.ts`, `serial.spec.ts`,
  `routing.spec.ts`, `away.spec.ts`), each test's temp project directory
  under the OS temp folder is left on disk after the run — this task did
  not change that pre-existing pattern, and each `CAIRN_OPEN` launch also
  still touches the real projects registry the same way those other specs
  already do; only `conductor.spec.ts`'s own `conductor.json` interaction is
  snapshotted here, matching the task's stated scope.
- `"twoconcerns"` and `"slowstream"` are fixture markers added beyond the
  three named in the brief's contract (`"title"`/`"garble"`/`"fail-key"`),
  as the brief anticipated might be needed ("adjust fixture scripting
  minimally if scenarios 6–7 need an extra marker") — both are deterministic
  (fixed content and fixed per-chunk delay, no randomness) and checked
  first in `scriptFor`'s priority order so they never collide with the
  three required markers even when a test message happens to also contain
  the word "title".
- Read the fixture contract as scripted off *message content*, per the
  brief's own literal wording, for the "reconnect against the fixture with
  the fail-key model/marker" scenario — the test connects normally and then
  sends a message containing the substring `"fail-key"`, rather than naming
  the *model* `"fail-key"` (the fixture never inspects the model field).
  This matches the brief's explicit, unambiguous fixture contract stated
  immediately above the scenario list.

Self-review: read `Chat.tsx`, `TaskCard.tsx`, `ConnectCard.tsx`,
`BodyPill.tsx`, `TaskRun.tsx`, `App.tsx`, `client.ts`, `service.ts`,
`taskblock.ts`, `store.ts`, and `keystore.ts` in full before writing any
test, to root every locator and every assertion in real markup/behavior
rather than assumption (e.g. discovering `ConnectCard`'s `<label>` does not
wrap its `<input>`, so `getByLabel` would not have worked — used scoped
`input[type=...]` locators and placeholders instead). Confirmed the offline
mock-dispatch git-status diff needed one more line than `serial.spec.ts`'s
own list (`?? .gitignore`) because the conductor's `ensureCairnIgnored`
creates that file on first send, before `serial.spec.ts`'s baseline dispatch
even runs. Confirmed `git status --porcelain` at the repo root lists only
the intended paths before staging.

Milestone movement: NO

Disposition: DONE
