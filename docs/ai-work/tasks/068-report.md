# Task 068 — Report

Phase 3 Task 8: the envelope now has a turn of its own, and it uses it for
every terminal run.

## What changed

### `app/src/shared/ipc.ts` — a third conversation role

`ConductorTurn` is a union now:

```ts
export type ConductorTurn = ConductorChatTurn | ConductorEnvelopeTurn;
```

The chat arm is byte-unchanged (`role: "owner" | "cairn"`, `text`, `ts`, and the
optional `tokens`/`costUsd`). The new arm is `{ role: "envelope"; card:
ResultCard; ts: string }` — no `text` at all, deliberately: everything the card
says is rendered from structured fields, so there is no sentence for a model to
author and no wording to drift.

`ResultCard` carries a disposition the record files do not have: `ERROR`, for a
run that threw instead of closing. That arm has no task number, no route, and no
verified facts — only a fixed code.

`ConductorDelta.kind` gains `"envelope"`.

### `app/src/main/conductor/relay.ts` (new) — the composition

- `composeResultCard(result)` reads `result.composed` for the done and stopped
  arms and nothing else.
- `composeErrorCard(message)` keeps ONLY the fixed code. The rest of the message
  is dropped — a thrown error's text can carry paths and provider output, and
  this card is written to disk inside the owner's project.
- `postResultCard(dir, conversationId, card)` appends the turn and returns it.
  It sends no delta: neither relay nor service owns a window, so the caller that
  does sends it.

### Store, service, BodyPill, Chat — the union's ripples

- `readTurns` keeps an envelope line only when its `card` is an object with
  `kind === "result"`, a known disposition, and a real `filesChanged` array.
  Anything else is dropped, never coerced.
- `listConversations` previews the first thing owner or Cairn SAID; a
  conversation where neither ever spoke previews as `"Result card"`.
- Prompt assembly maps an envelope turn to a `system` message labeled
  `Envelope result card (verified by Cairn's runtime, not by the conversation
  model):` followed by the card's own JSON, so the model cannot mistake it for
  its own earlier reply.
- `BodyPill`'s `replyLine` returns null for anything that is not a Cairn reply.
- `Chat` renders envelope turns as a card and handles an explicit `"envelope"`
  delta branch. That branch is FIRST in the handler, before the in-flight
  matching, so a card can never adopt a conversation id for a stream it has
  nothing to do with; it posts only while its own conversation is on screen.

### `app/src/main/tasks.ts` — the post-settle hook

```ts
settlements.set(dir, run);
...
void run.then(
  (outcome) => post(() => (outcome.ok ? composeResultCard(outcome.value) : composeErrorCard(outcome.message))),
  (error: unknown) => post(() => composeErrorCard(plainMessage(error))),
);
```

The chain is on the settled promise, not inside the run closure, so it executes
after that closure's `finally`: `clearRunning(dir)` has already run and the send
gate is already open when the card lands. Task 9's commentary gate depends on
that ordering, and the fake-codex test asserts it (the composer is enabled with
the card on screen).

It posts only when the request carried a `conversationId`, and it reads nothing
that `task:acknowledge` may have deleted — only `dir`, the id from the request,
and the run's own outcome.

## Three decisions worth naming

**1. `commit` comes from `composed.commit.reason`, not `result.commit.hash`.**
On a clean-start DONE the two differ: `composed` carries the pre-commit sentence
the report was rendered with, while `result.commit` carries the hash the commit
produced afterwards. The card exists to agree with the record on disk, so it
takes the record's own value. That sentence is never a claim about a commit that
did not happen — a DONE close is only returned after `commitExactPaths`
succeeded; a failed commit rewrites to STOPPED, where `composed.commit` is null.

**2. The connection-required arm gets `route: null`.** The brief said "route
from `result.route`'s fields", but that arm's `RouteResult` has no
`adapterLabel`, `provider`, or `model` — only `reason` and an empty candidate
list, because no adapter was ever resolved. Inventing a route there would be the
exact failure Task 065 fixed in the strip. Core's own readiness sentence rides
`evidenceSummary`, the card's one free line, and the render pairs it with the
adjudicated sentence `No task records or model call were created.` That is the
one field in the card used for something other than its name, and it is named
here rather than hidden.

**3. `composeErrorCard` checks the code's SHAPE, not just the colon.** "Text
before the first colon" alone would dress a raw runtime prefix as a Cairn code
the owner could go looking for: `ENOENT: ...` becomes `ENOENT`, and a Windows
path `C:\Users\...` becomes `C`. The code is accepted only if it matches
`/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/` within 64 characters — the shape every fixed
code in this codebase already has. No fixed code, no claimed code. This is
strictly fail-closed: it can only reject, never invent.

## TDD evidence (RED observed this session)

Six tests written first in `app/tests-unit/resultcard.test.ts`. `npm run
test:unit` runs `tsc` before the suite, so the first RED is compile-level and
names exactly what does not exist yet:

