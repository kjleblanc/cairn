# Task 065 — Report

Review fixes on Task 064: one Important, one paired Minor.

## What changed

### `app/src/renderer/screens/Chat.tsx` — the strip claims no invented facts

The last-resort terminal line no longer mentions records:

```ts
const terminalLine = session?.error
  ?? resultLine
  ?? (session?.result?.status === "connection-required"
    ? "Codex Exec readiness changed. No task records or model call were created."
    : "This task closed.");
```

The connection-required sentence is the one `TaskRun.tsx:92` already uses for
the same close, so the two screens cannot drift; the remaining fallback states
only that the task closed, which is true of every closed session by
definition. The comment above it records WHY the case exists — core returns
connection-required from the route itself, before a task number, a brief, or a
log row — so a later reader does not "simplify" the branch away.

`startDispatch`'s connection-required branch also refreshes the session now.
Without it that close depended on the one-second tick to stop showing the run
as still running.

### `app/src/renderer/screens/Chat.tsx`, `app/src/renderer/app.css` — one live region

The strip had two `role="status"` spans, one per state, each mounted with its
content already inside it. A live region announces a content CHANGE; a region
that appears already holding its message is the case assistive technology
announces least reliably — so the announcement an owner most needs, how the
run ended, was likely silent. There is now one span that mounts with the strip
and is never replaced: only its modifier class and its text swap
(`run-strip-state` carries the identity, `run-strip-stage` /
`run-strip-terminal` carry the look). The clock still sits outside it — a
polite region around a value that changes every second would read itself aloud
once a second.

### `app/tests/conductor.spec.ts`

One new test, plus two assertions added to the existing strip test, plus the
helper that stages the race.

`breakFakeCodex()` overwrites the fake shim in place so it stops answering
`--version`. It is deliberately NOT a delete: the fake install stays first on
PATH, and deleting it would let resolution fall through to a real Codex
install on the machine running the test — exactly the paid call this lane
exists to prevent.

Files touched: `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/app.css`, `app/tests/conductor.spec.ts`,
`docs/ai-work/tasks/065-brief.md`, `docs/ai-work/tasks/065-report.md`,
`docs/ai-work/LOG.md`.

## A finding this task surfaced and did NOT fix

Staging the race showed that the app's own dispatched path cannot reach
`connection-required` at all. Both screens name their adapter
(`adapterId: route.recommended.id`), and `routeTask` THROWS
`ROUTE_OVERRIDE_UNAVAILABLE` when a named adapter is no longer connected
(`core/src/routing.ts:155,165`) instead of returning connection-required. So a
readiness change during a dispatch surfaces to the owner as the raw code
`ROUTE_OVERRIDE_UNAVAILABLE` in the panel, and the "Codex Exec readiness
changed" branches in BOTH `Chat.startDispatch` and `TaskRun.run` are dead for
that race. The new test pins the honest half of today's behavior (the run is
refused, no session survives, no records are written) without pinning the raw
string, and reaches the connection-required close through the same public IPC
with no adapter named. Fixing the raw-code copy, or making core return
connection-required for a named-but-disconnected adapter, is a decision for
the plan owner — it is core behavior and outside this brief.

## TDD evidence (this session)

**RED**, against the unchanged app, on the real close — not a hypothetical:

```
Error: expect(locator).toContainText(expected) failed
Locator: locator('.run-strip')
Expected substring: "No task records or model call were created."
Received string: "This task closed. Its records are in this project's
                  docs/ai-work.Add one visible resultOpen the run screen"
```

That is the Important finding reproduced live: a run that wrote nothing, with
the strip naming a records directory. **GREEN** after the fix: 3.1s.

**The live-region fix is asserted, not claimed.** The strip test marks the
region's DOM node with `data-live-region-probe` — an attribute React never
writes — while the run is going, and reads it back after the terminal line
lands. Neutered back to two conditional spans (rebuilt, run):

```
Error: expect(locator).toHaveAttribute(expected) failed
Expected: "same-node"     Received: ""
```

The node had been replaced, exactly as the reviewer described. Restored, the
attribute survives and the test passes — so the assertion discriminates rather
than decorating.

## Checks run (all real, this session)

- `cd app && npx tsc --noEmit` — **exit 0**.
- `cd app && npm run test:unit` — `tests 46 / pass 46 / fail 0`.
- `cd app && npx playwright test tests/conductor.spec.ts` — **11 passed**
  (10 before, one added).
- `cd app && npm run test:smoke` — **29 passed**, one clean run, no rerun and
  no flake. (28 at Task 064, plus this task's one.)

## Limitations and remaining human judgment

- The connection-required sentence names "Codex Exec" literally, matching the
  two existing sites. It is true today (only the codex lane can return that
  close) and it will need re-keying off adapter capabilities when a second
  worker adapter lands — the same ledgered lane-wording debt.
- The last-resort "This task closed." line is, as far as I can trace,
  unreachable: a closed session always carries an error, a Result activity, or
  a connection-required result. It stays as a factless default rather than an
  empty strip.
- The 064 residuals stand unchanged: a mid-run disconnect still hides the
  strip, a task-card chip pressed during a run is silently refused, and the
  terminal line is still a raw run word rather than a result card (Task 8).
- Milestone movement: NO. This is honesty repair on Task 064's surface.

Disposition: DONE
