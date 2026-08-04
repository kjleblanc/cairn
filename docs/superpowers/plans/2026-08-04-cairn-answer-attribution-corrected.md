# Cairn Answer Attribution (Corrected) — Implementation Plan

**Task:** 174

**Base:** `98e2f8c19053c653d6ec3a6d0e4d6561e586a0da`

**Supersedes:** `2026-08-04-cairn-answer-attribution.md`

**Product authority:** Decisions 1, 5, and 6 in
`docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md`

## Why this plan was corrected

Three independent reviews found concrete defects in the first draft:

- the model could supply a plausible but invented `ownerText` and main had no
  deterministic link back to words the owner actually sent;
- non-requirement context was forced under one of the three requirement-source
  labels;
- the 500-character quotation cap regressed today’s 2,000-character details
  channel and the manual Task screen lost outer whitespace;
- **Send to dispatch** was called acceptance even though the owner could still
  cancel at the real confirmation panel;
- action fences were stripped without preserving the question/risk/proposal
  context needed to understand a reply or retry;
- manual preview/run, concurrent runs, delayed route previews, multiple risks,
  durable report variants, and the shipped CLI were not fully bound;
- focus/settled announcements were incomplete; and
- the plan promised complete Kimi argv evidence from a Windows test shim that
  intentionally cannot expose it.

The corrections below are implementation details inside the approved design.
They do not require a new owner decision and no product source was changed by
Task 174.

## Visible outcome and honest evidence claim

An owner can answer a Cairn choice question with **I’m not sure — you decide**.
Cairn either makes a choice it is allowed to make and names it briefly, or says
plainly that the requested fact/approval cannot be delegated. A tentative
answer is acknowledged in the same settled reply and remains easy to correct.

Before any task starts, every accepted outcome and requirement is visibly
marked **You said so**, **You weren’t sure**, or **Cairn chose**. The exact list
is repeated on the final dispatch panel. Main binds that list to the selected
run, Core task contract, generated brief, worker authorization and prompt,
durable report, authenticated result card, reload, conductor commentary, and
read-only phone projection.

The envelope proves only what code can prove:

1. an owner quotation is an exact slice of a main-authenticated owner turn (or
   the exact raw manual/CLI input);
2. Cairn showed a particular interpretation and source label in the current
   main-held proposal and final preview; and
