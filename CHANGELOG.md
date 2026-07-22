# Cairn changelog

The contract version lives in `CONTRACT-TEMPLATE.md` and each project's `AGENTS.md`.
Contract changes are explicit local work; they are never downloaded or activated
silently.

## Credential-opaque Codex event diagnostics — Task 042 — 2026-07-22

- Reduced completed Codex JSONL item events to four non-negative integers: agent
  messages, command executions, file changes, and failed command/file-change items.
- Added those bounded counts to the activity feed and safety report when a process
  result is available, including `MODEL_RECORDS_MISSING` stops.
- Continued discarding item text, reasoning, commands, paths, stdout, stderr, thread
  IDs, account details, authentication data, and credentials.
- Added real-parser, exact-schema, safety-report, and Electron fake-process coverage
  with secret-looking payloads that must never surface.
- Kept the documented `workspace-write` plus `on-request` Auto policy. Added no
  dependency, retry, continuation, scheduler, concurrency path, provider fallback,
  generic tracing framework, broader sandbox, or real model call.

## Honest already-satisfied Codex tasks — Task 039 — 2026-07-22

- Told the one confirmed Codex process that Cairn's displayed call disclosure was
  already approved for that exact request, without granting any wider authority.
- Required an already-satisfied outcome to be verified and closed with an honest
  report and log row instead of inventing a source change or leaving no records;
  those no-op results use milestone movement NO.
- Replaced the generic record-verification code with `MODEL_RECORDS_MISSING` when a
  completed process returns without the required model report and log row.
- Added fake-only coverage for both an honestly closed no-op DONE result and a
  missing-record STOPPED result. No real model call, retry, fallback, continuation,
  scheduler, concurrency path, provider framework, or dependency was added.

## Cairn-owned verified Codex commit — Task 037 — 2026-07-22

- Stopped asking non-interactive Codex to write protected `.git` metadata. Codex now
  owns workspace edits, checks, its matching report, and its append-only log row;
  Cairn owns the post-verification local commit.
- For a clean-start DONE result, Cairn derives the changed and untracked paths,
  rejects unsafe or unrelated task-record paths, stages every exact name after `--`,
  verifies exact index isolation, and creates one local commit. It never uses broad
  staging.
- Preserved dirty-start work byte-for-byte and kept dirty-start model results
  uncommitted when exact attribution is unavailable.
- Corrected Desktop STOPPED wording so it says verification failed and retained
  evidence needs inspection; successful DONE wording remains unchanged.
- Added no dependency, retry, continuation, scheduler, concurrency path, provider
  fallback, generic provider framework, or real model call during the repair.

## One confirmed real Codex Exec call — Task 034 — 2026-07-21

- Enabled one real, ephemeral, workspace-scoped Codex Exec process only after the
  owner confirms OpenAI, pinned model `gpt-5.6-sol`, the exact target project, the
  disclosed workspace data scope, and the one-process quota.
- Added one output-reducing process implementation that discards stderr and all raw
  JSONL content while retaining only the terminal event and numeric token usage.
- The model follows the existing Cairn task brief and owns the in-scope product
  edits, report, append-only log row, and exact-path local commit. Cairn verifies
  those records, protected starting work, and Git isolation before reporting DONE.
- Added fake-process core and Electron verification for the exact arguments, stdin
  prompt, disabled-until-confirmed UI, main-process rejection before task creation,
  successful model-shaped report/log/commit, and redacted malformed JSONL failure.
- Added no dependency, provider fallback, retry, continuation, scheduler,
  concurrency, login flow, generic provider framework, or real model call during
  implementation and tests.

## Codex Exec readiness and real-call boundary — Task 033 — 2026-07-21

- Added one Codex Exec adapter to the active serial route. Normal CLI and Desktop
  runs now detect installed and connected status through output-discarding
  `codex --version` and `codex login status` probes.
- Added one fake-only process seam that verifies an ephemeral, exact-workspace
  `codex exec` request with workspace-write sandboxing, on-request approvals, JSONL,
  stdin prompt delivery, and multi-agent support disabled.
- A production Codex route stops with `REAL_MODEL_CALL_NOT_AUTHORIZED` before the
  execution process starts. No task data is sent, no model is called, and no raw
  authentication output or credential value enters Cairn records or UI.
