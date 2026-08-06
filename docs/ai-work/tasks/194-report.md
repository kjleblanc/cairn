# Task 194 report - private commentary, paper next steps

**Lane:** E

**Base commit:** `f04e5fd4e7aec93b43e41e3978d70eeafcd54d4d`

**Brief commit:** `38294a9514995d9b83e27ee4c2654ba3c2635484`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

**Milestone moved:** NO

## Outcome

Cairn's private follow-up protocol now stays out of every public live view while
commentary streams. Partial openers, complete controls, malformed controls, and
unterminated controls are removed from the live projection before it reaches
the renderer, reattachment snapshot, reload, or bridge-facing current state.
The untouched provider reply remains available only to the settled parsers, so
valid follow-ups can still be recovered without exposing protocol text.

Once commentary settles, one valid follow-up block becomes a quiet cyan-ruled
paper annotation. Suggestions are flat, full-width native note buttons with a
small registration dash, hairline separators, restrained two-pixel movement,
clear two-pixel keyboard focus, and no chunky radius or shadow. A deliberately
long 140-character note wraps inside both the real wide side lantern and the
540-pixel compact layout. Reduced motion removes all arrival and response
travel.

Choosing a note sends its exact text through the existing ordinary owner-message
path. A successful send removes the notes and focuses the composer; a refused
send restores focus to the same surviving note. Notes never become dispatch,
approval, task, or question authority, and they do not steal focus when they
first appear.

The owner reviewed the refreshed safe-stream, wide, keyboard-focus, and compact
evidence and said "Looks right. Approved." on 2026-08-06. Task 194 is complete
in Lane E only. Main's protected Task 180/183 work remains untouched, so this
lane was not merged into main.

## What changed

- `app/src/main/conductor/followups.ts` replaces the former regular-expression
  extraction with one bounded line scanner, adds the monotonic
  `followupSafeStreamingText` public projection, strips every recognized block
  at settlement, and grants suggestions only to exactly one complete valid
  block. Duplicate, malformed, invalid, and unterminated blocks fail closed.
  Sibling task/question controls are reserved with their exact column-zero
  closing grammar so nested text can never gain follow-up authority.
- `app/src/main/conductor/taskblock.ts` applies the same sibling-reservation
  rule in the opposite direction. A malformed follow-up block cannot expose a
  nested task or question through a Markdown-like pseudo-close.
- `app/src/main/conductor/service.ts` derives live controller text from the
  composed task/question-safe and follow-up-safe projection. Settlement still
  parses the untouched provider reply, then passes only stripped prose and
  validated controls onward.
- `app/src/renderer/screens/Chat.tsx` renders the settled values as a labelled
  native suggestion group and paper-note buttons, uses the existing ordinary
  send path, returns focus to writing on success, restores the chosen note on
  refusal, and moves the temporary commentary explanation into a stable class.
- `app/src/renderer/app.css` removes the dashed rounded follow-up chips and
  replaces them with the transparent cyan-ruled annotation, flat note rows,
  restrained arrival, practical targets, explicit focus, compact containment,
  and final reduced-motion precedence. Commentary-in-progress presentation is
  quieter without becoming another card or live region.
- `app/tests-unit/followuppaper.test.ts` is the red-first renderer contract for
  semantic markup, success/refusal focus, paper material, native notes,
  keyboard focus, quiet commentary, compact containment, and reduced motion.
- `app/tests-unit/followups.test.ts` expands parser and streaming contracts for
  partial, complete, malformed, duplicate, unterminated, inert-example,
  lookalike, monotonic, service-wiring, longer-marker, and indented pseudo-close
  cases.
- `app/tests-unit/taskblock.test.ts` adds the symmetric authority-regression
  cases proving malformed follow-up controls cannot expose a nested task.
- `app/tests-unit/evidencepresentation.test.ts` and
  `app/tests-unit/newhorizons.test.ts` update adjacent source contracts for the
  composed safe projection and restrained paper-note motion.
- `app/tests-unit/runpaper.test.ts`, `app/tests-unit/dispatchpaper.test.ts`, and
  `app/tests-unit/questionpaper.test.ts` end their CSS slices at the following
  task marker, so each historical material contract inspects only the cascade
  it owns rather than Task 194's later animation.
- `app/tests/fixtures/fake-conductor.mjs` adds a deterministic long suggestion
  and a read-only gate reached only after all private chunks have streamed.
- `app/tests/conductor.spec.ts` turns the existing follow-up check into a full
  fake-only journey covering a held private stream, live-state inspection,
  reload while held, settled rehydration, wide and compact material, long-text
  containment, native Tab focus, exact-once send, composer focus, persistence,
  removal, and final reload.
- `docs/ai-work/tasks/194-report.md` is this report.
- `docs/ai-work/LOG.md` receives the Task 194 row. A later union merge must
  retain every independent lane row exactly once.

No dependency, provider/model/worker call, credential, external service,
storage schema, IPC authority, dispatch behavior, approval behavior, project
fact, milestone, production system, or production data changed. ConnectCard,
TaskRun, result receipts, publication checkpoint, and the outer lantern remain
outside this slice.

## AI decisions and review record

- The public stream is sanitized at the main-process controller boundary, not
  only in React. That gives the renderer, reload, reattachment, and current
  bridge snapshot one consistent public truth.
- Settled parsing uses the untouched provider reply because stripping a partial
  stream is intentionally lossy. Only validated values and stripped prose leave
  that private parsing boundary.
