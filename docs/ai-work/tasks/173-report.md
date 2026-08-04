# Task 173 report - Automatic checked pictures and the local album

**Lane:** B

**Base commit:** `58f8977ca69dd44ce093de726446e6df9bff6f2d`

**Brief commit:** `89a2c92`

**Milestone moved:** NO

## Outcome

Cairn now shows what its own envelope could actually see around a routed worker
run. Immediately before the worker starts, the main process captures only the
selected project's workspace stage. After the worker settles, Cairn refreshes
the terminal state, waits for it to paint, and attempts the matching terminal
capture before posting the result card. One surviving picture is shown
honestly; two become the full-width before/after pair; no pictures means no
evidence heading, button, or placeholder.

The pictures lead the authenticated result card. **Open the local album** opens
on that exact run, then pages through earlier checked runs and separately
labelled legacy review shots. The pair becomes a single full-width stack at the
existing narrow-window breakpoint. The overlay traps focus, makes the page
behind it inert, closes with Escape, and returns focus to its opener.

Only raw PNG bytes returned by Cairn's `BrowserWindow.capturePage()` enter the
checked store. Worker claims, renderer paths, legacy manifests, and changed
files cannot become checked evidence. Every read revalidates the project and
run identities, regular-file identity, containment, byte length, PNG shape,
dimensions, and SHA-256 from one already-open descriptor. A missing, linked,
replaced, malformed, contradictory, duplicated, oversized, or misbound item
disappears rather than being shown as trusted.

The original brief placed captures under ignored project-local `app/shots/`.
Pre-implementation review found that this could put conversation pixels in a
worker-readable project. The corrected design instead stores new checked
evidence under Electron's app-owned `userData/evidence/<project>/<run>/`
directory. Existing `app/shots/` content remains untouched, read-only,
strictly bounded, and visibly labelled as older review material rather than
checked evidence.

## What changed

### Main-owned capture and bounded custody

- `app/src/main/evidence.ts` adds the fail-closed per-run evidence store, direct
  selected-run lookup, opaque image loading, strictly bounded legacy reads, and
  an immutable timestamp trie whose exclusive cursors page history without
  scanning an ever-growing directory. History bytes are fully hashed within a
  per-page budget; a budget stop resumes at the same uncompleted run.
- `app/src/main/evidencecapture.ts` proves the selected project, real run,
  phase, generation, and in-bounds `.workspace-stage` rectangle both before
  and after capture. It never falls back to the full window. Terminal capture
  requires a matching state refresh and two animation frames.
- `app/src/main/tasks.ts` creates evidence only for a real routed worker,
  completes the pre-worker capture before adapter execution, completes the
  terminal attempt before card composition, discards unfinalized evidence on
  connection-required closes, and exposes only project-bound album/image IPC.
- `app/src/main/main.ts`, `app/src/preload.ts`, and `app/src/shared/ipc.ts` wire
  strict evidence IDs and bounded data-transfer shapes. There is no renderer
  capture API and no filesystem path crosses preload.

### Honest card, album, and terminal barrier

- `app/src/renderer/components/EvidenceAlbum.tsx` adds the selected-run-first
  modal album, checked/legacy grouping, lazy opaque image requests, bounded
  paging and de-duplication, persistent end/error status, focus containment,
  Escape close, and focus return.
- `app/src/renderer/screens/Chat.tsx` puts checked pictures first on eligible
  cards. While the terminal state is painting and being captured, it hides the
  spent run panels, disables the composer and New conversation action, and
  says that Cairn is finishing the result; this prevents a new conversation or
  stale card from replacing the stage before capture completes.
- `app/src/renderer/screens/Workspace.tsx` and
  `app/src/renderer/screens/TaskRun.tsx` expose the selected project, run phase,
  and generation only as a main-validated capture seam.
- `app/src/renderer/app.css` supplies the evidence-first card, overlay, album,
  one/two-image, and narrow stacked layouts without adding a breakpoint or
  motion.
- `app/lab/mock-cairn.ts` keeps the design lab's typed runtime mock complete.

### Persistence and disclosure boundaries

- `app/src/main/conductor/store.ts` preserves a valid optional evidence run ID
  on stored cards while remaining compatible with older cards.
- `app/src/main/conductor/relay.ts` strips the entire evidence field from
  conductor briefing input, so IDs, captions, metadata, paths, and image bytes
  do not widen Task 172's authorized provider data.
- `app/src/main/bridge/phonepage.ts` sends no evidence metadata or bytes and
  directs the owner to open checked pictures on the computer.

### Tests and records

- `app/tests-unit/evidence.test.ts` pins custody, immutable captures, direct
  selected-run loading, corruption isolation, terminal truth, bounded trie and
  legacy traversal, cursor progress, byte budgets, descriptor-size races,
  project separation, and same-size/same-dimension substitution rejection.
- `app/tests-unit/evidencecapture.test.ts` pins constant valid renderer scripts,
  stage/project/run/generation checks, pre-worker timing, terminal paint, TOCTOU
  rejection, timeout behavior, and the absence of a full-window fallback.
- `app/tests-unit/evidencepresentation.test.ts`,
  `app/tests-unit/resultcard.test.ts`, and `app/tests-unit/bridge.test.ts` pin
  evidence-first presentation, honest absence, trusted card persistence,
  provider stripping, phone behavior, album grouping, responsive layout, and
  reduced motion.
