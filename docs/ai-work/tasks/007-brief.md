# Task 007 — A successful commit is never relabeled STOPPED

Requested visible outcome: when Cairn commits verified model work, the run
reports DONE — a phantom or unrelated post-commit dirty-tree condition can no
longer overwrite the committed DONE records with STOPPED ones. Line-ending
differences never make a tree look dirty.

Context (Task 006, the milestone): the model improved Cairn through Cairn,
Cairn created the exact-path commit `80f7ba3` with DONE/YES records, and its
new test passes. But `verifyModelGitResult` (core/src/serial.ts) ran a
post-commit cleanliness check (`git status --porcelain` must be empty) that
tripped on a phantom CRLF-only change to core/test/files.test.ts — a file the
task never touched. The function returned null after the commit already
existed, so the caller rewrote the just-committed report and log row to
STOPPED in the working tree. HEAD said DONE; the tree said STOPPED. Root
cause of the phantom: core.autocrlf=true with no .gitattributes.

Boundary of intent:

1. Add `.gitattributes` normalizing text line endings so build/test runs stop
   producing phantom-dirty tracked files.
2. `core/src/serial.ts` — `verifyModelGitResult` decides commit eligibility
   BEFORE committing; once the exact-path commit succeeds and is confirmed
   (single-commit ancestry, exactly the derived task paths in the commit),
   the result is `created`. A post-commit dirty condition it did not cause
   must not turn a real commit into MODEL_RESULT_NOT_VERIFIED. If a genuine
   unexpected residue exists, surface it in the DONE report as a disclosed
   note, never by rewriting a successful commit to STOPPED.
3. `replaceDoneRecordsWithStopped` is never reached for a run whose commit
   was actually created.

What must not change: exact-path staging only, no broad `git add`; protected
starting work still blocks a commit up front; a model that truly reports
STOPPED still yields STOPPED; no dependency, retry, or scheduler.

Checks: a red-first test reproduces the torn state — a committed DONE with a
phantom/unrelated dirty file must yield a `created` commit and a DONE
disposition, not MODEL_RESULT_NOT_VERIFIED; existing STOPPED-path tests stay
green; core, cli, and app suites green. Version 0.0.3 → 0.0.4 with changelog
and mirrors.

DONE means the suites are green and the torn-state test proves a real commit
stays DONE. STOPPED means it does not. Milestone movement: NO — this protects
the milestone already earned in Task 006.
