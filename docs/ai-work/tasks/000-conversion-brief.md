# Task 000 — Convert the Cairn repository to the Cairn workflow

This is a future-only conversion. Nothing in the past is rewritten, and the new
process governs nothing until the owner's separate activation.

## 1. What this project is, in plain language

This repository is Cairn itself: the written protocol (README and five guides), the
portable project contract (`CONTRACT-TEMPLATE.md`, currently v1.2), the companion web
app (`cairn.html`, served live via GitHub Pages), and the new command-line runtime
(`cli/`, TypeScript on the Claude Agent SDK). The working tree is clean; all work is
committed and pushed to `github.com/kjleblanc/cairn` on `main`. Pushing to `main`
publishes the site — so during and after this conversion, only the owner pushes.

## 2. Preservation list — untouched by this conversion

- Every existing file in the repository, without exception. This conversion only
  **adds** files under `docs/ai-work/` and, at activation only, performs the exact
  rule-file swap described in section 3.
- `cli/node_modules/`, `cli/dist/`, `cli/assets/contract.md` — untracked by design
  (ignored); they stay untracked.
- Git history, the remote, and the GitHub Pages configuration.

## 3. The existing rule files — kept, and reorganized only at activation

Two rule-like files exist today:

- `AGENTS.md` — the **maintainer instructions** (content standards, lockstep rules,
  the one-name-per-concept table). It is authoritative today and remains
  authoritative until activation.
- `CONTRACT-TEMPLATE.md` — the product itself, not a rulebook for this repo. Never
  renamed or modified by this conversion.

The Cairn contract expects to live at `AGENTS.md`, which collides with the
maintainer file. Resolution, preserving both:

- **Now (candidate phase):** the filled-in contract is installed at
  `docs/ai-work/CONTRACT-CANDIDATE.md` with `STATUS: CANDIDATE — NOT ACTIVE`.
  The existing `AGENTS.md` stays exactly where it is and stays in charge.
- **At activation (owner-authorized, one commit):**
  1. `AGENTS.md` is renamed to `MAINTAINERS.md`, unchanged in content except one
     added first line: *"These content standards apply inside every Cairn task —
     the process itself is governed by AGENTS.md."*
  2. The candidate contract moves to `AGENTS.md` with `STATUS` flipped to `ACTIVE`
     and one added line under Project facts: *"Content standards for the framework
     live in MAINTAINERS.md and bind every task."*

  This activation intentionally does more than flip the STATUS line (the canonical
  activation prompt assumes no filename collision); the exact steps above are the
  authorized scope, and nothing else moves. **Dogfood finding for a later task:**
  the conversion guide should mention the collision case.

## 4. Exactly what the conversion creates

- `docs/ai-work/tasks/000-conversion-brief.md` — this file (already created by the
  audit, as the protocol allows).
- `docs/ai-work/CONTRACT-CANDIDATE.md` — Contract v1.2 with these Project facts:
  - `STATUS: CANDIDATE — NOT ACTIVE`
  - `PROJECT NAME: Cairn`
  - `WHAT WE ARE BUILDING: a protocol, web app, and CLI that let people with zero coding experience build real software safely with AI`
  - `WHO WILL USE IT: complete beginners — and Cairn's own maintainers, starting now`
  - `CURRENT MILESTONE: a real-model cairn task completes an improvement to Cairn itself, end to end`
  - `DIRECTION GATE TIMEBOX: two Standard tasks without visible progress (default)`
- `docs/ai-work/PROJECT.md` — goal, users, milestone, and non-goals (the framework
  stays project-neutral, novice-first, dependency-free in its public artifacts).
- `docs/ai-work/LOG.md` and `docs/ai-work/PILOT.md` — empty tables per the contract.
  The five-task pilot measures Cairn used on Cairn.
- `docs/ai-work/tasks/000-conversion-report.md` — the conversion report.

One conversion commit contains exactly these files, staged by name. No push.

## 5. Checks that already fail today

None known. `cd cli && npm run build` and the 13 unit tests pass as of the current
commit (`952ed4b`). One quirk, not a failure: on Windows, `node --test` needs
explicit file paths, which `npm test` already provides.

**Known open bugs recorded for the task backlog, not fixed here:** the CLI's
`isCairnProject()` accepts any `AGENTS.md` containing "Cairn" — including today's
maintainer file — so before activation it would misread this very repo. First-task
candidate. Also open: no revise-brief loop, no Tiny lane in the CLI.

## 6. Activation and abandonment

- **Activate:** only after a fresh-context review of this conversion. The owner
  authorizes the activation commit described in section 3 — one commit, exactly
  those two file operations plus the STATUS flip.
- **Abandon before activation:** delete `docs/ai-work/` in a normal commit; the
  maintainer `AGENTS.md` was never displaced. No history rewriting, ever.
- **Roll back after activation:** a new commit reversing the section-3 swap.

## Sensitive-surface rule for the dogfood era

Cairn developing Cairn means tasks may edit the very files that enforce the rules.
Any task touching `CONTRACT-TEMPLATE.md`, `cli/src/gates.ts`, or `cli/src/agents.ts`
gets a mandatory fresh-context review before the owner decides — no exceptions.
The owner remains the only one who pushes.

## Stop conditions

Stop the conversion if: the working tree stops being clean before install; any
proposed path collides with existing work; a supposedly read-only step writes;
product behavior changes; or the owner does not approve this exact brief.