- `app/tests/evidence.spec.ts` drives a real Electron window through proposal,
  dispatch, fake worker release, terminal paint, DONE card, album, pagination,
  reload, substitution failure, one-picture degradation, absent chrome,
  provider-wire exclusion, focus behavior, and wide/narrow layout.
- `app/tsconfig.unit.json` includes the new pure modules in the unit build.
- `docs/superpowers/plans/2026-08-03-cairn-evidence-and-local-album.md` records
  the first Plan 3 draft;
  `docs/superpowers/plans/2026-08-03-cairn-evidence-and-local-album-corrected.md`
  records the custody and timing correction; and
  `docs/superpowers/plans/2026-08-03-cairn-evidence-bounded-history-addendum.md`
  records the immutable bounded-history design.
- `docs/ai-work/tasks/173-brief.md`, this report, and the Task 173 log row are
  the task memory.

Verification generated only ignored build/unit output and disposable fake
projects, profiles, and screenshots under the operating-system temporary
directory. It did not create or alter this lane's `app/shots/`. No real
provider, paid model, credential, external service, publish, push, dependency
change, or external write was used.

## Checks run and real results

1. `cd app && npm.cmd run typecheck`
   - Passed on the final source with no TypeScript errors.
2. `cd app && npm.cmd run test:unit`
   - Passed: 308 tests total, 306 passed, 0 failed, and 2 existing
     platform-specific skips on Windows.
3. `cd app && npm.cmd run build:vite`
   - Passed: main, preload, and renderer production bundles built. Sandboxed
     attempts could not load Vite's worktree configuration; the identical
     locally allowed command passed.
4. `cd app && npm.cmd run build:lab`
   - Passed: the design-lab production bundle built under the same local
     allowance.
5. `cd app && .\node_modules\.bin\playwright.cmd test tests/evidence.spec.ts`
   - Passed: 2/2 fake-only Electron flows in 19.6 seconds. Both app-token
     locations were acquired for the run and released; no Electron process was
     left behind. The test observed that the pre-work record existed before
     releasing its fake worker and that the terminal barrier painted before
     final capture.
6. Visual inspection of the real Playwright captures
   - Passed. `cairn-task-173-evidence-wide.png` shows the two checked pictures
     first on the card; `cairn-task-173-evidence-album.png` clearly separates
     **This run** from **Earlier checked**; and
     `cairn-task-173-evidence-narrow.png` shows one unclipped full-width stack.
     All three are retained in the operating-system temporary directory, not
     Git.
7. `cd core && npm.cmd test`
   - Passed on the decisive locally allowed run: 151 tests, 0 failures. A
     restricted-sandbox diagnostic could not let the watchdog tests execute
     Windows `taskkill`, so their fake descendants held the Node runner open.
     The isolated locally allowed Codex suite passed 18/18 and exited. The first
     full locally allowed run completed 150/151 with one non-repeating fake
     stdin/EPIPE timing failure; the exact rerun passed 151/151 and exited.
8. Independent storage, security, UI, accessibility, and integration review
   - No remaining concrete Task 173 defect after multiple repair/re-review
     rounds. Review findings drove full descriptor-bound hashing, aggregate
     byte charging, progressing cursors, direct selected-run isolation, the
     terminal UI barrier, and focus/inert corrections before the final checks.
9. `git diff --check`, exact-path diff inspection, and final Git status
   - Passed after this report and log row were written. Only disclosed Task 173
     paths remained before the exact-path commit; the local screenshot files
     and app-owned evidence were never staged.

One malformed focused-test command accidentally supplied compiled test paths as
extra raw TypeScript test inputs. Its intended compiled suite passed, while the
three unintended raw duplicates failed to import. The command was corrected;
the final complete 308-test run above is the authoritative result.

## How to try it

1. Close any other Cairn window so the single app profile is free.
2. From this lane's `app` directory, run
   `.\node_modules\.bin\playwright.cmd test tests\evidence.spec.ts`. This is the
   safe fake-only demonstration: it does not contact a provider or make a paid
   model call.
3. Open the three `cairn-task-173-evidence-*.png` files in the operating-system
   temporary directory to inspect the wide card, album, and narrow stack.
4. For an ordinary live trial, start Cairn, choose a project, and complete one
   separately approved routed task. The finished result card should lead with
   one or two checked pictures; **Open the local album** should start on that
   run. A live routed task keeps all existing provider, cost, data, and dispatch
   approvals.

## Limitations and remaining judgment

- These stills show Cairn's selected-project workspace stage before and after
  its worker. They do not prove that an unrelated changed application was
  launched or behaved correctly.
- Motion clips require a separately designed, owner-authorized capture adapter;
  Task 173 does not execute arbitrary changed project code and stores stills
  only.
- Decision 1's source-marked **What you asked for** data still belongs to Plan
  4. Task 173 does not invent attribution before that plan exists.
- There is no retention/deletion policy yet. Per-run records and paged reads
  stay bounded, but local history can continue to consume disk space.
- A separate Core hardening task could make a denied Windows `taskkill` exit
  more explicitly and unreference an unconfirmed child. That sandbox-only
  diagnostic weakness did not affect the locally allowed 151/151 verification
  and Task 173 changes no worker or dispatch code.
- Whether the checked pictures and album feel useful in the owner's real work
  remains owner judgment; the executable truth, custody, timing, responsive,
  and accessibility boundaries are verified.

Disposition: **DONE**
