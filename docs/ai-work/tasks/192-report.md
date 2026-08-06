# Task 192 report — paper question annotation

**Lane:** E

**Base commit:** `fe3c8ee61b772f7325f56d66da61ebd4409aedfe`

**Brief commit:** `478fb49cf7b1aebd0763e04876a2b41c8841cad6`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

**Milestone moved:** NO

## Outcome

A current structured question now reads as one restrained cyan-ruled paper
annotation instead of a 22-pixel rounded form card. The question leads, and
the native labelled text input, Answer, and “I'm not sure — you decide” share
one shallow response field. The two decisions are flat text-like controls with
practical target height and strong keyboard focus, not lifted pills.

The automatically focused question heading uses a cyan paper underline rather
than a rectangular false-button outline. Long questions wrap inside the
lantern. The native single-line input keeps a 300-character exact answer in its
own field without widening the layout, and the submitted peach owner memo now
wraps an unbroken answer instead of clipping it.

Cairn's stored turn keeps the exact question so it remains honest passive
history after the one-time action retires or the app relaunches. While that
same action is current, Chat projects exact occurrences of its question out of
the accompanying prose, so the active prompt appears once in the question
annotation whether the model emitted it alone, appended, or embedded. No turn
is rewritten. After Answer or defer, the complete stored question is visible
again in history.

The owner reviewed the final blank, filled/focused, and pending compact
screenshots and said “Good. Continue.” on 2026-08-06. Task 192 is complete in
Lane E only. Main's stopped Task 180/183 work remains untouched, so this lane
was not merged into main.

## What changed

- `app/src/renderer/components/QuestionCard.tsx` groups Answer and defer beside
  the native input inside one response field while preserving their source
  order, callbacks, disabled gates, raw draft, Enter path, and IME guard.
- `app/src/renderer/screens/Chat.tsx` projects a current question's exact
  occurrences out of the latest Cairn turn wherever the model placed them. If
  no prose remains, its redundant bubble is hidden while the annotation is
  current. The stored turn and retired/passive display remain exact.
- `app/src/renderer/app.css` removes QuestionCard from the old 22-pixel group
  and adds the scoped paper annotation, registration rule, shallow answer
  field, flat native input, flat decisions, visible focus, compact one-column
  cascade, and final reduced-motion override. It also gives the existing owner
  memo `min-width: 0` and `overflow-wrap: anywhere` so exact long answers stay
  inside its clipped paper shape.
- `app/tests-unit/questionpaper.test.ts` is the red-first source contract for
  integrated native response semantics, one active prompt, exact passive
  storage, paper material, focus, ruled input, flat decisions, target size,
  disabled state, compact containment, and no new motion.
- `app/tests-unit/conversationpaper.test.ts` adds the adjacent long owner-answer
  containment guarantee to the existing paper memo contract.
- `app/tests/fixtures/fake-conductor.mjs` adds deterministic appended,
  question-only, and prose-embedded question responses used only by the local
  visual journey. It adds no production seam.
- `app/tests/conductor.spec.ts` adds the compact fake-only journey for blank and
  whitespace gates, a byte-exact 300-character Enter answer, keyboard order,
  focus, all-control submitting lock, one-shot retirement, replacement focus,
  native Space defer, passive history, question-only and prose-embedded
  de-duplication, long memo containment, reduced motion, and screenshots.
- `docs/ai-work/tasks/192-report.md` is this report.
- `docs/ai-work/LOG.md` receives the Task 192 row. A later union merge must
  retain the independent Task 180, 181, 183, 184–192 rows exactly once.

No main-owned action identity, persisted turn, answer/defer reply, provider
request, retirement, retry, IPC, worker, route, dispatch, result, Core, CLI,
phone, credential, dependency, lockfile, project fact, milestone, production
system, or production data changed.

## AI decisions and review record

- The control remains `input type="text"`. A long value scrolls inside that
  native single-line field; changing it to a textarea would have changed the
  brief's Enter and IME semantics.
- Answer and defer share one nested action row after the input. Native DOM order
  remains input → Answer → defer, so keyboard behavior needs no custom roving
  focus or event handling.
- The current prompt de-duplication is a bounded display projection: it applies
  only to the latest Cairn turn and only while the matching question action is
  current. Exact question occurrences are removed from that transient prose
  view and the remaining fragments are rejoined; an empty redundant bubble is
  hidden. Every stored byte remains untouched.
- The brief's 300-character proof exposed an older adjacent containment defect:
  an unbroken submitted answer could escape the peach owner memo. Two wrapping
  declarations repair that existing memo without changing its material.
- Main accepts and retires an action before the fake provider's delayed DONE,
  so a network gate cannot hold the card in its very short local `submitting`
  render. The E2E installs a test-only `MutationObserver` before Enter and
  records the moment the native input and both decisions are simultaneously
  disabled; no product delay or IPC seam was added.
- The action buttons retain 40-pixel minimum height despite their flat styling.
  This keeps practical targets without restoring chunky fills or shadows.
