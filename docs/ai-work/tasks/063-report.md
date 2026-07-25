# Task 063 — Report

## Correction to the 062 report (append-only, house convention)

Correction to the 062 report's TDD evidence: the newline-rejection test's
assertion-RED was masked by the compile gate in 062's run; the controller
observed it directly on 2026-07-25 (guard neutered → 45/46 failing on the
assertion, restored → 46/46) — the guard is discriminating.

## What changed

### `app/src/shared/ipc.ts`

New `TaskRunRequest` type — `{ dir, outcome, details, adapterId?,
realCallConfirmed?, disclosure?, conversationId? }` — with a comment naming
why it is an object: every part is load-bearing at the authorization gate, and
a positional signature that quietly drops one would dispatch something the
owner never read. `taskRun(request)` replaces the five-parameter signature;
`taskRoute(dir, outcome, details, adapterId?)` gains `details` in the third
position. `RunSessionSnapshot` gained `conversationId: string | null`.

### `app/src/preload.ts`

Both bridges follow: `task:route` forwards `details`, `task:run` forwards one
request object.

### `app/src/main/tasks.ts`

The four places the outcome went, `details` now goes too:

1. `task:route` — `routed?.disclosure?.(outcome, details ?? "")`, so the card
   the owner reads names the details it will send.
2. `detectedAdapters` — its third parameter is now `authorized?: { outcome,
   details }` (an object, so the two halves cannot be passed separately by
   mistake), handed to `authorizeCodexExec(dir, outcome, details)`.
3. The run-time disclosure gate — `expected = routed?.disclosure?.(outcome,
   details)`.
4. `runSerialTask(dir, outcome, { …, details })`, which binds them into the
   contract digest and the worker prompt.

`task:run` now destructures one `TaskRunRequest` and normalizes `details` once
(`request.details ?? ""`). `sessions.set` carries `conversationId:
request.conversationId ?? null`.

### `app/src/renderer/components/DisclosureConfirm.tsx` (new, 38 lines)

TaskRun's disclosure card, extracted verbatim (the brief allowed extraction
under ~50 lines): the six facts plus the confirm checkbox, taking
`disclosure`, `label`, `confirmed`, `onConfirmedChange`. Both places a run can
start now render THIS component, so the bytes an owner confirms cannot drift
between them. One addition: the `task` field carries `class="disclosure-task"`
with `white-space: pre-wrap`, because that field is now the outcome and the
details concatenated across lines by core — without it the confirmed bytes
would collapse into one run-on line on screen.

### `app/src/renderer/screens/Chat.tsx`

The prefill handoff is gone (`onOpenTask` deleted from the props). In its
place, a `Dispatch` state (`outcome`, `details`, `route`, `disclosure`,
`phase`, `error`) and a `realCallConfirmed` flag that mirrors TaskRun's:

- `onCardSend(outcome, details)` opens the panel immediately (so the press is
  never silent) and asks `taskRoute` for the route and disclosure. A
  `dispatchToken` ref makes a slow answer for a superseded panel land nowhere.
- The panel always shows the outcome and, when present, the details under
  "Details (sent verbatim)". `DisclosureConfirm` renders inside it only when
  `dispatch.disclosure` exists — in CAIRN_MOCK the routed offline-demo adapter
  declares none, so that lane is outcome + details + Start, exactly as the
  brief specifies. A `connection-required` route shows its plain reason and no
  Start control.
- `startDispatch` sends the whole request — outcome, details, the confirmed
  disclosure, the current `conversationId` — and mirrors TaskRun's honest
  handling of a refusal and of a `connection-required` result.
- `newConversation()` clears an undecided panel but keeps a running one: the
  run belongs to the project, not to the conversation that proposed it.

### `app/src/renderer/screens/TaskRun.tsx`, `app/src/renderer/App.tsx`

TaskRun lost `initialOutcome` (nothing seeds it any more) and sends `details:
""`, `conversationId: null`; its disclosure card is now the shared component.
`App`'s `task` view lost `initialOutcome` and `Chat` lost `onOpenTask` — the
ledgered seeding-clash path is deleted, not merely unused.

### Tests

- `app/tests/conductor.spec.ts` — the legacy full-loop test is rewritten to
  the inline flow (authorized and required by the brief): risk chip set aside
  → "Send to dispatch" → the panel shows outcome AND details, carries no
  confirm box in the demo lane, and the task screen never opens → "Run offline
  demonstration" → `taskCurrent` reports `phase: "closed"` and the
  conversation's real id. Its landing assertions carry over unchanged (report,
  LOG row, exact git status), plus two new ones: the brief on disk carries the
  owner's details verbatim.
- `app/tests/routing.spec.ts` — the real-lane guard (see below), plus the
  call-site migration and three source-text assertions in the existing
  surfaces test (Chat mounts `<DisclosureConfirm`; `onOpenTask` and
  `initialOutcome` stay gone).
- `app/tests/fixtures/fake-conductor.mjs` — the full-loop scripted reply now
  carries `details: "Keep the counts 74, 477, 256 exactly."` alongside its risk
  chip, so one test walks the whole path.
