# Task 116 brief — Level 3a plan, Task 3: disclosure, authorization, the adapter factory

Claims task number 116 (checked `main` history, `docs/ai-work/tasks/`, the
lane B branch and worktree, and fetched `origin/main`: highest claimed is
115).

## Requested visible outcome

The Kimi worker becomes a real `TaskAdapter` in `core/src/kimi.ts`, on top of
the Task 115 process half, byte-for-byte in the codex pattern:

- Constants: `KIMI_EXEC_PROVIDER = "Moonshot AI"`,
  `KIMI_EXEC_MODEL = "kimi-code/kimi-for-coding"`,
  `KIMI_EXEC_ADAPTER_ID = "kimi-exec"`, and a data-scope sentence naming the
  task instructions, AGENTS.md, the generated brief, the project files Kimi
  chooses to read, Kimi's own auto permission policy with its static deny
  rules (spike-observed print-mode behavior), and the session record print
  mode writes under `~/.kimi-code/sessions/`.
- Two quota sentences selected by billing: `"oauth"` → the membership truth
  (runs on the Kimi membership this CLI is signed into; plan rate limits
  apply; Cairn cannot see the remaining quota; exactly one ephemeral
  process, no retry or resume); anything else → the generic floor (the
  account this CLI is signed into; Cairn cannot tell which billing applies;
  same one-process promise).
- `kimiExecDisclosure(dir, billing, outcome, details)` /
  `authorizeKimiExec(...)` / the authorization match — the codex two-part
  (outcome + details) binding, plus billing: an authorization confirmed for
  one billing wording cannot dispatch under another.
  `KimiExecModelCallBoundaryError` extends `WorkerBoundaryError` with the
  **same** `REAL_MODEL_CALL_NOT_AUTHORIZED` code imported from `codex.ts`.
- The worker prompt: codex `taskPrompt` minus the apply_patch line, plus the
  spec's sharpened lines (subagents and background tasks forbidden — one
  serial call means one) and one honest line: "You are running as Kimi Code
  CLI in print mode."
- `createKimiExecAdapter(dir, status, authorization?, processRunner?)` →
  `TaskAdapter`: id `kimi-exec`, priority 90, capabilities `["serial-task"]`,
  `connected` from status; `run()` re-derives and refuses without a matching
  authorization, then translates the process result into `worker-result/v1`
  — completed iff exit 0, terminalEvent `"process-exit"`, and a final
  assistant message; evidence carries the numeric fields from Task 2.

## Boundary of intent — what must not change

- Files that may change: `core/src/kimi.ts`, `core/test/kimi.test.ts`, this
  task's records, one LOG.md row. `core/src/index.ts` already re-exports
  `kimi.js`.
- No codex behavior changes (the import of its error-code constant only),
  no routing, serial, app, cli, design, or contract changes. The parallel
  lane's files untouched.
- Red-first. No test reaches the real signed-in CLI — the adapter tests use
  injected `kind: "fake"` process runners; nothing spawns.
- App wiring (`detectedAdapters`, the fake-kimi E2E fixture) is plan Task 4;
  the Decision 6 chooser is plan Task 5 — both out of scope here.

## Checks that will show the outcome holds

1. `npm test` at the root passes, including new tests: disclosure byte-pins
   for both billing wordings; authorization refuses mismatched
   outcome/details/billing; the boundary error carries the shared codex
   code; the descriptor shape (priority 90); run() translation for
   completed/failed (non-zero exit, missing final message, terminal error);
   a wire pin on the request handed to the fake runner (args, command, cwd,
   and the prompt's Kimi lines — print-mode honesty, no subagents or
   background tasks, no apply_patch line); and `routeTask` with codex-at-100
   and kimi-at-90 sorting codex first and honoring an override to kimi.
2. `git diff --stat` and status contain only the named files.

## What DONE and STOPPED mean here

- DONE: the adapter works against fakes, both billing wordings are
  byte-pinned, the full suite is green, and the diff is scoped.
- STOPPED: a check fails without an in-scope correction, or isolation from
  the parallel lane cannot be maintained.
