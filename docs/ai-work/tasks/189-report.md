# Task 189 report — paper run thread

**Lane:** E

**Base commit:** `014fad7bd3ea7f6599a0bd72f5b8512756d57ed1`

**Brief commit:** `67f8817dd6e35e6dd9fe840071449cff21335a76`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

**Milestone moved:** NO

## Outcome

The live task status beneath Cairn's conversation is now a quiet ruled paper
thread instead of another rounded dashboard card. Running state, elapsed time,
safe actions, and the complete requested outcome have a deliberate two-line
hierarchy. DONE, STOPPED, ERROR, and closed states reuse that same thread.

The thread has no enclosing fill, border, shadow, or corner treatment. A thin
top rule and one short cyan registration mark locate it on the page. Status
words remain explicit, and each state also has distinct empty CSS geometry, so
color is never the only signal. Stop and Open run are flat text-like controls
with a visible keyboard focus ring.

The existing `.run-strip-state` live region remains one stable DOM node while
its text changes. The strip remains project-scoped and independent from the
conversation-scoped result receipt. Compact layouts keep the status, clock,
actions, and full wrapping outcome inside the lantern without adding motion.

The owner reviewed the final running and DONE screenshots and said “Looks
good. We can move on.” on 2026-08-06. Task 189 is complete in Lane E only.
Main's stopped Task 180/183 work remains untouched, so this lane was not merged
into main.

## What changed

- `app/src/renderer/screens/Chat.tsx` derives a presentation-only run-thread
  state from the existing main-owned project session and exposes it as
  `data-run-state`; it does not replace, key, or split the live status node.
- `app/src/renderer/app.css` removes the obsolete nested run-card overrides
  and defines one bounded paper-thread treatment: transparent material, ruled
  hierarchy, static registration mark, non-color state shapes, flat actions,
  visible focus, full outcome wrapping, and a compact three-row fallback.
- `app/tests-unit/runpaper.test.ts` is the red-first source contract for the
  persistent live node, main-derived state, flat material, status geometry,
  hierarchy, controls, compact containment, and reduced/no-new motion.
- `app/tests/conductor.spec.ts` checks running and STOPPED state, stable live-
  region identity, project scope, elapsed/outcome/action hierarchy, compact
  containment, keyboard order and focus, reduced motion, terminal screenshots,
  reload restoration, and a settled receipt barrier before Electron closes.
- `app/tests/evidence.spec.ts` checks the DONE thread beside its receipt and
  composer at compact width, including state, full outcome, action, containment,
  reduced motion, persistence after reload, and the final screenshot.
- `docs/ai-work/tasks/189-report.md` is this report.
- `docs/ai-work/LOG.md` receives the Task 189 row. A later union merge must
  retain the independent Task 180, 181, 183, 184, 185, 186, 187, 188, and 189
  rows exactly once.

No session construction, polling, dispatch, cancellation, acknowledgement,
result construction, conversation ownership, project scope, timer, navigation,
provider, worker, Core, CLI, phone, credential, dependency, lockfile, project
fact, milestone, production system, or production data changed.

## AI decisions and review record

- Main session truth stays authoritative. `runThreadState` is only a CSS hook
  derived from `session.phase`, `session.error`, and the structured result
  status; renderer settling state cannot invent a terminal word.
- The explicit state word remains screen-reader and sighted-user truth. The
  circle, bar, double outline, and square are empty supplemental CSS marks.
- Status/time/actions lead; the requested outcome always owns a full row below.
  This preserves the outcome even when another conversation does not contain
  the run's receipt.
- The strip and receipt remain separate because their scopes differ: the strip
  belongs to the selected project's current run session, while the receipt
  belongs to the conversation that dispatched the run.
- Existing entrance behavior was not expanded. No keyframe was added, and the
  final reduced-motion rule still removes the strip animation and action
  transitions.
- The reload check exposed an existing shutdown race in its harness. Terminal
  session phase becomes visible just before bounded evidence capture releases
  the run gate. Closing Electron at that exact point correctly opened Cairn's
  quit-protection dialog. The test now waits for the result receipt, which is
  posted only after the run promise's `finally` clears that gate. No product
  timeout or quit behavior was weakened.
- Independent code and visual reviewers reported no remaining P0–P2 finding.
  Their final checks confirmed main-owned state, the stable live node, explicit
  words and non-color marks, keyboard focus, compact wrapping, project scope,
  CSS order, and the intended flat hierarchy.

