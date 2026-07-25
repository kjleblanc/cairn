# Task 071 — Report

Review fix on 070. Three Important findings, one loose rationale, all fixed.
Two ledgered Minors left untouched by direction.

## IMPORTANT 1 — the quit drain can no longer start a paid call

`isQuitDraining()` is now the fourth skip condition inside `commentary()`
(`service.ts`), beside the other three rather than at the `tasks.ts` call site:
the guarantee belongs with the guarantees, where the next reader of the function
finds all four together.

The path is real and was verified by reading the ordering, not assumed:
`void run.then(post)` is registered at dispatch time (`tasks.ts`), before quit
ever happens, while `runs.settled()` subscribes to the same promise only when
the owner confirms the quit (`main.ts`). So the post-settle hook runs in the
microtask drain that precedes `app.quit()`, and every quit-cancelled run
carrying a conversation id started a comment there — a call paid for, killed
part-way by the process ending, never persisted and never seen. Seconds after
the quit dialog says "The model call already made is already paid for."

**No automated test covers this, and that is a real gap, stated rather than
dressed up.** The drain is only reachable through `before-quit` →
`dialog.showMessageBoxSync`, a native modal Playwright cannot answer, and
`service.ts` cannot be unit-tested because its `keystore` import needs Electron.
Extracting the four-condition decision into `rungate.ts` (where `runRefusal`
lives and is unit-tested) would have made it testable, but that moves the
guarantee out of the file the review asked to keep it in. The change is one line
guarding an early return, and its reason is written above it.

## IMPORTANT 2 — a refused message leaves no phantom turn

Task 070 opened a window that had effectively never been reachable: while the
envelope's comment streams, main holds this project's stream lock, but the
renderer never started that stream, so `streaming` and `runActive` are both
false and the composer stays open — exactly when a card lands and the owner is
most likely to type. Before Task 070, `controllers.has(dir)` was only ever true
while the renderer's own `streaming` was true, so the composer was already
closed.

Two harms, two fixes:

1. **The transcript kept a message the main process refused.** `send()` appended
   the owner's turn optimistically and never took it back, so the bubble sat
   there looking sent while nothing was on disk — and vanished on the next
   reload. `Chat.tsx` now holds that turn by identity and removes that exact
   turn on refusal. The text is not lost: `lastOwnerText` and the refusal
   bubble's "Try again" already resend the exact string, which the test proves.
   Rolling back is the smaller correct fix — the alternative, surfacing the
   commentary stream in the renderer, would dress an envelope-initiated call as
   something the owner started, and would need new state and new delta plumbing
   to do it.
2. **The refusal pointed at a control that was not there.** "Wait for that
   reply, or stop it first" — for a stream with no bubble and no Stop button
   (Stop lives inside the streaming bubble). The `controllers` map now carries
   the live stream's `kind`, so `send()` names what is actually in flight:

   > Cairn is finishing a short comment on the result card. Try again in a moment.

### TDD

RED, before the renderer fix, on the phantom itself:

```
Locator:  locator('.bubble-owner').filter({ hasText: 'Is that everything?' })
Expected: 0
Received: 1
```

RED again, after the rollback landed and before the copy changed, on the real
string:

```
- unexpected value "Cairn is already answering for this project.
  Wait for that reply, or stop it first.Try again"
```

GREEN on both, and the same test then clicks "Try again" and asserts the message
lands exactly once — on screen and on disk. The commentary fixture script was
split into four slower chunks so the window a test must stand in outlasts a
click; the words it produces are unchanged.

`sendChat` in the spec now matches `{ name: "Send", exact: true }`. A proposed
task card puts "Send to dispatch" on screen beside the composer's "Send", and
role-name matching is substring by default — the same reason the file's `Stop`
helper is already exact.

## IMPORTANT 3 — the money-safety fixture fails loudly on re-entry

`conductor-connection.ts` keeps its snapshot in module state. A second
`detachStoredConnection()` before a restore would overwrite `saved` with null,
and the restore that followed would DELETE the owner's real connection — the
fixture that exists to prevent a real paid call quietly destroying the key
instead. It now throws `CONDUCTOR_CONNECTION_ALREADY_DETACHED`.

### The discrimination check, run this session

Against a guard-free copy of the fixture (`if (detached)` → `if (false)`), with
`APPDATA` pointed at a sandbox so the real file was never involved, and a
stand-in "real key" written first:

| | with the guard | guard-free copy |
|---|---|---|
| second detach | throws `CONDUCTOR_CONNECTION_ALREADY_DETACHED` | returns |
| after restore | `REAL-KEY-STANDIN` | **`(nothing)`** |

The file also names its precondition: `playwright.config.ts`'s `workers: 1` is
load-bearing for it. Module state cannot see another worker PROCESS, so the
throw catches same-process re-entry only; the cross-process case would need a
lock file beside `conductor.json`, which is not built because nothing runs the
suite in parallel and the config, not this fixture, is where that is decided.

## MINOR 6 — the rationale now matches the code

`commentary()` was documented as returning "at once". It runs synchronously as
far as the first await, which includes `assembleBriefing`'s `execFileSync` git
calls. The guarantee that matters is unchanged and is now stated exactly: the
card is written and its delta already sent before `commentary` is called, so
nothing is waiting on it. `send()` has always done the same work on the same
thread, so this is not a regression — only a sentence that claimed more than the
code does.

## Checks run (all real, this session)

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **tests 53 / pass 53 / fail 0**.
- `npx playwright test` (app) — **35 passed** (34 after 070, plus the
  refused-message test), both lanes, one run, no flake and no rerun.
- `cd core && npm test` — **tests 104 / pass 104 / fail 0**. Core untouched.
- The fixture discrimination check above.

Files touched: `app/src/main/conductor/service.ts`,
`app/src/renderer/screens/Chat.tsx`, `app/tests/conductor.spec.ts`,
`app/tests/fixtures/conductor-connection.ts`,
`app/tests/fixtures/fake-conductor.mjs`, `docs/ai-work/tasks/071-brief.md`,
`docs/ai-work/tasks/071-report.md`, `docs/ai-work/LOG.md`.
`app/src/main/tasks.ts` is byte-identical to its 070 state — Important 1 was
fixed in the service, not at the call site.

## Limitations and remaining human judgment

- **Ledgered by direction, not fixed:** `posted` is assigned after
  `webContents.send` in `tasks.ts`, so a throw from the IPC send suppresses the
  comment (fail-closed, and no card the owner can see); and the fixture checks
  the commentary branch before the `fail-key` branch, so a fail-key conversation
  that somehow reached commentary would be scripted rather than refused.
- **Ledgered, still open:** the composer is open while a comment streams. The
  owner is now told the truth when they hit it, and nothing they type is lost,
  but they can still hit it. Closing it properly means the renderer learning
  about a stream it did not start.
- **Ledgered, still open:** an empty comment persists an empty cairn turn.
- The quit-drain guard has no automated test, for the reason given above.
- Milestone movement: NO. Correctness and safety fixes on Task 070; no new
  owner-visible capability.

Disposition: DONE