```
tests-unit/resultcard.test.ts(7,53): error TS2307: Cannot find module
  '../src/main/conductor/relay.js' or its corresponding type declarations.
tests-unit/resultcard.test.ts(181,26): error TS2322: Type '"envelope"' is not
  assignable to type '"owner" | "cairn"'.
tests-unit/resultcard.test.ts(190,22): error TS2339: Property 'card' does not
  exist on type 'ConductorTurn'.
tests-unit/resultcard.test.ts(191,22): error TS2339: Property 'card' does not
  exist on type 'ConductorTurn'.
tests-unit/resultcard.test.ts(192,26): error TS2339: Property 'card' does not
  exist on type 'ConductorTurn'.
tests-unit/resultcard.test.ts(199,26): error TS2322: Type '"envelope"' is not
  assignable to type '"owner" | "cairn"'.
```

GREEN after `relay.ts` and the union landed. The six cases are the brief's six:
the done card's Git-derived files (and its own copy of that array), the stopped
card's fixed reason with no commit and the real `protectedIntact: false`, the
connection-required mapping, the error card's code with an assertion that the
raw message text never rides the card, the store round-trip plus the drop of
`{"role":"envelope","card":{"kind":"nope"}}`, and the `"Result card"` preview.

## The union's ripples, in full

The brief named `store.ts`'s preview and `BodyPill`'s `replyLine`. The compiler
found these additional property-access sites, all fixed:

| Site | What broke | Fix |
|---|---|---|
| `store.ts` `readTurns` | `value.text` on the union | branch per role; envelope validated by card shape |
| `service.ts` history mapping | `turn.text` on the union | envelope maps to a labeled `system` message |
| `Chat.tsx` turn render loop | `turn.text` on the union | envelope renders `ResultCardView` |
| `tests-unit/store.test.ts` (×2) | `readTurns(...).map(item => item.text)` | one `spokenTexts` helper that marks a card instead of reading text off it |

`Chat.tsx`'s `lastReply` needed no change — its `find` still returns the union,
and `BodyPill` guards on the role.

## Checks run (all real, this session)

- `npm run typecheck` in `app` — clean.
- `npm run test:unit` in `app` — **tests 52 / pass 52 / fail 0** (46 before this
  task, plus this task's 6).
- `npx playwright test` in `app` — **31 passed** (29 before, plus this task's 2).
  Both new tests are in `tests/conductor.spec.ts`: the mock lane asserts the
  DONE card renders with `Files changed (from Git, not from claims)`, the
  claims heading, and the records path, then reloads and finds it again on disk
  (and confirms exactly one turn with `role === "envelope"`); the fake-codex
  lane stops a real-shaped run and asserts a STOPPED card naming
  `CANCELLED_BY_OWNER`, no commit, no `DONE` anywhere on the card, no
  `visible.txt` on disk, and an already-open composer.
- `cd core && npm test` — **tests 104 / pass 104 / fail 0**. Core was not
  touched; this is the regression check.
- The known conductor.spec connect-card flake did not appear: the full suite
  passed on its first run, twice.

Files touched: `app/src/shared/ipc.ts`, `app/src/main/conductor/relay.ts` (new),
`app/src/main/conductor/store.ts`, `app/src/main/conductor/service.ts`,
`app/src/main/tasks.ts`, `app/src/renderer/components/BodyPill.tsx`,
`app/src/renderer/screens/Chat.tsx`, `app/src/renderer/app.css`,
`app/tsconfig.unit.json`, `app/tests-unit/resultcard.test.ts` (new),
`app/tests-unit/store.test.ts`, `app/tests/conductor.spec.ts`,
`docs/ai-work/tasks/068-brief.md`, `docs/ai-work/tasks/068-report.md`,
`docs/ai-work/LOG.md`.

`core/src/index.ts` was NOT changed. The authorized one-line re-export of
`ComposedRecordInput` turned out to be unnecessary: `relay.ts` narrows
`SerialRunResult` and reads `result.composed` structurally, so the type resolves
through `serial.d.ts` without ever being named in app code.

## Limitations and remaining human judgment

- **A card is conversation-keyed; the run strip is project-keyed.** A run
  dispatched from conversation A and watched from conversation B shows B the
  strip's terminal line and no card; the card is on disk in A and appears when A
  is opened. This split is intentional and was adjudicated in Task 064 — the
  send gate is per-project, the card belongs to the conversation that asked for
  it. Nothing false is shown in either place, but the two surfaces do not agree
  in that case, and an owner could be surprised.
- **`Open the run screen` on an old card leads to the entry form.** The run
  session is deleted on acknowledge; the card outlives it. The screen then shows
  its ordinary "What should change?" form — honest, but not the run the card
  describes. The card's records path line is the durable pointer.
- **The ERROR card's second link is a path line, not a control.** The card
  states the code, the fixed sentence, `Open the run screen`, and
  `Any records this run retained are in this project's docs/ai-work.` Opening a
  local folder is not a capability this app has (`openExternal` takes a URL),
  and inventing one was out of scope. The wording avoids claiming records exist.
- **The store's validation is shape-level, not field-level.** A card whose
  `kind`, `disposition`, and `filesChanged` are right but whose `route` was
  hand-edited would render that edit. The card is written inside `.cairn/`,
  which is excluded from git and owner-owned; a deeper schema check would trade
  drop-on-evolution risk for a threat the owner already controls.
- **`evidenceSummary` carries the readiness reason on the connection-required
  arm.** Named above as decision 2. If a future card shape gains a `reason`
  field, that fold should move to it.
- Milestone movement: NO. This is the visible surface Phase 3 was building
  toward, but the milestone is a full dispatch-and-comment loop; Task 9 (the
  conductor commenting on a card it did not write) is still ahead.

Disposition: DONE
