# Task 191 report — paper dispatch checkpoint

**Lane:** E

**Base commit:** `9fe670348c7ae7e6f91b918e3f51eb9c6a4af20f`

**Brief commit:** `18219dca8a1e4f625bf0aa92586e911200dc1f81`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

**Milestone moved:** NO

## Outcome

The pause between Review and Start is now one calm ruled paper checkpoint
instead of a rounded settings card. The complete final request leads, with
owner-stated and Cairn-chosen provenance kept open. Provider, model, target
project, exact task, readable data, cost/quota, and the one-call approval also
remain fully visible before a real worker can start.

The routed facts are one ledger rather than little filled tiles. The exact task
payload uses a quieter monospaced inset so its required raw bytes do not shout
over the owner's approval. The native checkbox sits on its own amber ruled
line. Start and Cancel are flat text-like actions with visible keyboard focus.
The automatically focused, non-interactive heading uses a paper underline
instead of a rectangular outline that could be mistaken for a button.

After Start, the review, disclosure, approval, and actions leave the
conversation. Only a short `Cairn is working…` handoff remains above the
authoritative project run thread. Refusal and connection-required states use
explicit words and ruled margin treatments without inventing a Start action.
Cancel restores focus to the retained proposal heading.

The owner reviewed the final unchecked, checked, running, and connection
screenshots and said “Looks good. Continue.” on 2026-08-06. Task 191 is
complete in Lane E only. Main's stopped Task 180/183 work remains untouched,
so this lane was not merged into main.

## What changed

- `app/src/renderer/screens/Chat.tsx` names the dispatch phase, separates the
  complete confirm branch from the short running handoff, adds stable
  presentation hooks, moves focus to the checkpoint heading after Review, and
  returns focus to the proposal heading after Cancel.
- `app/src/renderer/components/DisclosureConfirm.tsx` adds presentation hooks
  around the existing disclosure bytes and native checkbox. Its words, order,
  controlled approval, and shared TaskRun behavior stay exact.
- `app/src/renderer/app.css` defines the paper checkpoint, registration mark,
  flat intent rows, ruled route ledger, quiet exact-task transcript, native
  approval strip, flat actions, connection/refusal margins, compact cascade,
  and reduced-motion protection. A neutral unscoped approval margin preserves
  the shared TaskRun layout; Chat's scoped rule supplies its ruled treatment.
- `app/tests-unit/dispatchpaper.test.ts` is the red-first source contract for
  phase hierarchy, focus lifecycle, disclosure truth, native approval, paper
  material, flat provenance/facts, quiet exact-task treatment, action focus,
  compact wrapping, shared spacing, and no new motion.
- `app/tests/conductor.spec.ts` proves the compact offline checkpoint, complete
  unchecked/checked real-call disclosure, native disabled/unlocked Start,
  keyboard order and focus, confirm-to-running reduction, refusal recovery,
  connection-required state, Cancel focus return, containment, reduced motion,
  and final screenshots. Its refusal assertion now reads the current
  authoritative attributed action rather than the retired proposal bridge.
- `docs/ai-work/tasks/191-report.md` is this report.
- `docs/ai-work/LOG.md` receives the Task 191 row. A later union merge must
  retain the independent Task 180, 181, 183, 184–189, 190, and 191 rows exactly
  once.

No accepted-request content, route selection, preview consumption, approval
meaning, dispatch start, run construction, refusal, worker, provider, Core,
CLI, phone, credential, dependency, lockfile, project fact, milestone,
production system, or production data changed.

## AI decisions and review record

- The confirm surface and running handoff remain one `section` with an explicit
  phase attribute. The phase changes presentation only; main-owned dispatch and
  run state remain authoritative.
- Required request and real-call facts stay open before Start. Nothing is
  folded, summarized, pre-checked, or replaced with an icon.
- The exact task remains byte-for-byte visible but uses smaller 500-weight mono
  type and an inset rule. This fixes information hierarchy without changing the
  disclosure.
- Review moves focus to the visible `Start this task` heading because the
  focused Review control is replaced. Cancel waits for React to restore the
  proposal, then focuses its `Ready to review` heading.
- A non-interactive focused heading uses a cyan underline, while real actions
  keep the stronger two-pixel rectangular focus indicator. This avoids a false
  button without weakening keyboard orientation.
- `DisclosureConfirm` is shared with TaskRun. Moving its inline margin to the
  new class initially left TaskRun without spacing because the paper rule is
  Chat-scoped. Independent review caught this; a neutral global 12-pixel margin
  now preserves TaskRun and the later Chat rule deliberately overrides it.
- Independent visual review also caught the boxed heading and overly loud raw
  task payload. Both were repaired and covered before the final screenshots.
  Final visual and code reviews reported no remaining P0–P2 findings.

## Checks run and real results

All command output below was observed in this task's Lane E terminal and was
not persisted to a file. The named PNG screenshots are the only persisted
visual check artifacts.

1. Red-first contract from `app`: `npm.cmd exec tsc -- -p
   tsconfig.unit.json`, then `node --test
   dist-unit/tests-unit/dispatchpaper.test.js`.
   - Initial result: **7 failed, 0 passed** against the prior rounded dispatch
     card, as intended.
   - The visual-review assertions initially failed **2** focused checks before
     the underline and quiet task transcript landed; both then passed.
   - The shared TaskRun-spacing assertion initially failed **1** focused check
     before the neutral default landed; it then passed.
   - Final result: **7 passed, 0 failed**.
