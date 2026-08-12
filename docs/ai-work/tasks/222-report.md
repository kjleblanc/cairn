# Task 222 report - add the dark production task critic route

**Lane:** A (the main checkout). **Base commit:** `64e44f4`.
**Brief claim commit:** `d0308a8`.

## Outcome

Task 222 stopped in its first, read-only feasibility slice. No application,
Core, test, activation, provider, or dependency source changed. The activation
registry remains empty, normal tasks remain on the legacy route, and Q9 remains
guarded and unchanged. No credential was read, no network or provider request
ran, and no paid, public, destructive, or external action occurred.

Two independent prerequisites are missing:

1. The current Codex Exec launch does not provide causal evidence that its
   `workspace-write` policy permits writes only beneath the canonical project
   while denying Electron `userData` and every implicit temporary writable
   root on every intended production platform. It ignores the owner's main
   config but does not use the available ignore-rules control or an app-owned
   explicit writable-root policy. The attempted standalone sandbox probe did
   not reproduce the production `workspace-write` policy. Adding candidate
   capability without causal equivalence would turn an assumption into write
   authority.
2. Every normal Task Spec currently requires Cairn-judged
   `adapter-attestation`, but an Evidence Plan command must be fixed before the
   Builder with the executable path and hash, structured arguments, cwd,
   timeout, parser, assertion, and expected exits. Codex deliberately reports
   only an opaque model-chosen command string after dispatch. Turning that
   string into an attestation would let the model invent the evidence authority
   that is supposed to verify its work.

These are the exact STOP conditions in the committed brief: project-only
writer isolation cannot presently be proved on the intended production
platforms, and an honest normal Evidence Plan would require vague or
model-authored authority.
Implementing the larger route around either gap would weaken the requested
boundary rather than complete it.

This is the second stopped attempt toward live Q10 routing, after Task 221
correctly stopped at the absent production route. Under the project contract,
the next step is not a third implementation attempt. It is an owner-visible
design choice followed by smaller precursor tasks.

## Files changed

- `docs/ai-work/tasks/222-brief.md` was created and committed alone at
  `d0308a8` to claim Task 222 before investigation.
- `docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`
  records the follow-up prerequisite STOP and the two decisions required before
  another attempt.
- This report records the evidence and disposition.
- `docs/ai-work/LOG.md` receives one truthful Task 222 row.

No application, Core, test, fixture, activation, provider, dependency, or
configuration file changed.

## Check results

### `c1` - the production Builder writer boundary is real and exact: FAILED

The built-in Codex path currently launches `workspace-write`, Windows elevated
sandbox configuration, disabled multi-agent delegation, and ignored user
configuration. It does not add `--ignore-rules`, nor does it supply an
app-owned explicit writable-root policy that the offline causal test can
reproduce byte for byte. The installed CLI reports version 0.145.0.

The attempted local no-network sandbox probe did not execute its harmless
`ver` command. It refused because `workspace-write` is not a ready named
permission profile for `codex sandbox`. Therefore it proved no relationship
between that standalone launcher and the production `codex exec` policy.
Project write success plus `userData` and arbitrary outside-write denial—the
brief's causal acceptance bar—remain unproved.

A Windows-only explicit policy is plausible, but deciding that the production
critic Builder works only on Windows while non-Windows platforms fail closed
changes product scope. The owner did not make that platform decision in the
authorization for this task, so it was not assumed.

### `c2` - one Task Spec and Evidence Plan survive dispatch unchanged: FAILED

Normal conversation and direct proposals require each current Cairn-judged
check to use `adapter-attestation`. Core accepts such a procedure only when it
contains one complete predeclared Evidence Command. Candidate capture then
requires the executed canonical command-hash set to match the predeclared set
exactly, and unresolved rows remain `cant-tell`.

Codex's own adapter labels its JSONL evidence as
`opaque-provider-command/v1`, explicitly not the canonical argv representation
that Evidence Plan hashes. The command is chosen by the model after dispatch
and does not authenticate the predeclared executable hash, cwd, timeout,
parser, or assertion. No deterministic Main-owned verifier registry exists to
supply those facts before Builder dispatch. Therefore no honest normal
Evidence Plan can be authored for the present adapter.

### `c3` - an ordinary task uses the durable lifecycle: NOT REACHED

The route was not implemented because `c1` and `c2` failed first. Ordinary
tasks retain the legacy close path and no injected active identity was minted.

### `c4` - packet-only critic scope and route stay closed: NOT REACHED

No production packet selector, disclosure, decision, or send path was added or
opened. Existing consent and Q8/Q9 packet boundaries remain unchanged.

### `c5` - durable decisions, counters, and restart cannot replay: NOT REACHED

No new Builder, critic, repair, retry, or pending-run operation was created.
There is no new state to replay or recover.

### `c6` - activation and legacy/Q9 separation remain fail-closed: PRESERVED; PRODUCTION PORTION NOT REACHED

