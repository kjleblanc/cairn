# Task 152 — an honest commentary window, and a second dispatch that always appears

Requested outcome: In the desktop app's chat with Cairn, after a dispatched
run finishes, (a) the short comment the envelope streams on the result card
is VISIBLE while it streams — today it is invisible: the composer looks
ready, but any send is refused, the typed text vanishes from the composer,
and from the owner's chair the next "Send to dispatch" never arrives; and
(b) a message refused during that window leaves the typed text in the
composer instead of clearing it; and (c) once a dispatch actually starts,
the stale proposed-task card (its "Send to dispatch" still clickable for a
task that already ran) leaves the screen, so a later proposal in the same
conversation is unambiguously the current one.

Owner's words: "It's a bit buggy. If CAIRN wants to send to dispatch more
than once during a chat, the button never appears."

Reproduced before fixing (throwaway harness, fixture brain, offline demo):
during the envelope's commentary the composer is enabled and shows no
streaming indicator, and a send is refused with "Cairn is finishing a short
comment on the result card" — the composer clearing the refused text. The
commentary stream is real but invisible (`streaming` stays false while
`streamingText` accumulates).

## Boundary of intent

- The Task 070/137 design stays: the composer remains ENABLED during the
  commentary, main keeps refusing sends with the same explanatory message,
  and Try again keeps resending. The change is that the commentary is
  visible while it streams and a refused send keeps the owner's text.
- The commentary never gets a Stop control (main's deliberate design: the
  envelope's own call points at no Stop). A failed or stopped commentary
  stays silent — no error bubble, no phantom partial turn — but the
  renderer must RELEASE its indicator in every one of those endings.
- Protected in-flight work unchanged: `Picker.tsx`, `projects.spec.ts`,
  `LOG.md`'s uncommitted rows, `design/`, the logs, and the 148/150/151
  task records. `projects.spec.ts` is not run.
- The phone bridge protocol is untouched (`emitBridgeSync` carries no
  delta shape); the standalone chat screen shares `Chat.tsx` and gets the
  same fixes.

## Changes planned

- `app/src/shared/ipc.ts`: `ConductorDelta` gains optional `turnKind`.
- `app/src/main/conductor/service.ts`: delta/done/error events carry
  `turnKind`; a commentary that fails, is aborted, or hits prompt-too-large
  emits a quiet `error` event (no message) so the renderer can release.
- `app/src/renderer/screens/Chat.tsx`: commentary state — visible cairn
  bubble with a caption and no Stop; refusal restores composer text;
  `setTaskBlock(null)` when a dispatch actually starts; "New conversation"
  stops and clears commentary; reattach recognizes a `commentary` snapshot.
- `app/tests/conductor.spec.ts`: extend the held-commentary test (caption
  visible, refused text retained) and add the owner's exact regression:
  second proposal after a dispatched run gets an enabled "Send to dispatch".

## Checks

- `npm run typecheck`, `npm run test:unit`, `npm run build:vite`,
  `npm run build:lab` in `app/` — all green.
- Throwaway repro harness re-run: the second "Send to dispatch" appears and
  dispatches; a capture of the visible commentary state for the shots page.
- `npx playwright test` on conductor.spec.ts (full file, chunked under the
  300s tool cap), bridge.spec.ts, away.spec.ts, serial.spec.ts,
  routing.spec.ts, smoke.spec.ts, connect-kimi.spec.ts — green, app token
  held at `app/.app-token` and released after.
- `git diff --check`; protected paths byte-identical at report time.

DONE means the outcome holds in the repro and the new E2E test, every check
is green, protected work is untouched, and the changes land as one
exact-path local commit.

STOPPED means a check fails that in-task repair cannot fix, protected work
changes, or the repro still shows the wedge.
