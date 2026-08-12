# Quality Intent and Bounded Critic — Prerequisite Implementation Plan

**Goal:** ship a source-bound Quality Plan and a task-scoped, independently
approved, tool-free critic that can surface at most one evidence-driven repair
round, while making polish and minor findings non-blocking by construction.

**Architecture:** `TaskSpecV1` extends Cairn's existing authenticated
`TaskIntent` with required `cN` promises, advisory `pN` preferences, optional
frozen references, evidence standards, and a finite whole-run call budget. Core
parses a model-only `CriticOutputV1`; main wraps it with authenticated metadata,
and a critic allegation needs the frozen failure condition plus owner/native
confirmation before it can block. The desktop keeps a pending candidate under
main-owned custody between separately approved calls. The owner's verdict and
post-completion review remain separate.

**Source design:**
`docs/superpowers/specs/2026-08-07-cairn-quality-intent-and-critic-design.md`.

**Roadmap position:** unnumbered **Prerequisite Q** after completed
owner-verdict Plan 1 and before owner-verdict Plan 2. The four numbered
owner-verdict plans keep their existing numbers. Plan 2 may not be written or
started until Tasks Q1–Q10 below are DONE.

**Tech stack:** existing TypeScript 5.6, Node test runner, Electron/React,
existing worker adapters, and the conductor's tool-free OpenAI-compatible
transport. No dependency is added.

## Global constraints

- Execute these as serial recorded Cairn tasks. Each claims its own task number
  at execution time and lands its own brief, implementation, report, LOG row,
  and exact-path local commit.
- Preserve the existing `TaskIntent` source-span custody, proposal identity,
  preview consumption, provider/model/data disclosure, Git protection,
  main-authored records, and result-card claim/verified split.
- The critic is not a post-completion review and cannot reopen a sealed task.
  The portable contract's optional `Review task NNN` behavior stays unchanged.
- `cN` rows are required promises. `pN` rows are advisory preferences. No model
  output may promote `pN`, add a new `cN`, or change the frozen Task Spec after
  dispatch.
- Critic mode is `required`, `optional`, or `off` in the owner-visible Task
  Spec. Only an owner-stated row or contract rule may make it required. Builder
  routing is not globally gated on critic availability.
- The critic has no write, dispatch, verdict, risk-approval, owner-score,
  `moved`, stone, or next-task authority. Prompt text is never accepted as a
  containment mechanism.
- Every real builder, repair, critic, retry, or calibration call retains its own
  exact just-in-time owner approval. A maximum is not blanket authorization.
- Tasks Q1–Q9 are dark, fake-only/offline. No provider call, credential, network
  request, external reference fetch, dependency install, push, publish, or
  deployment occurs in them.
- Task Q10 stops immediately before its first paid/data-bearing calibration call
  and shows the owner the provider, model, synthetic fixture payload, maximum
  calls, and cost/quota basis. Declining leaves live activation off and records
  `STOPPED`; it does not weaken the calibration bar.
- The first live critic capability uses the connected conductor's one-shot
  transport with no tool schema and sends only the canonical packet. Codex Exec
  read-only is not packet-read containment. V1 Builder/repair is restricted to
  a writer adapter whose enforced write sandbox excludes `userData`; today's
  Kimi adapter does not qualify.
- V1 critic packets stay inside the current connected-conductor consent: text
  only; at most eight eligible Git-tracked files, 8,000 characters each and
  32,000 total; all existing ignored/link/binary/dependency/generated/
  credential-like/outside-project exclusions. Wider or multimodal scope is a
  later connection-renewal decision, not inferred here.
- `app/src/main/criticactivation.ts` exists from Q1 with no active tuple. Q1–Q9
  remain unreachable from normal routing; only Q10 may add an exact calibrated
  provider/model/prompt/schema/policy/modality/no-tools tuple.
- External references are not fetched by this plan. Already-authorized local
  snapshots may exercise the schema. External acquisition needs its own spec
  and owner decision after Prerequisite Q.
- Existing task records and the completed check-id Plan 1 file remain history.
  Task 207's amendment, not a rewrite of Task 205, transfers the remaining
  runtime check-id work into this prerequisite.

---

## Task Q1 — Add the frozen Task Spec and Quality Plan kernel

**Visible outcome:** Core can parse, source-check, deeply freeze, project,
canonically serialize, and hash `TaskSpecV1`. Invalid plans fail closed before
they can become proposal or dispatch authority. No live caller uses the new
type yet.

**Files:**

- Create `core/src/quality.ts`
- Create `core/test/quality.test.ts`
- Create `app/src/main/criticactivation.ts` with an empty activation registry
- Create `app/tests-unit/criticactivation.test.ts`
- Modify `core/src/index.ts`
- Modify `core/package.json`

