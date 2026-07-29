# Task 118 — Concept 04: warm interface spirit

## Requested visible outcome

The lab-only avatar concept board gains a fourth direction, **Warm
interface spirit**, mixing the owner's two closest references: Concept 03's
sparse, mature interface-spirit base with a measured amount of Concept 01's
lopsided warmth and asymmetry. The new concept leans slightly toward
interface spirit and is posed across ready, thinking, working, DONE, and
STOPPED states beside the existing three.

## Boundary of intent — what must not change

- Lab-only concept files may change: `app/lab/concepts.tsx` and
  `app/lab/concepts.css`, plus this task's records. The existing three
  concepts remain available for comparison.
- Nothing under `app/src` changes; shipped renderer behavior, town runtime,
  core, CLI, contract, dependencies, credentials, and Git behavior remain
  untouched.
- The board remains clearly marked as mock concept exploration. Poses are
  visual only and do not claim runtime state.
- Existing garden tokens and reduced-motion behavior are reused; the
  untracked `design/` references stay outside the commit.

## Checks that will show the outcome holds

1. `npm.cmd run typecheck` in `app/` passes.
2. `npm.cmd run build:lab` passes.
3. `/`, `/lab/index.html`, and `/lab/concepts.html` still return HTTP 200
   with the correct badges.
4. An isolated Electron render proves all four concepts and all five poses
   are present; a screenshot is captured and inspected.
5. `git diff --check` is clean and the commit is scoped to lab concept
   files and records.

## What DONE and STOPPED mean here

- DONE: the owner can compare Concept 04 beside the original three, and it
  visibly leans interface-spirit while carrying lopsided warmth.
- STOPPED: the concept cannot be added without shipped-code changes, a
  check fails without an in-scope correction, or the new pose overclaims
  runtime state.
