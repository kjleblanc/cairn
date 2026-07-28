# Task 108 brief — prune the test-accumulated entries from the real profile

## Requested visible outcome

Owner-approved follow-up to Task 103: the real Cairn profile
(`AppData/Roaming/Cairn/projects.json`) no longer carries the 151
test-generated temp-dir entries that wedge the app at boot, the real app
boots responsive, and the E2E suite passes against the real profile.

## Boundary of intent — what must not change

- Only `projects.json` is touched, only entries under the OS Temp dir are
  removed; any entry pointing outside Temp is kept.
- A byte-for-byte backup is made first, beside the original.
- No application or test code changes. No other profile file is modified.

## Checks that will show the outcome holds

1. Backup exists and matches the original byte count.
2. After pruning, the entry count is 0 (all 151 were Temp paths — verified
   by inspection before writing) and the file parses as JSON.
3. The real profile boots responsive (renderer answers probes, welcome or
   home screen renders).
4. `smoke` and `connect-kimi` — the two tests red under the real profile —
   pass against the real profile on the current bundle.

## What DONE and STOPPED mean here

- DONE: profile pruned with backup, app responsive, both canary tests green
  on the real profile.
- STOPPED: anything unexpected in the file (non-Temp entries, parse
  surprise), or the canary tests still fail — restore from backup and
  report.
