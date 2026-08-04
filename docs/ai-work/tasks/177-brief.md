# Task 177 brief - one green accepted-intent dispatch migration

**Lane:** B

**Base commit:** `c6334971d7b7b3bf945be3075269e53e876538e7`

## Requested visible outcome

Implement Plan 4's third ordered slice as one green vertical migration. A chat
proposal or exact raw manual request must first become a one-time main-owned
route preview. The final existing Start/Run press is the only acceptance point:
it atomically consumes that preview and, for chat, the exact still-current
proposal, then carries the same frozen source-marked `TaskIntent` through the
App session, Core serial envelope, selected adapter, worker prompt, every close
record, and the shipped CLI.

The migrated path must:

- replace Core's legacy outcome/details task contract with
  `cairn-serial-task/v3`, one accepted intent, and its canonical
  `requestSha256`; bump worker results to `worker-result/v2`;
- render a structure-safe **What you asked for** section and separate context
  in briefs and both report families, retaining the same accepted request for
  DONE, every STOPPED path, offline completion, verification rewrites, and
  accepted thrown ERROR composition;
- derive both Codex and Kimi disclosure, authorization, and prompt bytes from
  the same frozen intent while keeping both data-scope constants byte-identical;
- issue main-owned preview IDs, bind each preview to its route generation,
  selected adapter, exact expected disclosure, intent, and optional current
  proposal, and expose only the output-safe request view plus context;
- reject late, changed, cancelled, stale, replayed, concurrent, wrong-adapter,
  wrong-risk, and disclosure-mismatched starts before work, with exactly one
  consumer able to create a session, evidence run, brief, or worker process;
- preserve exact direct App/CLI source text: at least five non-whitespace
  characters, 300 and 301 accepted, 2,000 round-tripped, and 2,001 refused
  before adapter detection or any preview/work artifact; and
- migrate every shipped App and CLI caller in the same task so no intermediate
  legacy signature remains.

## Boundary of intent - what must not change

- Task 176's authenticated owner-turn/action boundary remains authoritative.
  A proposal route may use only the exact current main-held task action with no
  unresolved risks. `TaskRequestView`, renderer values, conversation prose,
  worker claims, and files are output-only and can never become input authority.
- **Review dispatch** creates no accepted task. Only the final existing real-call
  or offline-Run press accepts; pre-accept refusal creates no run session,
  evidence run, Core record, or worker process. A consumed preview/proposal is
  never restored after Core entry, whatever terminal path follows.
- A newer route, owner turn, correction, replacement action, explicit cancel,
  successful consume, or relaunch invalidates the prior preview. Connection/no-
  route staleness leaves the proposal or manual editor usable; an authorization
  mismatch may leave the exact preview reviewable as specified by the plan.
- Existing provider/model/project/data/quota disclosure and checkbox gates,
  serial runtime, risk pause, protected-work rules, and legacy record reads stay
  intact. `CODEX_EXEC_DATA_SCOPE`, `KIMI_EXEC_DATA_SCOPE`, and the connected-
  conductor consent wording remain byte-identical.
- This task supplies Core's output-only accepted-request composition but does
  not yet add authenticated card persistence, final ResultCard/phone display,
  polished QuestionCard/TaskIntentList presentation, CSS, or accessibility
  focus/announcement behavior; those are ordered Tasks 4-6.
- No dependency, credential, paid/real model call, provider data-scope change,
  external write, publish, push, project fact, or milestone change is in scope.
- Source changes stay within Plan 4 Task 3's named Core, App, CLI, test, and task
  record paths unless a required adjacent correction is disclosed.

## Implementation plan (AI decisions)

1. Start with red Core tests for the v3/v2 contract, source-only digest changes,
   hostile intent revalidation, structure-safe rendering, all close paths, and
   exact Codex/Kimi disclosure/authorization/prompt bytes.
2. Migrate `routing.ts`, `serial.ts`, `records.ts`, `codex.ts`, and `kimi.ts` to
   accept validated frozen intents and canonical digests, using one shared
   source-safe request renderer for briefs and both report families.
3. Add a main-process preview store/generation and bounded discard IPC in
   `tasks.ts`. Route proposal/manual sources into frozen intents, recheck after
   asynchronous detection, and return only a main-issued preview projection.
4. Put preview validation and atomic consumption behind the existing per-project
   start gate. Re-detect the bound adapter and disclosure before consume, then
   derive every session/Core input from the accepted intent.
5. Migrate shared/preload/renderer/lab callers and the direct CLI flow together;
   retain exact raw source bytes and the fixed long-request interpretation
   without truncation or model summarization.
6. Add fake-only concurrency, stale-generation, correction, replay, wrong-risk,
   offline, boundary, and pre-spawn tests, then run full Core, CLI, App unit,
   typecheck, builds, and focused Electron compatibility checks serially.

## Checks that will show the outcome holds

1. Core routing/records/serial tests prove v3/v2 exact shapes, canonical intent
   validation, safe blockquoted source/context rendering, output-only composed
   requests, and retention across every DONE/STOPPED/error rewrite path.
2. Codex and Kimi tests prove source/span/context-only changes invalidate
   authorization before spawn, exact source semantics reach prompts, and both
   data-scope constants remain byte-identical.
3. App tests prove proposal/manual preview creation, 300/301/2,000/2,001 raw
   boundaries, generation recheck, discard, correction, risk, adapter and
   disclosure binding, and exactly-one atomic consume under simultaneous starts.
4. Fake-only routing Electron tests prove no stale preview appears or starts and
   pre-accept refusals create no session, evidence, record, or worker marker.
5. CLI tests prove one direct-source intent is built once from exact raw input
   and reused unchanged for disclosure, authorization, and execution.
6. `npm.cmd test` in Core and CLI; `npm.cmd run test:unit`, `npm.cmd run
   typecheck`, `npm.cmd run build:vite`, and `npm.cmd run build:lab` in App;
   independent review; `git diff --check`; and final exact status all pass.

## DONE and STOPPED

- **DONE:** one main-held preview is the sole acceptance point; exactly one
  concurrent start can consume it; the same authenticated intent and digest
  reach Core v3, worker v2, both adapters, every record close, App, and CLI;
  direct-input boundaries and pre-spawn refusals are executable; all callers and
  compatibility checks pass; and the exact changes land with one report and log
  row.
- **STOPPED:** any renderer/output view can supply authority, a stale/replayed or
  concurrent preview can start work, source/context can change without an auth
  mismatch, pre-accept refusal leaves work artifacts, a close path loses the
  accepted request, a shipped caller remains on the old API, protected work
  changes unexpectedly, or completing the migration requires an out-of-scope
  card/UI/phone, provider, dependency, or external action.
