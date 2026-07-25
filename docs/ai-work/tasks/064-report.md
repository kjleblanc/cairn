# Task 064 — Report

## What changed

### `app/tests/fixtures/fake-codex-env.ts` (new)

`fakeCodexEnvironment` moved out of `app/tests/routing.spec.ts:20-91` as a
shared export. The port is verbatim — the function body was sliced from the
file programmatically and compared byte-for-byte against the original; the
only edit is the `export` keyword, plus a module comment above it. Nine
routing tests import it and pass unchanged, which is the proof that the move
changed no behavior.

The lane matters because it is the only one where a run can be watched: the
mock adapter finishes instantly and declares no disclosure, while this shim
answers as the real Codex CLI does (`--version`, `login status`, `exec`),
records that the exec really started, captures the prompt it was handed, and
— with `behavior: "slow"` — waits eight seconds before finishing.

### `app/src/renderer/screens/Chat.tsx`

A `RunSessionSnapshot` now lives in chat's state, read through the two seams
the run screen already uses: `taskCurrent(dir)` on mount, and `onTaskActivity`
while the run moves. No IPC was added.

- **The strip.** While the session runs: the latest activity's stage (one of
  `Route | Run | Check | Result`; "Starting" until the first arrives, which is
  plainer than naming a stage the run has not reached), an m:ss clock from
  `session.startedAt`, the outcome, "Stop this task" wired to the existing
  `taskCancel`, and "Open the run screen". When it closes: the run's own
  Result line (`DONE — …` / `STOPPED — …`), or `session.error` when the run
  threw and never emitted one, with the run-screen link still there. That
  terminal line is the interim result relay — the conversation is not silent
  between this task and Task 8.
- **The composer tells the truth.** While a run lives the textarea and Send
  are disabled and a line under the strip reads "A task is running. The
  composer reopens when it finishes." `send()` refuses in the same condition,
  so a keyboard path cannot slip past the disabled control into a send that
  main's own gate would refuse anyway.
