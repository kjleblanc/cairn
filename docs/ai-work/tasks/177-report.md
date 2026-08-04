# Task 177 report - one green accepted-intent dispatch migration

**Lane:** B

**Base commit:** `c6334971d7b7b3bf945be3075269e53e876538e7`

**Brief commit:** `070d398`

**Milestone moved:** NO

## Outcome

Plan 4's third ordered slice is complete. An exact raw manual request or the
current authenticated, risk-free conductor action now becomes a one-time
main-owned preview. The existing final Start/Run press is the sole acceptance
point: one canonical-project gate rechecks the proposal, worker identity,
route, disclosure, and authorization, then atomically consumes the preview and
the exact chat action before any session, evidence run, Core record, or worker
process can exist.

The same frozen source-marked `TaskIntent` and canonical digest now travel from
App acceptance through Core's `cairn-serial-task/v3`, Codex or Kimi disclosure,
authorization and prompt, `worker-result/v2`, every DONE/STOPPED/error record
composition path, and the shipped CLI. Briefs and both report families render
**What you asked for** from one structure-safe blockquote renderer, with context
kept separate. Output projections, renderer text, conversation prose, worker
claims, and files never become dispatch authority.

Direct App and CLI input retains exact accepted bytes. The 300, 301, and 2,000
character boundaries round-trip; 2,001 characters and fewer than five
non-whitespace characters stop before adapter detection or work. Stale,
cancelled, corrected, replayed, concurrent, wrong-adapter, changed-route,
changed-disclosure, and changed-source starts fail closed. An accepted thrown
error retains the accepted request in the main-owned run session without
restoring either one-time authority.

Task 4's authenticated result-card persistence, Task 5's final visual and
accessibility presentation, and Task 6's phone rendering remain deliberately
out of scope.

## What changed

### Core contract, records, and adapters

- `core/src/routing.ts` replaces the legacy outcome/details adapter contract
  with `cairn-serial-task/v3`, one frozen intent and `requestSha256`; worker
  results are now `worker-result/v2` and echo that digest.
- `core/src/serial.ts` accepts and revalidates one intent, routes from its
  interpretation, passes the same object to the chosen adapter, verifies the
  echoed digest, and retains the output-only request view across every close.
- `core/src/records.ts` adds the shared source-safe request renderer used by
  briefs, composed worker reports, legacy reports, and verification rewrites.
  Every owner/context line, including blanks, headings, fences, tables, and
  disposition-looking text, remains blockquoted data.
- `core/src/codex.ts` and `core/src/kimi.ts` derive disclosure, canonical
  authorization, and worker prompt bytes from the same intent. Prompts explain
  that exact **You said so** words govern conflicts, **You weren't sure** is a
  starting point, and **Cairn chose** is not owner preference. The Codex and
  Kimi data-scope constants remain byte-identical.
- `core/src/kimi.ts` also carries the disclosed test-safety repair described
  below: a Kimi test lane can resolve only one strictly canonical temporary
  fake directory. It never consults PATH or the home install, refuses linked
  escapes and realpath uncertainty, ignores inherited `ComSpec`, and accepts
  only canonical local-drive Windows `cmd.exe`/`taskkill.exe`; normal product
  resolution is unchanged.
- `core/test/routing.test.ts`, `core/test/records.test.ts`,
  `core/test/serial.test.ts`, `core/test/codex.test.ts`, and
  `core/test/kimi.test.ts` cover v3/v2 shapes, exact digest continuity,
  source/span/context mismatches before spawn, hostile rendering, all close
  paths, both adapter prompts, direct boundaries, and the strict fake-Kimi
  lane. `core/test/lock.test.ts` migrates its synthetic adapter result to v2.

### Main-owned preview and App migration

- `app/src/main/tasks.ts` adds exact IPC validation, canonical route
  generations, one-time pending previews, bounded discard, the per-project
  start gate, repeated proposal/adapter/disclosure checks, atomic consumption,
  and accepted request retention for normal and exceptional closes.
- `app/src/main/conductor/service.ts` exposes only the exact current private
  task intent to main, consumes a risk-free action once, and invalidates route
  generations on owner turns, corrections, replacements, disconnects, and
  successful consumption.
- `app/src/main/adapters.ts` derives authorization from the accepted intent and
  keeps the delayed-detection seam test-only.
- `app/src/shared/ipc.ts` and `app/src/preload.ts` replace authority-bearing
  request fields with preview IDs and output-only request/context projections.
- `app/src/renderer/screens/Chat.tsx` dispatches authenticated action/risk IDs,
  removes an old card while its reply streams, mounts a fresh replacement by
  new action ID, and starts only by preview ID. Accepted ERROR inference is
  tied to the session's exact `acceptedPreviewId`.
