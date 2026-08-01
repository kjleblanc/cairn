# Task 160 report — project checkup: one button, an honest health report, fixes only suggested

**Lane:** A (main checkout) · **Base commit:** 6eb247e (brief claimed at 1caba9c) · **Disposition: DONE**

## The owner's request

"We should create some kind of button/system that checks the health of a
selected project. Could analyze the project's documents and goals, give
suggestions, perform clean-up/reorganizing." The concept card shown in
conversation — verdict first, findings grouped Risk / Needs attention /
Healthy, a suggested ordinary task beside each fixable finding, never any
automatic cleanup — was approved: "Looks right, turn it into a task."

## What actually changed

- `app/src/main/checkup.ts` (**new**) — the whole audit: `runCheckup(dir)`
  returns a typed `{ verdict, verdictNote, counts, trail, findings }`. Every
  check is a local deterministic read — file reads plus the same user-git
  plumbing `push.ts` already uses (an injectable `ExecFn`, so unit pins stub
  exact argv). No writes to the checked project, no network, no model call,
  no credentials. Checks: brief/report pairing, numbering gaps, stale
  briefs (brief without report that is not the latest task), in-flight
  briefs (latest), reports missing their LOG row and rows missing their
  files, STOPPED rows (a stopped *latest* task is attention; older ones are
  filed-honestly healthy), unpushed commits (≥20 = risk, 1–19 = attention,
  0 = healthy), uncommitted/untracked files, AGENTS.md ↔ CONTRACT-TEMPLATE.md
  version sync, PROJECT.md's cited contract version (drift = attention).
  Verdict rule: any risk → "Needs a decision"; else any attention → "Mostly
  healthy"; else "Healthy". A healthy finding is asserted only when its
  check actually ran. (The brief sketched a `checkup/` directory; a single
  module file was enough — AI decision, disclosed.)
- `app/src/shared/ipc.ts` — `CheckupReport`/`CheckupFinding`/`CheckupTrailCell`
  types and `projectCheckup(dir)` on the `CairnApi` bridge contract.
- `app/src/main/ipc.ts` — one handler, `project:checkup`, through the
  existing `toResult` wrapper; it adds nothing to the module's guarantees.
- `app/src/preload.ts` — the one-line bridge method.
- `app/src/renderer/components/Checkup.tsx` (**new**) — the report card:
  verdict line, one-cell-per-task records strip (an `role="img"` strip with a
  counts line in words), findings grouped Risk / Needs attention / Healthy,
  and a suggestion chip on every fixable finding. The card only reports.
- `app/src/renderer/screens/Picker.tsx` — a quiet "Checkup" pill on every
  loadable project card (broken entries keep their own layout), the busy
  state while it runs, and the report overlay; a suggestion tap calls the
  new `onOpenSuggestion(dir, text)`. **Disclosed:** this file has mixed line
  endings (124 CRLF + 15 LF lines predating this task); three Edit-tool
  attempts failed on `\r` handling, so the two edits were made byte-exact via
  a Python heredoc and verified by byte inspection. Git normalizes CRLF→LF
  for this file on commit (its warning noted; the committed diff is only the
  lines below).
- `app/src/renderer/App.tsx` — `openProject(dir, composerText?)` and a
  `composerSeed` state, reset on every open attempt and cleared on a failed
  open, passed to both Picker usages and to Workspace.
- `app/src/renderer/screens/Workspace.tsx` — accepts `composerSeed`, hands it
  to the first Chat mount through a ref consumed exactly once, so an internal
  project switch (which remounts Chat) can never re-seed old words.
- `app/src/renderer/screens/Chat.tsx` — new optional `initialComposer` prop,
  read only at mount. The suggestion is therefore never auto-sent and never
  dispatched; it waits in the composer for the owner to review and press
  send.
- `app/src/renderer/app.css` — the checkup card, verdict, trail cells, and
  finding-group styles in the app's Lantern Dusk language.
- `app/lab/mock-cairn.ts` — a mock `projectCheckup` report so the lab shows
  the card without Electron.
- `app/tsconfig.unit.json` — `src/main/checkup.ts` added to the unit-project
  include list.
- `app/tests-unit/checkup.test.ts` (**new**) — 11 pins: each check family,
  the verdict rule, both unpushed thresholds, and the read-only boundary
  (the fixture tree is byte-identical after a run).
- `app/tests/checkup.spec.ts` (**new**) — the E2E below.
- `docs/ai-work/tasks/160-report.md` (this file) and one `LOG.md` row
  (left uncommitted, Task 149 precedent).

## Checks run (exact commands, real results)

1. `cd app && npm.cmd run typecheck` — clean.
2. `cd app && npm.cmd run test:unit` — **169/169 pass** (11 new checkup pins).
3. `cd app && npm.cmd run build:vite && npm.cmd run build:lab` — both green
   (the suite tests the built bundle; the build preceded the E2E run).