## Checks run and real results

1. Red-first contract from `app`: `npx.cmd tsc -p tsconfig.unit.json`, then
   `node --test dist-unit/tests-unit/runpaper.test.js`.
   - Initial result: **6 failed, 0 passed** against the prior rounded run card,
     as intended.
   - Final result: **6 passed, 0 failed**.
2. Focused renderer command from `app`:
   `npx.cmd tsc -p tsconfig.unit.json; node --test
   dist-unit/tests-unit/runpaper.test.js
   dist-unit/tests-unit/conversationpaper.test.js
   dist-unit/tests-unit/resultreceipt.test.js
   dist-unit/tests-unit/evidencepresentation.test.js
   dist-unit/tests-unit/lantern.test.js`.
   - Final result: **46 passed, 0 failed**.
3. Final `cd app && npm.cmd run test:unit` after the completed run-thread code:
   - **405 total, 403 passed, 0 failed, 2 Windows host-specific skips**.
4. Final `cd app && npm.cmd run typecheck`, including the reload harness repair:
   - Passed with no TypeScript errors.
5. Final `cd app && npm.cmd run build:vite`:
   - Passed: main **63 modules**, preload **1 module**, renderer **73 modules**.
6. Final `cd app && npm.cmd run build:lab`:
   - Passed: **96 modules**.
7. With no Cairn/Electron process and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held, `CAIRN_TEST_LANE=1`, and only the
   existing loopback fake provider and fake Codex worker:
   - Running → STOPPED, same-node, project-scope, compact, keyboard, and focus
     journey: `npx.cmd playwright test tests/conductor.spec.ts --workers=1
     --grep "a dispatched run lives in the conversation"` — **1 passed, 0
     failed** in 15.4 seconds (16.2 seconds overall).
   - DONE receipt/thread/evidence/persistence journey: `npx.cmd playwright test
     tests/evidence.spec.ts --workers=1 --grep "automatic pair leads its
     card"` — **1 passed, 0 failed** in 9.7 seconds (10.1 seconds overall).
   - Reload restoration after the harness barrier repair: `npx.cmd playwright
     test tests/conductor.spec.ts --workers=1 --grep "a reload mid-run
     reattaches"` — **1 passed, 0 failed** in 16.0 seconds (16.8 seconds
     overall). It proved `running` immediately after reload, `done` in the same
     thread, and a result receipt after the run gate settled.
   - No real provider, model, or worker was called.
8. Visual inspection of the final artifacts:
   - `%TEMP%/cairn-task-189-run-running.png` — passed: the running state/time/
     actions form one flat first row and the complete outcome forms the second.
   - `%TEMP%/cairn-task-189-run-stopped.png` — passed: STOPPED keeps its own
     non-color mark and quiet Open run action without restoring card chrome.
   - `%TEMP%/cairn-task-189-run-done.png` — passed: the DONE thread stays
     subordinate to the receipt and contained above the composer.
   - The owner confirmed the direction on 2026-08-06.
9. `git diff --check`, exact diff/status inspection, final process/lock check,
   and separate main-checkout inspection:
   - Passed. Before records, Lane E held only the five intended App source and
     test paths. No Cairn/Electron process or app-token remained. Main stayed
     at `18a7a6e968e919783e824a7b44c1eb5daf6388bb` with its protected Task
     180/183 paths retained and was not written or landed into.

Diagnostic failures were repaired and are not counted as passes. Two initial
reload attempts never launched Electron because the desktop sandbox denied
process control. The permitted diagnostic run then proved running → done but
timed out at `electronApplication.close`; its action trace located the real
quit-protection race described above. Waiting for the post-settlement receipt
made the unchanged 60-second test pass cleanly. Each abandoned run used only
the local fixtures. The final cleanup confirmed no Electron process or token
lock remained.

## How to try it

The quickest exact comparison is between:

- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-189-run-running.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-189-run-stopped.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-189-run-done.png`

To run the local result once no other Cairn window is open:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run build:vite
npm.cmd start
```

This result is intentionally not visible from the dirty main checkout yet. It
can be landed only after main's stopped Task 180/183 ownership and older Task
180 number collision are reconciled.

## Limitations

Task 189 intentionally leaves the rounded dispatch confirmation, connection
setup, outer lantern, and remaining shared card/button treatments unchanged.
The dispatch confirmation directly above the thread is the clearest next
paper-conversation slice.

The owner supplied the required taste judgment.

Disposition: **DONE**
