# Cairn changelog

The contract version lives in the header of `CONTRACT-TEMPLATE.md` and in every
project's `AGENTS.md`. To bring a project up to date, follow "When Cairn updates" in
[EVERYDAY-WORKFLOW.md](EVERYDAY-WORKFLOW.md) — updates are approved by you, never
automatic.

## Contract v2.2 — 2026-07-20

- Ended Bootstrap Cairn's serial-only restriction. A bounded concurrent path may
  admit at most two independent Standard tasks with declared non-overlapping paths,
  isolated operating-system temporary worktrees, no task-to-task dependencies or
  task-level external actions, and one-at-a-time integration into `main`.
- Permitted that disposable concurrent path to use at most two separately bounded,
  tool-free provider calls through official installed authentication, exactly one per
  task, after the owner approves both exact calls and one fixed total cost cap.
- Preserved Task 016 as immutable historical evidence while allowing a new
  High-Stakes Final task to name its exact implementation and retained concerns,
  reuse or repair the code, and prove the v2.2 boundary before separate activation.
- Kept parallel mode disabled during the amendment. Contract permission does not
  claim that the current runtime implements or activates the concurrent path.

## Contract v2.1 — 2026-07-20

- Made the Direction Gate advisory. It still pauses patching, preserves failed
  evidence, and compares real alternatives, but the owner may explicitly continue
  the same approach with an `Owner override:` decision.
- Replaced the mandatory qualified-human, synthetic-canary, and OS/process-isolation
  prerequisites for owner-managed local AI provider authentication. One newly
  created disposable, tool-free provider call may use official installed
  authentication after the owner separately approves the exact credential use,
  provider network call, and fixed cost cap.
- Kept the hard non-exposure boundary: credential values never enter chat, commands,
  model-visible tools, output, logs, evidence, project files, or Git. The exception
  does not cover application-user authentication, billing changes, valuable
  repositories, model tools, or multi-call agent sessions.

## Contract v2.0 — 2026-07-19

- Replaced the mandatory multi-chat Define → Build → Verify → Decide sequence with
  **risk-based autonomy**. Tiny and Standard local reversible work now proceeds
  continuously through brief, implementation, repair, verification, report, log, and
  safe local commit without separate approval, build-chat, review, or decision gates.
- Kept explicit planning and approval for genuine High-Stakes work. High-Stakes
  builds still require safe rehearsal, just-in-time approval for live actions,
  mandatory fresh-context review, an owner decision, and qualified humans where the
  risk demands them.
- Changed task records from permission machinery into project memory. Routine work
  still leaves briefs, reports, and append-only log rows, so another chat can continue
  without guessing.
- Added `Bootstrap Cairn:` so maintainers can improve Cairn directly and serially
  while its own runtime is not reliable enough to self-host. Bootstrap bypasses the
  unproven app/CLI workflow, not the safety boundary.
- Removed parallel execution and coordinator repair from Cairn's current milestone.
  Existing parallel candidates remain disabled historical evidence.
- Strengthened the Direction Gate: a second gate on the same implementation ends
  that approach instead of permitting another renamed repair.
- Marked the current Cairn CLI and Desktop workflow as legacy v1.x behavior until a
  separate bootstrap implementation aligns them with Contract v2.0.

## Contract v1.5 — 2026-07-19

- Added **Experimental Drafts** for disabled, synthetic-only learning candidates.
  Their briefs name one supported user path and finite containment and rollback
  checks; they are not production guarantees.
- Review may return `PASS WITH CONCERNS` when the supported path works and
  containment holds. Defects or uncertainty outside that path remain documented
  concerns unless they can break the path or escape containment.
- A contained experiment no longer has to prove every internal call sequence,
  platform, crash interleaving, or future production condition before the owner can
  keep it for learning.
- A later Final task must name the exact candidate and its retained concerns, run the
  exhaustive checks appropriate to valuable work, and obtain every qualified-human
  approval required before activation.
- This distinction does not weaken scope, approval, protected-work, external-action,
  rollback, or genuine product-safety stops.

## Contract v1.4 — 2026-07-19

- A failed check is no longer automatically final. Correctable, in-scope
  implementation mistakes and checking-harness defects may be repaired and rerun in
  the same approved task, with the failed output and every correction retained in the
  report.
- A brief cannot force a repairable failure into `STOPPED` merely by naming the check.
  Tests may be corrected, but never weakened just to pass; affected checks must be
  rerun and independent evidence remains required where the lane or brief calls for it.
- Immediate stops remain for scope expansion, protected-state changes, missing
  authority or expertise, secrets, unsafe external effects, unclear rollback, and
  unexpected genuine product-safety failures.
- Added `Owner override:` for explicit process-only direction and `Amend the project
  contract:` for an owner-controlled pause, reviewed rule change, and separate exact
  reactivation. Neither escape hatch can waive the hard safety boundaries or silently
  authorize an external action.

## Contract v1.3 — 2026-07-18

- Added a narrow exception for an owner-managed local AI-provider credential. It can
  avoid mandatory expert review solely for holding the credential only when a real
  technical boundary keeps the value out of chat, files, logs, renderer memory, and
  every model-accessible tool.
- “Stored locally,” hidden UI, prompt rules, and command deny-lists are explicitly not
  enough. A synthetic rehearsal and boundary inspection must support all nine
  conditions; missing evidence fails closed.
- Real application login and permissions, other secrets, payments, personal data,
  destructive work, production security, public or legal commitments, and
  safety-critical behavior still require an experienced human. Credential use,
  provider network access, and cost still require separate owner approval.
- Cairn's current runtime is not grandfathered into the exception.

## Cairn Desktop v0.1 — 2026-07-17

The gated loop as a desktop app. A project picker, a dashboard where your cairn
stands on a hillside, and the five steps — define, approve, build, verify,
decide — as one calm wizard. Approvals are hash-locked and now persisted to
`docs/ai-work/tasks/NNN-approval.json` (the CLI does the same). Windows and Mac
installers are built by CI on every version tag; v1 ships unsigned with honest
install notes in `app/README.md`.

## Contract v1.2 — 2026-07-17

- Added the work log: every closed task appends one row to `docs/ai-work/LOG.md`,
  and the AI reads the last few rows when orienting a new chat. Setup creates the
  file.
- The Cairn app can now connect a project folder (Chrome/Edge, read-only): it shows
  your real recent work, stacks stones from actual DONE outcomes, and generates a
  "Share your cairn" snippet.

## Contract v1.1 — 2026-07-17

- Every prompt that stops for approval now names the exact message that resumes it,
  so the AI points you to the right next step instead of improvising its own
  approval question.
- A casual "yes" no longer counts as approval to build — only the scripted approval
  message does.
- The contract header carries the framework's home
  (https://github.com/kjleblanc/cairn) so any AI or human can find the full guides.

## Contract v1.0 — 2026-07-16

- First public release: the Define → Build → Verify → Decide loop, the eight owner
  commands, Tiny / Standard / High-Stakes lanes, Draft and Final, honest DONE and
  STOPPED, the Direction Gate, the five-task pilot, and always-on protections for
  existing work, secrets, and explicit authority.
