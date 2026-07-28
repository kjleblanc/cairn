# Task 108 report — prune the test-accumulated entries from the real profile

## What actually changed

One file, outside the repository, with the owner's explicit approval
(Task 103's open decision, approved 2026-07-28 15:28):

- `C:\Users\KenJL\AppData\Roaming\Cairn\projects.json` — all 152
  remembered-project entries removed (every one pointed into the OS Temp
  dir; zero non-Temp entries existed, verified by inspection before
  writing). The file now holds an empty list and parses as JSON.
- Backup first: `projects.json.pre-108-backup` (21,827 bytes) sits beside
  the original in the same folder; recovery is one copy back.
- Repository: `108-brief.md`, this report, one LOG.md row. No code changes.

## Checks run and their real results

1. Backup made before the write; byte count recorded (21,827 → 18). **Pass.**
2. Entry count 152 before, 0 kept; file parses. **Pass.**
3. Canary suite against the real (now pruned) profile on the current
   bundle: `smoke` + `connect-kimi` — the two tests that hung 30 s+ under
   Task 101 and again in Task 103's reproduction — **2 passed in 2.6 s.**
   **Pass.** (The runs append their own fresh temp entries back, as
   expected — the structural fix is the named follow-up, not this task.)

## How to try it

Open Cairn (Desktop shortcut or `npm start`). It should boot straight to a
responsive window instead of freezing on "Getting ready…".

## Limitations and remaining human judgment

- The suite still appends to `projects.json` on every run (the two named
  follow-ups from Task 103 — isolated test profiles, bounded registry —
  remain unscheduled). The wedge returns only after many more accumulated
  runs, but the follow-ups are the durable fix.
- The diagnostic probes' scratch (`app/test-results/`) was wiped by
  Playwright's per-run cleanup; all evidence is recorded in Task 103's
  report.

Disposition: DONE — the approved prune is done with a backup in place, the
real app boots responsive, and both canary tests are green on the real
profile.
