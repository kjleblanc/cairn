# Task 259 brief — the chat-first workspace, and retiring the visible Town and Pond

**Lane:** A (the main checkout), owner-confirmed free before any file was
written. **Base commit:** `19e7584`. **Slice:** 4 of 11 in
`docs/superpowers/plans/2026-08-13-cairn-resident-program-visual-overhaul.md`.

**259 is the lowest genuinely free number.** Every filename beginning with a
number was listed across the main checkout, all nine registered worktrees and
all thirteen local branches: 001–258 are taken without a gap, and nothing
begins with 259. The number quoted in the handoff was not trusted.

## The requested visible outcome

Cairn opens on a calm, chat-first desk. A slim rail holds navigation, a quiet
header holds the project's identity and whether Cairn is connected, and the
conversation is the object in the middle. Below the header, one small Cairn sits
beside a written line that says what is happening right now — and that line, not
his face, is the truth.

The town square, the pond, the draggable workers, the threads, the transfer
packets and the tucked villager chip are gone from the running app.

**This inverts Slices 2 and 3.** Their deliverable was that nothing moved. This
one changes what the owner sees, so "no visible change" is not the finish line
and Slice 3's guard that no `.rp-` selector reaches anything is about to stop
being true on purpose.

**Owner gate 2 falls at the end of this task.** It is the first owner judgment
since Slice 1, and this task's DONE carries the owner's confirmation. Nothing
proceeds on assumed approval.

## Two decisions taken before the work

**One resolved presence value, not two.** A pure combiner in
`renderer/activity/presence.ts` takes the neutral runtime truth from
`activity/presentation.ts`, Chat's `needsYou` seam and the conductor's
connection, and returns one value carrying the written status, the secondary
detail, the ground tone and the `CairnProgramState`. The line and the face are
read off the same field of the same object. Two independent answers to "is
something waiting?" would eventually disagree, and the line would be the one
that lied — which is the reason `pondLineLabel` was given the pond's `needsYou`
rather than recomputing it, and the reason survives the pond.

Its precedence, highest first, with the reason each rank has to sit where it is:

| # | Input | Resolves to | Why here |
|---|---|---|---|
| 1 | `needsOwner` | `needs-decision` | A waiting decision is the one state the owner must act on; nothing may bury it. This is the approved Task 155 / Decision 9 rule, kept. |
| 2 | truth `error` | `error` | A monotonic escalation in the runtime projection already; never masked. |
| 3 | truth `stopped` | `stopped` | An honest stop outranks a quiet desk. |
| 4 | truth `done` | `done` | A verified outcome outranks a quiet desk. |
| 5 | truth `thinking` | `thinking` | A live Cairn turn owns his face while it streams. |
| 6 | truth `checking` | `checking` | |
| 7 | truth `working` | `working` | |
| 8 | truth `starting` | `working` | The constitution's table makes "Starting / working" one row; the expression is shared and the written line still distinguishes them. |
| 9 | `!connected` | `disconnected` | Below every real run state: a reattached run and a saved result are true whether or not the conductor is connected, and the header carries the connection permanently anyway. |
| 10 | truth `quiet` | `ready` | |

**The conversation's interior is Slice 5's, not this task's.** This task moves
the conversation onto the approved warm paper by re-pointing the paired tokens
the interior is already written against — the mechanism `.chat-column-villager`
itself uses today — rather than rewriting the roughly two hundred rules inside
it. Bubbles, prose, composer and follow-up language are Slice 5.

## The boundary of intent — what must not change

1. Workspace's active project, polling, capture identity attributes
   (`data-project-dir`, `data-project-generation`), the project-generation
   guard, view routing to Dashboard and TaskRun, and the Chat focus signal.
   These are behaviour, not scenery.
2. The serial runtime, project-local records, project-switch isolation, stale
   poll guards, unfinished-run recovery, and reattachment.
3. Chat's orchestration: streaming, queued sends, unsent drafts, stop, retry,
   take-back, new conversation, close/reopen reattachment, saved-result
   recovery, and every approval boundary and its wording.
4. Literal `DONE`, `STOPPED` and `ERROR` meaning. State is never colour-, face-,
   position- or motion-only.
5. `App`'s persistent base view, inert and `aria-hidden` overlay behaviour,
   Escape, focus containment and focus restoration.
6. Existing stored data. `.cairn/town-square.json` is never deleted or
   transformed; the persistence code stays and simply stops being read.
   `TownSquare.tsx` and the whole `renderer/town/` directory stay on disk —
   Slice 10 deletes them.
7. The phone companion, `core/**`, `cli/**`, `src/main/**`, IPC, preload,
   stores and package manifests.
8. The 760 px minimum desktop window width. This task does not lower it.
9. No new dependency, and no runtime import from `@cairn/core` into the
   renderer.

## Checks

Run from `app/`.

1. **`c1` — nothing of the Town, the pond or the tucked chat is mounted.** No
   rendered output of the workspace contains a town square, a pond line, a pond
   back-control, a villager chip or a tuck control, and no production module
   imports `TownSquare` or `PondLine`. Proved by rendering, not by grepping the
   source alone.