- `app/src/renderer/screens/TaskRun.tsx` sends exact manual bytes, renders only
  main's preview, starts by ID, and uses the same accepted-error identity.
- `app/src/renderer/components/TaskCard.tsx` changes the dispatch callback to
  zero arguments so displayed strings cannot cross back into authority. This
  is a required adjacent caller repair beyond Plan 4's abbreviated Task 3 file
  list.
- `app/lab/mock-cairn.ts` migrates the design-lab IPC mock without creating
  authority.
- `app/tests/routing.spec.ts` covers exact input boundaries, cancellation,
  stale generations, lexical project aliases, simultaneous starts, one
  countable fake worker, disclosure/adapter mismatches, replay, and the guarded
  fake-Kimi path.
- `app/tests/conductor.spec.ts` migrates fixtures to authenticated actions and
  covers risk refusal, targeted set-aside, fresh IDs, correction invalidation,
  delayed route races, old-card removal, and inline dispatch. Two direct-send
  waits were repaired after a demonstrated harness race: they now observe
  main's controller/action state and always close Electron in `finally`.
- `app/tests/fixtures/fake-conductor.mjs` supplies attributed risk-bearing and
  replacement task actions. `app/tests/fixtures/fake-codex-env.ts` makes each
  process start countable. `app/tests/fixtures/fake-kimi-env.ts` supplies the
  exact authorized temporary bin required by Core's strict test lane.
- `app/tests-unit/kimi-wiring.test.ts`, `app/tests-unit/resultcard.test.ts`,
  `app/tests/evidence.spec.ts`, and `app/tests/serial.spec.ts` migrate the
  surrounding typed fixtures and compatibility assertions.

### Shipped CLI

- `cli/src/flows/task.ts` preserves raw owner input, consumes only the exact
  `--mock` switch, builds one direct-source intent before detection, and reuses
  it unchanged for route, disclosure, authorization, and execution.
- `cli/test/task.test.ts` covers exact whitespace, confirmation ordering,
  unknown `--`-prefixed owner text, 300/301/2,000 acceptance, 2,001 and short
  pre-detection refusal, and one-intent identity across every seam.

### Task memory

- `docs/ai-work/tasks/177-brief.md` claimed the task before source work.
- `docs/ai-work/tasks/177-report.md` is this report.
- `docs/ai-work/LOG.md` receives the one truthful Task 177 row.

No dependency, provider data scope, consent wording, project fact, milestone,
publish, push, deployment, or production data changed.

## Safety incident and repair

The first focused fake-Kimi compatibility attempt exposed a real harness
failure. The test concatenated fake Codex's complete PATH (fake Codex plus the
inherited machine PATH) before the fake Kimi directory. The fake-Kimi marker
was absent, and Cairn's bounded temporary report shows that a Kimi process
started and exited `1`. The machine's installed, signed-in Kimi CLI was therefore
likely invoked with the synthetic test request:

> Improve Cairn safely
>
> Use exactly 74, 477, 256 — do not round.

The retained report records `agentMessageCount=0`, `toolCallCount=0`,
`failedToolItemCount=0`, no readable worker claims, protected starting work
byte-identical, and only Cairn's generated `001-brief.md` changed. It is at
`C:\Users\KenJL\AppData\Local\Temp\cairn-kimi-real-path-89VVb5\docs\ai-work\tasks\001-report.md`
on this host. These facts reduce the observed impact but do **not** prove that
the CLI never contacted its provider or that no quota/cost was consumed. No
credential or account detail was inspected.

All Electron/provider-adjacent checks stopped immediately. No Kimi or Electron
process and no app token remained. The PATH order was repaired, then Core was
hardened so PATH order alone can never authorize a test Kimi again. An initial
independent review found two further blockers before any rerun: generic
canonicalization could fall back to a lexical path, and Windows still trusted
inherited `ComSpec`. Both were fixed with strict realpath-or-refuse identity,
linked-bin refusal, canonical temp/workspace containment, canonical local-drive
Windows shell/tree-kill resolution, and hostile PATH/home/link/`ComSpec`/
`SystemRoot` marker tests. The re-review found no remaining malformed-fixture
route to an installed Kimi. Only after that did the guarded fake-only Electron
path run again and pass.

The first guarded eight-case rerun also exposed an unrelated test timing race:
one direct conductor send could finish after a negative DOM assertion had
already declared it done. Five cases passed, one failed that assertion, and two
did not run; the skipped close caused isolated-profile cleanup to report
`EPERM`. The test now polls main's authoritative controller/action and closes
the app in `finally`; the two correction cases passed 2/2 and the final batch
passed 8/8. Temp test/profile directories were not broadly deleted.

## AI decisions and review record

- Preview authority lives only in main and is keyed by canonical project
  identity. A route generation invalidates async work before it can publish;
  the start gate is acquired before re-detection's first await.
