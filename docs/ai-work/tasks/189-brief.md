# Task 189 — paper run thread

**Lane:** E

**Base commit:** `014fad7bd3ea7f6599a0bd72f5b8512756d57ed1`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

## Visible outcome

The live run status directly beneath Cairn's conversation reads as a quiet
paper task thread instead of a separate rounded dashboard card. Running,
settling, DONE, and STOPPED remain explicit at a glance. Stage/time and the
current safe action lead; the full requested outcome stays readable on its own
line without competing with the receipt or composer.

The thread belongs to the approved faded dusk paper system: transparent field,
thin ruled hierarchy, one restrained registration mark, controlled spacing,
and quiet text-like actions. It introduces no enclosing glass fill, border,
shadow, oversized corner, decorative travel, or faux-handwritten edge.

## Boundary of intent

- This is the in-conversation run-strip presentation slice only. Run state,
  session polling, dispatch, cancellation, acknowledgement, result cards,
  conversation ownership, project scope, timers, and navigation stay exact.
- Preserve `.run-strip-state` as the same live-region DOM node across running
  and terminal updates. Keep explicit status words and add only supplemental
  non-color geometry. Do not manufacture or hide state.
- Stop remains available only while a task is running. Open run remains
  reachable whenever the strip is present. The complete outcome remains
  visible even when another conversation does not contain that run's receipt.
- Preserve project-scoped strip truth independently of conversation-scoped
  result receipts. Do not merge, replace, or conditionally hide either one.
- Preserve compact and wide wrapping, keyboard order, focus visibility,
  screen-reader announcements, reduced motion, disabled-composer truth, and
  the current safe action names.
- Do not redesign dispatch confirmation, the receipt, proposal, questions,
  connection setup, composer, outer lantern, rail, pond, cast faces, or Town
  motion. Add no dependency, asset, animation, scribbled edge, or handwriting.
- No Core/CLI/phone source, credential, real provider call, worker call, push,
  publish, deployment, production system, or production data.
- Main's stopped Task 180/183 work and dormant lanes are protected. This task
  writes and commits only inside Lane E and does not land while main is dirty.

## Checks

1. Add a red-first renderer contract for flat paper material, explicit status
   and non-color state geometry, hierarchy, quiet controls, compact wrapping,
   focus, and no new motion.
2. Run focused run-strip/conversation renderer tests, the full App unit suite,
   typecheck, and both production builds.
3. With the owner's app closed and both app-token locks atomically held, use
   only Cairn's scripted local fake provider and fake worker to exercise the
   same strip node through running → terminal truth. Mechanically verify Stop,
   Open run, live-region continuity, keyboard focus, compact containment,
   disabled-composer truth, reload restoration, and reduced motion. No real
   provider or worker may be called.
4. Capture and inspect running and settled compact states beside the receipt
   and composer, then ask the owner for the remaining taste judgment.
5. Run `git diff --check`, inspect the exact diff and final Git status, and
   confirm the main checkout's protected work has not changed.

## DONE / STOPPED

**DONE** means the run strip visibly belongs to the conversation paper instead
of reading as another glass card; every running/terminal word, action, outcome,
live announcement, focus path, compact layout, and reduced-motion guarantee
still holds; all mechanical checks pass; the owner confirms the visual
direction; and only isolated Task 189 paths are committed in Lane E.

**STOPPED** means the strip hides or blurs run truth, loses an action or outcome,
replaces its live-region node, becomes conversation-scoped, changes workflow or
accessibility behavior, a required check cannot be repaired in scope,
protected work changes, or the owner does not confirm the visual result.
