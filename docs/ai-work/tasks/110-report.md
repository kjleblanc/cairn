# Task 110 report — bound the remembered-projects registry

## What actually changed

- `app/src/main/registry.ts` — the only product code. New exported
  constant `RECENT_PROJECTS_LIMIT = 25` with a comment carrying the why
  (Task 103's measured diagnosis: ~25 ms per entry in `project:list`'s
  synchronous scan; 151 entries = 3.7 s against the renderer's 2 s poll =
  both event loops starved; at 25 the scan is ~0.6 s). The cap is applied
  on READ (`recentEntries` slices, so a legacy oversized file is cheap
  again immediately) and on WRITE (`touchProject` slices, so the file
  itself shrinks on the next open). Only remembered *entries* are dropped
  — never a project folder. `forgetProject` inherits the bound through
  `recentEntries`.
- `app/tests/projects.spec.ts` — one new serial test: seeds a 30-entry
  legacy file (29 ghost dirs + healthy Beta last), boots with Beta open,
  and asserts the file self-heals to 25 entries with the just-opened
  project first (the ghost at index 29 falls to the read cap before the
  re-save, proving both paths in one flow).
- Records: `110-brief.md`, this report, one LOG.md row.

## Checks run and their real results

1. `tsc --noEmit` — clean. `build:vite` — green.
2. New test: **pass** (`projects.spec.ts` 4/4).
3. Full suite on the final bundle, isolated profiles, zero operator env:
   **42/42 green** (5 smoke/away/connect-kimi/serial + 4 projects + 11
   routing + 11 + 11 conductor). One conductor batch reported "2 did not
   run" with no failure on its first attempt; the clean re-run passed
   11/11 and is the result recorded here.
4. Existing behavior below the cap unchanged: the list-shape, reopen,
   switcher, and honest-broken-entry tests all pass unmodified. **Pass.**

## How to try it

Use the app normally. The projects rail now remembers at most your 25 most
recent projects; opening one you haven't touched in a while simply brings
it back to the front. Nothing you made is ever deleted — only the
remembered shortcuts beyond the 25th.

## Limitations and remaining human judgment

- 25 is a judgment call (generous for the beginner audience, ~0.6 s worst
  scan); it is one exported constant with the reasoning beside it if the
  owner ever wants a different number.
- The scan itself remains synchronous per entry; the cap bounds it. Making
  `project:list` concurrent or cached would be a further optimization, not
  a correctness fix, and is not scheduled.
- With Tasks 109 + 110 landed, the Task 103 wedge class is closed at both
  ends: tests can't pollute the real profile, and the product can't stall
  on a large registry.

Disposition: DONE — the registry is bounded on read and write, the new
test proves both, and the full suite is 42/42 green.