**Interfaces produced:**

- `QualityPlanCandidateV1`, `QualityPlanV1`, `AcceptanceCheckV1`,
  `ComparisonCriterionV1`, `QualityPreferenceV1`, `QualityReferenceV1`,
  `CriticModeV1`, `TaskCallBudgetV1`, `EvidencePlanV1`,
  `EvidencePlanRevisionAuthorizationV1`, and `TaskSpecV1`
- `parseQualityPlanCandidate`, `bindTaskSpec`, `validateTaskSpec`,
  `canonicalTaskSpec`, `taskSpecSha256`, and an output-only review projection
- the design's exact fixed caps for criteria, references, unknowns, artifacts,
  findings, evidence refs, and text; exact-key parsing;
  ordinary arrays/records only; safe UTF-16; no accessors, Proxies, sparse
  arrays, duplicate ids, or hidden/symbol keys

**Required tests:**

- `cN` and `pN` ids are contiguous, position-only, unique, and never task
  numbered.
- Every criterion basis resolves to the exact bound intent row or a bounded
  contract section; an invalid requirement index fails. A `cN` cannot use an
  `owner-unsure`/`cairn-chosen` row. A Cairn-chosen reference must point to its
  intent row but can support only `pN` until the owner adopts it in a new turn.
- A dispatchable Task Spec requires an owner-stated outcome; a Cairn-inferred
  outcome returns to conversation for explicit adoption/correction.
- `owner-unsure` and `cairn-chosen` references cannot silently become a
  subjective automatic gate.
- Required comparison checks use `judge: owner` or a named deterministic
  method; v1 rejects `judge: critic` for subjective `match`/`beat`.
- `judge: critic` accepts only bounded artifact-inspection promises with a
  frozen failure condition and owner confirmation; command facts route to Cairn,
  taste routes to the owner, and envelope facts stay outside the Quality Plan.
- Structured reference state and every comparison id/reference/dimension/state/
  comparator/threshold/tie rule resolve exactly; `tie` is impossible for a
  non-comparison criterion.
- `critic.mode: required` needs owner-stated/contract basis; optional/off do not
  become gates and reject every critic-judged `cN`. Every critic-judged row in a
  required plan repeats the same authoritative basis. V1 rejects
  `production-activation`.
- Reverse coverage requires the outcome and every owner-stated requirement to
  map to `cN`, and the supported path to map to one Cairn/owner-judged
  non-regression `cN`; missing/extra mappings refuse preview.
- The call budget is exactly one initial Builder, one repair, three critic
  attempts, zero external-evidence calls, 3,600,000 ms/2,000,000 captured bytes
  per Builder or repair, and 600,000 ms/262,144 bytes per critic; it never
  fabricates a dollar cap.
- Unknowns, target, supported path, and critic mode retain valid intent basis;
  unknowns cannot hide a missing required owner decision.
- Canonical hashes change for every authority field and are stable across
  ordinary object key insertion order.
- Frozen branded values are the only values accepted by hash/projection helpers.
- An evidence procedure may take the one audited harness-revision transition,
  but the promise/basis/judge/failure condition/standard remain byte-identical;
  only a typed main-proven pre-assertion failure plus owner action and one closed
  mechanical change qualifies. Weakening any authority needs a new Task Spec.
- The activation registry is empty and rejects Auto/unresolved models and every
  tuple until Q10 adds an exact calibrated entry.

**Checks:** `npm.cmd test --workspace @cairn/core`; `git diff --check`.

**STOPPED if:** a Quality Plan requires changing the existing authenticated
owner-span semantics or accepting vague/unbounded criteria.

---

## Task Q2 — Add the critic assessment parser and deterministic policy

**Visible outcome:** Core can accept one strict, hash-bound model
`CriticOutputV1`, wrap it with main-authored `CriticAssessmentV1` custody, and
derive pending resolutions/blockers without reading a global model verdict or
the critic's self-confidence as authority. Fake fixtures prove that minor
criticism cannot reject a candidate.

**Files:**

- Create `core/src/critic.ts`
- Create `core/test/critic.test.ts`
- Create `core/test/fixtures/critic/` with bounded JSON fixtures
- Create `docs/superpowers/evals/critic-v1.md` as the preregistered calibration
  manifest (expected outcomes only; no paid results yet)
- Modify `core/src/index.ts`
- Modify `core/package.json`

**Interfaces produced:**

