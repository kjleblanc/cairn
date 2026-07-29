# Task 127 report — Remember the last seat; Cairn offers the add-a-model task

## Requested visible outcome

Owner direction: option D — remember the owner's last brain after a
disconnect (never the key), and when the owner connects with a custom seat,
Cairn itself offers in chat to add that model to the picker. Full brief:
`127-brief.md` (d03128d).

## What actually changed

- `app/src/shared/bodies.ts` — the curated list's one home (moved from
  `renderer/`; see the staging-race disclosure for the unusual path this
  took). Gains `OPENROUTER_BASE_URL` and `bodyBaseUrl()` so main and the
  renderer share the seat math.
- `app/src/main/conductor/seatnote.ts` — new, pure: `connectionNoteFor(
  baseUrl, model)` returns `null` for every curated seat (exact id+URL
  match; a curated id through a wrong host does NOT match) and otherwise a
  code-labeled note naming only the model id and host, instructing one
  natural offer of the add-a-model task and silence afterwards.
- `app/src/main/conductor/service.ts` — `streamTurn` inserts that note (when
  non-null) as one system message right after the briefing. Nothing else
  about the prompt changes.
- `app/src/renderer/components/ConnectCard.tsx` — reads `cairn-last-seat`
  (`{ baseUrl, model }` only) from profile-local storage at mount: a
  remembered seat opens the card straight on the pre-filled paste screen
  (custom seats restore both free-text fields); a successful connect writes
  it; a muted line — "Cairn remembers your last choice — never your key." —
  shows only while the on-screen seat IS the remembered one; a bad stored
  value is forgotten, not repaired. Fresh profiles still open on the Task
  126 start screen.
- `app/tests/fixtures/fake-conductor.mjs` — now also captures the raw body
  of the last ordinary reply request (`lastReplyBody`), the same
  wire-honesty pattern as task 080's commentary capture.
- `app/tests-unit/seatnote.test.ts` — new (red-first): curated seats silent,
  custom seat names model + host, wrong-host curated id is custom, one-offer
  wording, no key-shaped material.
- `app/tests-unit/bodies.test.ts` — import follows the shared move.
- `app/tests/conductor.spec.ts` — memory pins on disconnect AND relaunch
  (fields pre-filled, memory line, key field empty); a new wire test proves
  the note reaches the provider for the custom fixture seat (names
  `fixture-model`, the fixture host, the one-offer wording); the connect
  test explicitly forgets the seat + reloads at its start (see repair
  disclosure).
- `docs/ai-work/tasks/127-brief.md` (d03128d), this report,
  `docs/ai-work/LOG.md`.

`CONSTITUTION`, `consent.ts`, and every consent string byte-identical. The
key never touches the new storage (the field is cleared after every attempt,
as before). The note's whole content — model id and host — already reaches
the provider as the API call's own `model` field and endpoint, so the
connected-conductor data scope is unchanged in substance.

## Checks run and their real results

- `npm run test:unit` — 111/111 pass (107 + 4 red-first seatnote pins).
- `npm run typecheck`, `npm run build:vite`, `npm run build:lab` — green,
  on the fully merged tree (see disclosures).
- Full Playwright E2E with the app token held
  (`$TEMP/cairn-app-token`, taken and released): 44/44 pass (21 + 23,
  including the new seatnote wire test and the memory pins).
- Repair inside the task (disclosed): the seat memory persists in the
  spec-file's shared isolated profile, so the connect test's "fresh owner"
  opening assertions met a remembered card from an earlier test's connect.
  The feature was correct; the test's precondition was implicit. Fixed by
  having that test explicitly remove `cairn-last-seat` and reload before its
  opening walk; the memory pins at its end verify the feature itself.
- Screenshot (untracked scratch): `design/attachments/
  task-127-remembered-seat.png` — pre-filled paste screen with the memory
  line; visually inspected. Scratch spec deleted after.

## Mixed-tree and staging-race disclosures (parallel lane, same checkout)

- The motion slice landed mid-task as 8b895f8, titled "Task 126" — without
  the renumber it owed — and its commit SWEPT UP this lane's staged
  `git mv app/src/renderer/bodies.ts app/src/shared/bodies.ts` (a
  zero-content rename) and overwrote this lane's committed Task 126 report.
- That lane's own repair is pending in the working tree and was verified by
  this lane, not committed by it: a compatibility shim at
  `app/src/renderer/bodies.ts` (re-export of the shared module), their
  renumber records `128-brief.md` / `128-report.md`, and a byte-identical
  restore of this lane's 126 report. Every check above ran on the tree
  exactly as it stands — their motion landing, their pending repair files,
  and this task's changes together.
- This lane commits ONLY its own task-127 paths; the shim, the 126-report
  restore, and the 128 records remain the motion lane's to land.
- Three electron.exe processes from a previous day's E2E run remain alive —
  not this task's, owner's call.

## How to try it

Connect (any seat), then disconnect: the card re-opens pre-filled with your
last brain and the "remembers … never your key" line — paste and go.
Connect with Custom… instead and chat: Cairn will offer, once, to add that
model to the picker as a task.

## Limitations / remaining human judgment

- The seat memory is per app profile and never expires; there is no
  "forget my brain" button beyond choosing another seat (disconnecting keeps
  the convenience by design). A forget control is a reasonable follow-up if
  the owner wants one.
- The curated-match is exact string equality; a curated seat typed by hand
  with cosmetic URL differences reads as custom and earns one harmless
  offer.
- The chat-side offer is a prompt instruction, not a dispatched task; how
  well the conductor times and phrases it is the self-hosting loop's own
  future observation.
- The renderer shim at `app/src/renderer/bodies.ts` may be deleted once no
  `../bodies` import remains (its own comment says so) — a future cleanup.

Disposition: DONE
