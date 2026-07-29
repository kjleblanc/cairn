# Task 117 — avatar concept board in the visual lab

## Requested visible outcome

The visual lab gains a lab-only avatar concept board that shows three
candidate Cairn face languages side by side — **lopsided hologram**,
**grown-up Ed**, and **interface spirit** — each posed in ready, thinking,
working, DONE, and STOPPED states. The owner can compare the directions in
the browser before any shipped town-square face changes again.

## Boundary of intent — what must not change

- Lab-only presentation work: new concept-board files, the lab build input,
  and a small lab-controls link may change. Nothing under `app/src` changes;
  the shipped Electron renderer, town runtime, core, CLI, contract,
  dependencies, credentials, and Git behavior remain untouched.
- The board is clearly marked as mock concept exploration. It does not
  simulate or claim runtime state; the state names are visual poses only.
- The board reuses the existing garden token palette and respects reduced
  motion. No raw product behavior, accessibility claim, or worker identity
  is introduced.
- Existing untracked `design/` references remain untracked and untouched by
  the commit.

## Checks that will show the outcome holds

1. `npm.cmd run typecheck` in `app/` passes with the concept board sources.
2. `npm.cmd run build:lab` passes and bundles the concept board.
3. An in-process Vite lab server returns HTTP 200 for `/lab/concepts.html`,
   and the page contains all three concept names and all five state labels;
  `/` and `/lab/index.html` still return the visual lab.
4. `git diff --check` is clean and the commit is scoped to lab files and
   this task's records.

## What DONE and STOPPED mean here

- DONE: the owner can open the concept board from the visual lab and
  compare all three directions across all five poses, with shipped code
  byte-identical.
- STOPPED: the board cannot be built without touching shipped code, a
  check fails without an in-scope correction, or the visual poses would
  overclaim real runtime state.