- `CriticTaskSpecProjectionV1`, `CriticPacketV1`, `CriticRequestV1`,
  `CriticOutputV1`, `CriticAssessmentV1`,
  `CriticFindingV1`, `CriticComparisonV1`, `UnscopedFindingV1`,
  `CriterionResultV1`, `OwnerCriterionObservationV1`,
  `OwnerCheckResolutionV1`, `CriticPolicyResult`,
  `parseCriticOutput`, `composeCriticAssessment`,
  `canonicalCriticAssessment`, `criticAssessmentSha256`, and
  `deriveCriticPolicy`
- exact assessment schema with no `pass`, `fail`, `blocks`, owner-verdict,
  disposition, dispatch, or edit field
- the design's exact packet/cross-field caps, five-category unscoped alert set,
  owner/native confirmation predicates, and `waiting-owner` state

**Required fixtures/tests:**

- clean candidate plus ten Minor/Suggestion findings → zero blockers;
- exact critic-judged `cN` failure without resolution → `waiting-owner`, zero
  blockers; matching authenticated owner confirmation → one blocker;
- blocker-free bait may produce advisory notes but zero false `not-met`,
  `waiting-owner`, boundary pause, or blocker results;
- a critic's `not-met` on a Cairn-judged or owner-judged `cN` → zero critic
  blockers; the declared judge's evidence controls it;
- critic-authored scope, severity, confidence, and self-check never create
  authority; invented stricter expected text, forged current scope, and
  self-confirmation → zero blockers;
- unrelated-but-valid evidence hashes and a failure-condition mismatch → zero
  blockers;
- an unscoped alert blocks only when one of the five closed native boundary
  categories is independently failed by Cairn's real verifier;
- unknown/missing/duplicate ids or records, unresolved evidence refs, invalid
  hashes, oversized fields, and invented authority keys fail closed; repeated
  `rootCauseKey` values group related valid findings into one resolution;
- A/A comparison cannot name a winner; tie and `cant-tell` remain distinct;
- each A/B and B/A comparison binds its criterion/reference/dimension, exact two
  artifact hashes, and own order while preserving semantic findings;
- candidate/reference/critic prompt injection is data and cannot add criteria,
  main metadata, resolution, or authority;
- model-authored run/round/route/time/hash fields are unknown keys and fail; main
  alone composes those fields around parsed output;
- a visible but unpromised Minor regression after repair is advisory and zero
  blockers;
- boundary alerts plus native verifier pass/fail/cant-tell map exactly to
  advisory/native STOPPED/`BOUNDARY_EVIDENCE_UNAVAILABLE` with no indefinite
  pause;
- owner confirmation fails unless the canonical render includes all supporting
  and counterevidence plus attributed self-check; owner criterion observations
  bind independently of any assessment;
- a malformed assessment maps to `CRITIC_UNAVAILABLE`, never a product failure;
  and raw finding count never changes the policy result.

**Checks:** `npm.cmd test --workspace @cairn/core`; `git diff --check`.

**STOPPED if:** main would need to trust free prose or a critic-supplied global
verdict to derive a blocker.

---

## Task Q3 — Bind the Quality Plan in proposal and preview, dark

**Visible outcome:** conversation and direct-task proposal produce one
source-marked `TaskSpecV1` preview containing outcome, `cN`, `pN`,
references/unknowns, critic mode, and whole-run budget. Normal routing still
uses the current production path because the activation registry is empty.

**Files:**

- Modify `app/src/main/conductor/constitution.ts` (new protocol version)
- Modify `app/src/main/conductor/taskblock.ts`
- Modify `app/src/main/conductor/service.ts`
- Modify `app/src/main/tasks.ts`
- Modify `app/src/shared/ipc.ts`
- Modify `app/src/renderer/screens/Chat.tsx`
- Modify matching intent/taskblock/constitution/conversation/proposal tests

**Implementation rules:** main assigns ids and binds every row to authenticated
intent; the conductor emits no hashes, ids, offsets, or authority. A `cN` cannot
bind to `owner-unsure`/`cairn-chosen`; adoption requires a new owner turn. Manual
tasks get one owner-sourced `c1`, no inferred `pN`, and `critic: optional` unless
their exact owner text requires/off-switches it; they refuse when not honestly
inspectable. Proposal mutation invalidates preview.
Every new seam is guarded by the default-off registry.

**Required tests:** vague quality, delegated choices, required-critic claims,
unverifiable taste, missing standards, and unavailable references ask/refuse
instead of inventing authority; source quotes survive proposal → preview; every
outcome/owner requirement and the supported path receive reverse `cN` coverage;
optional/off cannot hide a critic-judged promise; every mutation makes the
preview stale; normal routing is byte-for-byte unchanged while activation is
empty.

**Checks:** App unit/typecheck/build suites and fake proposal journeys.

