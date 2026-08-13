# Task 224 report - freeze the proposal-only Builder intercom foundation

**Lane:** A (the main checkout). **Base commit:** `cc88db2`.
**Brief claim commit:** `dfe61b7`.

## Outcome

Task 224 completed the safe first slice of the owner-proposed Builder-to-Cairn
intercom. The chosen architecture is stronger than placing an intercom beside
a command-capable coding agent: the future quality Builder is one tool-free
inference turn over an exact packet and receives no local filesystem, shell,
process, network, credential, callback, or local-service handle. It may return
only inert data:

1. bounded full-text replacements for exact preselected tracked-text rows; or
2. one bounded request in a closed five-category capability vocabulary.

Core now provides the provider-independent offline protocol for that turn.
Every context is bound to one branded Task Spec, Evidence Plan, project, run,
turn, consent revision, base Git object, admitted Git state, and exact selected
bytes. Every response must echo the context digest. Replacement paths and
before hashes must rejoin exact selected rows, after hashes are recomputed,
no-op and widened proposals refuse, and parsing grants no effect authority.

The design record separates proposal, Cairn plan, owner grant, and receipt. It
also preserves Task 223's important result: an application broker is not a
firewall. Any future process that executes project code still needs a hard,
causally proved OS/VM/container boundary. Task 224 therefore adds no writer,
verifier, transport, provider route, IPC, UI, activation, or live model call.

## Files touched

- `docs/ai-work/tasks/224-brief.md` was created and committed alone at
  `dfe61b7` to claim Task 224.
- `core/src/builder-intercom.ts` adds the inert context/response protocol.
- `core/src/index.ts` exports only its pure data constants, types, composers,
  parsers, canonicalizers, and hashes.
- `core/test/builder-intercom.test.ts` adds the focused adversarial matrix.
- `core/package.json` includes that focused file in the complete Core suite.
- `docs/superpowers/specs/2026-08-12-cairn-builder-intercom-design.md` records
  the architecture decision and follow-up boundaries.
- `docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`
  records the completed proposal-only precursor while Q10 remains blocked and
  corrects its now-stale sandboxed-writer requirement to the accepted
  proposal-only selector/applier plus hard-isolated-runner boundary.
- This report records the actual result.
- `docs/ai-work/LOG.md` receives one truthful Task 224 row.

Core builds regenerated only ignored `core/assets/contract.md` and
`core/dist/**`. App unit compilation regenerated only ignored
`app/dist-unit/**`.

## Check results

### `c1` - the architecture is least-authority and explicit: PASSED

The architecture decision compares direct sandboxing, proxy/allowlist,
VM/container, remote runner, and proposal-only designs. It selects pure
inference plus Cairn-owned brokers because that route structurally removes the
local command-capable model process. It explicitly says the broker does not
repair Task 223's raw-loopback escape for any command-capable process.

The record separates later tracked-text selection and patch application,
durable category-specific owner-approved brokers, isolated verifier
vocabulary, tool-free provider transport, production route integration, live
calibration, and activation. None is smuggled into this task.

### `c2` - one exact Builder turn is closed and bounded: PASSED

Core accepts exact plain records only. It rejects Proxies, accessors, exotic
prototypes, symbol/extra keys, sparse or oversized arrays, malformed UTF-16,
wrong brands, broken Task-Spec/Evidence-Plan joins, stale identities, duplicate
rows, and cap violations. Manual length framing avoids inherited `toJSON`
rewrites and binds complete canonical Task Spec/Evidence Plan bodies, hashes,
ordered criteria, Git state, consent, selected bytes, and closed provenance.

V1 deliberately limits paths to printable ASCII. This is conservative: it
rejects Unicode filenames rather than pretending JavaScript has a complete
native-filesystem case fold. Within that closed alphabet, one uppercase
identity governs safety classification, duplicate detection, canonical order,
and response joins. Exact spelling is still required at the replacement join.

The exact caps are eight selected rows, eight replacements, 8,000 UTF-16 code
units per selected/after value, 32,000 in each aggregate, 1,024 path units, and
1,000 units per plain-language field. Boundary and over-boundary tests pass.

### `c3` - patch proposals cannot widen their input authority: PASSED

A replacement can name only one exact selected row. Core rechecks exact path
spelling and before SHA-256, computes the after SHA-256 from UTF-8 bytes,
requires canonical row order, and rejects duplicates and no-ops. Absolute,
traversal, slash-confused, wildcard, Windows-device, protected, linked,
dependency, generated, install/deployment-control, Git-control,
credential-like, Unicode, case-alias, unselected, and new paths refuse.

The module contains no writer or executable callback. This task intentionally
does not claim that the current filesystem still matches a proposal; the later
Main-owned applier must re-read and prove that immediately before any write.

### `c4` - capability requests are inert: PASSED

The only categories are `additional-tracked-text`, `external-reference`,
`dependency-change`, `external-service-action`, and `owner-clarification`.
Each request carries bounded plain-language target, what, why, expected effect,
data exposure, cost basis, and recovery. There is no URL, argv, executable,
callback, credential, grant, approval, transport, or retry field.

The direct module namespace is locked to eleven pure runtime exports. Its
compiled import allowlist is only `node:crypto`, `node:util`, and Core quality
data; tests reject dynamic imports and environment, fetch, socket, eval, or
other effect seams. JSON revalidation produces another inert branded response,
never a plan or grant.

