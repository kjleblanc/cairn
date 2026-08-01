# Task 157 brief — Cairn suggests follow-up tasks when a task completes

## Requested visible outcome

Whenever a dispatched task finishes and the envelope posts the result card,
Cairn's short comment on the card is followed by up to three concrete
next-step suggestions, shown as tappable chips right under the comment.
Tapping a chip sends that suggestion as the owner's own message, starting the
ordinary conversation (pushback → proposal card → the owner's dispatch
approval). The suggestions reappear after a reload, because they persist with
the comment turn.

## Why (owner's words)

"Let's add follow up task suggestions from CAIRN whenever a task completes."

This deliberately overrides the commentary turn's founding rule ("a comment
on finished work is not a pitch for more", service.ts) — the owner now asks
for exactly that pitch, in lightweight form.

## Boundary of intent — what must not change

- Dispatch approval: suggestions never dispatch anything. A tap only sends an
  ordinary owner message; every dispatch still waits behind the proposal card
  and its own disclosure confirmation.
- Cost basis: no new paid call. Suggestions ride the existing commentary
  turn — same stream, same standing authorization. Commentary still skips
  silently under its existing guards (no connection, stream in flight, run
  active, quitting, card not posted); when it skips, there are no
  suggestions, and the card stands alone exactly as today.
- Commentary failure contract: still a silent drop — no error bubble, no
  partial turn persisted, no chips from a comment that never finished.
- Fail-closed parsing, same posture as the task block: a malformed
  suggestions block yields no chips; the comment's visible text always
  survives with the fence stripped. A commentary still never emits a
  `cairn-task` proposal block.
- The phone stays read-only (Task 143): the suggestion field may flow through
  the bridge snapshot, but the phone page gains no action affordance.
- No dependency changes. Protected in-flight work untouched: the modified
  app.css, TownSquare.tsx, Picker.tsx, tokens.css, projects.spec.ts, LOG.md
  (uncommitted per the Task 149 precedent), the untracked 148/150 records,
  design/, faces.tsx, and the log files. (Chat.tsx is already modified in the
  tree by another actor; I will read the current file and extend it
  carefully, flagging any foreign hunks I find rather than reverting them.)

## Plan (AI decision)

- New `app/src/main/conductor/followups.ts`: `extractFollowups(text)` parses
  one ```cairn-followups fence holding a JSON array — 1 to 3 items, each a
  non-empty single-line string ≤ 140 chars, trimmed, de-duplicated; any shape
  violation returns null and the visible text keeps the fence stripped.
- `service.ts`: `COMMENTARY_INSTRUCTION` now asks for the one short comment
  plus up to three next steps in that fence, each written as a short
  imperative the owner could send as-is; still "no cairn-task block". On the
  commentary done delta, followups ride along; the persisted cairn turn
  carries `followups` so a reload re-renders the chips. A reply turn that
  emits the fence has it stripped and dropped (symmetric with the commentary
  task-block drop).
- `shared/ipc.ts`: `ConductorChatTurn` gains `followups?: string[]`;
  `ConductorDelta` gains `followups?: string[] | null`.
- `store.ts` `readTurns`: a persisted cairn turn's `followups` is revalidated
  fail-closed (array of ≤ 3 single-line strings ≤ 140 chars) and dropped if
  malformed — the conversation file lives inside the project a worker can
  write to.
- `Chat.tsx`: when the LAST turn is a cairn turn carrying followups (the just
  -settled comment, or one read back from disk), render up to three chips
  under it with a one-line plain label; a tap calls the ordinary `send()`
  with the suggestion verbatim, so queueing, refusal, and retry behavior are
  exactly Task 155's. The chips vanish the moment the conversation moves on
  (they only render on the last turn).
- Fixture + E2E: `fake-conductor.mjs`'s commentary script gains a followups
  fence; `conductor.spec.ts` gains the regression — chips appear after the
  comment settles, tapping one sends it as an owner message.

## Checks that show the outcome holds

1. New unit pins: followups parser (valid 1–3, >3 rejected, non-array, bad
   item, multiline, >140 chars, fence stripped, dedupe) and store round-trip
   (valid persists, malformed dropped on read).
2. `npm run typecheck` and `npm run test:unit` in `app/` — green.
3. `npm run build:vite` and `npm run build:lab` — green.
4. `conductor.spec.ts` E2E with the app token held (chunked per file over the
   300 s shell cap), including the new suggestion regression; `bridge.spec.ts`
   green (the snapshot now carries the new field). `projects.spec.ts` NOT run
   (protected, per the Task 151/153/154 precedent).

## DONE and STOPPED here

- DONE: checks 1–4 pass, and after a run settles the owner sees up to three
  suggestion chips under Cairn's comment; tapping one sends it as their own
  message and nothing dispatches by itself.
- STOPPED: the commentary stream's reliability regresses (cards without a
  comment, stuck indicators), the fixture harness flakes twice on the new
  path for a harness reason, or protected work would be touched.