3. the owner’s final **Start…**/**Run offline demonstration** press successfully
   consumed that exact preview.

Code cannot prove whether the owner felt certain or whether a real model will
classify every hedge correctly. The label is a correctable interpretation,
not a verified result fact. Fake tests prove the mechanism and custody;
real-model compliance remains the existing owner-authorized paid evaluation.

## Decision 6, made executable

Internal source codes map to fixed visible wording:

| Protocol value | Visible label | Meaning |
|---|---|---|
| `owner-stated` | **You said so** | The exact owner quotation is being treated as firm. |
| `owner-unsure` | **You weren’t sure** | The exact owner quotation is a starting point, not a rule. |
| `cairn-chosen` | **Cairn chose** | Cairn supplied this choice; it is not attributed to the owner. |

The constitution’s rules are precise:

- `300 milliseconds exactly` is firm owner wording.
- `maybe 300?` is a tentative candidate. It is not silently hardened and does
  not, by itself, authorize a different invented value.
- **I’m not sure — you decide** and `whatever you reckon` delegate a genuine
  product/design choice. Cairn acknowledges the handoff and names the choice in
  the same reply, without exposing reasoning.
- If an owner supplies a tentative candidate and delegates judgment, the
  candidate remains a separate **You weren’t sure** row and Cairn’s final value
  is a **Cairn chose** row. Neither overwrites the other.
- A correction immediately retires the old action and preview. A firm
  correction becomes **You said so** in a new proposal.
- The final Start/Run press is explicit acceptance of every visible **Cairn
  chose** row. A model cannot dispatch its choice by labeling it.
- Delegation never turns an unknowable fact, credential, consent, concrete-risk
  approval, legal/safety judgment, payment, destructive/public action, or other
  owner-only decision into an AI choice. Those remain native owner gates. If
  the defer answer reaches a question Cairn cannot safely decide, Cairn says so
  and emits no chosen requirement.

Every owner-answer-seeking conductor choice uses the structured question card.
Concrete-risk and paid-call approvals are not conductor choice questions and
keep their existing dedicated controls; they never receive a “you decide”
shortcut. The manual eval fails a body that asks a delegable task choice only
in prose, but the parser cannot semantically detect every unstructured question
on its own.

## Define one requirement without labelling ordinary notes

One attributed row is either:

- the single high-level visible outcome; or
- one atomic owner-visible must-have, value, or Cairn-selected default that
  materially constrains the result.

Internal algorithms, libraries, filenames, and incidental worker choices do
not become rows unless they are themselves an owner-visible constraint. A
single owner source slice may support multiple truly separate requirements;
the model may not split a long quotation merely to evade bounds.

Non-mandatory context is different. A sentence such as “Renaming may break
bookmarked links” is not **Cairn chose**, and the owner’s decision to set the
risk aside did not author that sentence. Context therefore stays inside the
one canonical intent and digest, is shown before dispatch, and reaches the
brief/prompt/report under **Context kept with the task — not a requirement**.
It does not receive a source tag and does not appear in the result card’s
**What you asked for** list. Unresolved risks remain outside the intent.

## Candidate, bound, and accepted shapes

The conductor emits only a candidate. Main converts it to a source-bound
intent. “Accepted” is reserved for the snapshot atomically consumed by the
final Start/Run press.

Add pure types and hostile-input validation in `core/src/intent.ts`, exported
from `core/src/index.ts`:

```ts
export type RequirementSource =
  | "owner-stated"
  | "owner-unsure"
  | "cairn-chosen";

export type OwnerSourceSpan = {
  kind: "conversation" | "direct";
  inputId: string;
  start: number;
  end: number;
  text: string;
};

export type AttributedRequirement =
  | {
      source: "owner-stated" | "owner-unsure";
      text: string;
      owner: OwnerSourceSpan;
    }
  | {
      source: "cairn-chosen";
      text: string;
      owner: null;
    };

export type TaskIntent = {
  version: "cairn-task-intent/v1";
  outcome: AttributedRequirement;
  requirements: readonly AttributedRequirement[];
  context: readonly string[];
};

export type TaskRequestRow = {
  source: RequirementSource;
  text: string;
  ownerText: string | null;
};

export type TaskRequestView = {
  outcome: TaskRequestRow;
  requirements: readonly TaskRequestRow[];
};
```

For a conversation source, `inputId` is a main-issued owner-turn UUID and the
offsets are JavaScript UTF-16 code-unit offsets into that authenticated turn.
For direct App/CLI input, main/CLI creates the input ID and the span points into
the raw input accepted at that boundary. `text` inside the span is always
re-derived from `source.slice(start, end)`, never copied from model output.

The fenced candidate has the same outcome/requirements/context organization,
but owner-sourced entries carry `ownerQuote` rather than IDs or offsets. The
model never sees or emits source IDs. Main matches each quote byte-for-byte to
an authenticated owner turn included in the exact provider history for that
reply, chooses the latest matching turn and first matching span
deterministically, and builds `OwnerSourceSpan` itself. No match means no
actionable task card and a fixed main-authored explanation; it is never
silently downgraded or relabelled. Cairn-chosen entries require
`ownerQuote: null`.

The source quotation governs if a **You said so** interpretation conflicts
with it. The proposal and confirmation display both; the brief and worker
instruction explicitly say the exact source span is authoritative. For **You
weren’t sure**, the exact span is evidence of the tentative wording, not a
fixed implementation value.

The validator enforces:

- exact keys and version; one outcome and at most eight requirements;
- at most three context strings and 1,000 context characters total;
- non-empty interpreted `text`, at most 300 characters for the outcome and 500
  for each requirement;
- each owner source slice is at most 2,000 characters, preserving today’s
  maximum details capacity; 2,001 is rejected rather than truncated;
- at most 6,000 characters across interpretations, source text, and context;
- candidate fence at most 12,000 characters so one 2,000-character exact
  quotation plus JSON/interpretation duplication remains representable;
- no duplicate `(source, text, source-span)` row;
- valid integers and in-bounds offsets whose re-derived slice exactly equals
  stored span text;
- no NUL, unpaired surrogate, or Unicode bidi override/isolate that could make
  visible text disagree with stored text; and
- no silent chunking, omission, normalization, or default. An over-bound
  candidate is dropped whole with a fixed “narrow or split the task” message.

Public Core validation accepts only ordinary or null-prototype data objects and
ordinary arrays with enumerable own data properties. It rejects symbols,
accessors, custom prototypes, non-enumerable fields, and proxies before reading
values (`node:util.types.isProxy` is the proxy check). Descriptor-based
inspection never invokes a getter. After validation, Core deep-copies and
freezes every object, array, source span, and string-bearing structure.

Canonical JSON uses fixed key order and includes source kind, ID, offsets,
exact source text, interpretation, ordering, and context. A change to any one
changes `requestSha256`.

## Authenticate owner turns without trusting `.cairn`

Conversation files are inside a worker-writable project. A well-shaped owner
line is not enough to prove the owner sent it. Add
`app/src/main/conductor/turnauth.ts`, using the same demonstrated boundary as
`cardauth.ts`: before appending a new owner turn, main writes a digest marker
under Electron `userData`, outside the selected project. The marker binds
project, conversation, owner-turn UUID, timestamp, exact raw text, and inert
reply context. There is no secret for a read-capable worker to steal; the
worker cannot write the marker.

`app/src/main/main.ts` configures the marker root. `store.ts` gains dedicated
owner-turn append/read helpers:

- renderer/main rejects a whitespace-only message but preserves the complete
  accepted string, including outer spaces and line breaks;
- marker write happens before conversation append and before a provider call;
  an orphan marker after an append failure is harmless;
- source binding reads only marker-authenticated owner turns, de-duplicates a
  copied genuine line by its turn UUID, and requires it to have been in the
  exact history snapshot sent for this reply;
- ordinary legacy/edited/unmarked turns remain readable conversation history
  but cannot become **You said so**/**You weren’t sure** provenance; the owner
  must restate a needed legacy detail; and
