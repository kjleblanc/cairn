# Task 154 report — E2E tests stop taking over the owner's screen

**Disposition: DONE**

The owner reported: "Whenever we run tests, it minimizes and interrupts
what's on my screen." Cause: every Playwright spec launches the real Electron
app, and `createWindow()` always showed its 1320×820 focused window — dozens
of focus-stealing pop-ups per suite run, plus a second "phone" window in
`bridge.spec.ts`.

## What actually changed (every file touched)

- `app/src/main/main.ts` — under `CAIRN_E2E=1` (the suite's own marker, set
  only by the `isolated-profile` fixture and already the gate for
  `CAIRN_TEST_USER_DATA`), the main window now **parks off every connected
  display**: position computed from `screen.getAllDisplays()` (2000 px past
  the farthest edge in both axes), `focusable: false`, `skipTaskbar: true`,
  plus `webPreferences.backgroundThrottling: false` so the app's polling
  timers can never be starved. Ordinary launches (`npm start`, shortcuts)
  build the window exactly as before — the parking branch cannot trigger
  without the test marker. `screen` added to the electron import.
- `app/tests/bridge.spec.ts` — the in-test "phone" window gets the same
  parking (coordinates computed inside `app.evaluate` via the `screen`
  module, same formula).
- Two one-off diagnostic scripts (`app/vis-check.cjs`, `app/raf-probe.cjs`)
  were written, used, and **deleted**; their results are recorded below.

### Why parked, not hidden (the in-task repair, disclosed)

The first approach was `show: false`. It failed with evidence:

1. Probe: a hidden page got **3 rAF in 2 s** (timers ran at full rate, 18/2s;
   `document.visibilityState` was even `"visible"`). Chromium simply stops
   issuing frames to hidden windows.
2. Playwright's element waits poll on rAF, so every interaction crawled, and
   `conductor.spec.ts:164` ("a live reply belongs to its project and
   reattaches after navigation") failed **deterministically** — its ~1.5 s
   streaming window closed before the slowed navigation finished.
3. Baseline (stashed change) passed that test in 4.8 s; restoring the change
   reproduced the failure. Conclusion: `show: false` is not viable for this
   suite; off-screen parking renders at full speed instead.

## Checks run and their real results

All in `app/`. Note: `npm` is not on this shell's PATH; the npm used was
`"/c/Program Files/nodejs/npm.cmd"`. Playwright ran as
`./node_modules/.bin/playwright`.

- `npm run typecheck` — clean.
- `npm run test:unit` — **141/141 pass**.
- `npm run build:vite` — green (rebuilt for every experiment; the shipped
  bundle is the parked one).
- Parked-window probe (final build): window bounds (3920, 3920) intersect
  **no** display; `isFocused()` false, `isFocusable()` false; **479 rAF / 2 s**
  and 19 chained 100 ms timers / 2 s — full speed. (A shown-window control
  measured the same 479 — this machine's display is 240 Hz, so parking costs
  no extra rendering CPU. `PARK CHECK: PASS`.)
- E2E, app token held (see below), chunked per the 300 s shell cap,
  `projects.spec.ts` deliberately **not run** (protected in-flight edit, per
  the Task 151/153 precedent):
  - `conductor.spec.ts` — **27/27 accounted green**: lines 164–711 (13
    tests) passed in two full-file runs; lines 818–1676 (13 tests) passed in
    three line-filtered chunks (46 s / 43 s / 32 s); the chip test (line
    738) passed in isolation twice (5.4 s, 6.9 s).
  - `bridge.spec.ts` + `away.spec.ts` + `serial.spec.ts` — **4/4** (16.8 s),
    including the bridge flow with the parked phone window.
  - `routing.spec.ts` + `smoke.spec.ts` + `connect-kimi.spec.ts` — **14/14**
    on rerun (1.7 m).

### Pre-existing flakes, disclosed and bounded (not caused by this change)

- The busy-chip test (`conductor.spec.ts:738`) failed full-file runs **twice
  under the parked build and once under a stash-restored baseline build** —
  identical signature each time. It is the load-sensitive flake its own
  comment documents ("first-run flake seen in tasks 131/137"); green in
  isolation every time. It needs its own task if the owner wants it gone.
- `routing.spec.ts:81` failed once inside its three-file chunk, then passed
  in isolation (16.8 s) and passed in the chunk rerun (14/14).
- Full `conductor.spec.ts` uninterrupted exceeds the 300 s shell cap when
  green (~4–5 min), hence the chunking; one 300 s timeout occurred, no
  orphaned `electron.exe` remained (checked by PID list).

## App token

Held for every E2E run at **both** documented locations —
`%TEMP%\cairn-app-token` (HANDOFF convention) and `app/.app-token` (Task 146
convention) — since recent rows don't say which is current; both released
after the runs. Disclosed per contract.

## Screen-time cost of verification, honestly

Diagnosing required visible windows twice on the owner's screen: one ~5 s
probe window (shown-control measurement) and one 2.6 m baseline control run
of `conductor.spec.ts` (the decisive proof that the chip flake predates this
change). Every other run in this task was invisible.

## How to try it

Run the suite any time — e.g. `cd app && npm run test:smoke` (or
`npx playwright test tests/smoke.spec.ts` after a build). Nothing appears on
screen, focus never leaves your current window, and no taskbar/alt-tab entry
flashes. The windows exist at coordinates past your rightmost/bottom-most
monitor edge, unfocusable; Playwright drives them over CDP exactly as before.

## Limitations / remaining human judgment

- The busy-chip load flake (above) is pre-existing and untouched; it can make
  a full-file `conductor.spec.ts` run red on a busy machine regardless of
  this change.
- `projects.spec.ts` was not run (protected); its modified content is
  another lane's in-flight work.
- If a future monitor layout parks a display at extreme coordinates
  (> 2000 px past the current farthest edge), the formula recomputes per
  launch, so this is self-adjusting.
- One visible diagnostic window and one baseline run appeared on the owner's
  screen during this task (see "Screen-time cost") — that should be the last
  time the suite itself interrupts.
