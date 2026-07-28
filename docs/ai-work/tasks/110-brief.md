# Task 110 brief — bound the remembered-projects registry

## Requested visible outcome

The app's remembered-projects list can never again grow without limit: it
is capped at 25 entries, so the boot-time `project:list` rescan (measured
~25 ms per entry, Task 103) always finishes well inside the renderer's
2-second poll, and the app cannot wedge on its own registry no matter how
it was used before.

## Boundary of intent — what must not change

- One file of product code: `app/src/main/registry.ts`. No behavior change
  below the cap; the list keeps its exact shape and ordering.
- The cap applies on READ (a legacy oversized file is cheap immediately)
  and on WRITE (the file self-heals on the next open). Nothing deletes
  project folders; the cap only drops the oldest *remembered* entries.
- A broken/missing entry is still shown honestly (existing test behavior).

## Checks that will show the outcome holds

1. New E2E test in `projects.spec.ts`: seed 30 entries, open one project —
   the file comes back with 25 entries, opened project first.
2. Full suite green (41 + 1 new = 42), isolated profiles, no operator env.
3. Typecheck clean; `build:vite` green.

## What DONE and STOPPED mean here

- DONE: cap in place, new test proves both the read bound and the write
  self-heal, suite 42/42.
- STOPPED: the cap breaks an existing assertion or the honest-broken-entry
  behavior — report before improvising.
