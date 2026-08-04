# Task 176 report - authenticated owner turns and inert conductor actions

**Lane:** B

**Base commit:** `66e24431b0012f4b876e96b2dfcd9fd0128e9fb3`

**Brief commit:** `741edec`

**Milestone moved:** NO

## Outcome

Plan 4's second additive implementation slice is complete. Cairn now preserves
the exact raw owner text accepted by main, writes a main-owned authentication
marker outside the selected project before project persistence or provider use,
and admits only marker-matching owner turns into provider history or source
attribution. Legacy and hand-edited conversation prose remains readable, but it
cannot become **You said so** or **You weren't sure** evidence and cannot be
replayed to the provider as an authenticated instruction.

The conductor may emit at most one exact `cairn-question` or new source-marked
`cairn-task` control. Main strips every control fence from visible and streaming
prose, binds quoted owner text only against the authenticated snapshot used for
that reply, generates every action and risk ID itself, keeps the bound
`TaskIntent` private, and exposes only an output-safe action view. Exactly one
inert action may be current for a project/conversation. A renderer reply must
target that action and, where applicable, that risk exactly; stale, replayed,
wrong-project, wrong-conversation, wrong-action, wrong-risk, and commentary
paths fail closed before they can influence a provider turn.

An accepted owner append retires the action once and authenticates a bounded,
ID-free account of the answer, deferral, risk dismissal, or correction into the
provider snapshot. Provider and parser failures cannot resurrect it. A
pre-write marker or append failure retains the action and spends no provider
call. If persistence may have completed before an error, Cairn reads back the
exact authenticated turn: it reports saved truth when it can prove it, reports
uncertainty otherwise, makes no provider call, and never makes the action
replayable.

Question wording is saved once as passive conversation text. Live action state
survives a renderer remount but deliberately does not revive from
project-writable history after a full app relaunch. The existing legacy task
proposal/dispatch path remains compatible and authoritative until Plan 4 Task
3 performs the one-slice signature migration.

## What changed

### Runtime and trust boundary

- `app/src/main/conductor/conversation-id.ts` adds strict conversation-ID
  validation and main-owned high-water allocation so deleted, corrupt, or
  failed conversation files cannot cause ID reuse.
- `app/src/main/conductor/custody.ts` adds the shared outside-project custody
  primitive: real non-linked profile/container checks, regular single-link
  ledger checks, no-follow descriptor opens, descriptor/path identity checks,
  capped reads, same-descriptor append plus fsync, post-write verification, and
  crash-tail repair.
- `app/src/main/conductor/turnauth.ts` defines exact owner-turn markers,
  authenticated Cairn turns, bounded ID-free reply context, validation, and
  digest binding to canonical project identity, conversation, UUID, timestamp,
  and raw text.
- `app/src/main/conductor/store.ts` writes and reads authenticated owner and
  Cairn turns, separates visible legacy history from provider-eligible history,
  applies a shared external event order across owner/Cairn/envelope turns,
  reconstructs public envelope cards without project-added fields, repairs
  partial JSONL tails, and rejects linked conversation storage paths.
- `app/src/main/conductor/taskblock.ts` adds exact bounded question and
  `{intent, risks}` parsing, the 12,000-code-unit outer cap, three-risk limit,
  mixed/duplicate/malformed fail-closed handling, Markdown-example immunity,
  complete control stripping, and partial-stream concealment.
- `app/src/main/conductor/service.ts` owns current action state, main-issued
  UUIDs, private bound intents, safe projections, exact one-time reply
  validation, action retirement, provider-history selection, passive question
  persistence, retry context, and truthful pre-write/post-write failure paths.
- `app/src/main/conductor/cardauth.ts` moves new result-card custody markers to
  case-preserving canonical real-project identities while retaining legacy
  markers only for direct, unambiguous roots; aliases and case-sensitive
  ambiguity fail closed.
- `app/src/main/conductor/constitution.ts` teaches the conductor the staged
  question/task control protocol, source distinctions, limits, and the rule
  that it never invents main-owned IDs.
- `app/src/main/main.ts`, `app/src/main/ipc.ts`, `app/src/shared/ipc.ts`, and
  `app/src/preload.ts` wire external marker roots, the additive current-action
  read, and typed action replies through the main-owned boundary.
