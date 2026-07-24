# Cairn Phase 2 — Core Surgery — Design

Date: 2026-07-24
Status: approved by owner (design session)
Scope: design only. This document changes no behavior. It governs the Phase 2
implementation plan and its serial recorded tasks.

## Where this comes from

The route spec (`2026-07-23-cairn-conductor-route-design.md`) names Phase 2's
three chunks: record authorship moves to Cairn, adapter validation
generalizes, and the operational debts get paid. A phase boundary is a
re-plan moment, so this session pressure-tested that scope against the code
and the full task history before designing. Three findings changed the plan:

- **The route spec's rationale for the record surgery was partly wrong.**
  The six pre-reset runs that burned on record verification (legacy 036,
  038, 040, 041, 043, 047) did not fumble record formats — in nearly every
  diagnosed case the worker could not write files at all (the three stacked
  Windows sandbox bugs Task 002 later proved live; the counters show 12
  command executions, 0 file changes). Only one true format failure exists
  in the whole history (Task 003 Run 1). Moving authorship to Cairn would
  not have saved those runs. The surgery is still right, for these reasons:
  every future worker (Phase 4) would have to reproduce the exact record
  format from its own prompt, re-importing the fragility per model; the
  surgery is the stated prerequisite for Phase 3; and it deletes
  `readModelRecords`, which conflates at least eight failure shapes into
  the one opaque code `MODEL_RECORDS_MISSING`.
- **The operational debts are worse than the route spec's one line.** App
  quit does not kill a paid worker process. A wedged worker hangs forever
  and blocks conductor chat too (the gates are shared). The run lock is two
  in-memory Sets, so quit-and-relaunch can start a second task against a
  folder an orphaned worker is still writing. Navigation or reload orphans
  the run's UI permanently (the result resolves to a dead screen; a
  remounted screen cannot re-adopt the stream).
- **Phase 1's milestone is honestly unmet, and its closeout is independent
  of this work.** The eval table is empty and no conductor-proposed task
  has dispatched. A real body sat in the seat for the first time on
  2026-07-24 (untracked trace in `.cairn/`). The owner's closeout — push,
  run the eight eval scenarios, attempt the milestone — needs no Phase 2
  code, and Phase 2's safety debts protect exactly those paid runs. In that
  first real conversation the conductor overstated project history; that is
  brain-and-briefing territory (eval scenario 7), and Phase 2 deliberately
  does not touch it.

## Decisions

1. **Sequencing: debts → record authorship → adapter registry.** The safety
   debts land first because they are independent and protect the owner's
   imminent paid Phase 1 runs. The record surgery precedes the registry so
   the registry generalizes the new record flow — most per-adapter record
   wording gets deleted, not generalized.
2. **Claims channel: a fenced block in the worker's final message.** The
   worker ends its final message with a small fenced `cairn-claims` JSON
   block — the same fail-closed pattern as the conductor's `cairn-task`
   fence. No new project files; message-native workers (the Phase 4 Claude
   SDK adapter) fit naturally; the adapter captures the final message text
   and core parses it centrally.
