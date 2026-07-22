# Task 002 — Diagnose the Codex Exec write-failure in the open

Requested visible outcome: a reproduced, evidence-backed explanation of why
every pre-reset real Codex Exec run stopped with zero file changes
(RECORD_VERIFICATION_FAILED / MODEL_RECORDS_MISSING), demonstrated with
visible output in a disposable temporary project, and the working invocation
identified if one exists.

Boundary of intent: no changes to product code, dependencies, or the real
repository's tracked files — this task writes only its own task records. All
codex exec runs target a disposable folder under the session scratchpad,
never a real project. Raw run output is observed live for diagnosis and is
not committed to the repository; the report records findings and bounded
excerpts with any account-identifying text removed.

Evidence so far (free, local): codex-cli 0.145.0 installed and connected;
this shell has no .codex shim directories in PATH. `codex exec --help` lists
no --ask-for-approval option; the root help defines `on-request` as "the
model decides when to ask the user for approval" and `never` as "never ask;
execution failures are immediately returned to the model". Cairn's
prepareCodexExecRequest (core/src/codex.ts) passes root-level
`--ask-for-approval on-request` before `exec` — an approval mode with no one
to answer in non-interactive mode.

Checks: Test A reruns Cairn's exact argument list in a disposable project
with a trivial write task and must reproduce the failure signature (zero
file_change items). Test B runs the corrected policy (no on-request /
`--ask-for-approval never`) with the same task and shows whether the file is
actually created. A created file with matching content is the pass signal.

Paid boundary: each test is one real Codex Exec call on the owner's connected
OpenAI account (model gpt-5.6-sol), up to three short calls total, approved
by the owner immediately before the first call.

DONE means the failure signature is reproduced and explained, and the
working invocation (or the proof that none exists at this Codex version) is
recorded. STOPPED means the evidence could not be produced.
