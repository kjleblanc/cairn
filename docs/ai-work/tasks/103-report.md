# Task 103 report — the E2E settle run: suite re-verified, click-hang diagnosed

## What actually changed

- `app/src/renderer/screens/Chat.tsx` — one string literal. The run strip's
  terminal line for a `connection-required` close now reads "No task was
  started, nothing was saved, and no AI was called." (was "Codex's setup
  changed while you were deciding. Nothing was started or saved."). This is
  the repair of a Task 097 leftover, proven below — 097 updated the
  assertion at `conductor.spec.ts:818` to the new honest sentence but gave
  the strip a different one, so the test could never pass; the "readiness"
  wording was also inaccurate for a never-connected close.
- Records: `103-brief.md`, this report, one LOG.md row.
- Diagnostic scratch (Electron probes, screenshots) lived in the gitignored
  `app/test-results/`; a temporary IPC-tracing patch to `main.ts` was
  applied, used, and reverted (`git diff` empty before the repair above).

## The click-hang, diagnosed to a named cause

**Verdict: the failures are data-dependent, not code-dependent.** The suite
was re-verified two ways on the same final bundle:

- Real profile (the owner's `AppData/Roaming/Cairn`): `smoke` and
  `connect-kimi` still fail with the exact 30-second post-click hang Task
  101 saw. Reproduced in isolation, single spec, nothing else running.
- Isolated profile (`CAIRN_E2E=1` + `CAIRN_TEST_USER_DATA=<fresh dir>`, the
  configuration the fixtures were already written to read): **the full
  suite passes, 41/41**, on the final bundle (batches: 8, 11, 11, 11).

**The mechanism, each step measured:**

1. Every E2E spec boots against the owner's real profile (no spec sets
   `CAIRN_TEST_USER_DATA`), and every scaffolded test project is appended
   to the profile's `projects.json`, never removed. It held **151 entries**
   today (oldest 01:42 EDT — the day the failures began at ~01:56, with
   ~45 entries then).
2. Main's `project:list` handler scans every remembered project dir
   synchronously: measured **~3.7 s per call** at 151 entries.
3. The renderer polls `project:list` on a **2-second** interval (plus boot
   and activity bursts). Calls arrive faster than they complete: main
   grinds scans back-to-back with no idle (timestamped IPC trace), and
   each completion ships a 151-project clone through the contextBridge to
   a renderer that re-renders the whole rail.
4. Both event loops saturate (~one core each, which is why total-CPU
   looked "idle"). The renderer then services nothing else: `evaluate`,
   clicks, RAF, `DOM.getDocument`, and even compositor-side
   `Page.captureScreenshot` all time out — the "post-click hang".

**Bisect evidence:** trivial Electron window — fine. Real bundle's
`index.html` in a bare shell — fine. Real app with real preload+sandbox but
stub IPC — fine. Real app with a clean profile, project opened, full
workspace rendered, click completes — fine. Full copy of the real profile —
wedged. Copy minus every cache dir — still wedged. Copy minus
`projects.json` — **8/8 responsive**. Copy trimmed to the 5 newest entries —
8/8 responsive. The wedge follows `projects.json` and scales with entry
count; it is not GPU (retested with `--disable-gpu
--disable-gpu-compositing`), not occlusion/backgrounding (retested with the
three disable flags), not Playwright (reproduced with a raw CDP client),
not a reboot-level OS wedge.

**Why it began at 01:56:** the count crossed the threshold where one
`project:list` scan outlasts the 2 s poll. Tasks 097/098/101's "proven
code-independent, machine-wide" failures were this — the proofs were
correct; the machine variable was the accumulating profile.

## Checks run and their real results

1. `npm run build:vite` — pass; `tsc --noEmit` — pass.
2. Full suite, isolated profile, final bundle: **41/41 pass**
   (8: smoke/away/connect-kimi/serial/projects 12.8 s; 11: routing 44.1 s;
   11 + 11: conductor 47.5 s / 1.5 m). `smoke` and `connect-kimi` — the
   tests red under Task 101 — are green.
3. Real profile, final bundle: `smoke` still fails with the hang — the
   data-dependence is confirmed on the same bundle.
4. `conductor.spec.ts:791` was red for a second, unrelated reason (the 097
   leftover above); after the one-string repair it passes, as do the 7
   tests its failure had skipped.
5. Diff isolation: `git status` shows only this task's four paths plus the
   pre-existing untracked `design/`.

## How to try it

- Green suite (does not touch the real profile):
  ```powershell
  cd app; $p = New-Item -ItemType Directory -Force (Join-Path $env:TEMP "cairn-prof")
  $env:CAIRN_E2E = "1"; $env:CAIRN_TEST_USER_DATA = $p.FullName
  npm.cmd run test:smoke
  Remove-Item Env:CAIRN_E2E, Env:CAIRN_TEST_USER_DATA
  ```
- The real app still wedges on launch until the profile is pruned — that is
  the owner's call (below).

## Limitations and remaining human judgment

- **Owner decision owed — prune the real profile.** The app the owner
  launches (and the default suite) still wedges, because the real
  `AppData/Roaming/Cairn/projects.json` holds 151 mostly test-generated
  temp-dir entries (my own probes added ~8 more, disclosed here). Deleting
  or editing owner app data is a contract pause-point, so nothing was
  pruned. Safe smallest step if approved: quit Cairn, then remove the
  `cairn-*`-under-`Temp` entries from `projects.json` (or delete the file —
  the app treats a missing file as "no projects yet"); the real projects
  the owner made through the UI are not in this list to lose, but that is
  the owner's verification to make before deleting.
- **Two follow-up defects named, not fixed (new tasks, per the serial
  rule):** (a) no E2E spec sets `CAIRN_TEST_USER_DATA`, so the suite both
  pollutes and depends on the owner's real profile — the guard exists
  (`main.ts:16`) but is opt-in; (b) the product has no bound on
  remembered-project count or on `project:list` cost, so a large registry
  is a self-inflicted denial of service — a cap/virtualized rail and an
  async or cached scan are the product-side fix.
- Task 104 landed mid-run (14:27) and deferred its own E2E to this settle
  run; the green 41/41 covers it — the only `app/` change from the merge
  wave was the 0.4.0 version bump, which the suite exercised.
- This task began under contract v0.3.0 and ends under v0.4.0 (Task 104
  landed the two-lane protocol mid-run); it ran on `main` throughout,
  which is the settle run's role.

Disposition: DONE — the suite verdict is known from real runs (41/41 green
on clean data; red on the accumulated profile), the click-hang is diagnosed
to a named, measured cause, one proven code defect is repaired, and the
remaining actions are stated as the owner's choices.