- `app/src/renderer/screens/Chat.tsx` stops trimming accepted owner messages so
  the exact outer spaces and line breaks displayed optimistically are the same
  bytes main authenticates and sends.
- `app/lab/mock-cairn.ts` implements the new additive action-read surface for
  the design lab without creating live controls.

### Executable evidence and adjacent repairs

- `app/tests-unit/turnauth.test.ts`, `app/tests-unit/store.test.ts`,
  `app/tests-unit/taskblock.test.ts`, `app/tests-unit/constitution.test.ts`, and
  `app/tests-unit/resultcard.test.ts` cover marker binding, custody, replay and
  reorder refusal, exact bytes, snapshot intersection, parser limits, stream
  concealment, action protocol wording, card migration, and hostile linked or
  forged storage.
- `app/tests/fixtures/fake-conductor.mjs` adds fake-only question/task,
  malformed-control, provider-failure, and commentary-control answers plus a
  request counter. No real provider is involved.
- `app/tests/conductor.spec.ts` adds the seven Task 176 Electron scenarios and
  repairs three stale/load-sensitive checks found during full compatibility
  verification: async completion polls use the established 30-second E2E
  budget; the run strip expects its intentional friendly stop sentence while
  the card/report still prove `CANCELLED_BY_OWNER`; and a sub-second Town return
  phase is verified from the existing mutation probe rather than raced live.
- `app/tsconfig.unit.json` includes the new conversation-ID, custody, and
  turn-authentication modules in the App unit build.
- `core/test/codex.test.ts` is a disclosed adjacent fixture repair. Its fake
  child previously exited without reading required stdin and could manufacture
  `CODEX_EXEC_STDIN_FAILED` under concurrent Windows load. It now consumes and
  verifies the exact bounded request before emitting JSONL; production Core
  code is unchanged.
- `docs/ai-work/tasks/176-brief.md` claimed Task 176 alone before source work.
  This report and the Task 176 row in `docs/ai-work/LOG.md` are the task memory.

No dependency, credential, provider data scope, consent wording, production
dispatch signature, project fact, milestone, legacy record, external service,
or generated artifact changed.

## AI decisions and review record

- The external owner, Cairn, event-order, conversation-ID, and result-card
  ledgers share one descriptor-bound custody implementation. Project JSONL is
  presentation/history storage; it is never the source of authentication.
- Main's external event order, rather than project-file line order, determines
  which authenticated turns can enter a provider snapshot. This prevents a
  project writer from rearranging genuine entries into a different dialogue.
- A successful owner append retires any current new action even if the later
  provider or parser step fails. A same-conversation legacy proposal remains
  only as the explicit Task 3 bridge; any new authenticated action supersedes
  it.
- New custody markers use case-preserving `realpathSync.native` identities.
  Legacy lowercased card markers remain accepted only when lower- and
  upper-case probes resolve to the same direct directory identity.
- Independent parser/action review and a separate custody/lifecycle/code audit
  both ended with no remaining Task 176 blocker. Reviewers did not edit files.
  The final code audit reran TypeScript, 347 App unit cases, and diff hygiene.
- Pure Node pathname APIs cannot make every ancestor lookup handle-relative.
  The implemented boundary therefore rejects static worker-created links and
  assumes Cairn's existing single-instance, serial-runtime rule: no independent
  same-user process races a junction swap while an append is in progress.
  Review accepted this explicit residual; stronger protection would require a
  native handle-relative API and is not justified by this task's threat model.

## Checks run and real results

1. `cd app && npm.cmd run test:unit`
   - Passed after the final edits: 347 tests total, 345 passed, 0 failed, with
     two platform-specific skips on this Windows host.
2. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
3. `cd app && npm.cmd run build:vite`
   - Passed: main, preload, and renderer production bundles built from the
     final runtime code. `resources/contract.md` synced byte-identically and
     remained clean.
4. `cd app && npm.cmd run build:lab`
   - Passed: the design-lab production bundle built.
5. Focused fake-only Electron check while holding and releasing
   `C:\Users\KenJL\AppData\Local\Temp\cairn-app-token`:
   - `npx.cmd playwright test tests/conductor.spec.ts --workers=1 --grep "structured question|attributed task actions|owner marker custody|post-fsync owner|post-fsync Cairn|answered action stays|comment's follow-up suggestions"`
   - Passed: 7 tests, 7 passed, 0 failed.
