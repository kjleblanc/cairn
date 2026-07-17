# Task 003 — report

> **Recorded retroactively**, like the brief. The full engineering trail lives in
> `docs/superpowers/specs/2026-07-17-cairn-desktop-design.md`, in
> `docs/superpowers/plans/2026-07-17-cairn-desktop.md`, and in the sixteen commits
> from `5743344` to `bfd355a` (merged fast-forward to main).

## Result

Cairn Desktop v0.1 exists and works. The repo is now three packages sharing one
engine:

- **core/** — `@cairn/core`: files, gates, prompts, agents, plus the loop as
  resumable steps (`defineTask`, `approveBrief`, `buildTask`, `reviewTask`,
  `closeTask`, `runDirectionCheck`, `projectStatus`, `initProject`). Approvals are
  now written to `docs/ai-work/tasks/NNN-approval.json`; `buildTask` re-reads the
  file and refuses if the brief changed by one byte.
- **cli/** — same three commands, same prompts and output, now a thin sequencer
  over core. One visible addition: `cairn status` mentions an unfinished task.
- **app/** — the Electron app: welcome/first-run with a guided Claude sign-in
  check, project picker with the five-question kickoff, the hillside dashboard,
  the five-step wizard, the Direction Gate screen, and settings. Denied actions
  surface as amber "blocked" chips in the live activity feed.

## Files changed

64 files, +12,960 / −103, across sixteen commits — see `git log 23285b2..bfd355a`.

## Commands run

`npm install`, `npm test` (root and per package), `npm run typecheck`,
`npx playwright test`, `npm run make`. No pushes, no deploys.

## How to try it

From the repo root: `npm install && npm test`, then `cd app && npm install &&
npm start`. For the offline demo: set `CAIRN_MOCK=1` before `npm start` and run a
task in a scratch project — the whole loop works with no AI calls.

## Human checks

- The owner approved the design spec section by section, chose the approaches
  (Electron, full-home scope, Windows+Mac, Claude login, faded-pastel visuals),
  approved the written spec and plan, and accepted the merge to main.
- The owner has not yet clicked through the app by hand. That is the natural next
  personal check.

## Evidence

- 23 core tests + 5 CLI tests pass on the merged result.
- The Playwright smoke test drives the entire mock loop through the real UI —
  boot, auto-open, define, approve (hash lock), build, decide, close — and asserts
  the stone lands (`app/tests/smoke.spec.ts`, ~3 s).
- `npm run make` produced `Cairn-0.1.0 Setup.exe`; the packaged app launched and
  ran until killed.

## Limitations — honest

- **No fresh-context reviewer ran on this work.** Brief 000 makes review mandatory
  for `gates.ts` / `agents.ts`; both moved packages verbatim (content unchanged),
  but the surrounding steps code is new. The owner may order `Review task 3` at
  any time — the artifacts and diffs are all in place for it.
- The approval-hash gate did not govern this work itself; the owner's approvals
  were interactive chat approvals of the spec, the plan, and the merge.
- Not yet exercised: a real-engine (non-mock) run of the app; the Mac build and
  the release upload (proven only by pushing a `v*` tag); code signing.

## Milestone movement

NO — the milestone is "a real-model `cairn task` completes an improvement to Cairn
itself, end to end," and this work ran outside the cairn loop by design. It builds
the road toward that milestone for people who will never open a terminal.

Disposition: DONE