The static activation literal array remains empty. Both quality-preview
activation identities remain literal `null`. No production or synthetic
authority moved, and no environment, profile, project, renderer, or journal
state was given a new activation path. Legacy and Q9 source was not edited.
The broader injected-route separation matrix was not run because no route was
implemented.

### `c7` - complete offline regression and owner-visible evidence pass: NOT RUN

The full suites, builds, Electron matrix, and app-token owner precondition were
not reached because the task had already met two explicit STOP conditions
before implementation. Running them could not establish the missing sandbox
or evidence semantics. Three independent read-only architecture/security
passes challenged the STOP and found no narrower honest route inside the
committed boundary.

## Exact commands and observed results

From the repository root:

`git status --short --branch`

Result before investigation: `main` was ahead of `origin/main` by 158 local
commits and otherwise clean.

`git worktree list --porcelain`, followed by `git status --short --branch` in
the main checkout and `.lanes/b`, `.lanes/c`, `.lanes/d`, and `.lanes/e`

Result before closing records: the four auxiliary worktrees were clean on
`lane/b`, `lane/c`, `lane/f`, and `lane/g`. Main contained only this task's
modified LOG and plan plus its untracked report.

`codex --version`

Result: `codex-cli 0.145.0`.

`codex exec --help`

Result: exit 0. The installed CLI lists `--sandbox workspace-write`,
`--strict-config`, `--ignore-user-config`, `--ignore-rules`, and `--add-dir`.

`codex sandbox -P workspace-write -C "C:\Users\KenJL\Desktop\WebApp Projects\AI Coding Workflow Framework" --sandbox-state-disable-network cmd.exe /d /s /c ver`

Result: exit 1 before the child command ran: `default_permissions requires a
[permissions] table`. No provider or network path was involved.

`rg -n -- '--sandbox|workspace-write|--ignore-user-config|--ignore-rules|--strict-config' core/src/codex.ts`

Result: the production and repair requests contain `workspace-write` and
`--ignore-user-config`; neither request contains `--ignore-rules` or
`--strict-config`.

`rg -n "adapter-attestation|OPAQUE_PROVIDER_COMMAND_EVENT_REPRESENTATION|deriveAdapterAttestations|composeSerialCandidatePolicyEvidence" app/src/main/conductor/qualityproposal.ts core/src/codex.ts core/src/serial.ts`

Result: normal proposal binding requires adapter attestations; Codex declares
opaque provider command events; serial candidate capture derives attestations
only from exact planned command hashes; policy evidence has no alternate
promotion for those normal Cairn rows.

`rg -n "CALIBRATED_ACTIVATION_LITERALS|QUALITY_PREVIEW_ACTIVATION_IDENTITY|QUALITY_PROPOSAL_ACTIVATION_IDENTITY" app/src/main/criticactivation.ts app/src/main/tasks.ts app/src/main/conductor/service.ts`

Result: the activation registry is `Object.freeze([])` and both preview
identities are literal `null`.

`git diff --check`

Result before staging: exit 0 with no output.

The final exact-path record diff was checked with `git diff --check` before
staging and `git diff --cached --check` after staging. Final status was
inspected before the local commit.

## Smallest safe continuation

Before another attempt at the production route, the owner needs to make two
separate product decisions and authorize their smaller precursor tasks:

1. **Intended-platform decision.** Choose either a Windows-only first Builder,
   with non-Windows platforms explicitly retaining the legacy/no-critic route,
   or require a proven cross-platform outer sandbox before routing any normal
   task. After that product decision, an AI-owned precursor can build one
   explicit sandbox policy, pin the exact launcher implementation, exclude
   implicit temporary roots and `userData`, and prove the same policy causally
   without a model or network.
2. **Evidence-semantics decision.** Choose the bounded, owner-understandable
   verification semantics and which task vocabulary qualifies. Main can then
   bind a deterministic verifier before dispatch and execute it after the
   Builder. If generic prose promises cannot map honestly to that vocabulary,
   narrow which Task Specs qualify or make those checks explicit owner
   observations. The runner, parser, sandbox, and pinning are subsequent AI
   implementation decisions; a generic command must not be described as proof
   of an arbitrary promise.

Only after both precursors pass should a newly briefed route task resume the
remaining Main admission, packet selection, durable production dependency,
restart, and Electron work. Live Q10 calibration still comes after that and
retains a separate just-in-time approval for every external call.

## How to try it

There is intentionally no new product control to try. A maintainer can run the
source queries above and should continue to see the empty activation registry,
opaque Codex command evidence, and no production candidate route.

## Limitations and owner decision

No cross-platform sandbox was built or tested, no verification vocabulary was
chosen, and no normal task entered candidate custody. Those are intentional
STOP results, not deferred claims of completion. The project milestone did not
move.

**Disposition: STOPPED - project-only writer isolation is not proved on the intended production platforms, and current normal Task Specs cannot produce a non-model-authored exact Evidence Plan for Codex.**