- The fake-codex PATH shim now writes the prompt it received on stdin to a
  capture file (`CAIRN_FAKE_CODEX_PROMPT`), following the existing marker-file
  idiom — a test can assert on what Cairn really sent, not on what the app
  believed it sent.

Files touched: `app/src/shared/ipc.ts`, `app/src/preload.ts`,
`app/src/main/tasks.ts`, `app/src/renderer/App.tsx`,
`app/src/renderer/app.css`, `app/src/renderer/components/DisclosureConfirm.tsx`,
`app/src/renderer/screens/Chat.tsx`, `app/src/renderer/screens/TaskRun.tsx`,
`app/tests/conductor.spec.ts`, `app/tests/routing.spec.ts`,
`app/tests/serial.spec.ts`, `app/tests/fixtures/fake-conductor.mjs`,
`docs/ai-work/tasks/063-brief.md`, `docs/ai-work/tasks/063-report.md`,
`docs/ai-work/LOG.md`.

## TDD evidence (this session)

**RED (Step 2), assertion-level, not compile-level.** The rewritten full-loop
test was written first and run against the unchanged app. Playwright does not
type-check, so the test genuinely executed and failed on its assertion:

```
Error: expect(locator).toBeVisible() failed
Locator: locator('.dispatch-panel')
Timeout: 15000ms
Error: element(s) not found
```

(The app had navigated to the task screen instead — the behaviour being
replaced.) 1 failed, 1 passed, 6 did not run (this file is `mode: "serial"`).

**GREEN.** After the implementation: `tests/conductor.spec.ts` 8/8.

**The real-lane guard is discriminating — verified by neutering, one site at a
time.** Each site was broken alone, the app rebuilt, and the new routing test
run; then the site was restored:

| Neutered site | How the test failed |
| --- | --- |
| `task:route` disclosure → `(outcome, "")` | `expect(disclosure.task).toBe(…)` — the card no longer names the details |
| `authorizeCodexExec` details → `""` | `expect(JSON.stringify(run)).not.toContain("REAL_MODEL_CALL_NOT_AUTHORIZED")` — every detailed dispatch refused |
| run-gate disclosure → `(outcome, "")` | `expect(stale.ok).toBe(false)` — an outcome-only confirmation could dispatch a details-bearing request |
| `runSerialTask` details → `""` | `expect(JSON.stringify(run)).not.toContain("REAL_MODEL_CALL_NOT_AUTHORIZED")` |

All four restored, full suite re-run green. The plan's CRITICAL
authorization-chain gap cannot now ship silently.

## Checks run (all real, this session)

- `cd app && npx tsc --noEmit` — **exit 0**. Task 3's two deliberate errors
  (`tasks.ts:77`, `:111`) are closed; nothing new.
- `cd app && npm run test:unit` — `tests 46 / pass 46 / fail 0` (unchanged;
  this task adds no unit test — its surface is IPC and rendering).
- `cd app && npm run test:smoke` — **26 passed**, one clean run, no rerun and
  no flake. Previous count was 25: the legacy full-loop test was rewritten in
  place (not added), and one real-lane details test is new.
- `git status --porcelain=v1 --untracked-files=all` before staging listed
  exactly twelve modified files (the eleven source/test files above plus
  `docs/ai-work/LOG.md`) and three untracked ones (`DisclosureConfirm.tsx`,
  `063-brief.md`, `063-report.md`) — nothing else outside the git-ignored
  `app/test-results/`.

## How to try it

```
cd app
npm run test:smoke
```

Or by hand: open a governed project in chat with a connected brain, ask for a
change, resolve the card's chips, and press "Send to dispatch". The
confirmation appears in the conversation with your details verbatim; on a real
Codex lane it also shows the six facts and the confirm box, and the Task line
now reads your outcome and your details together — the exact bytes that go to
the worker.

## Limitations and remaining human judgment

- **The panel's disclosure block has no end-to-end UI test.** The mock lane's
  adapter declares no disclosure, and the real lane has no conductor fixture,
  so no single Playwright test both connects a brain and routes to codex. The
  gap is narrowed two ways: the block is now one shared component that
  routing.spec's TaskRun test asserts field-by-field, and a source-text
  assertion pins that Chat mounts it. Closing it properly needs the fake
  conductor in the codex lane — worth doing when a later task already touches
  both.
- **A finished inline run leaves no trace in the conversation.** The panel
  clears on success; the result lives in the task records and in the session,
  which the task screen still reattaches to and displays. Task 6's
  envelope-authored result relay is what puts it in chat.
- The panel offers no stop control while running; the task screen's Stop is
  one navigation away and still governs the same run.
- Dispatching the same card twice in a row is possible (main refuses only
  *concurrent* runs). Each dispatch passes through its own confirmation, so
  nothing runs unread.
- Milestone movement: NO. This is the dispatch half of the loop; the owner
  still reads results on the task screen.

Disposition: DONE
