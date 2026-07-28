# Task 095 report — close the town-square workspace end to end

The approved town-square workspace is complete against the full local
verification matrix. A live worker remains owned by its original project while
another project is viewed: the original rail row stays marked working, the
other town shows no foreign villager, the main-process session remains live,
and returning restores the worker. Closing the run removes its villager and
thread while the rail and records retain task history.

Beginner-facing documentation now describes the conductor and persistent
rail/Chat/town workspace as current behavior. It continues to state the real
limit: worker execution is serial within each project, and the visual
eight-villager cap is not a concurrency promise.

Files changed:

- `README.md` — adds the current conductor workspace and town to “What works
  now” and replaces the obsolete “conductor is the destination” prose.
- `app/README.md` — describes the real workspace path, semantic town,
  accessibility/persistence behavior, and complete local verification command.
- `app/tests/conductor.spec.ts` — adds cross-project live-worker isolation,
  unique temporary project labels, real activity-marker targeting, and a
  scenario-specific commentary timing control.
- `app/tests/routing.spec.ts` — updates the architecture assertion for the
  workspace-owned task view and scopes retained-evidence copy to its real card.
- `app/tests/fixtures/fake-codex-env.ts` — adds a long-lived local fake used
  only by the town drag/switch/reload scenario.
- `app/tests/fixtures/fake-conductor.mjs` — makes the sibling-chip busy interval
  deterministic and exposes a test-only commentary delay used by one lock
  scenario.
- `docs/ai-work/tasks/095-brief.md` — records the closeout outcome and bounds.
- `docs/ai-work/tasks/095-report.md` — records this result.
- `docs/ai-work/LOG.md` — appends the task outcome.

Checks run:

- Core workspace — passed, 106 tests.
- CLI workspace — passed, 9 tests.
- desktop `npm run typecheck` — passed.
- desktop `npm run test:unit` — passed, 92 tests.
- desktop `npm run build:vite` — passed for main, preload, and renderer.
- complete conductor Electron file — passed, 22 tests.
- all remaining Electron files — passed, 18 tests.
- total final Electron matrix — 40 passing scenarios, using fresh isolated app
  profiles, a loopback conductor fixture, and fake worker executables only.
- `git diff --check` — passed.

The first sandboxed root test wrapper exceeded ten minutes in Core's fake child
process timeout/kill coverage. The same Core suite ran outside that process
sandbox and passed all 106 tests in 32.8 seconds; it made no network or real
provider call.

Three full Electron attempts exposed test-only timing and locator assumptions:
the new rail duplicated retained-evidence text, repeated temporary project
names made name-only selection ambiguous, and short fake reply/comment windows
could close before assertions on a loaded serial suite. Locators were tied to
the intended card or real working activity marker, temporary names were made
unique, and only the affected fake scenarios gained deterministic longer
windows. Focused reruns passed, followed by clean 22/22 and 18/18 final runs.

How to try it:

1. From the repository root, run `npm.cmd --prefix app start`.
2. Open a governed project. Chat is centered, the project/task rail is on the
   left, and the semantic town is on the right.
3. Switch projects from the rail, collapse it, resize the divider, and narrow
   the window to use Chat/Town tabs.
4. Connect Cairn through its official card if desired. A real live worker
   villager appears only after the separate one-call confirmation.
5. Select Cairn, a worker, or a task thread by pointer or keyboard; drag a
   worker, reload to restore it, and use Reset layout to return to automatic
   placement.

Limitations:

- No installer was produced or installed, and nothing was published or
  deployed; those are separate risk-boundary actions.
- No real provider call was made during this build or its tests.
- The current runtime remains one worker task and one conductor reply at a
  time per project. This work does not authorize multi-agent concurrency.
- The current project milestone was not moved by this workspace build.

Disposition: DONE