- marker failure refuses the send before persistence or provider cost.

This proves quotation origin, not semantic certainty. The final visible review
still owns the classification.

## Preserve an action’s meaning while making it inert

Use two model fences, exactly one per reply:

````text
```cairn-question
{"question":"Which settling speed should Cairn use?"}
```
````

````text
```cairn-task
{"intent":{"version":"cairn-task-intent/v1","outcome":{...},"requirements":[],"context":[]},"risks":[]}
```
````

`app/src/main/conductor/taskblock.ts` parses both candidates with exact keys
and bounds, rejects duplicates/both-at-once, and strips all control fences from
visible prose. A task candidate may contain up to three risks but no question.
Commentary may create neither action.

Main wraps a valid candidate in one current action per project:

```ts
type ConductorAction =
  | {
      kind: "question";
      actionId: string;
      conversationId: string;
      question: string;
    }
  | {
      kind: "task";
      actionId: string;
      conversationId: string;
      request: TaskRequestView;
      context: readonly string[];
      risks: readonly { riskId: string; text: string }[];
    };
```

Main’s internal current-task action retains the bound `TaskIntent`; the shared
renderer action is its output-only request/context projection. Main issues
every action/risk ID. `ConductorDelta.action` and `conductorAction()` expose
that trusted projection for renderer remount; no action is restored from
`.cairn` after full app relaunch.

The validated question sentence does remain readable after relaunch. Store it
as passive Cairn-turn question text (or append it once to visible reply prose),
and include it in provider history. A relaunch test proves the sentence remains
and no stale QuestionCard/control reappears.

When the owner answers, defers, sets aside one risk, or types a correction while
an action is current, main validates the exact action ID and, for a risk, exact
risk ID. Before retiring it, main attaches a bounded inert snapshot to the new
authenticated owner turn. It contains the question, targeted risk, or source-
marked proposal the owner is answering, but no live IDs or dispatch authority.
`streamTurn()` supplies it as explicitly non-authoritative context to the same
provider. Because the marker-authenticated snapshot persists with the owner
turn, a reply containing only `300`, **I’m not sure — you decide**, `set that
risk aside`, or `No, use 400` remains intelligible after a provider failure and
ordinary retry. A worker-forged snapshot is not supplied as trusted context.

Every successfully appended owner turn retires the current action and any
pending dispatch preview for that project. A malformed provider reply, parse
failure, stop, or provider error never resurrects it. Wrong-risk, double-use,
stale-action, and wrong-conversation replies fail before append/provider call.

## Main-owned preview and the one acceptance point

The task-card control becomes **Review dispatch**. It does not accept or consume
the proposal. Route preview returns a main-issued one-time preview for both chat
and manual input:

```ts
type TaskRouteSource =
  | { kind: "proposal"; proposalId: string; conversationId: string }
  | { kind: "manual"; rawOutcome: string };

type TaskRouteRequest = {
  dir: string;
  source: TaskRouteSource;
  adapterId?: string;
};

type TaskRoutePreview = {
  previewId: string;
  request: TaskRequestView;
  context: readonly string[];
  route: RouteResult;
  disclosure?: WorkerDisclosure;
};

type TaskRunRequest = {
  dir: string;
  previewId: string;
  realCallConfirmed?: boolean;
  disclosure?: WorkerDisclosure;
};
```

`TaskRequestView` is a pure output-only projection of outcome/requirements with
visible source, interpretation, and exact owner quotation. It omits source IDs,
offsets, and context. It is never accepted as input and therefore cannot become
a second authority. The preview also returns context separately for the final
panel.

`task:route` in `app/src/main/tasks.ts`:

1. For a proposal, capture the exact current main action with zero unresolved
   risks. For manual input, reject only if `rawOutcome.trim()` is empty, retain
   the raw string in a direct source span, and use a trimmed plain
   interpretation for routing.
2. Give every route attempt a generation. Detect adapters and derive the
   disclosure from the frozen intent.
3. After the asynchronous detection returns, verify that its generation and
   proposal are still current. A correction/replacement/cancelled route cannot
   publish a late preview.
4. Store one pending preview in main, including the selected adapter ID and
   exact expected disclosure, invalidate the previous preview, and return its
   ID plus output-only view. The renderer never rebuilds the request.

Cancel calls a bounded `task:preview-discard` IPC. Any owner turn, replacement
action, newer route, relaunch, or successful run also invalidates the preview.

The final existing **Start one real … call** or **Run offline demonstration**
press is the only acceptance point. `task:run` carries only `previewId` and the
existing disclosure confirmation; the adapter comes from the main-held preview
and cannot be switched at run time:

1. Acquire the per-project start/run gate before the first asynchronous recheck
   so two manual or proposal runs cannot both pass detection.
2. Re-detect the preview’s exact adapter/worker identity and re-derive the
   complete disclosure from the main-held intent. A missing/different adapter
   or real-call mismatch refuses before work (an authorization mismatch leaves
   the preview reviewable); connection-required/no-route discards the stale
   preview but leaves the proposal or manual editor available.
3. Atomically consume the still-current preview and, for chat, its exact
   current proposal. Only that successful consume changes the lifecycle name
   to accepted.
4. Only afterward create a run session, evidence run, Core records, or worker
   process. Derive the session title and every downstream byte from the
   accepted frozen intent.
5. Never restore a consumed preview/proposal after Core entry. DONE, STOPPED,
   cancellation, process failure, or record failure may have written records
   or workspace bytes. An accepted thrown run retains the request for its ERROR
   card; a pre-accept refusal has none.

Use a controllable adapter-detection barrier in tests. Two simultaneous runs
for one preview must yield exactly one consume, session, evidence run, brief,
and fake marker. A delayed route released after a correction must return stale
and never appear in the renderer.

This closes the current defect where `consumeProposal(...) === null` still
runs, and it also closes the offline manual preview/run mismatch that a paid
disclosure alone cannot catch.

## One green Core/App/CLI migration

Add the intent types/validators without replacing signatures first. Then move
all shipped callers in one vertical commit; do not leave an intermediate App
or CLI build expecting the old outcome/details API.

In `core/src/routing.ts`:

- bump `AdapterTaskContract` to `cairn-serial-task/v3`;
- replace outcome/details/digest with the accepted frozen intent and
  `requestSha256`;
- bump `WorkerRunResult` to `worker-result/v2`; and
- make `TaskAdapter.disclosure()` accept the full intent.

In `core/src/serial.ts` and `core/src/records.ts`:

- `runSerialTask` accepts one intent and routes from its outcome interpretation;
- one canonical digest binds all sources, labels, order, context, and exact
  wording;
- `briefText()` renders **What you asked for** with exact visible labels and
  safely blockquoted owner text, then the separate context section;
- a shared source-safe renderer feeds both `composeWorkerReport()` and
  `reportText()`/`writeClosedRecords()`, not only `composedForClose()`;