3. **Seam shape: one universal worker-result contract.** Core defines a
   single result shape every adapter translates into at its edge. Core
   validates that one shape, once, with the existing hostile-object
   paranoia. Validation authority stays in the envelope; transport quirks
   stay in the adapters. Rejected alternatives: self-describing adapters
   (moves safety-critical validation into adapter modules) and a central
   per-adapter schema table (two halves per adapter that drift — the
   duplicated offline statement constant is today's live example).

## Chunk 1 — Operational debts

### Timeout and cancel

The worker child process gets a two-timer watchdog where the process is
managed in core:

- **Inactivity timer, default 10 minutes.** Real runs stream JSONL
  continuously; a child silent on stdout and stderr for 10 minutes is
  wedged.
- **Absolute cap, default 60 minutes.** Bounds a worker that keeps
  chattering but never finishes.

Either timer kills the **process tree** — on Windows via tree termination
(`taskkill /T` semantics), because the worker launches through a `cmd.exe`
shim and killing only the shim orphans the real child. The run stops with
the new precise code `ADAPTER_TIMED_OUT`.

Cancel is owner-initiated: a new `task:cancel` IPC and a cancel control on
the run screen flow an abort signal into core, kill the tree the same way,
and stop with `CANCELLED_BY_OWNER`.

Both paths reuse the existing fail-closed machinery: the adapter throws a
typed error; the same safety path that handles `ADAPTER_FAILED` writes
honest STOPPED records, retains workspace evidence, and names the local
debug path. The report states plainly that the killed call was still paid.

### Quit protection

On quit with a live run, the app asks: "A worker task is still running.
Stop it and quit?" Confirming cancels the run, waits a bounded few seconds
for the STOPPED records to land, then quits. The app never exits leaving
the child alive.

### Cross-process run lock

A lock **file** at `<git-common-dir>/cairn-run.lock`:

- Outside the worktree, so it can never trip the exact-path or
  phantom-dirty invariants; distinct from the reserved `.git/cairn`
  legacy-state directory.
- Created atomically (exclusive-create); contains `{pid, hostname,
  startedAt}`.
- On conflict: if the recorded PID is dead on the same machine, the lock is
  stale — remove it and proceed; otherwise refuse with the existing
  `SERIAL_RUN_ACTIVE` message, now naming the holder and start time.
- Released in the same `finally` that clears the in-process Sets, which
  stay as the fast path and the chat gate.

The lock lives in the git *common* directory, so two worktrees of one repo
serialize — the deliberately conservative reading of one-task-at-a-time.
The CLI gets the lock for free because it lives in core.

### Run-reattach

Run ownership moves from the screen to the main process: a per-project run
session holds the outcome, activities so far, and — when finished — the
final result. The run screen re-queries `task:current(project)` on mount
and subscribes to the activity stream keyed by project; the per-mount
`sessionId` goes away. Navigation, return, and window reload all redraw
from the main process's copy; a finished result waits there until seen.
This chunk is UI truthfulness only — the on-disk safety story was already
correct.

## Chunk 2 — Record authorship moves to Cairn

### The worker's job shrinks to product work

The task prompt drops every record duty — no report file, no log row. In
their place, one closing requirement: end the final message with a fenced
`cairn-claims` block. All other rules (never touch git, one task, risk
boundaries) stay.

### The claims block

JSON inside a ```` ```cairn-claims ```` fence, parsed fail-closed in core
(the `cairn-task` parser pattern) with per-field size caps:

- `disposition`: `DONE` or `STOPPED`
- `summary`: one line
- `changes`: what the worker touched and why
- `checks`: each check run and its real result
- `howToTry`: safe local trial steps
- `limitations`: what remains for human judgment
- `milestone`: `YES`, `NO`, or `UNCLEAR`

This is the contract-required report content, from the only party who knows
it.

### Capture and privacy

The Codex adapter retains the text of the worker's **final agent message**
— today deliberately dropped — and nothing else of the stream. The privacy
line in reports gets one honest reword to say so. A missing or malformed
fence after an otherwise-completed process stops with the new code
`WORKER_CLAIMS_MISSING`.

### Cairn composes all three records

The report has two clearly separated parts:

- **Verified by Cairn:** files changed (from git, not from claims), the
  protected-work result, bounded process evidence, the commit result.
- **The worker's account:** the claims, labeled as claims and never
  presented as verified.

The log row is Cairn's; its milestone column carries the worker's claimed
value. Final disposition: DONE only when the worker claims DONE **and**
every envelope check passes; anything else is STOPPED with the precise
reason.

### The flow inverts, and torn writes die

Today: worker writes records → Cairn verifies them → on failure Cairn
rewrites a DONE report into STOPPED (the torn-write machinery behind the
Task 006 incident). After: worker works → Cairn verifies the workspace →
Cairn writes records once, already knowing the truth. `readModelRecords`
and `MODEL_RECORDS_MISSING` are deleted. The DONE→STOPPED rewriter shrinks
to the one remaining self-check on Cairn's own writes. The Codex lane's
record handling becomes structurally identical to the offline lane's — one
path, not two.

### Deliberately unchanged

The single exact-path commit (product changes and records together), the
brief byte-check, protected-work hashes, no-retry, fail-closed everything.
The contract needs no amendment: "write an honest report, append one log
row" stays true of the system; who holds the pen is runtime mechanics, and
the task prompt states it plainly. Contract wording is revisited once, in
Phase 3, when the conductor starts relaying results.

## Chunk 3 — The universal worker-result contract

### One shape, every adapter

Core defines a single `worker-result/v1` value:

- `status`: `completed` or `failed` — the transport's own verdict,
  translated by the adapter (codex.ts maps `exitCode 0 && turn.completed`
  to `completed` internally; the Phase 4 Claude adapter maps its SDK result
  message, with no exit codes to fake)
- `claimsText`: the worker's final message holding the fence, or null
- `evidence`: a small bounded map of named numbers (tokens, event counts,
  exit code — whatever that transport honestly has)

Core validates the one shape in one place with the existing paranoia:
exact own-key sets, prototype checks, descriptor checks, size caps.

### Errors universalize

Core defines two error classes — a boundary error (stopped before the real
call) and a process error (code plus local debug path). Adapters throw
those; the envelope's catch recognizes only those. The codex-specific
imports in serial.ts disappear, and a future adapter's authorization
boundary is classified correctly by construction.

### Disclosure generalizes

Each adapter provides its own disclosure — provider, model, data scope,
quota basis — through the seam; `codexExecDisclosure` becomes the Codex
instance. The app's byte-exact disclosure check compares against whatever
the routed adapter declares. Nothing in the seam assumes an API key;
detection and disclosure are adapter-defined, which is what the Phase 4
Claude subscription transport requires.

### Branches die rather than generalize

With Cairn composing records uniformly, per-adapter report prose is gone.
What remains is a two-way semantic distinction the descriptor already
encodes: a **demo** lane (offline — "the requested change was not
attempted") versus a **real worker** lane. Wording keys off that flag,
never off an adapter id. The offline adapter returns the same universal
shape through the same validator, and the duplicated statement constants
are deleted.

### Deliberately untouched

The routing priority sort (already generic), the `gpt-5.6-sol` pin (it
lives inside the Codex adapter), one-task-at-a-time, and every git
invariant.

## Testing

Every change red-first, through the repo's own workflow.

- **Debts:** fake processes that never resolve or ignore kills drive
  timeout and cancel; a child node process holding the lock proves
  cross-process refusal and stale-lock self-healing (both idioms exist in
  the suite). Playwright gains a "slow" behavior in the fake codex fixture:
  navigate away mid-run, return, reload, cancel — the screen reattaches and
  records stay honest.
- **Records:** parser tests (hostile input, oversize, duplicate fences);
  composition golden-files; a fake worker that does product work, writes no
  records, and emits claims must reach DONE — the old failure class, dead;
  no fence → `WORKER_CLAIMS_MISSING`; claims say DONE but a protected file
  changed → `PROTECTED_WORK_CHANGED` wins.
- **Registry:** the hostile-result suite attacks the universal validator;
  the exact-path and phantom-dirty suites run unchanged; and the Phase 4
  readiness proof — a synthetic third adapter defined only in a test
  fixture reaches a verified DONE **without one line of serial.ts
  changing**.

## Out of scope

Anything conductor-side (conductor-authored briefs, result relay — Phase
3); actual new adapters (Phase 4); the brain's honesty drift (eval and
briefing work, not core); contract amendments (Phase 3, once). Timeout
defaults (10/60 minutes) are constants an implementation task may surface
in settings later; changing the defaults is not Phase 2 work.

## Version

Phase 2 closes at 0.2.0.
