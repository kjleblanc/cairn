# Task 182 report — one cohesive Cairn composer

**Lane:** E (recovery worktree)

**Base commit:** `64dccfcee91b03f41ac02fc6b154b37d6e365ab6`

**Brief commit:** `18a7a6e`

**Milestone moved:** NO

## Outcome

Cairn's desktop conversation now presents one deliberate writing control.
**Talk with Cairn** occupies the top of a single bordered surface, with a quiet
**New** action at its lower left and the primary **Send** action at its lower
right. The detached **New conversation** row is gone. The shorter visible
label keeps the accessible name **New conversation**, and all three controls
fit inside the narrow 760-pixel test window.

The interaction behavior did not change. Send is unavailable for an empty
draft, Enter sends, and New retires the current conversation while preserving
an unsent draft. The first Electron check caught that the new test had wrongly
expected New to erase the draft. Inspection showed the existing implementation
deliberately retains it, so only the test was corrected; the product behavior
was not changed.

Task 182 began in the main checkout. While it was in progress, Task 183 wrote a
broad Project Home/sidebar draft into that same checkout, including files that
overlap this task, and then stopped with `PROTECTED_WORK_CHANGED`. None of that
work was reset, cleaned, moved, staged, or overwritten. Task 182 was recovered
from its brief commit into clean worktree `.lanes/e` on branch `lane/e`, and
only the Task 182 implementation/test paths were reapplied and verified
there. The stopped work on `main` remains intact. Because `main` is not between
tasks, this completed lane has deliberately not been merged there.

## What changed

- `app/src/renderer/screens/Chat.tsx` nests the textarea, New, and Send in one
  composer and shortens only New's visible label while retaining its accessible
  name and exact existing disabled gates.
- `app/src/renderer/app.css` gives that shared control one surface and focus
  treatment, stacks its text and actions, anchors the two compact pills at
  opposite ends, and keeps the dark Lantern-on-Water treatment cohesive.
- `app/src/renderer/motion.css` updates the existing specificity explanation
  for the fact that both composer actions are now pills; motion behavior itself
  is unchanged.
- `app/tests-unit/newhorizons.test.ts` pins the shared DOM surface, enclosure,
  vertical layout, action placement, compact sizing, and pill-motion ownership.
- `app/tests/conductor.spec.ts` adds a fake-provider Electron check for narrow
  geometry, accessible names, empty/send states, Enter, conversation reset,
  unsent-draft retention, and the final screenshot.
- `app/tests/evidence.spec.ts` updates one pre-existing terminal-paint probe to
  identify New by its retained accessible name instead of the now-shorter
  visible label.
- `docs/ai-work/tasks/182-report.md` is this report.
- `docs/ai-work/LOG.md` receives the one truthful Task 182 row in Lane E. On a
  later landing, Git's configured union merge must retain the independent
  Task 180, 181, and 183 rows currently present on `main` exactly once.

No dependency manifest or lockfile, provider behavior, model call, task card,
dispatch path, queue, retry, stored conversation format, Core/CLI/phone source,
project fact, milestone, credential, push, publish, deployment, or production
data changed.

## AI decisions and review record

- The composer owns the border and focus ring; the textarea is transparent.
  This makes the three pieces read as one control without introducing a second
  nested field outline.
- New stays visually quiet and Send stays primary. Their existing `.pill`
  classes retain the approved press motion, while `aria-label="New conversation"`
  keeps the shortened control clear to assistive technology.
- No new responsive breakpoint was added. The same flex structure fits the
  existing narrow conversation panel, and the Electron geometry assertion
  proves every textarea/button edge remains inside the shared surface.
- The failed first Electron run was treated as a test-harness finding, not a
  reason to alter established draft custody. The corrected path now proves New
  clears the old transcript and preserves the unsent draft before Send/Enter
  starts the replacement conversation.
- Two independent read-only reviews found the stale evidence-test selector
  above. After its repair they reported no remaining P0-P2 interaction,
  accessibility, layout, specificity, responsive, race, or test-validity
  finding.

## Checks run and real results

1. Red-first renderer contract: `cd app`, `npx.cmd tsc -p
   tsconfig.unit.json`, then `node --test
   dist-unit/tests-unit/newhorizons.test.js
   dist-unit/tests-unit/evidencepresentation.test.js`
   - The new composer contract initially failed against the detached controls,
     as intended. From the final Lane E source it passed: **24 tests, 24
     passed, 0 failed**.
2. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
3. `cd app && npm.cmd run test:unit`
   - Passed: **366 total, 364 passed, 0 failed, 2 Windows host-specific
     skips**.
4. `cd app && npm.cmd run build:vite`
   - Passed after granting Vite the local worktree-read allowance its config
     traversal needs: main **63 modules**, preload **1 module**, renderer **73
     modules**.
5. `cd app && npm.cmd run build:lab`
   - Passed with the same local allowance: **96 modules**.
6. With zero Electron processes and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held by a `try/finally` PowerShell
   wrapper, set `$env:CAIRN_TEST_LANE = '1'`, then run `npx.cmd playwright
   test tests/conductor.spec.ts --workers=1 --grep "New and Send share one
   narrow Cairn composer without changing their behavior"` from `app`.
   - First run: failed because the new assertion incorrectly expected New to
     erase an unsent draft. Both locks were released and Cairn closed.
   - Final run after correcting only that assertion: **1 passed, 0 failed** in
     4.9 seconds. It used the scripted fixture provider only. No real provider
     or worker call occurred.
7. Visual inspection of
   `%TEMP%/cairn-task-182-cohesive-composer.png` at 760 by 720 pixels
   - Passed: one outlined composer is visible; New and Send sit inside it at
     opposite lower corners; neither control clips or overlaps.
8. Guarded rerun of the affected pre-existing evidence journey: `npx.cmd
   playwright test tests/evidence.spec.ts --workers=1 --grep "automatic pair
   leads its card"`
   - Not counted as a pass. Its legacy fake-conductor setup returned prose but
     did not create the task card, so the run stopped before reaching the
     terminal-paint selector changed here. The failure precedes and is
     independent of the composer markup; the Task 182 unit/Electron checks
     separately prove the accessible New control exists. Both locks were
     released and Cairn closed.
9. `git diff --check`, exact six-path diff inspection, final Lane E status,
   main-checkout status, app-process check, and both-token check
   - Passed. Lane E contained only the six intended implementation/test
     changes before records. No Electron process or token remained. Main's
     stopped Task 180/183 work and log changes remained outside the lane. The
     pre-existing `app/launch-build.log` SHA-256 still matched
     `EC68DC49DD35BF0214797058C132C97E562FAEE0360A02034DC968E6FFA1C91D`.

The approved fresh-worktree setup ran `npm.cmd ci` at the repository root and
again in `app/`; neither changed a tracked file. The app install reported 32
audit findings in the already-locked dependency graph (3 low, 2 moderate, 26
high, 1 critical). No dependency or audit-fix update was attempted.

An extra fresh-worktree baseline, `npm.cmd test` at the repository root, built
Core and printed passing Core adapter tests but did not complete before its
300-second limit. It was terminated with no Electron or real Codex child left
behind. That harness timeout is not counted as a pass and is not a Task 182
product check; the task's complete App suite and both required builds passed.

## How to try it

The quickest safe review is the captured image at
`C:\Users\KenJL\AppData\Local\Temp\cairn-task-182-cohesive-composer.png`.

For a live look before the lane is landed:

1. Close any running Cairn window.
2. In `.lanes/e/app`, run `npm.cmd start`.
3. Open Cairn's conversation and look at the bottom of the lantern. Type a
   draft to see Send become available; New and Send should remain inside the
   same border. Sending through a connected real conductor is unnecessary and
   could use provider quota.

The main checkout does not contain a safely isolated final Task 182 result
yet. Land `lane/e` only after the retained Task 180/183 work on `main` has been
resolved and `main` is clean between tasks.

## Limitations and remaining judgment

- The layout and interactions are mechanically verified at the existing
  760-pixel narrow test size, and the screenshot was inspected. Whether its
  spacing feels as calm as intended remains the owner's visual judgment.
- The unrelated repository-root test harness timeout remains available for a
  separate diagnostic task; no evidence ties it to these renderer-only edits.
- The locked app dependency audit findings predate this source-only task and
  were not changed or repaired here.
- Task 182 is committed and DONE in Lane E, but intentionally not merged into
  the dirty main checkout.

Disposition: **DONE**
