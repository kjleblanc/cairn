# Task 071 — Brief

Requested visible outcome: review fixes on Task 070 (the commentary turn). Three
Important findings, one loose rationale. The commentary turn stays; what changes
is where it must not fire, what the owner sees when it collides with them, and
whether the money-safety fixture can be trusted.

Details (verbatim):

- **The quit drain must not start a paid call.** `run.then(post)` is registered
  at dispatch time, before `runs.settled()` subscribes on quit, so every
  quit-cancelled run carrying a conversation id starts a comment inside the
  drain — paid for, killed part-way by the process ending, never persisted and
  never seen. It is fired seconds after the quit dialog tells the owner "The
  model call already made is already paid for." `isQuitDraining()` becomes the
  FOURTH skip condition inside `commentary()` in
  `app/src/main/conductor/service.ts`, beside the other three, so the guarantee
  lives with the guarantees and not at the call site.
- **A refused message must leave no phantom turn.** While a comment streams,
  main holds the project's stream lock but the renderer never started a stream,
  so the composer stays open. A message sent into that window was appended
  optimistically and never taken back on refusal: a bubble that looks sent,
  is not on disk, and vanishes on the next reload. The refusal also told the
  owner to "stop it first" for a stream with no Stop control on screen. Both
  are fixed: `Chat.tsx` removes the optimistic turn on refusal, and the refusal
  in `send()` names the stream actually in flight.
- **The money-safety fixture must fail loudly on re-entry.**
  `app/tests/fixtures/conductor-connection.ts` keeps its snapshot in module
  state, so a second detach before a restore would record "there was nothing
  here" and the restore would then DELETE the owner's real connection. It now
  throws, and it names `playwright.config.ts`'s `workers: 1` as the config line
  it depends on.
- **One loose sentence corrected.** `commentary()` was documented as returning
  "at once". It runs synchronously as far as the first await, which includes
  `assembleBriefing`'s git calls. Nothing waits on it — the card is written and
  its delta sent before it is called — so the guarantee is stated as what the
  code actually holds.

Checks that will show the outcome holds:

- `app/tests/conductor.spec.ts`, RED first: a message sent while the comment
  streams is refused, leaves no owner bubble behind, is not told to stop
  anything, and is not lost.
- The re-entrancy guard's own discrimination check, run against a guard-free
  copy of the fixture.
- `npm run typecheck`, `npm run test:unit`, `npx playwright test` in `app`, and
  `cd core && npm test` — all green.

DONE means: no paid call can start while Cairn is quitting, the transcript never
keeps a message the main process refused, the owner is never pointed at a
control that is not there, and the connection fixture cannot silently destroy a
real key. STOPPED means any of the four still holds.
