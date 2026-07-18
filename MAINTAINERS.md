These content standards apply inside every Cairn task — the process itself is governed by AGENTS.md.

# AI Coding Workflow Framework — maintainer instructions

This is a standalone documentation project for complete novice coders. Work only
inside this directory unless the user explicitly expands scope.

## The public framework

- `README.md` — front door and route chooser;
- `GETTING-READY.md` — tool setup and the glossary;
- `CONTRACT-TEMPLATE.md` — the portable project contract; **all workflow rules live
  here and only here**;
- `PROJECT-KICKOFF.md` — setup for an empty folder;
- `PROJECT-CONVERSION.md` — preservation-first setup for an existing folder;
- `EVERYDAY-WORKFLOW.md` — the daily reference for the owner's short commands;
- `HIGH-STAKES.md` — stricter steps and expert-escalation boundaries;
- `cairn.html` — the Cairn companion app: a self-contained interactive walkthrough of
  the whole framework (landing, onboarding, guided paths, daily command deck, pilot
  tracker). It is the primary human-facing interface; the Markdown files remain the
  canonical source.
- `index.html` — a redirect to `cairn.html` so the GitHub Pages root opens the app;
- `CHANGELOG.md` — plain-language history of contract versions;
- `LICENSE` — MIT;
- `cli/` — cairn-cli (early alpha): the workflow as a gated command line on the
  Claude Agent SDK. The Markdown protocol stays canonical; the CLI is its reference
  runtime, and it must enforce in code what the contract states in prose (hash-locked
  approvals, tool deny-lists, the reviewer's report lockout, the mechanical Direction
  Gate). Its `assets/contract.md` is synced from `CONTRACT-TEMPLATE.md` at every
  build — never edited by hand.

The contract carries a version number (`Cairn Contract v1.2` in its header). Bump it
whenever the contract's rules change meaningfully, in the template and the app's
embedded copy together — and add a plain-language entry to `CHANGELOG.md` in the
same session. Projects update through the two prompts in EVERYDAY-WORKFLOW.md
("When Cairn updates"), which the app mirrors; those prompts preserve the Project
facts block exactly and touch nothing else.

Every prompt that ends by waiting for the owner must name the exact next message it
will accept ("the only message that approves this begins: …"). Prompts travel
without their guides, so each handoff must be self-contained — never assume the AI
can see the next step's text.

## Design rules

1. **Rules live in the contract, not in prompts.** The contract template defines
   every procedure once. Everyday messages must stay short enough to type from
   memory. Only one-time setup prompts and High-Stakes steps may run long.
2. **Novice-first language.** Every term a beginner could not know is defined in the
   glossary or explained where it appears. When in doubt, define it.
3. **Happy path first.** Each document leads with the normal successful flow.
   Exceptions, stop conditions, and troubleshooting go at the end.
4. **One name per concept.** Use exactly these terms everywhere:

   | Concept | The only name for it |
   |---|---|
   | The rules file in a project | project contract (`AGENTS.md`) |
   | The saved per-task boundary file | task brief |
   | The saved per-task outcome file | report |
   | A candidate to judge / an adopted result | Draft / Final |
   | The care levels | Tiny, Standard, High-Stakes |
   | The honest outcomes | DONE, STOPPED |
   | The stop-patching rule | Direction Gate |
   | The human in charge | owner |

5. **Keep the honesty clauses.** Fresh-context review reduces tunnel vision but is
   not independent assurance; evidence proves observations, not overall correctness;
   experts are required where the contract says so. Never soften these.
6. **Preservation first.** Existing, modified, and untracked work is protected in
   every flow. Setup must never become cleanup.
7. **Self-contained and personal-data-free.** No personal names, private history,
   product code, or external dependencies in the public artifacts, and no tie to a
   specific programming language. The app stays self-contained (no CDNs, no network
   requests, no analytics; user data only in localStorage). Cairn builds on Claude:
   the CLI and app run Claude models, and the docs may name current Claude model ids.
8. **Change in lockstep.** A change to loop, lanes, commands, or names updates the
   contract template first, then every document and the app in the same session.
   `cairn.html` embeds verbatim copies (in its `text/plain` script blocks) of the
   contract, both kickoff setup prompts (manual and app-assisted), the four
   conversion prompts, and the three update prompts (check, apply, app-applied
   commit) — when any source text changes, update the embedded copy in the same
   session and verify the contract block still matches `CONTRACT-TEMPLATE.md`
   exactly. The app may write files directly (automatic setup, applied updates)
   only in ways an owner explicitly clicks, never touching files outside Cairn's
   own, and the manual path must always remain documented for non-Chromium users.

Do not add session logs, project-specific scripts, publishing configuration, or
heavyweight evidence machinery (hashes, receipts, hooks) to the beginner defaults;
that class of control belongs in `HIGH-STAKES.md` and only when justified there.