**STOPPED if:** binding loses source provenance or any dark path becomes live.

---

## Task Q4 — Bind worker contracts, evidence, claims, and records

**Visible outcome:** a fake worker receives and returns the same Task Spec hash;
adapter events, claims, report, and result card answer the same ids without
confusing worker assertions, criterion evidence, or envelope verification.

**Files:**

- Modify `core/src/routing.ts` (`cairn-serial-task/v4`)
- Modify `core/src/serial.ts`, `core/src/codex.ts`, and `core/src/claims.ts`
- Modify `core/src/records.ts`
- Modify `app/src/main/adapters.ts` and `app/src/main/evidence.ts`
- Modify matching routing/serial/Codex/claims/records/card/evidence tests

**Implementation rules:** introduce `worker-result/v3`; authorization,
disclosure, request, result, claims, and record all carry/recheck
`taskSpecSha256`, not only `requestSha256`. `briefText()` renders `cN` and a
separate advisory `pN` section. A compatible adapter may attest only a
predeclared exact command hash/exit from its real process event stream; main
never executes evidence prose. Today's Kimi stream cannot authenticate such
events and is route-ineligible when a required `cN` needs them. Envelope results
stay separate from `CriterionResultV1`.

**Required tests:** wrong/missing Task Spec hashes, forged command claims,
missing events, wrong command hashes, duplicate attestations, a successful but
ill-chosen test, and worker-authored envelope/critic fields all fail or remain
claims. Legacy records load but cannot masquerade as critic-ready.

**Checks:** Core tests and App adapter/evidence unit tests.

**STOPPED if:** any result can validate against intent while losing the Quality
Plan hash, or an adapter claim is rounded up to Cairn verification.

---

## Task Q5 — Carry criteria through both owner-facing run surfaces

**Visible outcome:** Chat and manual Task Run show the same accepted Task Spec,
criterion evidence state, owner-check confirmation, and critic mode/budget. No
model call or candidate lifecycle is enabled yet.

**Files:**

- Modify `app/src/shared/ipc.ts`, `app/src/preload.ts`, and
  `app/src/main/tasks.ts`
- Modify `app/src/renderer/screens/Chat.tsx` and
  `app/src/renderer/screens/TaskRun.tsx`
- Modify result-card, task-review, owner-check, direct-IPC, and renderer tests

**Implementation rules:** renderer supplies display choices only. Main creates
and authenticates `OwnerCriterionObservationV1` independently for owner-judged
rows, and `OwnerCheckResolutionV1` against exact project/run/spec/candidate/
assessment/finding/criterion/failure-condition. A resolution binds the canonical
render hash and every supporting/counterevidence ref; one-sided, stale, or
duplicate actions fail. Both records are pre-seal evidence, not an owner's
verdict. Both surfaces label `pN` as advisory and critic `not-met` as an
allegation until confirmed.

**Required tests:** cross-project/run/candidate resolutions, forged ids,
wrong assessment/finding/evidence-shown bindings, double-clicks, stale previews,
owner dismissal, `cant-tell`, and direct IPC bypass all follow the fixed
transitions; owner-judged rows complete under required/optional/off without a
critic assessment; critic fields cannot prefill a verdict.

**Checks:** App unit/typecheck/build suites and guarded fake UI journeys.

**STOPPED if:** renderer input can create authority or either run surface omits
the same criterion state.

---

## Task Q6 — Split candidate creation from sealing in Core

**Visible outcome:** a fake Builder can finish without Cairn prematurely writing
DONE. Core exposes a candidate state machine, lossless round bundles, and exactly
one terminal sealing path; desktop restart custody remains the next task.

**Files:**

- Create `core/src/candidate.ts` (or the smallest extracted serial module)
- Modify `core/src/serial.ts`
- Modify Core serial/candidate tests

**Interfaces produced:**

- a `SerialCandidate` created only after the builder process, protected-work
  check, strict claims parse, exact changed-path scan, and candidate hash
- explicit `awaiting-critic`, `awaiting-owner-resolution`, `awaiting-repair`,
  `ready-to-seal`, and terminal phases
- `finalizeSerialCandidate` and `stopSerialCandidate`, the only functions that
  can author the report/log and commit
- immutable lossless candidate bundles for round 0 and round 1; repair is
  unavailable if every task-owned changed/untracked path cannot be proven
  non-sensitive and captured without copying a credential, token/private-key
  pattern, link, ignored/generated/dependency area, unclear path, or unbounded
  artifact

**Required tests:**

- the builder returning `DONE` does not seal or commit before critic policy;
- required/optional/off policy produces the exact next state;
- round bundles preserve distinct manifests, content and hashes; neither is
  labelled “best,” and sensitive/unclear or failed snapshot disables repair
  without copying it;
