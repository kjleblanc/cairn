# Task 161 brief — convert an existing project, one button on the projects screen

**Lane:** A (main checkout)
**Base commit:** e73c957 (Task 160 landed; tree clean except the pending LOG row and standing untracked `design/` + logs)

## Requested visible outcome

The owner asked for "a project migration button within the projects area" and
chose the conversion meaning: turning an ordinary existing folder into a
governed Cairn project from the app, instead of the manual paste flow in
`PROJECT-CONVERSION.md`.

After this task, on the projects screen:

- The "bring an existing project" card carries a real **Convert an existing
  project** button.
- The owner picks any folder. Cairn first looks, read-only, and shows in plain
  language: what it found (code, git or no git, other AI rule files), what
  stays untouched (everything), and what it will add (the rulebook and the
  records folder).
- The owner answers the same four questions a new project asks (name
  pre-filled from the folder), approves, and the folder becomes a Cairn
  project: `AGENTS.md` from the current template, `docs/ai-work/` records, a
  conversion report listing what was added and what stayed untouched, and one
  exact-path commit when git allows — then it opens like any project.
- A folder that already has its own `AGENTS.md` (or is already a Cairn
  project) is refused with a plain explanation, pointing to the guided paste
  flow for rule conflicts. Nothing is ever overwritten.

## Boundary of intent — what must not change

- **The converted folder's existing work is protected work.** Conversion only
  ever creates new paths (wx-flag semantics); it never overwrites, renames,
  deletes, or transforms an existing file, and never touches product code,
  dependencies, remotes, or history.
- **No model call, no network.** Deterministic local inspection and writes,
  mirroring Task 160's checkup law. Git is local-only
  (`GIT_TERMINAL_PROMPT=0`).
- **The commit is exact-path and conditional.** Only the files conversion just
  created are staged, and only when the repository has a git identity and the
  named paths are cleanly isolable; otherwise conversion reports "written, not
  committed" honestly. A non-git folder gets `git init` (disclosed on the
  approval screen before it happens) so tasks can run at all.
- **Other AI rule files** (CLAUDE.md, .cursorrules, copilot instructions, …)
  are reported and left alone; a pre-existing `AGENTS.md` is a hard refusal,
  not a judgment call.
- Legacy `.git/cairn` state, if found, is disclosed as a warning (tasks will
  stay blocked until a separate reviewed migration) — never touched.
- **In this repo:** the pending LOG.md row (Task 160's), `design/`, and the
  app logs stay protected and out of every commit.

## Files expected to change

- `core/src/convert.ts` (new: `inspectConversion`, `convertProject`), exported
  from `core/src/index.ts`; `core/src/files.ts` only if the log-header
  constant needs exporting.
- `core/test/convert.test.ts` (new unit suite, temp-dir fixtures, real git —
  the serial.test.ts idiom).
- `app/src/shared/ipc.ts` (types + channel names), `app/src/main/ipc.ts`
  (two handlers on the `toResult` bridge), `app/src/preload.ts`,
  `app/src/renderer/api.ts` if the seam is re-exported there,
  `app/src/renderer/screens/Picker.tsx` (button + convert panel),
  `app/src/renderer/app.css` only if the panel needs styles the create panel
  doesn't already provide.
- `app/tests/convert.spec.ts` (new one-scenario E2E on the isolated fixture
  profile, mirroring checkup.spec), plus fixture(s) under `app/tests/fixtures/`.
- This task's three record files.

## Checks that will show the outcome holds

- `cd core && npm test` — new convert suite green plus the whole core suite:
  happy path (code-filled folder converts, bytes verified, exact-path commit
  contains only created files, pre-existing dirty file untouched/unstaged);
  AGENTS.md conflict refused with zero writes; existing `docs/ai-work/LOG.md`
  kept and reported; no-identity repo → written, not committed; non-git folder
  → init + commit; already-Cairn folder refused.
- `cd app && npm run typecheck && npm run test:unit` — green.
- `cd app && npm run build:vite && npm run build:lab` — green.
- `cd app && npx playwright test tests/convert.spec.ts` — the E2E scenario
  (convert a fixture folder in the isolated profile, land in the project)
  green, with the app token held for the run; released after.
- Final `git status` inspected; conversion fixture outside the repo left as
  evidence or cleaned deliberately, disclosed either way.

DONE means: the button converts a real folder end-to-end in the app, every
refusal path refuses without writing, all checks above are green, and the
report names what the owner can try. STOPPED means any of those does not
hold, with retained evidence and an honest reason.
