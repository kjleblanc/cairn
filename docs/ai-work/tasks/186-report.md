# Task 186 report — quiet paper field

**Lane:** E

**Base commit:** `43519bf001f7f05919011f3659203fb3251d51ed`

**Brief commit:** `c904c855c410ab87a16daf62c8678bdcad0b6c96`

**Synced main base:** `18a7a6e968e919783e824a7b44c1eb5daf6388bb`

**Milestone moved:** NO

## Outcome

Cairn's real desktop workspace now opens with its project rail tucked against
the left edge. The rail, pond, conversation lantern, and composer share one
quiet static paper grain and a faded dusk palette. Hard glass dividers, stacked
halos, oversized pills, and extra current-project cards have been reduced or
removed; project identity at the top is now a light annotation with a short
cyan environmental mark.

Cast faces remain their existing readable three-stroke drawings with no circle,
badge, or added scribble. Visual flair comes from one soft, offset identity-color
wash behind each face. Rail monograms use the same unboxed wash language.

The composer remains one field containing **Talk with Cairn**, **New**, and
**Send**. Its actions are smaller, flatter rounded rectangles, retain their
accessible names and focus treatment, and become completely still when reduced
motion is requested. The tucked rail also retains explicit accessible project,
activity, and action names.

The owner inspected the final wide, compact, and composer captures and confirmed
the direction on 2026-08-06. Task 186 is complete in Lane E only. Main's stopped
Task 180/183 work remains untouched, so this lane was not merged into main.

## What changed

- `app/src/renderer/tokens.css` adds one local static monochrome paper-grain
  token and a feathered rail-shore material.
- `app/src/renderer/app.css` applies the shared grain, tucks and feathers the
  rail, unboxes rail marks, quiets lantern edges and light spill, turns the top
  project context into an annotation, flattens workspace/composer actions,
  adds the restrained face wash, and closes the reduced-motion specificity
  gap without changing any face path.
- `app/src/renderer/screens/Workspace.tsx` makes the existing rail state start
  collapsed; its expand/collapse behavior is otherwise unchanged.
- `app/src/renderer/components/ProjectRail.tsx` gives icon-only tucked projects
  and bottom actions explicit accessible names, including activity and urgent
  state for each project.
- `app/tests-unit/papersignal.test.ts` is the red-first Task 186 contract for
  the tucked shelf, shared static grain, unboxed marks, bare face strokes,
  flatter composer controls, reduced motion, and annotated project context.
- `app/tests-unit/environmentchrome.test.ts`,
  `app/tests-unit/lantern.test.ts`, and
  `app/tests-unit/newhorizons.test.ts` update the existing environment contracts
  to the quieter approved treatment.
- `app/tests/projects.spec.ts` proves the rail starts tucked, its accessible
  names survive that presentation, its old expansion/switching behavior still
  works, and wide/compact geometry remains contained; it writes the two final
  environment captures.
- `app/tests/conductor.spec.ts` proves the unified composer is stationary under
  reduced motion, writes the current Task 186 composer capture, adapts project
  navigation assertions to the named tucked rail, and repairs one stale
  pre-Task-184 risk selector in the full dispatch journey.
- `docs/ai-work/tasks/186-report.md` is this report.
- `docs/ai-work/LOG.md` receives the Task 186 row. A later union merge must
  retain the independent Task 180, 181, 183, 184, 185, and 186 rows exactly
  once.

No dependency, lockfile, face geometry, conversation/task/dispatch behavior,
provider connection, worker behavior, stored project data, credential, project
fact, milestone, push, publish, deployment, or production data changed.

## AI decisions and review record

- The existing rail collapse state is the sole owner of the tucked default;
  no second responsive state or hidden navigation component was introduced.
- Texture is a tiny static inline SVG token. It is layered faintly on existing
  surfaces, so it creates paper tooth without an asset dependency, animated
  noise, or rough control outlines.
- Existing avatar paths were protected. The offset wash is a pseudo-element
  behind the face and carries each cast member's existing identity color.
- The current-project header keeps its semantic structure and live status but
  loses its independent card material. This preserves screen-reader behavior
  while reducing visible chrome.
- Review found that the first reduced-motion rule lost to the more specific
  villager-button selectors. Matching-specificity final rules now remove both
  transition and hover/press transform, and the Electron proof checks computed
  style rather than source text alone.
- Review also required a fresh composer capture and found two test-only rail
  assertions coupled to expanded text. Both were updated and rechecked.
- The final full dispatch/navigation journey exposed one obsolete
  `.task-chip-risk` locator after Task 184 renamed the live item `.task-risk`.
  Only that harness selector changed; the complete journey then passed.
- Three independent read-only final reviews reported no remaining P0–P2
  visual, accessibility, code, test, or provenance findings.