- Follow-up authority is deliberately conservative: exactly one complete valid
  block may create notes. Every recognized duplicate or malformed shape is
  removed from prose but creates no controls.
- Cairn's three private protocols reserve one another using the same exact
  column-zero, three-backtick close. Ordinary Markdown keeps its normal
  indentation and longer-fence behavior. This prevents two parsers from
  disagreeing about whether a nested protocol is active.
- Suggestion buttons remain native buttons and submit through the existing
  message function. The renderer does not translate them into action IDs,
  approvals, questions, or dispatches.
- Focus changes only after a send result. There is no initial autofocus. A
  refusal locates the exact surviving note after optimistic unmount/remount;
  success moves to the composer.
- Independent visual review found no P0-P2 issue. Independent code review first
  found longer-backtick cross-protocol disagreement, then an indented-close
  variant. Both directions were repaired and covered by red adversarial tests.
  Final re-review found no remaining P0-P2 issue and probed fourteen additional
  pseudo-close variants without exposing task or follow-up authority or causing
  the public stream to rewind.

## Checks run and real results

All command output below was observed in Lane E and was not saved to a project
file. The named PNGs are temporary visual evidence outside the repository.

1. Red-first renderer contract from `app`: compile with
   `.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json`, then run the Task 194
   renderer and adjacent motion contracts with `node --test`.
   - Before implementation: **16 total, 7 passed, 9 failed**.
   - After implementation: **16 passed, 0 failed**.
2. Red-first follow-up parser/stream contract from `app`, using the same unit
   compile followed by `node --test dist-unit/tests-unit/followups.test.js`:
   - Before implementation: **20 total, 13 passed, 7 failed**.
   - After the initial implementation: **20 passed, 0 failed**.
3. After independent review, the symmetric parser command
   `.\node_modules\.bin\tsc.cmd -p tsconfig.unit.json; node --test
   dist-unit/tests-unit/followups.test.js
   dist-unit/tests-unit/taskblock.test.js`:
   - Both longer-marker adversarial tests failed before repair.
   - Both indented-close adversarial tests failed before the final repair.
   - Final result: **49 passed, 0 failed**.
4. The first `npm.cmd run test:unit` after the visual implementation:
   - **443 total, 438 passed, 3 failed, 2 Windows host-specific skips**.
   - The three failures were stale CSS-source slice boundaries in the Task 189,
     191, and 192 contracts. Those tests were repaired to stop at the next
     task-owned cascade marker; no historical runtime style changed.
5. Final `npm.cmd run typecheck`:
   - Passed with no TypeScript errors.
6. Final `npm.cmd run test:unit` after both parser-review repairs:
   - **447 total, 445 passed, 0 failed, 2 Windows host-specific skips**.
7. Final `npm.cmd run build:vite`:
   - Passed: main **63 modules**, preload **1 module**, renderer **73 modules**.
8. `npm.cmd run build:lab`:
   - Passed: **96 modules**.
9. With no Cairn/Electron process and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held, `CAIRN_TEST_LANE=1`, the existing
   loopback fake conductor/offline fixtures, and a temporary local project:
   - `.\node_modules\.bin\playwright.cmd test tests/conductor.spec.ts --grep
     "private commentary settles into contained paper next steps"` passed
     **1 test, 0 failed** in 11.2 seconds overall after the final parser repair.
   - It proved the private stream and reload remain clean, settled notes
     rehydrate, wide and compact layouts contain long text, native focus order
     holds, the exact first suggestion sends once, notes disappear, composer
     focus returns, persistence remains correct, and final reload stays clean.
   - No real provider, model, worker, browser sign-in, network remote, public
     write, production service, or non-test project was contacted.
10. Visual evidence:
    - `%TEMP%/cairn-task-194-comment-stream-safe.png` - 1304x1000; full public
      prose is visible during commentary while protocol, JSON, and suggestions
      remain absent.
    - `%TEMP%/cairn-task-194-followups-wide.png` - 1304x1000; two flat paper
      notes settle in the real pond-plus-side-lantern layout.
    - `%TEMP%/cairn-task-194-followup-focus.png` - 1304x1000; native Tab focus
      produces the explicit cyan two-pixel outline.
    - `%TEMP%/cairn-task-194-followups-compact.png` - 540x900; the long second
      note wraps completely inside the lantern without initial focus theft.
    - Independent visual review passed, and the owner approved all refreshed
      evidence on 2026-08-06.
11. `git diff --check`, exact-path status/diff inspection, app-token checks,
    process checks, and main custody inspection:
    - Passed. Lane E contained only the fifteen intended App source/test paths
      and its Task 194 records. Neither app token nor an Electron process
      remained. Main stayed at
      `18a7a6e968e919783e824a7b44c1eb5daf6388bb` with its protected Task 180/183
      paths retained and was not written or landed into.

## How to try it

The quickest comparison is:

- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-194-comment-stream-safe.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-194-followups-wide.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-194-followup-focus.png`
- `C:\Users\KenJL\AppData\Local\Temp\cairn-task-194-followups-compact.png`

To run Lane E locally after closing any other Cairn window:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run build:vite
npm.cmd start
```

This result is intentionally absent from the dirty main checkout. Landing must
wait until main's stopped Task 180/183 ownership and older Task 180 collision
are reconciled.

## Limitations

The notes appear only when the connected conductor returns one valid optional
follow-up block. Task 194 does not change when the conductor chooses to offer
them, the latest-turn-only rule, provider connection behavior, or any dispatch
and approval surface.

The owner supplied the required taste judgment.

Disposition: **DONE**