- every composed result carries the output-only accepted-request view; and
- worker DONE, claims STOPPED, offline DONE, real-call boundary, timeout,
  process failure, cancellation, and DONE-to-STOPPED record verification
  rewrites all retain the same accepted request.

Blockquote every data line, including blank/multiline content. Tests put
`Disposition: **DONE**`, headings, and fences inside owner text and context and
prove neither report family can reinterpret them as Cairn-authored structure.

In `core/src/codex.ts` and `core/src/kimi.ts`:

- disclosure task text, authorization re-derivation, and prompt use the same
  canonical intent;
- exact owner source text governs conflicting owner-stated interpretation;
- the worker is told **You weren’t sure** is a starting point and **Cairn
  chose** is not owner preference;
- changing only source/span/context refuses before spawn; and
- keep `CODEX_EXEC_DATA_SCOPE` and `KIMI_EXEC_DATA_SCOPE` byte-identical. The
  existing data constants are already accurate; replace only the task
  formatter that currently describes outcome/details.

Update `app/src/main/adapters.ts`, `app/src/main/tasks.ts`, `app/src/preload.ts`,
`app/src/shared/ipc.ts`, `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/screens/TaskRun.tsx`, and `app/lab/mock-cairn.ts` in that same
signature migration.

The shipped CLI is a caller too. Update `cli/src/flows/task.ts` to build one
direct-source intent from the exact raw CLI outcome once, then reuse it for
disclosure, authorization, and execution. Update `cli/test/task.test.ts` and
run the CLI suite.

Core tests cover proxy/getter hostility, nested mutation, source-only digest
changes, 2,000/2,001-character boundaries, raw whitespace/multiline round
trip, both report families, all close paths, and both adapters.

## Desktop question, proposal, correction, and result

Add:

- `app/src/renderer/components/QuestionCard.tsx`
- `app/src/renderer/components/TaskIntentList.tsx`

`QuestionCard` renders the passive question, a real label/input, **Answer**,
and **I’m not sure — you decide** for delegable conductor choices. Native
consent/risk/paid-call gates remain separate and owner-only. Enter submits the
raw answer without trimming it; a whitespace-only answer remains disabled.

`TaskIntentList` is reused in the task proposal, final confirmation, and result
card. It uses a semantic heading/list, visible source text on every requirement,
the plain interpretation, and exact owner quotation. Color is supplemental.
Context has its own untagged heading on proposal/confirmation only.

`TaskCard` has no local resolved-answer state. Questions are standalone;
multiple risks carry main IDs; any response removes the whole old action and
waits for a new proposal. **Review dispatch** is disabled while streaming,
while a risk remains, or when action identity is stale.

The final dispatch panel repeats only main’s preview, says plainly that Start
accepts the displayed **Cairn chose** rows, and keeps the existing provider,
model, project, data, quota, and checkbox gate. Cancel discards the preview.
Typing a correction while it is open discards it before sending.

In `ResultCardView`, order remains:

1. Task 173 checked pictures;
2. Cairn-verified facts;
3. worker claims;
4. **What you asked for**; and
5. existing actions.

The request section is not a result fact. A legacy terminal card with a task
number and no attribution says, “This older result did not record where its
requirements came from.” A new no-accepted-task card omits the section. An
accepted ERROR retains it.

For accessibility, do not put `aria-live` on token streaming. When a reply
settles after a QuestionCard/TaskCard action, publish one polite, atomic status
announcement and move focus to the new QuestionCard/TaskCard heading
(`tabIndex={-1}`); on failure, restore focus to the composer/error recovery.
Ordinary composer replies do not steal focus. DOM tests pin the once-only
announcement and focus path; a real screen-reader listen-through remains human
judgment.

CSS uses Task 171’s approved mint **You said so**, dashed amber **You weren’t
sure**, and quiet neutral **Cairn chose** treatments. Preserve Lantern on
Water, the 1260/620 breakpoints, face geometry, and reduced motion. Use
`min-width: 0`, `overflow-wrap: anywhere`, `white-space: pre-wrap`, and stacked
or wrapping controls at 760×620; add no breakpoint or horizontal scroll.

## Authenticated result, commentary, legacy reads, and phone

Add an output-only compatibility field:

```ts
acceptedRequest?: TaskRequestView | null;
```

- absent means a legacy card; authenticate its original shape before doing
  anything else;
- `null` means a new card with no accepted task; and
- present means the pure view derived from the atomically accepted intent.