4. `cd app && npx.cmd playwright test tests/checkup.spec.ts` with BOTH
   app-token locations held (`app/.app-token`, `$TMPDIR/cairn-app-token`) —
   **1/1 pass (6.4s)**; windows parked off-display by the suite's own
   `CAIRN_E2E=1` seam; tokens released after; no orphan electron processes
   remained. The spec scaffolds two fixture projects (Tidy: paired, pushed,
   in-sync; Messy: 22 unpushed commits, PROJECT.md citing v0.5.0 against a
   v0.6.0 contract, a numbering gap at 003, a stale 005 brief, a report-only
   006, an in-flight 007, one STOPPED row, an untracked `debug.log`, one
   modified file), seeds the remembered-projects list on the suite's
   throwaway profile, connects the suite's fake-conductor fixture (mock mode
   boots disconnected — the composer only renders connected), and pins: the
   verdict "Needs a decision", every finding row, the 6-cell trail strip
   with its counts line, and the suggestion chip — tapped, the project
   reopens with "push decision" pre-filled in the composer and **zero**
   owner bubbles sent.
5. Cairn self-check (brief check 4), via a throwaway
   `node --input-type=module -e` harness importing the compiled
   `app/dist-unit/src/main/checkup.js` against the repo root (harness
   deleted after): verdict **"Needs a decision"**; risk **"150 commits not
   pushed"** (matches `git status -sb` ahead-150); attention **"Task 160 is
   in flight"** (this task, honest), **"Uncommitted changes in 10 files"**,
   **"7 untracked files"**, **"Doc drift"** (PROJECT.md cites the older
   contract version); healthy **"Contract in sync — v0.6.0"** and **"6
   stopped runs filed honestly"**; counts 153 done · 6 stopped · 1 in flight
   · 0 unlogged across 160. **One named difference from the brief's
   expectation:** the brief expected an "intact pairing" healthy line, but
   `docs/ai-work/tasks/` holds `148-report.md` with no `148-brief.md`
   (verified on disk), so the report honestly shows **"Task 148 has a report
   but no brief"** as attention and the "Records intact" healthy
   finding — which fires only when pairing is fully clean — correctly does
   not fire. The brief's assumption was stale; the module told the truth.
6. Final `git status --porcelain` — exactly the 10 modified + 4 new task
   files above plus the untracked strays (`app/lab-server.log`,
   `app/launch-build.log`, `design/`), which are untouched and uncommitted;
   staging was exact-path.

## Repairs inside the task (all disclosed)

Engine/test-side, made before the green runs above:

- Removed dead `rowNoFiles` code left from an earlier draft of the LOG check.
- Broadened the PROJECT.md citation regex (`CITED_VERSION_RE`) — prose
  citations like "Cairn contract v0.5.0" were missed by the strict
  contract-file pattern; contract files themselves keep the strict one.
- Fixed the unit stub keys to exact argv — a substring `@​{u}` key had
  shadowed the `rev-list` count.
- Trail strip relabel: the counts line says "unfinished" where the sample
  card the owner first saw said "in flight" — a non-latest brief without
  report is stale, not in-flight; the findings already distinguish the two
  ("Task NNN is in flight" only for the latest).

E2E spec iterations (test-side only; the feature code did not change after
its first green unit run):

- The remembered-projects file's real shape is `{ recent: [...] }` under
  Electron's `userData` — the first draft seeded a wrong-shaped file at a
  wrong path under a **nonexistent** `CAIRN_USER_DATA` seam; the spec now
  uses the suite's `isolated-profile` fixture (`CAIRN_TEST_USER_DATA`) like
  every other spec, with snapshot/restore. The owner's real profile was
  inspected after the misdirected early runs: `%APPDATA%/Cairn/projects.json`
  holds only the owner's two real projects — no pollution.
- Mock mode boots disconnected, so the composer never renders; the spec now
  connects the suite's `fake-conductor` fixture first (the same dance
  `conductor.spec.ts` uses), which also exercises that the suggestion's
  words survive behind the ConnectCard.
- The hand-scaffolded contract was missing the `STATUS:`/`CURRENT MILESTONE:`
  fact lines `isCairnProject` requires; added.
- `addCommits` rewrote identical files on its second call, leaving an empty
  commit; it now appends.
- Three assertions were written from memory of the sample card and corrected
  to the real rendered copy ("22 commits not pushed", "Doc drift" as a
  finding title, `.checkup-cell` trail cells).

## Harness notes

`npx` and bare `powershell` are absent on this shell's PATH; Playwright ran
via `npx.cmd`, and process checks used `tasklist` / the full PowerShell
path. The app token was held in both locations only for the E2E runs and
released after. The E2E window was parked off every display by the suite's
own seam.

## How to try it

Open the app, click **Open project**, and press **Checkup** on any project
card — try it on Cairn itself: it will say "Needs a decision", name the
unpushed commits as the risk (that decision is still the owner's to make),
and list this task as in flight. Tap a suggestion chip to see the words
land in the composer, unsent. To look at the card without launching
Electron, `npm run lab` in `app/` shows the same card against a mock report.

## Limitations / remaining human judgment

- If the conductor is not connected when a suggestion is tapped, the project
  still opens and the words wait in the composer's state; they appear as
  soon as the owner connects (the ConnectCard and composer are conditional
  renders inside one mounted Chat, so the state is not lost). Nothing is
  ever sent or dispatched by the checkup itself.
- The unpushed risk threshold (≥20) is an AI-chosen line, recorded in the
  module; it is a one-line change if the owner wants it stricter or looser.
- The checkup reads the working tree as it is; it cannot judge whether a
  finding *matters* — that stays the owner's call, which is why every
  suggestion is an ordinary task draft and nothing more.

**Milestone moved?** NO.
