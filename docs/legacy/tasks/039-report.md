# Task 039 report — Close an already-satisfied Codex task honestly

## Result

Task 038 did run through the Task 037 build: its generated brief contains the new
Cairn-owned exact-path commit wording. Its requested Desktop wording and Electron
coverage were already present in starting commit `5ecb706`, and the process left no
product change, model report, or model log row. Cairn therefore stopped and wrote
only its safety records. Because Cairn deliberately discards raw model output, the
model's exact explanation cannot be recovered; treating the already-satisfied
request as a no-op is the strongest inference from the retained evidence, not a
quoted model result.

The Codex task prompt now:

- states that the owner already confirmed Cairn's displayed provider, model,
  project, data scope, and one-call quota for this exact request;
- limits that confirmation to the one call and in-scope local reversible work;
- tells Codex not to invent a product change when the outcome is already present;
  and
- still requires proportionate checks, an honest report, one matching log row, and
  milestone movement NO for an already-satisfied result.

If a completed process still supplies no model records, Cairn now stops with the
specific safe code `MODEL_RECORDS_MISSING`. It does not synthesize a success, retain
raw model text, retry, or commit the missing result.

## Checks

- `npm.cmd test --workspace core` — PASS, 40 tests. New fake coverage proves both
  an honestly closed already-satisfied DONE result with a three-record exact commit
  and a single-call missing-record STOPPED result.
- `npm.cmd test --workspace cli` — PASS, 9 tests.
- `npm.cmd --prefix app run typecheck` — PASS.
- `npm.cmd --prefix app run test:smoke` — PASS, all 11 Electron tests.
- `git diff --check` — PASS before the final records; rerun in the final audit.
- Scope audit — no package manifest, lockfile, dependency, provider fallback,
  retry, continuation, scheduler, concurrency path, or generic provider framework
  changed.
- Real Codex/model calls during Task 039 — NONE.

## How to try it

1. Fully close the current Cairn window and start this repository build with
   `npm.cmd --prefix app start`.
2. Use a genuinely new, small outcome rather than repeating Task 038. A useful
   connection test is: `On the stopped task result card, show the safe stop reason
   code directly below "Codex Exec task: stopped", keep raw provider output hidden,
   and update the focused Electron test.`
3. Review the displayed OpenAI model, project, data scope, and quota. Confirm only
   if those exact terms are acceptable.
4. A completed new task should produce a model report and log row, then Cairn should
   create the exact-path local commit. A process with no records should now show
   `MODEL_RECORDS_MISSING`, which is evidence to inspect rather than a success.

## Limitations and remaining judgment

This repair is fake-verified. No third paid or data-bearing model call was made.
The current milestone still requires one genuinely new real-model improvement to
complete end to end. A later real call remains a separate per-call owner decision.

Milestone movement: **NO**

Disposition: **DONE**
