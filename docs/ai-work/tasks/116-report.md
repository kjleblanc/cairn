# Task 116 report — Level 3a plan, Task 3: disclosure, authorization, the adapter factory

## What actually changed

- `core/src/kimi.ts` — the adapter section, appended below the Task 115
  process half:
  - Constants: `KIMI_EXEC_PROVIDER = "Moonshot AI"`,
    `KIMI_EXEC_MODEL = "kimi-code/kimi-for-coding"`,
    `KIMI_EXEC_ADAPTER_ID = "kimi-exec"`. `KIMI_EXEC_DATA_SCOPE` names the
    task instructions, AGENTS.md, the generated brief, the project files
    Kimi chooses to read, Kimi's auto permission policy with its static
    deny rules (spike-observed print-mode behavior), **and** the session
    record print mode writes under `~/.kimi-code/sessions/` — the second
    at-rest copy the spike found.
  - Two quota sentences: `KIMI_EXEC_QUOTA_OAUTH` (the membership truth the
    spike's `source=oauth` line lets us tell: runs on the Kimi membership
    this CLI is signed into, plan rate limits apply, Cairn cannot see the
    remaining quota, exactly one ephemeral process with no retry or resume)
    and `KIMI_EXEC_QUOTA_GENERIC` (the honest floor for anything not
    observed as `source=oauth`: the account this CLI is signed into, Cairn
    cannot tell which billing applies, same one-process promise).
  - `kimiExecDisclosure(dir, billing, outcome, details)` /
    `authorizeKimiExec(...)` / `kimiAuthorizationMatches(...)` — the codex
    two-part (outcome + details) byte binding, plus billing: a card
    confirmed under one billing wording cannot dispatch under another.
  - `KimiExecModelCallBoundaryError` extends `WorkerBoundaryError` carrying
    the **same** `REAL_MODEL_CALL_NOT_AUTHORIZED` code, imported from
    `codex.ts`, so the envelope's stop-reason mapping is unchanged.
  - `kimiTaskPrompt`: the codex `taskPrompt` minus the apply_patch line,
    plus "You are running as Kimi Code CLI in print mode." and the spec's
    sharpened line forbidding subagents and background tasks ("One serial
    call means one: finish the task in this process and let it exit.") —
    print mode's stay-alive behavior makes this load-bearing.
  - `prepareKimiExecRequest` (args carry only
    `--output-format stream-json -m kimi-code/kimi-for-coding`; the prompt
    rides separately to the Task 115 spawn guard) and
    `createKimiExecAdapter(dir, status, authorization?, processRunner?)` →
    `TaskAdapter`, priority 90, capabilities `["serial-task"]`, `connected`
    from status. `run()` refuses without a matching authorization, then
    translates into `worker-result/v1`: completed iff exit 0, terminalEvent
    `"process-exit"` (a malformed line means the stream was not fully
    understood — no completion), and a final assistant message; evidence
    carries exitCode and the three numeric counts.
- `core/test/kimi.test.ts` — 7 new tests (31 total in the file), red-first:
  descriptor shape with priority 90; disclosure byte-pins for both billing
  wordings plus the two-part task binding and the adapter's own disclosure
  seam; the no-authorization boundary refusal carrying the shared codex
  code; mismatch refusals for outcome, details, and billing (fake never
  runs); the authorized-run wire pin (request command/args/cwd at the seam,
  the Kimi prompt lines, apply_patch absent, claims fence and record rules
  intact) with exact `worker-result/v1` translation; the three failure
  translations; and `routeTask` with codex-at-100 / kimi-at-90 fakes sorting
  codex first, honoring an override to kimi, and routing kimi alone.
- This report, `116-brief.md` (committed first to claim the number), and
  one LOG.md row.

No other files. No codex behavior changed — only its error-code constant is
imported.

## Checks run and their real results

1. Root `npm test`: **core 137/137** (Task 115's 130 plus 7 new; all prior
   tests unmodified), **cli 9/9**. Red-first held: build failed on the
   missing exports before the implementation existed.
2. `git status --porcelain` / `git diff --stat`: only the two named files.
   `design/` and the newly appeared `app/lab/concepts.*` are the parallel
   lane's untracked files — not staged, not touched.
3. Nothing spawned: every new test uses an injected `kind: "fake"` process
   runner; the real signed-in CLI was never near a suite.

## How to try it

`npm test` at the repo root. To read the seam: the adapter section of
`core/src/kimi.ts` from `KIMI_EXEC_PROVIDER` down — the disclosure and
quota constants are the exact bytes an owner would confirm.

## Limitations and remaining human judgment

- Both quota wordings are byte-pinned by the tests, but the wording itself
  is the design's choice; the owner can adjust it before Task 4 wires the
  gate (a wording change is a one-line diff plus its byte-pin).
- What an API-key configuration's `provider list` prints was never observed
  (no second account): everything not `source=oauth` deliberately takes the
  generic floor.
- App wiring (`detectedAdapters`) is plan Task 4; the Decision 6 chooser is
  plan Task 5 — the adapter is built but not yet reachable from the app.

Disposition: DONE