6. Full conductor compatibility coverage, always one process and one app-token
   holder at a time:
   - The monolithic `npx.cmd playwright test tests/conductor.spec.ts
     --workers=1` run proved the first 22 scenarios, then this Windows host
     intermittently exhausted the global test lifecycle while closing the
     Electron profile. The timeout carried no failed product assertion, but
     the immediate profile cleanup consequently reported `EPERM`.
   - The exact unreached long dispatch, reduced-motion, claims-motion, reload,
     connection-required, commentary, queueing, result-card, and push-safety
     scenarios were rerun in fresh serial processes. Their clean results were
     1/1, 1/1, 1/1, 1/1, 6/6, and 6/6; the stopped-card scenario also passed
     before an unrelated transient-motion assertion was repaired and rerun.
     Together with the first 22, every one of the file's 39 scenarios has
     passing evidence. The app token was released after every run.
7. `cd core && npm.cmd test`
   - Passed after the adjacent fake-stdin repair: 174 tests, 174 passed, 0
     failed. Before that repair, two full concurrent attempts produced the same
     lone `CODEX_EXEC_STDIN_FAILED`; the case passed alone and the complete
     suite passed 174/174 with `--test-concurrency=1`, which isolated the fake
     child's exit-before-stdin race. The repaired default concurrent command
     then passed in 41.9 seconds.
8. `cd cli && npm.cmd test`
   - Passed: 18 tests, 18 passed, 0 failed. It ran only after Core had fully
     exited, so neither suite cleaned the other's compiled output.
9. Independent review, `git diff --check`, exact-path diff inspection, and
   final lane status
   - Passed before writing the records. No remaining correctness, custody,
     parser, replay, lifecycle, compatibility, or executable-evidence blocker
     was reported; generated outputs remained ignored and only disclosed task
     paths were changed.

Early diagnostic attempts were also recorded honestly: `npm.cmd run test:e2e`
was not a defined App script and was corrected to the Playwright command;
restricted Vite/lab and subprocess-heavy Core attempts were rerun with the
local execution allowance; and red-first hostile/storage cases plus the E2E
harness repairs were corrected and rerun. No real provider, paid model,
credential, dependency install, external service, publish, push, or external
write was used.

## How to try it

1. From `app/`, run `npm.cmd run test:unit`. The final block of output names
   the authenticated owner/Cairn history, conversation-ID, linked-path,
   question/task parser, action, and marker-custody cases.
2. Run the focused fake-only Playwright command in check 5 while no owner-opened
   Cairn window is using the profile. It proves raw whitespace, main-issued
   IDs, one-time exact replies, relaunch behavior, marker and post-fsync
   failures, retry context, and commentary isolation without a model call.
3. For a code-level orientation, read
   `app/src/main/conductor/turnauth.ts`, then `store.ts`, `taskblock.ts`, and
   `service.ts` in that order. The public IPC projection is in
   `app/src/shared/ipc.ts`; it contains no source IDs or offsets.
4. Continue with Plan 4 implementation task 3 for the visible action controls
   and one-green-slice dispatch signature migration. Do not treat this task's
   inert action as dispatch authority.

## Limitations and remaining judgment

- The shipped renderer still uses the legacy proposal controls. New question
  and task actions are trustworthy but intentionally inert until Task 3.
- Passive question prose survives a full app relaunch; live action controls do
  not. That prevents project-writable history from reviving authority.
- Legacy conversation prose remains visible but unmarked owner/Cairn lines are
  excluded from provider history and attribution. Same-conversation legacy
  proposal retention is the deliberate Task 3 compatibility bridge.
- Legacy result-card markers are accepted only for direct, case-unambiguous
  roots. Aliased or case-sensitive-ambiguous selections require the new v2
  marker.
- The monolithic Electron file remains sensitive to accumulated Windows
  process/profile lifecycle timing on this machine. All 39 scenarios have
  passing serial evidence, but not in one uninterrupted invocation during this
  task.
- Fake tests prove custody, parsing, replay refusal, exact provider bytes, and
  lifecycle behavior. They cannot prove an unevaluated real conductor will
  always notice uncertainty or emit the best candidate. The owner separately
  controls any later real-model evaluation, including provider, model, data,
  and cost.
- The same-user concurrent junction-swap residual described above remains
  outside Cairn's single-instance/no-concurrent-worker-mutation boundary.

Disposition: **DONE**
