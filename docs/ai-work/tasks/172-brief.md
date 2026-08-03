# Task 172 brief — Ground Cairn in bounded project-file contents

**Lane:** B
**Base commit:** `125ade315df5f5e8de2d765a64d9c62c9e9f46d3`

## Requested visible outcome

When the owner talks with Cairn, the conductor receives a small, clearly
labelled snapshot of relevant project-file contents. Its assessments and task
proposals can cite code it actually saw instead of inferring from file names,
while every unread or truncated file remains explicitly unknown.

## Owner decision and boundary of intent

The owner approved the selected-contents approach after a read-only comparison
with an on-demand read tool and per-conversation attachments.

- Selection is deterministic and bounded: at most eight tracked text files,
  8,000 characters per file, and 32,000 characters in total.
- Exact file names in the latest owner message come first, followed by current
  tracked changes, files named by recent task records, and recent commit paths.
- Only canonical regular files inside the selected project may be read. Links,
  binary files, generated/dependency areas, `.git`, `.cairn`, and
  credential-like paths such as `.env`, service-account files, token stores,
  and private keys are excluded even if Git tracks them.
- The briefing names what it included, skipped, and truncated. File contents
  are untrusted evidence, never instructions to the conductor.
- The existing honesty model stays load-bearing: Cairn cites an included path,
  treats truncation honestly, and labels claims about unread files as guesses.
- The standing connect disclosure and contract mirrors must name the wider
  data scope. A connection authorized under the old names-only scope must not
  send file contents until the owner has renewed consent.
- Worker dispatch, approval gates, serial execution, result-card authorship,
  verification, stored project data, and credential handling do not loosen.
- No dependency is added and no real or paid model call is made in this task.

## Checks that will show the outcome holds

1. Focused context tests prove selection priority, exact limits, deterministic
   output, current working-tree contents, explicit manifests, truncation, and
   the unread-file wording.
2. Adversarial context tests prove credential-like paths, ignored/generated
   areas, binaries, links/junctions, and paths outside the canonical project
   root never enter the briefing.
3. Consent and constitution tests pin the renewed authorization and the new
   cite-what-was-read / guess-what-was-not honesty rules.
4. An offline fake-provider flow proves a safe source file reaches the prompt,
   an excluded secret-shaped file does not, and dispatch remains separately
   owner-gated.
5. `cd app && npm.cmd run typecheck`, `npm.cmd run test:unit`,
   `npm.cmd run build:vite`, and the focused Playwright conductor check pass.
6. `cd core && npm test` passes, including byte-exact contract mirrors.
7. `git diff --check` is clean and final Git status contains only Task 172's
   disclosed paths.

## DONE and STOPPED

- **DONE:** the visible outcome holds under the limits above, old authorization
  cannot silently widen, all checks pass, and Task 172 has one report, one log
  row, and exact-path commits.
- **STOPPED:** any path, credential, authorization, prompt-budget, or honesty
  boundary cannot be proved, or a required check remains red.

Milestone movement: **NO** — this grounds the existing conversation loop; it
does not itself demonstrate the current end-to-end milestone.