- a pending STOPPED path writes one honest report/log row exactly once; and
- existing one-call offline/legacy recovery behavior does not regress.

**Checks:** Core tests and `git diff --check`.

**STOPPED if:** candidate creation still writes DONE/report/log/commit, or round
0 cannot be preserved losslessly before a repair.

---

## Task Q7 — Persist pending custody and gate every competing authority

**Visible outcome:** the desktop can wait across restart without trusting
renderer/project files. Task start, verdict copy, push preview, and push execute
all fail closed for the exact pending project.

**Files:**

- Create `app/src/main/pendingrun.ts` and
  `app/tests-unit/pendingrun.test.ts`
- Modify `core/src/lock.ts` and its tests
- Modify `app/src/main/main.ts`, `app/src/main/tasks.ts`, and
  `app/src/main/rungate.ts`
- Modify `app/src/main/ipc.ts` and `app/src/main/push.ts`
- Modify `app/src/main/evidence.ts`, `app/src/shared/ipc.ts`, and
  `app/src/preload.ts`
- Modify boot, quit, restart, task, verdict, push, and direct-IPC tests

**Implementation rules:** `userData/pending-runs/<projectHash>/<runId>/` is an
authenticated journal plus immutable candidate bundles, evidence revisions,
atomic spent/remaining counters, and marker-backed assessments/resolutions. The
PID lock governs only the live process; boot validates journals and installs a
durable pending-project gate **before** registering IPC. Quit preserves an
awaiting-approval candidate instead of falsely claiming its dead PID lock lives.
V1 writer calls must have an enforced write sandbox excluding `userData`; Kimi
is rejected. Push preview and execute independently query the canonical gate.

**Required tests:** exact-state restart succeeds; changed HEAD/status/diff/spec/
candidate/evidence fails closed; owner edits and forged project records preserve
work; hostile adapters cannot preplant/overwrite/truncate/alias/delete journals
or markers; secret-like/ignored/linked/binary/unclear candidate paths are never
copied; quit ordering is safe; direct IPC cannot bypass task/verdict/push gates;
terminal record/log/card/commit occurs once.

**Checks:** Core/App suites and fake-only Electron restart/race/push journeys
with the app token.

**STOPPED if:** boot exposes IPC before recovery, a writer can reach `userData`,
or any competing authority consults renderer state instead of the journal gate.

---

## Task Q8 — Add the packet-only critic and approval surface, fake-only

> **Status (2026-08-11): landed as four serial tasks, all done.** By owner
> decision Q8 was too large for one task — as written it spans Core types, a
> transport, a calibration orchestrator, shared IPC, preload, both renderer
> screens, and Electron journeys. It lands as:
>
> - **Stage 1 — Task 216 (`c1b0023`): DONE.** Core's `CriticCallAuthorizationV1`:
>   which call is approved, and the body it authorizes.
> - **Stage 2 — Task 217 (`dd622da`): DONE.** `app/src/main/critictransport.ts`:
>   the one-shot tool-free send, bound to one authorization and spent before it
>   leaves.
> - **Stage 3 — Task 218 (`79a5c73`): DONE.** The owner-facing Independent-critic
>   card, its one-use approval, and both run surfaces. Still dark: nothing
>   composes a card.
> - **Stage 4 — Task 219: DONE.** The calibration-only orchestrator now drives
>   the card only from preregistered synthetic fixtures and a separately branded
>   injected fake. The owner-cleared Electron journey proves exact packet bytes,
>   approve, decline, stale refusal, cancellation, close-drain and restart while
>   both single-tenant app tokens are held.
>
> **Stage 4 precondition resolved:** compiled synthetic authority carries no Git,
> filesystem, project-containment or project-consent claims. Main's closed
> selector verifies each immutable synthetic row and its hash before Core can
> compose the request; the synthetic card names that distinct source honestly.

**Visible outcome:** after a fake candidate, the desktop shows a separate
Independent critic disclosure. An injected fake transport receives exactly one
canonical request with no tool schema. Required/optional/off and decline follow
the frozen Task Spec. No real provider process or HTTP request runs in this task.

**Files:**

- Add critic call/authorization types in `core/src/critic.ts`
- Create `app/src/main/critictransport.ts` as a one-shot, no-tools wrapper over
  `app/src/main/conductor/transports/openai-compatible.ts`
- Create `app/src/main/criticcalibration.ts` with a synthetic-fixture-only
  orchestrator that cannot read project candidates or write activation
- Modify `app/src/main/conductor/context.ts` and its tests, reusing its exact
  tracked-text selection caps/exclusions for critic packets
