# Task 156 brief — port the cast into the real town

(Renumbered from 154: lane B's brief "E2E tests stop taking over the owner's
screen" claimed 154 and lane C's "a smoother conversation" claimed 155 while
this brief was being written; my commit `bcbae9a` briefly overwrote their
154 brief, which the renumber commit restored byte-exact. History is
honest, nothing rewritten.)

## Requested visible outcome

The owner approved Task 152's expressive cast: "Looks good. Let's go with
this." Port it from the lab board into the real app:

1. Every live worker node in the town wears its model's face — distinct
   geometry, signature color, mark, tilt, and blink rhythm — mapped from the
   run's adapter id (`codex-exec` → Codex, `kimi-exec` → Kimi, claude/gemini
   ids → their faces; anything unknown keeps today's shared working marks
   and amber, unchanged).
2. Cairn keeps its real ready/thinking/working marks byte-for-byte and gains
   the cast's "done": for a few seconds after a run closes with a result,
   Cairn's smile opens (aria: "Cairn, done"), then settles back.
3. The lab's mock worker runs as `codex-exec` so the lab town shows the real
   treatment.
4. Captures of the real app (live worker face; Cairn) inspected and
   published as the top shots-page entry.

Deliberately out of scope (each named on the lab board as later): the
"waiting on approval" state (approval state lives in Chat/conductor — and
lane B is actively editing `Chat.tsx`/`service.ts`/`ipc.ts`; this task
steers clear), the delighted one-shot, and worker visibility rules (workers
still appear only while running, so working is their only town state).

## Boundary of intent — what must not change

- Cairn's ready/thinking/working geometry and the thought bubbles stay
  byte-for-byte; the fallback worker face is today's exact shared marks.
- No behavior change to run/dispatch logic, visibility rules, drag, or
  selection; no new dependencies; reduced-motion covers every new animation.
- Foreign uncommitted work stays untouched: `Picker.tsx`,
  `projects.spec.ts`, `Chat.tsx`, `service.ts`, `ipc.ts`, LOG.md's pending
  rows (this task's row is appended, file still uncommitted per the 149/151
  precedent), `app/tmp-capture/`, the 148/150 records.
- `projects.spec.ts` is the stopped workers' file: it is not run and not
  edited here (Task 151's policy), disclosed in the report.

## Checks that will show the outcome holds

- `npm.cmd run typecheck`, `npm.cmd run test:unit` (existing 141 plus new
  mapping tests), `npm.cmd run build:vite`, `npm.cmd run build:lab` clean.
- Playwright E2E file-by-file with the app token held, excluding
  `projects.spec.ts`; any test asserting the old shared worker geometry is
  updated with disclosure (except the foreign file).
- Real-app captures (Electron, visible window) inspected: the Codex face
  live in the town in its color with mark and tilt; Cairn's ready face
  unchanged; shots page serves the new entry.

## DONE and STOPPED

- DONE: cast lives in the real town per above, checks green, captures
  published, records written, exact-path commits (brief; then the work).
- STOPPED: the port can't hold the boundary (e.g. wiring the done moment
  proves inseparable from the foreign lane's files), or checks fail beyond
  honest repair; stop with state preserved and the smallest next choice
  named.
