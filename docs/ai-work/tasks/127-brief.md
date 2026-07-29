# Task 127 brief — Remember the last seat; Cairn offers the add-a-model task

Owner direction (2026-07-29): option D from this lane's proposal — "Remember
your last brain after disconnect, and when you connect with Custom…, Cairn
itself offers in chat to add that model to the picker."

Note on the number: the parallel lane's motion-slice task claimed 126 after
this lane and owes the renumber; this lane claims 127 for option D first, so
the motion-slice renumber's next free number is 128.

## Requested visible outcome

1. **The card remembers your last brain — never the key.** A successful
   connect saves only `{ baseUrl, model }` to profile-local renderer storage
   (`localStorage`, the same place theme/sound already live). On a later
   disconnect the card re-opens directly on the one-paste screen pre-filled
   with that seat (curated seats restore their fixed view; a custom seat
   restores the two free-text fields, pre-filled), with one muted line:
   "Cairn remembers your last choice — never your key." First-time profiles
   (nothing stored) still open on the Task 126 start screen. Disconnecting
   keeps the memory (it's a convenience, not a credential); nothing is
   remembered until a connect succeeds.
2. **A custom seat gets Cairn's offer, not homework.** When the connected
   seat is NOT one of the curated picker entries, the conductor's turn gains
   one code-assembled system note naming the model id and host: at a natural
   early moment, Cairn offers ONCE to add that model to the picker as a task
   (the Task 123/124 add-a-model loop), and lets it go if the owner declines
   or ignores it. Curated seats add nothing to the prompt.
3. **One source of truth for the curated list** moves from
   `app/src/renderer/bodies.ts` to `app/src/shared/bodies.ts` so main can
   ask "is this seat curated?" without a drifting copy (shared/ is already
   the cross-bundle home, e.g. `ipc.ts`).

## Boundary of intent

- The remembered seat is `{ baseUrl, model }` only — never the API key, and
  the connect flow's key handling is untouched (field cleared after every
  attempt; keystore path unchanged).
- The connection-facts note carries ONLY the model id and host — data the
  provider already receives as the API call's own `model` field and
  endpoint, so nothing new leaves the machine. `CONSTITUTION`,
  `consent.ts`, and every consent string stay byte-identical; the briefing
  assembly (`context.ts`) is untouched.
- The note is labeled as code-assembled (the established cardBriefing
  pattern), instructs ONE offer, and never dispatches anything itself.
- `streamTurn`'s history, envelope, and commentary ordering is otherwise
  unchanged; the note inserts right after the briefing.
- Files in scope: `app/src/shared/bodies.ts` (moved), import updates
  (`ConnectCard.tsx`, `bodies.test.ts`), `app/src/main/conductor/seatnote.ts`
  (new, pure), `app/src/main/conductor/service.ts` (one insertion),
  `app/src/renderer/components/ConnectCard.tsx` (memory), plus pinned tests
  and task records.
- The parallel lane's in-flight work (`main.tsx`, `tokens.css`,
  `motion.css`, its tmp harnesses, `design/`) is never touched, staged, or
  committed; mixed-tree disclosure applies as usual. If the motion slice
  lands mid-task, re-verify against the merged tree before landing.

## Checks that will show the outcome holds

- Red-first unit: `seatnote.test.ts` pins curated seats → no note, custom
  seat → note names model + host and contains no key-shaped material;
  `bodies.test.ts` passes from the new shared path.
- Unit suite, typecheck, `build:vite`, `build:lab` green.
- Full E2E with the app token held: the connect test gains memory pins
  (after disconnect the card re-opens pre-filled with the fixture seat in
  custom mode; same on relaunch), and a wire assertion proves the
  connection-facts note reaches the provider only for the custom fixture
  seat (the fixture records what it is sent).
- Screenshots of the remembered-seat paste screen via a scratch spec
  (deleted after), visually inspected.

## DONE and STOPPED

- DONE: a reconnect after disconnect is one paste with nothing to choose;
  a custom seat produces exactly one honest offer note in the prompt;
  curated seats change nothing; all checks green.
- STOPPED: a check fails, the memory would store anything beyond
  baseUrl+model, or the note cannot stay within the already-disclosed data.
