# Task 154 brief — E2E tests stop taking over the owner's screen

## Requested visible outcome

Running the Playwright E2E suite no longer pops app windows onto the owner's
screen or steals focus from whatever they are doing. Every test launch runs
with its window hidden; the suite's assertions and coverage are unchanged, so
the same green run happens silently.

## Why (owner's words)

"Whenever we run tests, it minimizes and interrupts what's on my screen."

Cause found by inspection: every spec launches the real Electron app via
`_electron.launch`, and `main.ts`'s `createWindow()` always shows the window
(1320×820, focused). A full run launches the app dozens of times, so the
owner's screen is repeatedly interrupted. `bridge.spec.ts` additionally opens
a second "phone" `BrowserWindow` in-test.

## Boundary of intent — what must not change

- Test behavior, assertions, and coverage: the suite must pass exactly as
  before, driving the app through the same UI paths.
- Ordinary app launches (owner double-click, `npm start`): the window still
  shows by default. The hide is gated on `CAIRN_E2E=1`, the same test-only
  marker that already gates `CAIRN_TEST_USER_DATA`; that marker is set only by
  the suite's `isolated-profile` fixture, so no stray variable can hide a real
  launch.
- No dependency changes, no new packages.
- Single-tenant rule unchanged: E2E runs only with the app token held.
- Protected in-flight work in the tree is untouched: `projects.spec.ts`
  (modified, a stopped worker's file — deliberately not run), `Picker.tsx`,
  `LOG.md`, the untracked task records, `design/`, logs.

## Plan (AI decision)

- `app/src/main/main.ts`: in `createWindow()`, when
  `process.env.CAIRN_E2E === "1"`, create the window with `show: false` and
  `webPreferences.backgroundThrottling: false` (hidden pages get their timers
  throttled by Chromium; the app's polling must not be starved). All spec
  launches inherit `CAIRN_E2E=1` through their `process.env` spreads, so this
  one edit covers every launch site.
- `app/tests/bridge.spec.ts`: the in-test "phone" window gets `show: false`
  and `backgroundThrottling: false` too. Hidden windows still fire
  `waitForEvent("window")` and are fully drivable over CDP.

## Checks that show the outcome holds

1. `npm run typecheck` and `npm run test:unit` in `app/` — green as before.
2. `npm run build:vite` — green (the suite's global setup refuses a stale
   bundle).
3. A focused launch check: launch the app via Playwright with the E2E env and
   assert `BrowserWindow.getAllWindows()[0].isVisible() === false` while the
   page is fully drivable.
4. The E2E suite, run per-spec file (300 s shell cap) with the app token held:
   conductor, bridge, away, serial, routing, smoke, connect-kimi — all green.
   `projects.spec.ts` is NOT run (protected in-flight edit, per the Task 151 /
   153 precedent).
5. Normal-launch path verified by inspection: `show: false` applies only
   inside the `CAIRN_E2E === "1"` conditional; the default path constructs the
   window exactly as before (Electron windows show by default).

## DONE and STOPPED here

- DONE: checks 1–4 pass, check 5 holds, and the owner can run the suite
  without a single window appearing.
- STOPPED: the suite fails for a harness reason twice, or hiding the window
  breaks a test that genuinely needs OS visibility (none found by inspection:
  no screenshots, no focus/minimize/restore assertions, no
  `document.visibilityState` use in the renderer), or protected work would be
  touched.
