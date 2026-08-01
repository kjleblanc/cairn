# Task 156 report — the cast, for real: faces live in the town

Requested visible outcome: port the owner-approved cast (Tasks 149/152) from
the lab board into the real app — per-model worker faces mapped from adapter
ids, Cairn's real marks byte-for-byte plus its new done moment, the lab mock
wearing the Codex face, captures published.

## What actually changed

- `app/src/renderer/town/faces.ts` — new. The cast as data: Cairn
  (ready/thinking/working byte-for-byte the app's original TownFace marks,
  plus the new done), the four worker faces (kimi/codex/claude/gemini, each
  with all four states, signature mark, tilt, blink rhythm, color token),
  and `worker-fallback` (the previous shared working marks in garden amber,
  every state). `faceForAdapter()` maps adapter ids by family substring;
  anything unknown returns the fallback — an unrecognized adapter changes
  nothing.
- `app/src/renderer/components/TownSquare.tsx` — `TownFace` renders from the
  defs (nested eye groups so per-eye blink animations compose; marks; tilt;
  per-face color/glow via CSS vars). Worker nodes wear
  `faceForAdapter(entity.role)` in the working state (workers are visible
  only while running — visibility rules unchanged). Cairn gains the done
  moment: a running→closed transition with a result opens its smile for ~6 s
  (aria "Cairn, done"), tracked locally in the square; `town/model.ts`
  untouched. `town-face-worker` is kept on non-Cairn faces as a
  style-inert compatibility class (see Repairs).
- `app/src/renderer/tokens.css` — the cast's color tokens
  (`--face-kimi/-codex/-claude/-gemini` plus glows), documented next to the
  garden tokens.
- `app/src/renderer/app.css` — face strokes color from `--face-color`;
  per-face holo glow from `--face-glow` (Cairn keeps its exact original
  two-shadow glow); the cast's blink rhythms (double / slow / alternating /
  squeeze; single is the app's original); Gemini's mark dots bob; tilt
  wrapper; reduced-motion covers every new animation. Retired the old
  eye/mouth size/weight classes (stroke widths now come from the face data,
  as on the board). One disclosed visual delta: Cairn's mouth is now pure
  `--garden-cyan` (was a 78/22 cyan-amber mix) — the board's approved
  treatment.
- `app/lab/mock-cairn.ts` — the lab's stand-in worker runs as `codex-exec`
  so the lab town shows the real cast treatment (lab-only file).
- `app/tsconfig.unit.json` + `app/tests-unit/faces.test.ts` — 4 new unit
  tests: adapter→face mapping (all four families), fallback for
  null/unknown ids, Cairn's original geometry pinned byte-for-byte, and
  every cast face carrying four states with distinct colors and blinks.
- `app/shots/` (gitignored) + `design/attachments/` — three inspected
  captures as the new top entry: `task-156-town-clear.png`,
  `task-156-worker.png`, `task-156-ready.png`.

## Checks run and their real results

- `npm.cmd run typecheck` — clean.
- `npm.cmd run test:unit` — 145/145 (141 existing + 4 new).
- `npm.cmd run build:vite` / `npm.cmd run build:lab` — clean.
- Playwright E2E with the app token held (`$TEMP/cairn-app-token`, the 143
  convention this time): smoke 1/1, away 1/1, connect-kimi 1/1,
  routing + serial 14/14, bridge 1/1 — **18/18 green**. `projects.spec.ts`
  not run (the stopped workers' uncommitted file — Task 151's policy).
  `conductor.spec.ts` not run (lane C's active Task 155 WIP — see Repairs).
- Captures inspected: the Codex face live in the real town (keen amber
  eyes, spark, tilt, worker pad, thread to Cairn), Cairn's working and
  ready faces unchanged, the tucked chip beside them.

## Repairs disclosed

1. **Renumbered 154 → 156.** My brief commit `bcbae9a` collided with lane
   B's already-claimed 154 (E2E window parking) and briefly overwrote their
   brief file; `9d19564` restored theirs byte-exact (verified: empty diff
   against the pre-collision version) and claimed 156, the next free number
   (155 is lane C's). History not rewritten; the collision commit stands.
2. **Compat class for the in-flight lane.** `conductor.spec.ts` — both the
   committed version and lane C's WIP — asserts the retired
   `.town-face-worker` class at two points. The file is actively being
   edited by lane C (130-insertion WIP), so instead of touching it, every
   non-Cairn face carries `town-face-worker` as an additional style-inert
   class (no CSS rules reference it). It keeps their assertions true both
   ways; remove it after 155 lands and the spec names the cast classes.
   `conductor.spec.ts` was therefore not run here — its WIP tests unlanded
   behavior and would fail for reasons unrelated to this task.
3. First bridge.spec run failed in `playwright.global-setup.ts`
   (`freshOrThrow` mtime guard) and passed on immediate rerun with no
   rebuild — a transient mtime race, same family as the known harness
   nuisances; noted, not a product issue.
4. The lab mock's done path nulls the session instead of emitting a
   closed-with-result snapshot, so the done moment isn't capturable in the
   lab; it is logic-verified against the real main-process transition
   (`tasks.ts` sets `phase = "closed"` with `result` on success) and shown
   on the Task 152 board. Fabricating a `SerialRunResult` in the mock was
   judged heavier than the shot was worth.

## How to try it

Open the app (or the lab root) and start a task: the worker node appears
wearing its model's face — today that's the Codex face (amber, keen eyes,
spark, slight lean). Watch Cairn when the result card lands: the smile
opens for a few seconds. Drag the worker, tuck the bubble — everything else
behaves exactly as before. The three captures are the top entry on
`/shots.html`.

## Limitations and remaining human judgment

- Kimi/Claude/Gemini faces ship dark until those adapters exist — only
  codex-exec and the fallback are exercisable today (the lab shows Codex).
- The done moment is 6 s and Cairn-local; if the owner wants it longer or
  wants the worker to linger with its done face, that's a visibility-rule
  change for a later task.
- The compat class is deliberate debt with a named removal point (after
  Task 155 lands).
- The foreign uncommitted evidence (stopped worker runs' picker edits and
  records, LOG.md's pending rows — now including this task's) remains
  untouched and awaits the owner's decision.

Disposition: DONE