2. Focused renderer command from `app`: `npm.cmd exec tsc -- -p
   tsconfig.unit.json; node --test
   dist-unit/tests-unit/dispatchpaper.test.js
   dist-unit/tests-unit/conversationpaper.test.js
   dist-unit/tests-unit/evidencepresentation.test.js
   dist-unit/tests-unit/resultreceipt.test.js
   dist-unit/tests-unit/runpaper.test.js
   dist-unit/tests-unit/lantern.test.js`:
   - **53 passed, 0 failed**.
3. Final `cd app && npm.cmd run test:unit`:
   - **412 total, 410 passed, 0 failed, 2 Windows host-specific skips**.
4. Final `cd app && npm.cmd run typecheck`:
   - Passed with no TypeScript errors.
5. Final `cd app && npm.cmd run build:vite`:
   - Passed: main **63 modules**, preload **1 module**, renderer **73 modules**.
6. Final `cd app && npm.cmd run build:lab`:
   - Passed: **96 modules**.
7. With no Cairn/Electron process and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held, `CAIRN_TEST_LANE=1`, and only the
   existing loopback fake provider plus fake/offline workers:
   - Compact proposal → offline dispatch → Cancel/focus return:
     `npx.cmd playwright test tests/conductor.spec.ts --grep "one compact
     proposal carries its complete details" --workers=1` — **1 passed, 0
     failed** in 6.2 seconds (6.7 seconds overall).
   - Unchecked/checked real-call gate → running handoff → STOPPED thread:
     `npx.cmd playwright test tests/conductor.spec.ts --grep "a dispatched run
     lives in the conversation" --workers=1` — **1 passed, 0 failed** in 16.1
     seconds (16.9 seconds overall).
   - Route-gone refusal → retained proposal → connection-required → Cancel:
     `npx.cmd playwright test tests/conductor.spec.ts --grep "a route that
     becomes unavailable refuses" --workers=1` — **1 passed, 0 failed** in 6.8
     seconds (7.3 seconds overall).
   - No real provider, model, or worker was called.
8. Visual inspection of the final artifacts:
   - `%TEMP%/cairn-task-191-dispatch-offline.png` — passed: compact request,
     context, offline action, containment, and paper-heading focus.
   - `%TEMP%/cairn-task-191-dispatch-real-unchecked.png` — passed: request and
     routed ledger lead without rounded tiles; the raw task begins quietly.
   - `%TEMP%/cairn-task-191-dispatch-real-checked.png` — passed: raw task,
     readable-data/cost rules, native approval, and flat Start/Cancel preserve
     hierarchy while every byte stays visible.
   - `%TEMP%/cairn-task-191-dispatch-running.png` — passed: only the short
     handoff remains above the paper run thread.
   - `%TEMP%/cairn-task-191-dispatch-refusal.png` and
     `%TEMP%/cairn-task-191-dispatch-connection.png` — passed: explicit error
     and recovery truth remain flat, contained, and action-honest.
   - The owner confirmed the direction on 2026-08-06.
9. From Lane E, `git diff --check; git status --short; git diff --stat`, plus
   `Test-Path -LiteralPath '.\app\.app-token'; Test-Path -LiteralPath
   (Join-Path $env:TEMP 'cairn-app-token'); @(Get-Process -Name electron
   -ErrorAction SilentlyContinue).Count`; from the main checkout, `git
   rev-parse HEAD; git status --short`:
   - Passed before records. Lane E held only the five intended App source/test
     paths. No Cairn/Electron process or app-token remained. Main stayed at
     `18a7a6e968e919783e824a7b44c1eb5daf6388bb` with its protected Task 180/183
     paths retained and was not written or landed into.

Diagnostic failures were repaired and are not counted as passes. Initial
sandboxed build attempts could not read Vite configuration above the restricted
process boundary; the permitted local reruns passed. The first refusal journey
showed the correct visible error but exposed a stale test assertion against the
retired `conductorProposal` bridge; the repaired assertion uses the current
attributed-action seam and passed. After the last CSS repair, Playwright
correctly refused a stale bundle until `build:vite` refreshed it. One guarded
command used a `New-Item` flag unsupported by this PowerShell version and
stopped before launching Electron; the supported exact computed path was used
thereafter. Cleanup checks found no abandoned process or token lock.

## How to try it

The quickest exact comparison is between:

- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-191-dispatch-real-unchecked.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-191-dispatch-real-checked.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-191-dispatch-running.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-191-dispatch-connection.png`

To run the local result once no other Cairn window is open:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run build:vite
npm.cmd start
```

This result is intentionally not visible from the dirty main checkout yet. It
can land only after main's stopped Task 180/183 ownership and older Task 180
number collision are reconciled.

## Limitations

Task 191 intentionally leaves the standalone connection setup, structured
question card, push confirmation, outer lantern frame, and TaskRun screen
unchanged. Those are later bounded visual slices.

The owner supplied the required taste judgment.

Disposition: **DONE**