## Checks run and real results

1. Red-first focused contract from `app`: compile with
   `npx.cmd tsc -p tsconfig.unit.json`, then run the Task 186 renderer tests.
   - The initial six new assertions failed against the previous glassier
     treatment, as intended.
   - Final command:
     `node --test dist-unit/tests-unit/papersignal.test.js dist-unit/tests-unit/environmentchrome.test.js dist-unit/tests-unit/furniture.test.js dist-unit/tests-unit/lantern.test.js dist-unit/tests-unit/newhorizons.test.js`
   - Final result: **33 passed, 0 failed**.
2. `cd app && npm.cmd run test:unit`
   - Final result: **383 total, 381 passed, 0 failed, 2 Windows host-specific
     skips**.
3. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
4. `cd app && npm.cmd run build:vite`
   - Passed with the required local worktree-read allowance: main **63
     modules**, preload **1 module**, renderer **73 modules**.
5. `cd app && npm.cmd run build:lab`
   - Passed with the same local allowance: **96 modules**.
6. With no Cairn/Electron process and both `.lanes/e/app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held, every Electron run used
   `CAIRN_TEST_LANE=1`, one worker, an isolated profile, and only Cairn's local
   mock/scripted fixtures:
   - `npx.cmd playwright test tests/projects.spec.ts --workers=1 --grep
     "project chrome opens tucked"` — **1 passed**; wrote the settled wide and
     compact captures.
   - `npx.cmd playwright test tests/conductor.spec.ts --workers=1 --grep
     "New and Send share"` — **1 passed**; verified containment, behavior, and
     computed reduced-motion style, and wrote the composer capture.
   - The first two serial remembered-project checks run together — **2 passed**;
     verified registry, reopen, tuck/expand, project switching, narrow/wide
     conversation navigation, and Project Home compatibility.
   - `npx.cmd playwright test tests/conductor.spec.ts --workers=1 --grep
     "a dispatched run lives"` — final **1 passed** in 15.2 seconds; the full
     proposal, set-aside, preview, fake dispatch, project-away/back, pond,
     persistence, stop, and terminal-result journey remained intact.
   - No real provider, model, or worker was called.
7. Visual inspection of the final settled artifacts:
   - `%TEMP%/cairn-task-186-quiet-paper-field-wide.png` — passed: tucked shelf,
     paper tooth, unframed Cairn face, and plain top annotation read as one
     environment without clipped content.
   - `%TEMP%/cairn-task-186-quiet-paper-field-compact.png` — passed: the compact
     conversation remains cohesive and the project identity stays explicit.
   - `%TEMP%/cairn-task-186-unified-paper-composer.png` — passed: Talk with
     Cairn, New, and Send occupy one field with restrained controls.
   - The owner confirmed all three as the desired direction on 2026-08-06.
8. `git diff --check`, exact diff/status inspection, final process/lock check,
   and separate main-checkout status inspection
   - Passed. Lane E contains only Task 186 implementation, test, and record
     paths. No Cairn/Electron process or app-token remains. Main remains at
     `18a7a6e968e919783e824a7b44c1eb5daf6388bb` with its protected Task 180/183
     work retained and was not written or landed into.

Diagnostic failures were repaired and are not counted as passes. Windows
PowerShell rejected the first lock wrapper's `New-Item -LiteralPath` before an
app or lock existed; the exact compatible `-Path` form was used. The first two
visual-test attempts made incorrect expanded-versus-tucked assertions and were
repaired in the test. A standalone invocation of the second serial project test
opened Welcome because that serial scenario intentionally depends on the first
test seeding its registry; both tests passed together. One Electron invocation
correctly refused a bundle made stale by a later CSS edit; both builds were
rerun before final E2E. The first combined composer/full-journey invocation
passed the composer but stopped at the stale risk locator described above; the
repaired full journey passed on its next run. Every attempt released both locks,
and final checks found no Electron process.

## How to try it

The quickest exact review is the settled wide capture:

`C:\Users\KenJL\AppData\Local\Temp\cairn-task-186-quiet-paper-field-wide.png`

Compare it with the compact and composer captures beside it. To run the real
local result once no other Cairn window is open:

```powershell
cd "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework\.lanes\e\app"
npm.cmd run build:vite
npm.cmd start
```

This result is intentionally not visible from the dirty main checkout yet. It
can be landed only after main's stopped Task 180/183 ownership is reconciled.

## Limitations

This task changes presentation, not the pending Project Home/side-project
structure being explored in the stopped main work. The static captures verify
the tested Windows render sizes; other display scaling can slightly change how
fine the grain appears. The owner supplied the required final taste judgment.

Disposition: **DONE**