- **The strip is keyed to the PROJECT, not the conversation.** This is a
  deliberate reading of the plan's "a session for this conversation". The gate
  the strip explains is per-project: `rungate` refuses every send while any
  task runs for this dir, whichever conversation dispatched it. A
  conversation-keyed strip would leave a closed composer unexplained and its
  stop control unreachable after "New conversation" — which chat already
  treats as project-scoped ("a running dispatch belongs to the project, not to
  the conversation it was started from", Task 063). Task 8's result cards stay
  conversation-keyed, as the spec requires; that is a different surface.
- **A one-second tick while the run lives** advances the clock and re-reads
  the snapshot. The re-read is load-bearing for a reloaded renderer, which
  holds no run promise of its own to await: a thrown close emits no Result
  activity at all, and even an ordinary close is marked just after the last
  activity goes out.
- **Carried fix 2.** `startDispatch` now takes a `dispatchToken` the way
  `onCardSend` does, and drops its own answer if a newer dispatch has taken
  the panel. Before this, a second dispatch opened during a long run would be
  cleared or error-stamped by the first run's late answer.

### `app/src/renderer/App.tsx`, `app/src/renderer/app.css`

One navigation prop (`onOpenRun`) for the strip's link, which seeds nothing —
the run screen reattaches to the same main-process session either way, and the
retired prefill path stays deleted. The CSS is one flex line above the
composer, with the outcome ellipsised so a long one cannot push the controls
off the card.

### `app/tests/routing.spec.ts`

Imports the fixture; the local copy is gone. **Carried fix 1:** the
details-guard comment's mapping is rewritten. It claimed three of the four
threading sites refuse the run and the fourth strips the owner's numbers out
of the captured prompt. What the 063 neutering table actually produced:

| Neutered site | The assertion that catches it |
| --- | --- |
| route disclosure (`task:route`) | `expect(disclosure.task).toBe(…)` |
| run-time disclosure gate (`task:run`) | `expect(stale.ok).toBe(false)` |
| the adapter's authorization | the confirmed run's `not.toContain("REAL_MODEL_CALL_NOT_AUTHORIZED")` |
| `runSerialTask`'s own options | the same refusal assertions, one layer down — core's `authorizationMatches` throws before `processRunner.run`, so no process spawns and the prompt file the old comment blamed is never written for the prompt assertion to read |

### `app/tests/conductor.spec.ts`

Two new tests in the shared fake-codex slow lane, plus the helper that reaches
it. Both connect the fixture brain AND route to codex, which the 063 report
named as a gap ("no single Playwright test both connects a brain and routes to
codex") — so the inline panel's six-fact disclosure block now has real
end-to-end coverage as a side effect.

- `codexEnv()` builds the launch env from this file's own string-coerced base
  and then overrides it: PATH shim, `CAIRN_MOCK=0`. It is never the file-wide
  mock env.
- `scaffold()` gained a git identity, because the real-call lane commits its
  own records; the mock lane commits nothing and is unaffected.
- `waitStreamDone` now matches "Stop" exactly. Playwright's role-name matching
  is substring by default, so a running task's "Stop this task" button would
  otherwise satisfy the wait for the streaming Stop pill to disappear — a
  cross-talk bug waiting for the first test that streams during a run.

Files touched: `app/src/renderer/App.tsx`, `app/src/renderer/app.css`,
`app/src/renderer/screens/Chat.tsx`, `app/tests/fixtures/fake-codex-env.ts`
(new), `app/tests/conductor.spec.ts`, `app/tests/routing.spec.ts`,
`docs/ai-work/tasks/064-brief.md`, `docs/ai-work/tasks/064-report.md`,
`docs/ai-work/LOG.md`.

## TDD evidence (this session)

**RED, at assertion level, both tests, against the unchanged app** (Playwright
does not typecheck, so they genuinely executed — and everything before the
strip worked, which is what makes these honest failures rather than setup
errors: the dispatch panel appeared, the disclosure was confirmed, the real
call started):

```
1) a dispatched run lives in the conversation … (33.1s)
   Error: expect(locator).toBeVisible() failed
   Locator: locator('.run-strip')       Error: element(s) not found

2) a reload mid-run reattaches … 
   Locator: locator('.run-strip').getByRole('button', { name: 'Stop this task' })
   Error: element(s) not found
```

**GREEN** after the implementation: 4.0s and 12.5s respectively.

**The reattachment assertion is discriminating — verified by neutering.** The
post-reload assertion carries a deliberately tight five-second timeout,
measured from an already-mounted screen, because the next activity in this
lane is roughly seven seconds away: a strip that waited for an event instead
of reading the session on mount would pass a loose timeout for the wrong
reason. With the mount-time `taskCurrent` read removed (`useEffect(() => {
/* NEUTERED */ }, [refreshSession])`) and the app rebuilt, the test failed on
exactly that line; restored, it passed again.

## Checks run (all real, this session)

- `cd app && npx tsc --noEmit` — **exit 0**, before and after.
- `cd app && npm run test:unit` — `tests 46 / pass 46 / fail 0` (unchanged;
  this task's surface is rendering and reattachment, which the smoke lane
  covers end to end).
- `cd app && npx playwright test tests/routing.spec.ts` — **11 passed**
  immediately after the fixture extraction, with no source change in the app:
  the port is behavior-neutral.
- `cd app && npm run test:smoke` — **28 passed** in one clean run, no rerun
  and no flake (26 before, plus this task's two). The known environmental
  connect-card flake did not appear in either full run.
- `git status --porcelain=v1 --untracked-files=all` before staging listed the
  five modified files above plus `docs/ai-work/LOG.md`, and three untracked
  ones (`fake-codex-env.ts`, `064-brief.md`, `064-report.md`) — nothing else
  outside the git-ignored `app/test-results/`.

## How to try it

```
cd app
npx playwright test tests/conductor.spec.ts -g "the strip names its stage"
```

Or by hand: open a governed project in chat with a connected brain and a
connected Codex, ask for a change, resolve the card's chips, press "Send to
dispatch", confirm the real call. The run then stays in front of you — stage,
clock, "Stop this task", "Open the run screen" — the composer says why it is
closed, and when the run ends its own terminal line stays in the strip.

## Limitations and remaining human judgment

- **The terminal line is a raw run word** (`STOPPED — CANCELLED_BY_OWNER`),
  the same words the run screen's activity feed shows. It is honest but it is
  not a result card; Task 8 replaces it with one rendered from the verified
  record. Until then it also never clears itself — it goes when the session is
  acknowledged on the run screen and chat re-reads on its next mount.
- **The confirmation panel still says "Cairn is running this task"** while the
  strip says the same thing more precisely, so the outcome appears twice for
  the length of a run. Removing the panel's running branch is Task 8's work,
  when the result card takes over that space; doing it here would have left a
  silent gap between the press and the first activity.
- **A proposed-task chip pressed during a run does nothing visible.** `send()`
  refuses, so the chip correctly stays unresolved — no false state — but the
  card gives no reason of its own; its only "busy" copy names the streaming
  case ("Wait for Cairn to finish answering"), which would be a false reason
  here. The strip and the composer line do say what is true, one line below.
- **The strip's clock is renderer-side** and rounds down to the second; it is
  a comfort reading of how long the owner has been waiting, not a measurement,
  and the records remain the record.
- The strip carries a run started on the task screen too (project-keyed, as
  above). That is deliberate: the composer is closed for that run as well, and
  a closed composer with no explanation would be worse.
- Milestone movement: NO. The run is visible in the conversation, but the
  result still has to be read as a raw line or on the run screen.

Disposition: DONE