- Every matched pre-accept uncertainty retires the preview except one exact
  authorization mismatch, which deliberately leaves the unchanged review
  usable. Once Core entry is accepted, no terminal path restores authority.
- The public `TaskRequestView` contains visible labels, interpretations, owner
  quotation, and separate context only. IDs, offsets, authenticated inputs,
  the frozen intent, and digest authority remain private.
- CLI parsing treats only the exact `--mock` token as a flag; unfamiliar
  `--...` text remains part of the owner's request so it cannot evade length
  checks or be silently discarded.
- Independent Core reviews found and closed span-only authorization and hostile
  legacy-report test gaps, then found and closed both Kimi test-lane safety
  blockers. Independent App reviews found no production preview/action blocker
  and confirmed the correction-wait cleanup. Reviewers launched no Electron or
  provider process.

## Checks run and real results

1. `cd core && npm.cmd test`
   - Passed from the final Core tree: **178 tests, 178 passed, 0 failed, 0
     skipped**. This includes the successful Windows junction refusal and
     hostile PATH/home/`ComSpec`/`SystemRoot` marker cases.
2. `cd cli && npm.cmd test`
   - Passed: **23 tests, 23 passed, 0 failed**.
3. `cd app && npm.cmd run test:unit`
   - Passed from the final tree: **347 total, 345 passed, 0 failed, 2
     platform-specific skips**.
4. `cd app && npm.cmd run typecheck`
   - Passed after the final production and E2E-harness edits.
5. `cd app && npm.cmd run build:vite`
   - Passed: main, preload, and renderer production bundles built. The first
     restricted attempt was denied filesystem traversal by the sandbox; the
     same local build passed with the required worktree read allowance.
6. `cd app && npm.cmd run build:lab`
   - Passed: the design-lab production bundle built.
7. Final guarded fake-only Electron check while atomically holding and finally
   releasing `C:\Users\KenJL\AppData\Local\Temp\cairn-app-token` and setting
   `CAIRN_TEST_LANE=1` for every launched app:
   - `npx.cmd playwright test tests/routing.spec.ts tests/conductor.spec.ts --workers=1 --grep "manual previews|a cancelled delayed route|two simultaneous starts|fake-kimi lane|dispatch preview accepts|a correction during delayed proposal|the full loop|a targeted risk reply"`
   - Passed: **8 tests, 8 passed, 0 failed**. The fake-Kimi case completed DONE
     through the real-call-shaped path but could resolve only its exact temp
     shim. The token was released; Kimi and Electron process counts were zero.
8. Focused correction-harness rerun after the timing repair:
   - `npx.cmd playwright test tests/conductor.spec.ts --workers=1 --grep "dispatch preview accepts|a correction during delayed proposal"`
   - Passed: **2 tests, 2 passed**.
9. Independent Core, App, CLI, and final cross-boundary review; `git diff
   --check`; exact changed-path/status inspection
   - Passed before writing these records, with no remaining blocker. Generated
     build/test output remained ignored and only the disclosed task paths were
     modified.

The final checks used temporary local fakes only. They made no approved real
model call. The earlier likely installed-Kimi launch is the separately disclosed
exception; provider contact and quota/cost remain unknown.

## How to try it

1. From `core/`, run `npm.cmd test`. The accepted-intent, record renderer,
   adapter authorization, and strict fake-Kimi cases are named in the output.
2. From `cli/`, run `npm.cmd test`. The final cases show exact direct input and
   the 300/301/2,000/2,001 boundaries.
3. From `app/`, run `npm.cmd run test:unit` and `npm.cmd run typecheck`.
4. To inspect the visible path without starting work, open Cairn, ask the
   connected conductor for a task, resolve or set aside its risks, and choose
   **Review dispatch**. The final panel is main's one-time preview. Do not press
   the real-call Start button unless you intend to approve the exact displayed
   provider, model, project, data, and quota for that call.

## Limitations and remaining judgment

- Authenticated request persistence into final ResultCards is Plan 4 Task 4;
  the accepted ERROR view in this slice is main-session state only.
- Final `QuestionCard`/`TaskIntentList` styling, keyboard focus, live-region
  behavior, and narrow-screen polish are Task 5. Phone parity is Task 6.
- The final Electron evidence is a focused eight-case compatibility set, not
  the entire App E2E suite. Core, CLI, App unit/type, and both builds are full.
- Fake workers prove bytes, ordering, refusal, and one-time consumption. They
  do not evaluate how a real worker follows source attribution.
- The strict Windows executable rules are test-lane-only and intentionally
  fail closed on malformed or non-local system roots. Normal Kimi product
  discovery retains its existing PATH then home-install behavior.
- Whether the accidental installed-Kimi process reached its provider or spent
  quota cannot be established from the bounded evidence. No claim otherwise
  is made.

Disposition: **DONE**