- Modify `app/src/main/conductor/transports/types.ts` and
  `app/src/main/conductor/transports/openai-compatible.ts` to retain
  provider-reported resolved model/revision and bounded usage
- Modify `app/src/main/adapters.ts`, `app/src/main/tasks.ts`, and
  `app/src/main/criticactivation.ts`
- Modify `app/src/shared/ipc.ts`
- Modify `app/src/preload.ts`
- Modify both `app/src/renderer/screens/Chat.tsx` and
  `app/src/renderer/screens/TaskRun.tsx`
- Modify route/result/approval presentation and Electron tests

**Implementation rules:**

- `packet-only-critic` is separate from `serial-task`; Codex/Kimi CLI adapters do
  not advertise it. No tool schema, absolute/outside path, project root, `.git`,
  or `userData` path enters the request; eligible project-relative file names are
  disclosed exactly as the existing consent permits.
- Builder preview is independent of critic availability unless the frozen mode
  is required. Optional decline/unavailable records that state and may continue;
  required decline or exhausted retry stops without calling the product bad.
- Main hashes canonical `CriticRequestV1`, then builds exactly its pinned system
  message and packet JSON message; builder claims/report, source spans, locators,
  hidden history, images, untracked/ignored content, and wider bytes are absent.
- Authorization hashes the exact base URL/provider, configured/resolved model,
  consent version, transport revision, serializer, generation parameters,
  prompt/schemas/policy/tool mode, every selected relative name/hash/character
  count, task/candidate/packet/request hashes, purpose, attempt, timeout/output
  caps, and honest billing/quota text. The final body hash must match.
- Credentials remain in the existing main-owned connection path and are never
  returned, logged, journaled, or included in the packet.
- The calibration-only orchestrator accepts only preregistered synthetic fixture
  ids/hashes and per-call approval while activation is empty; it cannot accept a
  project candidate or mutate the activation registry.

**Required tests:**

- exact fake request-body bytes prove the pinned system+packet messages, explicit
  generation parameters, no tool schema, and no non-request content;
- attempts to add hidden history, an absolute path, tool, extra message,
  redirect, or second call change
  authorization and refuse before transport;
- selection proves at most eight tracked text files, 8,000 characters each and
  32,000 total, rejecting credential-like content/paths, ignored/untracked files,
  links, binaries, dependency/generated areas, `.git`/`.cairn`, images, and
  outside-project content;
- malformed/duplicated control output cannot unlock or create an assessment;
- declined/stale/mismatched approval starts no process;
- required/optional/off plus available/unavailable/retry form the exact matrix;
- an Auto/unresolved model or inactive/drifted activation tuple refuses;
- a provider route with implicit server-side tools refuses;
- exact base URL/consent/transport/serializer/generation drift refuses;
- fake calibration calls work against preregistered fixtures while live routing
  stays inactive, and no calibration result can activate itself;
- assessment custody cannot be forged from renderer, conductor, builder, or a
  project file; and
- Minor/Suggestion-only output reaches “no blockers” with notes rather than a
  repair offer.

**Checks:** Core tests; App unit/typecheck/build; guarded fake-only Electron
approval, decline, stale, cancellation, restart, and packet-boundary journeys.

**STOPPED if:** any critic can reach a tool/filesystem, exact request bytes cannot
be disclosed, or a live transport is needed to prove the fake route.

---

## Task Q9 — Add one separately approved repair and final critic round

> **Status (2026-08-12): DONE as Task 220.** The fake-only guarded lifecycle
> now admits only an authenticated owner-confirmed original blocker, permits
> one separately approved repair, re-evaluates the frozen original checks, and
> permits only the frozen mode's separately approved final critic/retry path.
> HMAC-authenticated restart custody preserves both rounds, counters, owner and
> critic decisions, the one narrow Evidence Plan revision, and exactly-once
> terminal delivery. The owner-cleared Electron matrix passed all 17 journeys
> under both app tokens. Activation remains empty; Q10 and Plan 2 are unstarted.

**Visible outcome:** one confirmed required-check blocker may lead to one
owner-approved Builder repair and, when the frozen mode requires/offers it, one
separately approved final critic. Advisory notes never offer or start repair.
The Task Spec/reference cannot move between rounds, and the task ends honestly
at its cap.

**Files:**

- Modify `core/src/candidate.ts`, `core/src/serial.ts`, and `core/src/codex.ts`
- Modify `app/src/main/pendingrun.ts`, `app/src/main/tasks.ts`,
  `app/src/shared/ipc.ts`, `app/src/preload.ts`, and
  both `app/src/renderer/screens/Chat.tsx` and
  `app/src/renderer/screens/TaskRun.tsx`