2. **`c2` — the written status and Cairn's expression come from one value.**
   The combiner is pure and total; the capsule reads both from the same resolved
   object. Proved by a test that changes the resolved value and observes both
   move together, and by asserting the component derives the state from the same
   call rather than a second projection.
3. **`c3` — every state the constitution names is written.** ready/idle,
   thinking, needs-decision, starting, working, checking, DONE, STOPPED, error
   and disconnected each produce a distinct written line, and no two states
   share one. Overlapping inputs — streaming with a decision waiting, terminal
   with a decision waiting, terminal while disconnected, streaming while
   disconnected — resolve by the precedence table above.
4. **`c4` — a stale project or run can never paint the current project.** A
   project switch resets the presence to its quiet state, and an event or poll
   for the old project arriving afterwards changes nothing on screen.
5. **`c5` — capture identity survives.** `data-project-dir` and
   `data-project-generation` are still on the stage element, and the generation
   still increments exactly once per project change.
6. **`c6` — Chat is a main region, and the keyboard still works.** The
   conversation is a `main`/`section` landmark with an accessible name and no
   `role="dialog"`; the focus signal still focuses the composer; focus is
   visible on tab; and the activity capsule is not interactive.
7. **`c7` — the composition contains itself at every desktop size.** 1320×980,
   1320×820, 760×1000, 760×720, the supported minimum 760×620, and the test-only
   below-minimum 540×900 stress: no horizontal page scroll, header and capsule
   and composer never overlap, the transcript is the only region that scrolls,
   and the connection state is never the thing pushed off the edge. **No new
   breakpoint is introduced** — the breakpoint set is asserted.
8. **`c8` — reduced motion reaches the identical semantic end state, and
   nothing loops.** No perpetual animation is introduced, every new animation is
   finite and ends at `transform: none`, and no transform is applied to a
   container holding interactive controls.
9. **`c9` — measured contrast holds in both themes on the real composition.**
   Recomputed in the browser from what is actually drawn, not read from the
   stylesheet, at the floors the constitution sets: 4.5:1 body text, 3:1 for
   controls, focus rings and state marks.
10. **`c10` — Slice 3's isolation guard now says what it is meant to say.**
    That guard proved `.rp-` reached nothing. This task makes it reach
    production on purpose, so it is rewritten to prove the thing that must stay
    true — every new selector is still `.rp-`-prefixed and bounded, production
    still imports nothing from `lab/`, and the lab board and production still
    agree token for token — and the change is disclosed as **Rewritten**.
11. **`c11` — the app compiles, builds and tests as it did.**
    `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build:vite`,
    `npm.cmd run build:lab`, plus every board and qualification suite this
    change could touch even where the plan does not list it. The unit **failure
    SET** is diffed against the 997 / 986 / 9 / 2 baseline, never the count.
    Every retired visual test carries a recorded disposition — Preserved,
    Rewritten or Replaced — and no blanket snapshot update is made.
12. **`c12` — targeted E2E under the exact mutex protocol.** The conductor,
    projects and contrast scenarios this change touches, one invocation per
    scenario, `workers: 1`, with `--output=test-results/task259-runner`. Three
    E2E scenarios are known red on `main` and are not this task's to fix; each
    is re-derived rather than assumed.
13. **`c13` — Owner gate 2.** Real production screenshots or the running app in
    empty, responding, needs-owner, working, DONE and STOPPED states, at wide,
    at the supported minimum 760×620, and at the test-only 540×900 stress. The
    owner is asked about scale, calmness, hierarchy, and whether Cairn feels
    present but small. **The owner's words are recorded verbatim.**
14. **`c14` — no dependency, no external action.** No install, provider or
    model call, credential, paid call, network or external-service write, push,
    publication or deployment. No `.cairn` data read, written or deleted.
15. **`c15` — records and Git protection.** This brief committed alone; the
    completion commit stages only this task's exact paths. Nothing cleaned,
    stashed, reset, broadly staged or rewritten. Every unrelated tracked,
    modified and untracked path is protected, including the untracked evidence
    under `app/test-results/`, which is backed up before Playwright runs
    because Playwright clears its output directory.

## DONE and STOPPED

**DONE** means the app opens on the approved composition — slim rail, quiet
header, centered conversation paper, one small Cairn, a non-interactive written
activity capsule — with no Town, pond or tucked chat mounted; every behaviour in
the boundary above still holds; checks `c1`–`c12`, `c14` and `c15` pass or have
their real results recorded; **and the owner has approved gate 2 in their own
words.**

**STOPPED** if runtime behaviour cannot be preserved through the composition
change, if a stale project or run can paint the current project, if a concrete
risk boundary is reached, or if the owner's gate-2 verdict is anything other
than approval. A STOPPED report names the exact state and the smallest useful
next choice, and the composition is left in a recoverable place.

Slice 5 will not be begun in this conversation.