`composeResultCard()` copies only `SerialRunResult.composed.acceptedRequest`.
`composeErrorCard()` receives the main-retained view only after acceptance.
Renderer values, conversation prose, worker claims, and files cannot supply it.

`store.ts` strictly validates a present bounded view but never materializes a
default before `cardauth.ts` checks the original digest. A malformed present
view drops the card. The existing out-of-project marker thereby binds every
visible source byte to project, conversation, and timestamp.

`cardBriefing()` adds a third block labelled exactly as request context, not
verification or worker claim. It whitelists visible labels, interpretations,
and owner quotations only; source IDs/offsets, context notes, evidence IDs,
captions, metadata, paths, and bytes stay out.

The connected-conductor consent string remains byte-identical. The provider
already receives owner messages, Cairn replies, task records, and the card used
for commentary. The inert reply snapshot repeats Cairn’s own prior control and
the owner’s response to the same connected provider; it introduces no project
file content or hidden transcript excerpt. Pin `DATA_SCOPE` unchanged. Any
future extra transcript/file category would require renewal.

`phonepage.ts` renders the same authenticated request view after worker claims
using text nodes/`textContent`. It receives no source IDs, context, evidence
metadata, or image bytes; it adds no write action and preserves the LAN
disclosure. A real 390-pixel bridge test covers the labels, 2,000-character
wrapping, legacy sentence, and no horizontal overflow.

## Ordered implementation tasks

### 1. Pure intent, source, and hostile-input contract

**Files:**

- `core/src/intent.ts`
- `core/src/index.ts`
- `core/test/intent.test.ts`

Add types, candidate/bound conversion helpers, canonical serialization,
request view projection, source-span verification, deep freeze, and every
hostile/boundary test. This step is additive and leaves shipped signatures
green.

### 2. Authenticated owner turns and inert structured actions

**Files:**

- `app/src/main/conductor/turnauth.ts`
- `app/src/main/conductor/store.ts`
- `app/src/main/conductor/taskblock.ts`
- `app/src/main/conductor/service.ts`
- `app/src/main/conductor/constitution.ts`
- `app/src/main/main.ts`
- `app/src/main/ipc.ts`
- `app/src/shared/ipc.ts`
- `app/src/preload.ts`
- `app/tsconfig.unit.json`
- `app/tests-unit/turnauth.test.ts`
- `app/tests-unit/store.test.ts`
- `app/tests-unit/taskblock.test.ts`
- `app/tests-unit/constitution.test.ts`
- `app/tests/conductor.spec.ts`

Pin raw owner bytes, markers, span binding, legacy refusal, passive persisted
questions, action/risk IDs, reply context, clear-on-owner-turn, remount/relaunch,
failure/retry, and no commentary actions. Keep this additive until the vertical
dispatch switch.

### 3. Switch App, Core, adapters, and CLI in one green vertical slice

**Files:**

- `core/src/routing.ts`
- `core/src/serial.ts`
- `core/src/records.ts`
- `core/src/codex.ts`
- `core/src/kimi.ts`
- `core/test/routing.test.ts`
- `core/test/serial.test.ts`
- `core/test/records.test.ts`
- `core/test/codex.test.ts`
- `core/test/kimi.test.ts`
- `app/src/main/tasks.ts`
- `app/src/main/adapters.ts`
- `app/src/shared/ipc.ts`
- `app/src/preload.ts`
- `app/src/renderer/screens/Chat.tsx`
- `app/src/renderer/screens/TaskRun.tsx`
- `app/lab/mock-cairn.ts`
- `app/tests-unit/kimi-wiring.test.ts`
- `app/tests/routing.spec.ts`
- `cli/src/flows/task.ts`
- `cli/test/task.test.ts`

Land main-held preview IDs, preview discard/generations, the atomic start gate,
Core v3/worker v2, every report path, disclosures/prompts, all App callers, and
CLI together. Red tests include changed/stale/concurrent/replayed manual and
proposal previews, delayed route/correction, wrong risk, source-only mismatch,
offline route, and pre-spawn refusal.

### 4. Authenticated accepted-request card and persistence

**Files:**

- `app/src/shared/ipc.ts`
- `app/src/main/conductor/relay.ts`
- `app/src/main/conductor/store.ts`
- `app/src/main/conductor/consent.ts` (test-only byte pin; wording unchanged)
- `app/tests-unit/resultcard.test.ts`
- `app/tests-unit/store.test.ts`

