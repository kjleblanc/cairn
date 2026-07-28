# Task 106 report — refresh the public guides for two lanes (lane B's first task)

## What actually changed

All edits were made inside the lane B worktree (`.lanes/b`, branch
`lane/b`) and land on `main` by merge — lane B's maiden run under
contract v0.4.0.

- `README.md` — "What works now" now says one task at a time per lane
  (up to two lanes); the serial-worker paragraph gains a short
  plain-language note that up to two chats may work a repository, each
  with its own task, worktree, and records, with the rules in the
  contract's "Working in two lanes" section. The serial-worker truth is
  unchanged.
- `EVERYDAY-WORKFLOW.md` — title now reads "one task at a time per
  lane"; a new "Running a second lane" section explains the worktree
  copies, claim-by-commit numbering, serial landing, and the
  single-tenant app/E2E rule in beginner language, and points at
  `AGENTS.md`.
- `MAINTAINERS.md` — the product promise names per-lane serial work; a
  new "Maintainer lanes" section records the lane-B worktree convention,
  the union-merged log, the serial landing with settle check, the app
  token, and one operational lesson this task discovered (below).
- Records: `106-brief.md` (committed alone as the number claim, per the
  new contract), this report, one LOG.md row.

Discovered while verifying — a real lane-onboarding lesson:
`core/assets/contract.md` is a generated, gitignored artifact
(`core/.gitignore:3`), so it does not exist in a fresh worktree. The
contract-mirror test fails with ENOENT in a new lane until one core
build (or `node core/scripts/sync-contract.mjs`) regenerates it. The
sync script was run in lane B; the mirror test then passed. This is now
documented in MAINTAINERS.md's "Maintainer lanes" section.

## Checks run and their real results

1. **No contradicting phrases** — grep over the three guides finds only
   the new per-lane wording; the old serial-only claims are gone.
   **Pass.**
2. **Mirror test in lane B** — failed on first run (ENOENT, generated
   asset absent in a fresh worktree — see above), passed after the sync
   script: 1/1. **Pass, with the onboarding lesson recorded.**
3. **Landing ritual** — `lane/b` merged into `main`; settle check on
   `main`: core 106/106, cli 9/9, app typecheck green. **Pass.**
4. **LOG rows** — this task's row and the parallel session's rows each
   appear exactly once after the merge. **Pass.**
5. **Diff isolation** — the merged change contains only the three
   guides and this task's records. **Pass.**

## How to try it

Read the new "Running a second lane" section in `EVERYDAY-WORKFLOW.md`,
or open `MAINTAINERS.md`'s "Maintainer lanes" for the discipline this
very task followed.

## Limitations and remaining human judgment

- The app token remains a convention, not tooling; these docs describe
  it as a habit, which is what it is.
- The protocol's first real landing was uneventful — the merge was
  clean, the settle check green, no LOG conflict occurred (the parallel
  session had no unlanded row at merge time, so the union driver was not
  exercised by this landing; it remains proven by the Task 104 throwaway
  test).
- `PROJECT-KICKOFF.md` and `PROJECT-CONVERSION.md` were checked and
  needed no lane wording: they describe setup, not concurrent work.

Disposition: DONE — the guides read consistently with v0.4.0, lane B
completed its first full circuit (claim → work → land → settle check),
and the one surprise found along the way is documented for the next
lane.