### `c5` - current product routes remain dark and compatible: PASSED

The activation literal array remains `Object.freeze([])`, both normal quality
preview identities remain literal `null`, and Codex and Kimi still advertise
only `serial-task`. The sole `serial-task-candidate` result is the existing
guarded Q9 fake adapter. App has no Builder-intercom import. No App, routing,
serial/candidate, critic, Q9, calibration, IPC, preload, renderer, dependency,
stored-data, or platform behavior changed.

### `c6` - verification and records are complete: PASSED

Focused build/tests, the complete Core suite, App typecheck and complete App
unit suite, darkness queries, exact diff checks, and three independent
adversarial reviews passed. Those reviews found real canonicalization,
provenance, path, cap, and public-surface defects; each was repaired and the
stable final bytes received three clear dispositions.

**Addition `a1` - path identity is causally guarded: PASSED.** The generated
ASCII-path gate mutation described below made the focused suite fail, and the
tracked-source rebuild restored 9/9. This check was added during the work; the
brief's original `c1`-`c6` ids were not renumbered.

The initial red-first command transcript was not retained. Before closing, an
addition mutation check removed the generated ASCII path gate, observed the
focused suite fail on its adversarial path cases, then rebuilt from tracked
source and observed the final focused suite pass. This provides causal red/
green evidence without changing the committed source history.

## Exact commands and observed results

From `core`:

`npm.cmd run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test dist\test\builder-intercom.test.js`

Result after the final repairs: exit 0; Core build passed; 9 tests passed, 0
failed or skipped.

`npm.cmd test`

Result: exit 0; build passed; 420 tests ran, 410 passed, 10 expected
Windows skips, 0 failed; Node test duration 2,094,040 ms.

For the causal mutation addition, only ignored generated
`core/dist/src/builder-intercom.js` was temporarily changed to remove
`!ASCII_PATH.test(value)`, then this was run:

`node --test dist\test\builder-intercom.test.js`

Result: exit 1; 8 passed and 1 failed. The unsafe-context test admitted
`src/Σ.ts`, proving the ASCII boundary is causally guarded. The tracked source
was untouched. `npm.cmd run build` regenerated `dist` from tracked source, and
the focused command above returned to 9/9 passing.

From `app`:

`npm.cmd run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run test:unit`

Result: exit 0; typecheck passed; 829 tests ran, 827 passed, 2 expected
platform skips, 0 failed; Node test duration 600,486 ms.

After the final Core rebuild, `npm.cmd run typecheck` was run once more from
`app` and passed.

The source darkness checks were:

`rg -n "CALIBRATED_ACTIVATION_LITERALS|QUALITY_PREVIEW_ACTIVATION_IDENTITY" app/src/main/criticactivation.ts app/src/main/tasks.ts app/src/main/conductor/service.ts`

Result: the activation literal array is `Object.freeze([])` and both quality
preview identities are `null`.

`rg -n capabilities core/src/codex.ts core/src/kimi.ts app/src/main/q9fake.ts`

Result: Codex and Kimi are `serial-task` only; candidate capability appears
only on the existing guarded Q9 fake adapter.

`rg -n "builder-intercom|composeBuilderTurnContext|parseBuilderTurnResponse" app/src`

Result: no matches.

`rg -n "node:(fs|child_process|net|http|https|tls)|process\.env|fetch\(|spawn\(|exec\(|writeFile|readFile" core/src/builder-intercom.ts`

Result: no matches. The stronger direct-module namespace and compiled import/
effect assertions also passed inside the focused suite.

`git diff --check` and `git diff --no-index --check NUL <each new file>`

Result before records/staging: ordinary `git diff --check` exited 0. Each
no-index check emitted no whitespace diagnostic and exited 1 because the new
file intentionally differs from `NUL`. After exact-path staging, `git diff
--cached --check` exited 0. `git diff --cached --name-status` showed exactly:

- `M core/package.json`
- `A core/src/builder-intercom.ts`
- `M core/src/index.ts`
- `A core/test/builder-intercom.test.ts`
- `M docs/ai-work/LOG.md`
- `A docs/ai-work/tasks/224-report.md`
- `M docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`
- `A docs/superpowers/specs/2026-08-12-cairn-builder-intercom-design.md`

Final pre-commit status showed only those eight staged paths; there was no
unstaged or untracked path. All four auxiliary worktrees were clean.

## How to try it

There is intentionally no new Cairn button yet. A maintainer can inspect the
architecture record and run the focused Core command above. It exercises one
exact selected-file proposal and all five capability categories without a
model, provider, credential, network, or project/source effect. Its build step
does regenerate the ignored `core/assets/contract.md` and `core/dist/**`.

## Limitations and next safe tasks

This is a dark protocol foundation, not a working production Builder. It
deliberately supports printable-ASCII tracked paths only. The next safe work is
serial and separately reviewed:

1. causal tracked-text selection plus an exact, crash-safe Cairn patch applier;
2. a durable one-use approval/broker kernel with one injected fake closed
   handler; each real category-specific handler remains its own later task;
3. a predeclared verifier vocabulary inside a hard isolated runner;
4. one exact tool-free production model transport; and
5. normal quality-route integration, then the still-separate live calibration
   and activation task.

No provider/model/credential/network/paid call, permission change, dependency,
external write, push, publication, or deployment occurred. The current
milestone did not move.

**Disposition: DONE**
