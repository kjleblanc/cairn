# Task 003 — brief

> **Recorded retroactively.** This work ran under a written spec and a 16-task
> implementation plan (the superpowers flow), not through `cairn task`. The owner
> approved the spec, the plan, and the final merge interactively in chat. This brief
> restates what was agreed before the build, in the contract's own format, so the
> trail stays in one place.

## Lane: High-Stakes · Mode: Final

**Why High-Stakes:** the work adds dependencies (Electron, React, Vite, Playwright),
moves the gate and agent files into a new package, changes how approvals are stored
(now written to disk), and produces an installer that strangers will run. Several of
those are on the contract's High-Stakes list, and `gates.ts` / `agents.ts` fall under
the mandatory-review rule from brief 000.

**Why Final:** the spec was approved section by section before any code; this is the
project's real desktop app, not a candidate to park.

## The visible outcome

A double-clickable desktop app — Cairn Desktop — that runs the whole gated loop for
someone who has never opened a terminal: pick or create a project, see the cairn on
its hillside with the real log, then define → approve → build → verify → decide in a
five-step wizard. The approval gate, the report lock, the forbidden-action denials,
and the Direction Gate all still live in code the interface cannot bypass.

## The boundary that was agreed

- The repo becomes a workspaces monorepo: `core/` (the engine, extracted from
  `cli/src`), `cli/` (same commands, same behavior), `app/` (the Electron skin).
- Approvals become persisted: `docs/ai-work/tasks/NNN-approval.json`, re-read and
  hash-checked before any build. The CLI adopts the same persistence.
- Auth rides on the owner's Claude Code sign-in. No API keys anywhere.
- Visuals: faded pastels, nature blended with technology, no mascots.
- v1 ships unsigned, Windows + Mac, built by CI on version tags.
- Out of scope: code signing, auto-update, Linux, API-key auth.

## Checks agreed before building

- Every existing CLI test keeps passing; the extracted engine gains tests for the
  resumable steps, including tamper-refusal and resume-from-disk.
- A Playwright smoke test drives the full mock loop through the real app UI.
- `npm run make` produces a Windows installer and the packaged app launches.

DONE when: all checks pass and the owner accepts the merge.
STOPPED if: any gate behavior would have to weaken to make the app work.
