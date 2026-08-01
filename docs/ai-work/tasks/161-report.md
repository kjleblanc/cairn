# Task 161 report — convert an existing project, one button on the projects screen

**Lane:** A (main checkout) · **Base synced from:** main @ e73c957 (Task 160)

## What changed

The projects screen's "bring an existing project" card now carries a working
**Convert an existing project** button — the deterministic, no-model form of
`PROJECT-CONVERSION.md`. The owner picks a folder; Cairn first looks
(read-only) and shows what it found in plain language (git or no git, changed
and untracked counts, other AI tools' rule files, records it would keep,
legacy `.git/cairn` state as a warning), states exactly what it will add,
asks the same four questions a new project asks (name pre-filled from the
folder), and converts only on the owner's click. Conversion only ever
**creates new paths** (every write uses the wx flag — an existing file cannot
be overwritten even by accident), writes a `docs/ai-work/CONVERSION.md`
report listing what was added and what stayed untouched, and makes one
**exact-path commit of only its own new files** when a git identity exists
(otherwise it reports "written, not committed" honestly). A non-git folder
gets `git init` — disclosed on the approval screen before it happens —
because tasks need git to protect work. A folder that is already a Cairn
project, or has its own non-Cairn `AGENTS.md`, is refused with a plain
explanation and no button; rule conflicts stay with the guided paste flow.

Files touched, exactly:

- `core/src/convert.ts` (new) — `inspectConversion` (read-only) and
  `convertProject` (the write path and its law: preserve, local, exact-path,
  honest).
- `core/src/files.ts` — `LOG_HEADER` exported (was module-private).
- `core/src/steps.ts` — `hasLegacyState` exported (was module-private).
- `core/src/index.ts` — re-export the new module.
- `core/package.json` — the test script names suites explicitly; added
  `dist/test/convert.test.js` (one-line change).
- `core/test/convert.test.ts` (new) — 9 tests, temp-dir fixtures, real git.
- `app/src/shared/ipc.ts` — `ConvertResult`, re-exported core conversion
  types, two `CairnApi` methods.
- `app/src/main/ipc.ts` — `project:convertInspect` + `project:convert`
  handlers on the existing `toResult` bridge; the `project:pickFolder`
  handler gained a `CAIRN_TEST_PICK_FOLDER` seam (same family as the existing
  `CAIRN_OPEN` seam) because E2E cannot drive the native dialog.
- `app/src/preload.ts` — the two channel bindings.
- `app/src/renderer/components/Convert.tsx` (new) — the inspection-and-approval
  panel, including both refusal renderings (no convert button offered).
- `app/src/renderer/screens/Picker.tsx` — the card's button, the read-only
  `startConvert` flow, the panel branch, and an `ErrorCard` on the main
  picker view (disclosed adjacent fix: checkup errors previously had no
  visible surface at all). Stale "This reset does not transform legacy
  .git/cairn…" copy replaced — conversion now discloses legacy state properly.
- `app/lab/mock-cairn.ts` — the lab's mock API gained the two methods with
  the lab's honest "never in the lab" refusal, matching `projectInit`.
- `app/tests/convert.spec.ts` (new) — the E2E below.

Decisions that were mine to make (recorded per the contract): conversion
logic lives in **core** beside `initProject` (CLI reuse, core's real-git test
idiom); the flow is **two IPC steps** so the approval screen always renders
freshly-inspected truth and `convertProject` re-inspects fail-closed at write
time; a foreign `AGENTS.md` is a **hard refusal**, never an overwrite or a
judgment call.

## Checks run and their real results

- `cd core && npm test` → **148/148 pass** (139 prior + 9 new: inspection
  honesty, conflict refusal with zero writes, already-Cairn refusal,
  missing-facts refusal, happy path with byte-exact preservation and a commit
  containing only created files, kept-records reporting, non-git init +
  commit, legacy state disclosed and byte-untouched). One in-task repair,
  disclosed: the non-git test caught `inspectGit` never probing identity
  outside a repo (so non-git folders would never have committed) — fixed by
  probing identity unconditionally; the suite then passed.
- `cd app && npm run typecheck` → green. One in-task repair, disclosed:
  `lab/mock-cairn.ts` implements `CairnApi` and needed the two new methods.
- `cd app && npm run test:unit` → **169/169 pass**.
- `cd app && npm run build:vite` and `npm run build:lab` → both green.
- `cd app && npx playwright test tests/convert.spec.ts` → **1/1 pass**
  (3.4s), app token held and released: real button → inspection panel → four
  questions → conversion → project opens; disk verified (contract filled with
  the four answers, `CONVERSION.md` names the kept rules, HEAD is the
  conversion commit containing exactly the four created files, `CLAUDE.md`
  byte-identical, the untracked file still untracked).
- `npx playwright test tests/projects.spec.ts tests/smoke.spec.ts` → **9/9**;
  `tests/checkup.spec.ts` → **1/1** (the picker-sharing neighbors).
- Final `git status` inspected: only the files above plus this task's
  records; the pending LOG pool, `design/`, and the app logs untouched.

## How to try it

`cd app && npm start`, open the projects screen, and at the bottom card
"bring an existing project" click **Convert an existing project**. Pick any
ordinary folder (a copy of something real is a good first try) and read what
Cairn found before you click Convert — then look inside the folder:
`AGENTS.md`, `docs/ai-work/`, and `docs/ai-work/CONVERSION.md` telling you
what was added and what stayed untouched.

## Limitations / remaining human judgment

- Conversion is the deterministic 80% case. Folders with their own
  `AGENTS.md`, tangled rule conflicts, or unclear ownership are refused on
  purpose and belong to the guided paste flow, where a person reads them.
- A converted folder whose git has no identity gets its files uncommitted
  (reported on screen and in `CONVERSION.md`); the owner commits them after
  setting `user.name`/`user.email`.
- Legacy `.git/cairn` state is disclosed, not migrated — that migration is
  the separate reviewed task it always was.
- The `LOG.md` row for this task is appended but **left uncommitted**, pooled
  with Task 160's row per the Task 149 precedent; closing the pool is the
  owner's close-out decision.

**Disposition: DONE**