Cover DONE/STOPPED/accepted ERROR, absent/null/present, malformed views,
original-shape marker checks, forged worker/conversation attribution, separate
commentary blocks, unchanged consent, and Task 173 evidence exclusion.

### 5. Desktop review/correction/result and accessibility

**Files:**

- `app/src/renderer/components/QuestionCard.tsx`
- `app/src/renderer/components/TaskIntentList.tsx`
- `app/src/renderer/components/TaskCard.tsx`
- `app/src/renderer/screens/Chat.tsx`
- `app/src/renderer/app.css`
- `app/tests-unit/evidencepresentation.test.ts`
- `app/tests-unit/resultcard.test.ts`

Implement exact controls/copy, main-preview repetition, context separation,
cancel/correction, result ordering, settled announcement, focus recovery,
wrapping, legacy display, and no new motion/breakpoint.

### 6. Phone and typed design-lab compatibility

**Files:**

- `app/src/main/bridge/phonepage.ts`
- `app/lab/mock-cairn.ts`
- `app/tests-unit/bridge.test.ts`
- `app/tests/bridge.spec.ts`

Pin the real read-only phone, authenticated request view, legacy/null behavior,
long wrapping, and unchanged evidence/LAN boundary.

### 7. Full fake-only path and manual eval definitions

**Files:**

- `app/tests/attribution.spec.ts`
- `app/tests/fixtures/fake-conductor.mjs`
- `app/tests/fixtures/fake-codex-env.ts`
- `app/tests/fixtures/fake-kimi-env.ts`
- `docs/superpowers/evals/conductor-v0.md`

Add scenarios 13 (explicit delegation and chosen value) and 14 (hedge,
acknowledgement, correction) plus S13/S14 columns, unscored. They fail both a
missed hedge and a delegable choice asked only in prose. Do not run them without
the owner’s paid-call approval.

Electron uses only a scripted local conductor and PATH-shim workers. It proves
question/defer, raw answer/action context, firm/unsure/chosen rows, correction,
preview/cancel/final acceptance, concurrency, exact Codex stdin and generated
brief, result/reload/commentary/phone, focus, and wide/narrow layout.

On Windows, the Kimi `.cmd` fixture intentionally preserves only the first
multiline argv line. Electron therefore asserts Kimi route/spawn shape, marker,
first-line seam, and source-sensitive pre-spawn refusal. Full Kimi prompt,
disclosure, and authorization bytes are decisive only in
`core/test/kimi.test.ts`; no native helper is added.

## Decisive checks

Run from a clean implementation lane. Hold the app token for Electron:

```powershell
cd core
npm.cmd test

cd ..\cli
npm.cmd test

cd ..\app
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build:vite
npm.cmd run build:lab
.\node_modules\.bin\playwright.cmd test tests\attribution.spec.ts tests\routing.spec.ts tests\conductor.spec.ts tests\bridge.spec.ts

cd ..
git diff --check
git status --short
```

Visually inspect retained 1320×820, 760×620, and 390-pixel phone captures.
Check source labels without color, raw whitespace/multiline wrapping, context
separation, focus after defer/correction, evidence still first, and no
horizontal overflow. A real screen-reader listen-through remains owner/human
judgment.

No real provider, paid eval, credential, dependency change, external write,
publish, push, or app-controlled target project is part of implementation
verification.

## DONE and STOP boundaries

DONE means the deterministic mechanism holds: authenticated owner spans or raw
direct input feed one source-bound intent; context is separate; a main-issued
preview is repeated; only the final atomic Start/Run consume accepts it; the
exact source-sensitive request reaches every Core, adapter, report, card,
reload, commentary, and phone seam; stale/concurrent/forged paths fail before
work; Task 173 evidence and existing consent remain intact; fake wide/narrow/
phone/focus checks pass; and the real-model eval is honestly recorded as not
run.

DONE does not claim that an unevaluated real model will always notice a hedge
or always emit the structured question fence. Those behaviors remain written
constitution/eval requirements until the owner authorizes and scores the paid
run.

STOP rather than weaken provenance if main cannot authenticate the cited owner
span, if an action reply loses its exact context, if route/run can consume two
different requests, if one report path drops attribution, if old history would
have to be guessed into new source labels, or if provider data scope would need
to widen without renewed owner consent.
