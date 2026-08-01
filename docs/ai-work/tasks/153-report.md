# Task 153 — an honest commentary window, and a second dispatch that always appears

## What changed

Four files, plus records:

- `app/src/shared/ipc.ts` — `ConductorDelta` gains optional
  `turnKind?: ConductorStreamKind`, so a renderer can tell the owner's
  reply from the envelope's comment on a result card.
- `app/src/main/conductor/service.ts` — every delta/done/error event from
  `streamTurn` now carries `turnKind`; and a commentary that fails, is
  aborted, or hits the prompt-too-large guard emits a quiet, message-less
  `error` event (previously it emitted nothing) so the renderer can
  release its indicator. Main's design is unchanged: a failed comment is
  still dropped silently — nothing persisted, no error bubble, no retry.
- `app/src/renderer/screens/Chat.tsx` —
  - **The comment is visible while it streams.** New `commentary` state,
    set from `turnKind` on deltas, reattach (`conductorCurrent` snapshot),
    and cleared on done, on the quiet error, and on "New conversation"
    (which now also stops a running comment). It renders as a cairn bubble
    (class `bubble-commentary`) with the streamed text and a caption — "A
    short comment on the result card above — not an answer to a message.
    If a send bounces while this streams, your words stay put." — and NO
    Stop control, matching main's deliberate design that the envelope's
    call points at no Stop. The composer stays enabled (Task 070).
  - **A refused send keeps its text.** The refusal path in `send()` now
    restores the refused string into the composer; it used to clear it
    even though the send never happened — the "my message vanished" half
    of the owner's report. The error bubble and its Try-again resend are
    unchanged.
  - **The stale card leaves with its dispatch.** `startDispatch` success
    now also clears `taskBlock`, so a spent proposal (chips resolved, its
    "Send to dispatch" still clickable for a task that is already
    running) stops crowding the conversation and can never be re-sent.
- `app/tests/conductor.spec.ts` —
  - The held-commentary test (Task 070's) gains: the caption is visible
    while the comment is held; the refused send's text stays in the
    composer; and its waits now exclude the streaming bubble
    (`:not(.bubble-commentary)`) so Try-again still clicks strictly after
    the lock releases. Two other waits that synchronize on the settled
    comment turn got the same exclusion.
  - New regression test, the owner's exact report: "a second proposal
    after a dispatched run gets its own Send to dispatch" — first
    proposal resolved and dispatched offline, stale card gone, comment
    settled, second proposal ("detailtask", zero concerns) arrives with
    an ENABLED Send to dispatch, panel opens, second run completes with
    its own result card.

## Checks run and their real results

- `npm.cmd run typecheck` (in `app/`) — clean.
- `npm.cmd run test:unit` — 141/141 pass.
- `npm.cmd run build:vite` — green; `npm.cmd run build:lab` — green.
- Throwaway verification harness (`app/tmp-capture/verify.mjs`, deleted
  after use) against the fixture brain and offline demo — no paid call —
  with the fixture's commentary gate held for a deterministic window.
  All eight assertions PASS: stale card cleared on dispatch; commentary
  bubble visible while held; no Stop on it; composer still enabled;
  refused send keeps composer text; second proposal's Send to dispatch
  appears enabled; second dispatch panel opens; second run completes with
  its own result card. Two captures inspected and published as the top
  shots-page entry: `task-153-commentary.png`, `task-153-second-dispatch.png`.
- E2E, app token held at `app/.app-token` (released after):
  `tests/conductor.spec.ts` 27/27 (chunked by line target under the 300s
  tool cap), `tests/bridge.spec.ts` + `tests/away.spec.ts` +
  `tests/serial.spec.ts` 4/4, `tests/routing.spec.ts` +
  `tests/smoke.spec.ts` + `tests/connect-kimi.spec.ts` 14/14.
  `tests/projects.spec.ts` deliberately not run: it is the stopped
  Task 148/150 worker's modified file.
- `git diff --check` — clean.
- Protected work at report time: `Picker.tsx` (+13 lines) and
  `projects.spec.ts` (+26) byte-identical to task start; `LOG.md`,
  `design/`, the logs, and the 148/150/151 records untouched by this task.

## Repairs disclosed

1. **Renumber 152 → 153.** Lane B's "cast learns to feel" brief claimed
   task number 152 (commit `2ed19b2`) after this lane's first read of the
   queue; this lane's first brief commit overwrote it in the working tree.
   Repaired per the contract's later-one-renumbers rule: their brief
   restored byte-exact from `2ed19b2`, this task renumbered to 153, both
   committed in `490c280`. History keeps the collision visible; nothing
   was rewritten.
2. **Selector synchronization.** The visible streaming comment bubble
   would have satisfied three existing tests' "wait for the settled
   comment" locators early (it shares `.bubble-cairn`); the waits now
   exclude `.bubble-commentary`, preserving their timing guarantees.
3. **Task 151 shots note.** The captures published with Task 151 show its
   pre-repair 520px geometry; the shipped geometry at the default window
   is 408px (the node-clearance repair from that task's E2E). The Task 153
   captures show the same layout outcomes holding at the shipped geometry,
   and the shots-page entry says so.

## How to try it

Open the app (`npm.cmd start` in `app/`) and open a project with Cairn
connected. Dispatch a task; when the result card lands, watch the comment
stream in as a labeled bubble — the composer stays open, and if you send
right then and it bounces, your words are still in the composer and the
message says why. Then ask for the next change: its proposal card arrives
with its own "Send to dispatch", and the old card is gone.

## Limitations and remaining human judgment

- A send during the commentary window is still a refusal-by-design (Task
  070): the message explains, the text survives, and one retry lands it.
  Whether the window should instead QUEUE the send is a flow decision for
  the owner, not a defect.
- The run strip keeps showing the previous run's terminal line until the
  next run starts — pre-existing behavior, visible in the second-dispatch
  capture; left as is.
- `docs/ai-work/LOG.md` carries this task's row but stays uncommitted per
  the Task 149 precedent (the stopped worker rows 148/150 still await the
  owner's decision).

Disposition: DONE