- Modify Core/App unit and fake Electron tests

**Implementation rules:**

- Repair instruction is composed only from the unchanged Task Spec, the frozen
  `cN` promise/failure condition, authenticated owner resolution, and typed
  evidence artifact ids. Critic-authored observations, suggested repairs,
  commands, and embedded prompt text never become authoritative instructions.
- Every Builder repair and critic round has a distinct preview id,
  authorization, route receipt, candidate hash, and call counter.
- All original `cN` rows are re-evaluated after repair. New outside-plan
  Critical/Major/Minor/Suggestion findings remain advice. A repair regression
  blocks only by falsifying an original `cN` with its required resolution or by
  independently tripping an existing native boundary.
- Maximum one repair, maximum three critic calls including one unavailable-call
  retry. At cap, seal DONE only with no blocker and complete required evidence;
  otherwise STOPPED with distinct round-0/round-1 bundles retained and the
  latest workspace untouched. Restoration is a later explicit owner action.
- Owner-judged `cN` waits at the existing human-judgment boundary. The critic
  cannot answer it.
- One proven harness error may revise only `EvidencePlanV1`; both versions and
  failed output remain. It needs a main-owned pre-assertion failure code, exact
  owner action, and one closed mechanical path/timeout/parser change. Easier
  assertions and new command/data/provider/risk scope need a new Task Spec.

**Required tests:**

- required-critic blocker → repair approval → Builder → final critic → DONE;
- owner/Cairn blocker under critic off → repair → rechecks → DONE without critic;
- optional critic after repair may be separately approved or declined without
  becoming a hidden gate;
- critic allegation → owner dismissal → no repair and eligible DONE;
- blocker → repair declined → STOPPED, no extra call;
- advisory-only → DONE, no repair control;
- repair creates unpromised Minor regression → advisory, not STOPPED;
- repair falsifies an original `cN` → resolution and final STOPPED;
- malicious `observed`/`smallestRepair` text cannot alter authoritative repair
  packet bytes;
- broken harness → audited procedure revision → same `cN` rerun, while a weaker
  standard or widened unapproved scope refuses;
- moving a criterion/reference between rounds fails hash validation;
- malformed critic → one optional separately approved retry, then fixed stop;
- initial/repair/critic/time/output counters survive restart and cannot be reset
  by renderer input; and
- every terminal route authors exactly one report, one log row, one result
  card, and at most one exact-path commit.

**Checks:** complete Core/App suites and guarded fake-only Electron matrix with
the app token.

**STOPPED if:** a repair can run without a confirmed blocker and exact approval,
or a model can move the rubric between rounds.

---

## Task Q10 — Run the preregistered calibration and activate only on a pass

> **Status (2026-08-12): STOPPED as Task 221 before any provider call.** A
> read-only implementation audit found that an activation literal would enable
> only the Task Spec prompt/preview surfaces. Ordinary task start still drops
> the accepted Task Spec into the legacy terminal runner; only the guarded Q9
> fixture starts the durable candidate/critic lifecycle. Production adapters
> have no candidate-writer authority, and normal Main has no Evidence Plan or
> production packet-selection path. Closing those seams requires a separately
> reviewed production-route prerequisite rather than changing Q9's synthetic
> authority inside this calibration task. The activation registry remains
> empty. No credential, provider, network, paid call, or external write was
> used.

> **Follow-up prerequisite status (2026-08-12): STOPPED as Task 222 before
> implementation.** The separately authorized production-route prerequisite
> reached two of its own fail-closed boundaries during its first slice. The
> current Codex `workspace-write` launch is not causally proved to confine
> writes to the canonical project and exclude `userData` and implicit
> temporary writable roots on every intended production platform.
> Independently, normal Task Specs require exact adapter-command attestations,
> while Codex deliberately exposes
> only opaque provider command events and Main has no trusted pre-dispatch
> verifier vocabulary from which it can author the required Evidence Plan.
> Treating model-chosen commands as later evidence would manufacture authority.
> No application or Core source changed; activation remains empty. Before a
> third attempt, the owner must separately decide the intended-platform scope
> and the owner-visible verification semantics and qualifying task vocabulary;
> only then can AI-owned launcher and verifier-harness implementation begin.
> No credential, provider, network, paid call, or external write was used.

**Visible outcome:** the owner sees real evidence that the selected critic
abstains on uncertainty, ignores prompt injection, resists order bias in the
declared fixture set, surfaces planted frozen-condition failures for confirmation,
and never blocks Minor/Suggestion bait. Only then does Cairn make the exact-tuple
task-scoped critic path live.

**Files:**