- Added no dependency, provider fallback, retry, continuation, scheduler,
  concurrency path, model picker, login flow, or generic provider framework. The
  explicit offline demonstration remains available only through mock mode.

## Active runtime process-gate cleanup — Task 032 — 2026-07-21

- Removed the automatic Direction Gate, project Direction timebox, and Direction
  core, CLI, IPC, and Desktop surfaces from the active runtime.
- New projects no longer create or commit `PILOT.md`. Existing pilot files remain
  untouched historical evidence.
- Historical STOPPED/NO rows and task records without an old closing log row remain
  visible but no longer block the next serial task.
- Kept preserved legacy `.git/cairn` state as the one migration-related mutation
  block; Cairn still does not parse, rewrite, or delete those bytes.
- Added core and Electron regression coverage for continuing safely past retained
  historical evidence, while keeping the offline verified beginner flow green.

## Contract v3.0 — 2026-07-21

- Replaced the v2.x governance system with one continuous serial task workflow.
- Removed mandatory planning chats, pinned-brief approval, fresh-context review,
  reviewer verdicts, owner-decision receipts, activation ceremonies, Direction
  Gates, Experimental Drafts, Bootstrap mode, scheduler/provider profiles, parallel
  lanes, and phase handoffs from the active contract and public guides.
- Kept short task briefs, honest reports and log rows, repair-and-rerun, exact-path
  Git commits, and preservation of tracked, staged, modified, and untracked work.
- Replaced task-wide High-Stakes ceremony with approval immediately before a real
  risky action: installs, credentials, paid or data-bearing calls, valuable-data
  changes, external writes, publication, deployment, or production effects.
- Kept qualified-human boundaries for permissions, payments, personal or regulated
  data, destructive migrations, production security, legal commitments, and
  safety-critical behavior.
- Made reviews optional advice. A review may propose follow-up work but cannot
  automatically reopen a completed task or force an accept/revise loop.
- Simplified project setup, conversion, provider guidance, contract updates, and the
  self-contained browser companion to match the active serial product.
- Preserved all v1/v2 task records, log rows, changelog entries, and Git history as
  evidence. Their old commands no longer govern new work.

## Active runtime reset — Task 031 — 2026-07-21

- Replaced the legacy define → approve → build → review → decide product workflow
  with one serial project → task → route → run → check → result path.
- Kept first-run guidance, project create/open/recent handling, Project Conversion
  guidance, the useful route and activity UI, Git protection, and honest task
  records.
- Removed concurrency, bounded-run, scheduler, passive-proof, experimental provider,
  model-effort, retry, and continuation paths from active core, CLI, Desktop, and
  clean generated output. Their Git history and task evidence remain unchanged.
- Added one deterministic offline adapter seam, explicitly labeled provider `none`
  and model `none`. It proves lifecycle wiring but reports that the requested
  product change was not attempted and milestone movement was `NO`.
- Normal mode now stops at connection-required without writing records. This reset
  connects no provider, uses no credential, makes no model call, adds no dependency,
  deploys nothing, and does not claim Cairn's self-hosting milestone.
- Contract v2.3 remained the governing version when Task 031 was built. Contract
  v3.0 now supersedes its process gates; historical permissions do not reactivate
  removed runtime experiments.

## Contract v2.3 — 2026-07-21

- Added a narrow owner-managed provider account connection profile. The owner may
  personally complete official installed provider linking without a qualified-human
  verdict while every secret and raw account value remains outside AI-visible
  surfaces.
- Permitted one approved High-Stakes Final to run a contained disposable scheduler
  proof with at most two Standard tasks and four fixed provider calls: one Planning
  and one Building call per task, with no retry or continuation.
- Required physical proof-root limits on every model read, exact passive-artifact
  write limits, no model-authored execution or network/tool expansion, a finite cost
  or quota cap, exact owner approval, and a fresh review that is not `FAIL` or
  `VALID STOPPED` before activation.
- Kept valuable repositories, permission or entitlement changes, billing, personal
  or regulated data, production, deployment, public action, and other live-risk
  classes behind the ordinary High-Stakes and qualified-human boundaries.
- Paused product work for the amendment. The amendment itself does not link an
  account, use a credential, call a provider, repair a candidate, or activate a
  scheduler.

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