- The independent visual reviewer reported no findings. Two record/code audit
  passes caught P2 variants behind the universal one-prompt claim: a valid
  question-only response and a question embedded in visible prose. The final
  display projection and fake-only journey cover appended, sole, and embedded
  shapes without rewriting history. The final re-audit reported no findings.

## Checks run and real results

All command output below was observed in this task's Lane E terminal and was
not persisted to a file. The named PNG screenshots are the only persisted
visual check artifacts.

1. Red-first contract from `app`: `npm.cmd exec tsc -- -p
   tsconfig.unit.json; node --test
   dist-unit/tests-unit/questionpaper.test.js`.
   - Initial result: **7 failed, 0 passed** against the prior rounded question
     card, as intended.
   - The later one-prompt assertion failed **1** focused check before the exact
     display projection landed, then passed.
   - The adjacent owner-memo containment assertion failed **1** focused
     `conversationpaper` check before the wrapping repair, then passed.
   - The question-only edge failed **1** focused check before its redundant
     current bubble was hidden, then passed.
   - A follow-up audit found the prose-embedded shape. Its first E2E assertion
     counted matching passive history across the whole conversation and failed
     **1** harness check; the assertion was correctly scoped to the current card
     and latest prose, then passed with the display projection unchanged.
   - Final `questionpaper` result: **8 passed, 0 failed**.
2. Final focused renderer command from `app`: `npm.cmd exec tsc -- -p
   tsconfig.unit.json; node --test
   dist-unit/tests-unit/conversationpaper.test.js
   dist-unit/tests-unit/questionpaper.test.js
   dist-unit/tests-unit/evidencepresentation.test.js`:
   - **32 passed, 0 failed**.
3. Final `cd app && npm.cmd run test:unit`:
   - **420 total, 418 passed, 0 failed, 2 Windows host-specific skips**.
4. Final `cd app && npm.cmd run typecheck`:
   - Passed with no TypeScript errors.
5. Final `cd app && npm.cmd run build:vite`:
   - Passed: main **63 modules**, preload **1 module**, renderer **73 modules**.
6. Final `cd app && npm.cmd run build:lab`:
   - Passed: **96 modules**.
7. With no Cairn/Electron process and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held, `CAIRN_TEST_LANE=1`, and only the
   existing loopback fake conductor:
   - Compact paper question, exact Answer, replacement, and defer:
     `npx.cmd playwright test tests/conductor.spec.ts --grep "a compact paper
     question keeps exact Answer" --workers=1` — **1 passed, 0 failed** in 8.7
     seconds (9.5 seconds overall).
   - Exact current-action persistence and passive history after full relaunch:
     `npx.cmd playwright test tests/conductor.spec.ts --grep "a structured
     question survives only as passive text after a full relaunch" --workers=1`
     — **1 passed, 0 failed** in 5.0 seconds (5.5 seconds overall).
   - No real provider, model, worker, push, or external service was called.
   - One parallel wrapper around final unit and Lab checks reached its 120-second
     shell timeout without returning results and left no Node/Electron process.
     Both commands were rerun separately and produced the passing results above.
   - After the last renderer edit, Playwright first refused the intentionally
     stale bundle. Default-sandbox Vite/Lab builds and Electron launch then hit
     host access-denied errors; the same local commands were rerun outside that
     sandbox and passed. The one failed harness assertion left one known test
     profile, which was exact-path verified inside `%TEMP%` and removed after
     Electron had exited. No product data was touched.
8. Visual inspection of the final artifacts:
   - `%TEMP%/cairn-task-192-question-blank.png` — passed: one prompt, one
     shallow answer field, disabled Answer, available defer, and no rounded
     form-card chrome.
   - `%TEMP%/cairn-task-192-question-filled.png` — passed: the native field
     contains the 300-character value and the real Answer focus remains strong.
   - `%TEMP%/cairn-task-192-question-pending.png` — passed: the retired question
     is honest passive history, the exact owner answer wraps in its memo, and
     Cairn's pending lead does not invent another control.
   - `%TEMP%/cairn-task-192-question-replacement.png` — passed: the fresh action
     gets deliberate underlined heading focus and an empty new draft.
   - The owner confirmed the direction on 2026-08-06.
9. From Lane E, `git diff --check; git status --short; git diff --stat`, plus
   `Test-Path -LiteralPath '.\app\.app-token'; Test-Path -LiteralPath
   (Join-Path $env:TEMP 'cairn-app-token'); @(Get-Process -Name electron
   -ErrorAction SilentlyContinue).Count`; from the main checkout, `git
   rev-parse HEAD; git status --short`:
   - Passed before and after records. Lane E held only the seven intended App
     source/test paths plus its two Task 192 records. No Cairn/Electron process
     or app-token remained. Main stayed at
     `18a7a6e968e919783e824a7b44c1eb5daf6388bb` with its protected Task 180/183
     paths retained and was not written or landed into.

## How to try it

The quickest exact comparison is between:

- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-192-question-blank.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-192-question-filled.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-192-question-pending.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-192-question-replacement.png`

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

Task 192 intentionally leaves the standalone connection setup, push
confirmation, outer lantern frame, and TaskRun screen unchanged. Those remain
later bounded visual slices.

The owner supplied the required taste judgment.

Disposition: **DONE**