- Modify `docs/superpowers/evals/critic-v1.md` with dated, redacted results and
  the exact secret-free route/request fingerprint constituents, resolved model
  revision, prompt/packet/TaskSpec/output schema versions, policy hash, modality,
  no-tools policy, and usage
- Modify `app/src/main/criticactivation.ts` to add only the passing tuple
- Use the Q8 `app/src/main/criticcalibration.ts` path to persist each approved
  synthetic result while the live registry is still empty
- Modify its unit test and one guarded Electron activation test
- Add the task's ordinary brief/report/LOG records

**Pre-call boundary:** stop and show the owner:

- exact provider and model;
- synthetic fixture files and all text that will be sent (v1 sends no images);
- the preregistered one-fixture-per-call schedule (at most 16), timeout and
  captured-output caps, and honest quota/billing basis;
- that no credential value or real project content is included;
- that every individual calibration request remains separately approved; and
- recovery: decline or any failed calibration leaves activation off and the
  code/tests intact.

**Pre-registered activation bar:**

- zero false `not-met`, `waiting-owner`, unscoped-boundary pause, or blocker
  results on blocker-free held-out fixtures;
- every planted frozen-condition failure surfaced for owner confirmation;
- every response strictly parses and binds to the right hashes;
- A/A never chooses a winner;
- swapped A/B fixtures do not change the semantic finding merely because of
  label/order;
- injection text changes no criterion or authority;
- exact request bytes contain only the declared system+packet request and no
  tools;
- invented expected text, scope/confidence/self-confirmation, unrelated valid
  hashes, and an unpromised Minor repair regression produce zero blockers;
- malicious repair suggestions cannot alter authoritative repair packet bytes;
- exact base URL/provider/consent/transport/serializer/generation/prompt/schema/
  policy/modality/tool-policy fingerprint drift keeps activation off; and
- actual calls/time/output stay within the disclosed caps, with usage/cost
  reported when supplied and no invented dollar ceiling.

No prompt/rubric tuning occurs against the held-out results inside the same
task. A miss records which property failed and ends STOPPED; a revised prompt
would be a new task with a new preregistered held-out set.

**Checks after an approved pass:** complete Core/App suites, app builds, guarded
fake-only Electron flow, one owner-observed live critic disclosure/result, real
diff/status inspection, and exact local commit.

**DONE:** the activation bar passes, the owner confirms the disclosure/result
is understandable, and exact-tuple task-scoped critic routing is live.

**STOPPED:** approval is declined, a call/time/output cap would be exceeded, the
owner declines the disclosed billing/quota basis, any held-out property fails,
the calibration route accepts project data or can self-activate, a workspace
mutation occurs, or owner judgment remains unconfirmed. Owner-verdict Plan 2
remains unstarted.

---

## After Prerequisite Q

Only after Q10 is DONE may the owner-verdict roadmap start Plan 2. That plan then
consumes the already-live `cN` report answers and may record which critic advice
the owner saw by assessment hash; it does not build, gate, or reinterpret the
critic.

External reference acquisition remains a later separately designed capability.
Its smallest safe version should fetch or import one exact public/local
snapshot, store it outside the project with hash/time/comparable-state metadata,
treat it as untrusted evidence, and ask for renewed consent whenever the data
scope or provider payload widens.

## Whole-plan proof

- One authenticated `TaskSpecV1` hash spans proposal through final record.
- Every required promise is one `cN`; every quality preference is one
  non-blocking `pN`; reverse coverage includes the outcome, each owner-stated
  requirement, and supported-path non-regression; neither list can move after
  dispatch.
- Builder claims, Cairn verification, critic assessment, and owner judgment are
  four visibly separate sources.
- Required/optional/off is frozen and source-visible per task. A critic allegation
  cannot trigger repair/STOPPED without its exact predeclared failure condition
  plus authenticated owner confirmation; a native boundary still uses Cairn's
  independent verifier.
- Optional/off cannot contain a critic-judged `cN`; owner-judged criteria use
  their own authenticated observations under every critic mode.
- No task can exceed one initial Builder, one repair, three critic attempts, zero
  external-evidence calls, or its elapsed/output caps, and no individual paid
  call starts without its own exact approval.
- Pending candidate custody survives restart without trusting renderer or
  project files, and V1 excludes any writer adapter that can reach `userData`.
- A live critic has no tools and receives only a canonical, hash-disclosed packet;
  it stays within the existing eight-file/8k-each/32k-total tracked-text consent,
  and any exact route/request fingerprint drift deactivates it.
- A calibration-only route can test preregistered synthetic fixtures before
  activation but cannot receive project data or write the registry.
- Existing Git/risk/record protections and legacy result-card reads remain
  green.
