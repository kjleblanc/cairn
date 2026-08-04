# Cairn Answer Attribution — Implementation Plan

**Task:** 174

**Base:** `98e2f8c19053c653d6ec3a6d0e4d6561e586a0da`

**Product authority:** Decisions 1, 5, and 6 in
`docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md`

## Outcome

After this plan is implemented, an owner never has to pretend certainty to
keep a task moving. Every question that can affect a task offers **I’m not sure
— you decide**. Cairn notices a tentative answer, says how it understood that
answer in the same turn, and lets one ordinary correction replace the proposed
task.

Every piece of the accepted task is visibly marked **You said so**, **You
weren’t sure**, or **Cairn chose** before dispatch. Main, not the renderer or a
worker, binds that exact source-marked request to the paid-call disclosure,
Core task contract, Git brief, worker prompt, durable report, authenticated
result card, reload, phone projection, and conductor commentary.

The envelope authenticates a deliberately narrow fact: this is the exact
source marking Cairn showed and the owner accepted for this run. It cannot
prove the owner’s state of mind. A model’s first classification is therefore a
candidate until the owner sees it and presses **Send to dispatch**; it never
becomes a verified result fact merely because the model emitted a label.

## Exact semantic contract

The protocol uses stable internal codes. Owner-facing copy is fixed:

| Protocol value | Visible label | Meaning at dispatch |
|---|---|---|
| `owner-stated` | **You said so** | Cairn is treating the quoted owner wording as firm. |
| `owner-unsure` | **You weren’t sure** | The quoted owner wording is a starting point, not a fixed rule. |
| `cairn-chosen` | **Cairn chose** | Cairn supplied this choice; it must never be presented as the owner’s value. |

“Verbatim” means the owner message after the existing send boundary removes
only leading and trailing whitespace. The accepted owner quotation is then
carried byte-for-byte. Later parsers, IPC handlers, Core, adapters, records,
and renderers may validate or quote it, but may not trim, normalize, reorder,
or paraphrase it.

The constitution’s behavior is explicit:

- A firm value such as `300 milliseconds exactly` is `owner-stated` and its
  owner quotation is retained exactly.
- A candidate such as `maybe 300?` is `owner-unsure`. It is not silently
  hardened into an exact requirement and is not, by itself, permission for
  Cairn to invent a different value.
- A delegation such as **I’m not sure — you decide** or `whatever you reckon`
  lets Cairn make the choice. Cairn acknowledges that handoff and names the
  concrete choice briefly in the same reply, without exposing reasoning. The
  resulting value is `cairn-chosen`.
- If a reply both supplies a tentative candidate and delegates judgment, the
  tentative owner wording remains one `owner-unsure` row and Cairn’s final
  value is a separate `cairn-chosen` row. One never overwrites the other.
- A correction is an ordinary owner turn. The old question or proposal becomes
  unusable as soon as main accepts that turn; only the replacement proposal can
  dispatch. A firm correction is shown as `owner-stated`.
- Routine implementation details Cairn legitimately decides may be
  `cairn-chosen`; no value Cairn creates may appear in an owner quotation.

This is the Decision 6 reconciliation: **choice is allowed; false attribution
is not**.

## One canonical accepted-request shape

Add the shared runtime contract in a new `core/src/intent.ts` and export it from
`core/src/index.ts`:

```ts
export type RequirementSource =
  | "owner-stated"
  | "owner-unsure"
  | "cairn-chosen";

export type TaskStatementRole =
  | "outcome"
  | "requirement"
  | "context";

export interface AttributedTaskStatement {
  role: TaskStatementRole;
  source: RequirementSource;
  /** Plain worker-facing interpretation. */
  text: string;
  /** Exact accepted owner wording for owner-*; exactly null for Cairn. */
  ownerText: string | null;
}

export interface AcceptedTaskIntent {
  version: "cairn-task-intent/v1";
  statements: readonly AttributedTaskStatement[];
}
```

This replaces the independent `outcome`, `details`, and `notes` payloads for
new work. There must never be two canonical copies that can disagree. The one
`outcome` statement supplies routing/session titles; `requirement` statements
hold must-haves and choices; `context` statements hold non-mandatory context
worth preserving, including a risk the owner explicitly set aside.

The pure validator and canonical serializer enforce all of these rules before
an intent crosses a trust boundary:

- exact keys only; version exactly `cairn-task-intent/v1`;
- one to twelve ordered statements, with the first and only `outcome`;
- at most eight `requirement` and three `context` statements;
- non-empty `text`, at most 300 characters for the outcome and 500 for every
  other statement, with at most 4,000 characters across all strings;
- `ownerText` is non-empty and at most 500 characters for the two owner sources,
  and exactly `null` for `cairn-chosen`;
- no duplicate `(role, source, text, ownerText)` tuple;
- no NUL, unpaired surrogate, or bidirectional override/isolate character that
  could make visible attribution differ from stored attribution; ordinary
  owner line breaks remain data and are rendered safely;
- no mutation after validation: deep-copy and freeze the intent, its array,
  and every statement; and
- one canonical JSON representation with fixed key order. SHA-256 is computed
  over that representation, so changing only a source label or owner quotation
  changes the authorized request.

`ownerText` is shown on the proposal and confirmation, and travels into the
brief and prompt. For owner-sourced rows it is the authoritative original;
`text` is Cairn’s plain interpretation. If they differ in meaning, the owner
can see that before dispatch and correct it. Main does not infer or “repair”
old free-form `details` into this shape.

## Main-owned question and proposal authority

The current `TaskBlock` is both a model value and a renderer value. Replace the
actionable control with a main-issued union in `app/src/shared/ipc.ts`:

```ts
export type ConductorAction =
  | {
      kind: "question";
      id: string;
      conversationId: string;
      question: string;
    }
  | {
      kind: "task";
      id: string;
      conversationId: string;
      intent: AcceptedTaskIntent;
      risks: readonly { text: string }[];
    };
```

The model never emits `id` or `conversationId`. It emits exactly one candidate
fence:

````text
```cairn-question
{"question":"Which settling speed should Cairn use?"}
```
````

or:

````text
```cairn-task
{"intent":{"version":"cairn-task-intent/v1","statements":[...]},"risks":[]}
```
````

`app/src/main/conductor/taskblock.ts` becomes the strict parser for both forms.
It accepts at most one control fence, rejects a reply containing both, applies
the intent validator, limits one question to 300 characters and three risks to
300 characters each, and strips every control fence from ordinary conversation
text whether valid or invalid. Commentary turns may never create either
action.

All task-affecting questions use `cairn-question`; `cairn-task` no longer
accepts a `question` concern. This is required because Cairn can ask before it
knows enough to propose an outcome. Looking for a trailing question mark would
be ambiguous and would miss questions phrased without one.

In `app/src/main/conductor/service.ts`:

- replace `CurrentProposal` with one current `ConductorAction` per project;
- wrap a valid parsed candidate with `randomUUID()` in main;
- expose it through a renamed `conductorAction` IPC and `ConductorDelta.action`;
- keep it in main memory across renderer remounts, as today;
- deliberately forget unaccepted actions on a full app restart rather than
  restoring a dispatch control from worker-writable `.cairn` files;
- retire the current action after **every** owner turn main successfully
  appends, not only after starting a new conversation;
- allow a question answer, defer choice, or risk action to carry its action ID;
  refuse a stale or wrong-conversation ID before appending the answer; and
- never restore an old action merely because the next model reply, provider
  call, or parse failed. The visible conversation remains, and the owner can
  retry; a stale dispatch card does not come back.

The fixed button sends exactly **I’m not sure — you decide** as the ordinary
owner message. Typed answers remain exact owner messages. Including the action
ID is a control check, not extra prose sent to the provider.

Unaccepted proposals intentionally retain the existing restart behavior. The
durable source-marked record begins only after acceptance: Core writes it into
the task brief/report and the authenticated result card persists it in the
conversation. Legacy conversation prose stays readable but is never mined to
invent attribution.

## Exact dispatch binding

Replace positional `taskRoute(dir, outcome, details, adapterId?)` and raw chat
run fields with an explicit source union:

```ts
export type TaskIntentSource =
  | { kind: "proposal"; conversationId: string; proposalId: string }
  | { kind: "manual"; outcome: string };

export interface TaskRouteRequest {
  dir: string;
  source: TaskIntentSource;
  adapterId?: string;
}
```

`TaskRunRequest` carries the same `source`, selected adapter, confirmation bit,
and main-produced disclosure. A conversation request carries no renderer-owned
outcome, requirements, notes, or source labels. For the direct Task screen,
main creates a one-statement `owner-stated` intent from the normalized text the
owner typed; this preserves that existing entry point without pretending it
came from a conductor proposal.

`app/src/main/tasks.ts` uses one resolver for preview and run:

1. A manual source is validated and converted to a frozen intent. A proposal
   source must name the current main-held task action for the exact project and
   conversation, and that action must have no unresolved risks.
2. Route detection and the real-call disclosure are derived from that intent.
   `TaskRoutePreview` returns a copy of the same intent for the final visible
   confirmation.
3. After the asynchronous detection and disclosure check, run atomically
   consumes the still-current proposal ID. A newer owner turn, replacement
   proposal, wrong conversation, missing ID, changed attribution, or replay
   makes consumption fail.
4. A conversation run cannot create a session, evidence run, Core record, or
   worker process unless that consume succeeds. This fixes the current defect
   where `consumeProposal(...) === null` still runs.
5. Main derives the session outcome and every downstream byte from the consumed
   frozen intent. It never compares or trusts a renderer copy.
6. A connection-required route consumes nothing and leaves the proposal
   actionable. Once Core entry begins, the proposal stays spent on DONE,
   STOPPED, cancellation, adapter error, or record error; those paths may have
   changed the workspace or written records and must never silently resurrect a
   second dispatch.
7. An accepted thrown run passes its retained intent to the ERROR card. A
   refusal before acceptance carries no intent.

`app/src/preload.ts`, the test API mock in `app/lab/mock-cairn.ts`, and all
renderer call sites move to the request-object signature together.

## Core and adapter passage

In `core/src/routing.ts`:

- bump `AdapterTaskContract` to `cairn-serial-task/v3`;
- replace `requestedOutcome`, `details`, and `requestedOutcomeSha256` with the
  frozen `intent` and `requestSha256`;
- bump `WorkerRunResult` to `worker-result/v2` and require the exact
  `requestSha256`; and
- change `TaskAdapter.disclosure()` to accept the whole intent.

In `core/src/serial.ts`:

- make `runSerialTask` accept one validated intent rather than an outcome plus
  optional details;
- route from the one outcome statement;
- hash the canonical complete intent once and carry that digest through every
  contract/result check;
- deep-freeze the nested statements before an adapter receives them;
- add **What you asked for** to `briefText()`, with the visible labels, role,
  interpretation, and owner quotation. Quote every data line independently so
  Markdown, fences, headings, and newlines remain data;
- include the same accepted intent in `cairnWorkerRecords()` and every
  `composedForClose()` arm; and
- render it as a separate durable report section, never under verified facts or
  worker claims. `LOG.md` remains only the bounded task index.

In `core/src/codex.ts` and `core/src/kimi.ts`:

- derive disclosure, authorization, and prompt from the same canonical intent;
- change the disclosure’s data wording from “the owner’s details” to the honest
  “source-marked task request and generated task brief”;
- show every source label and exact quotation in the paid-call confirmation;
- tell the worker that **You said so** is the owner’s firm wording, **You
  weren’t sure** is a starting point, and **Cairn chose** is Cairn’s choice and
  not evidence of owner preference;
- quarantine each statement as task data rather than prompt instructions; and
- refuse before process spawn when wording, ordering, quotation, or source has
  changed since confirmation.

Update `core/test/routing.test.ts`, `serial.test.ts`, `codex.test.ts`,
`kimi.test.ts`, and `records.test.ts`. Tests must change only a source while
keeping text identical and prove that the digest, disclosure, authorization,
brief, prompt, and composed record all change together. They also cover nested
mutation attempts and every DONE/STOPPED/error close site.

## Desktop proposal, confirmation, and result card

Add `app/src/renderer/components/TaskIntentList.tsx` and reuse it in the task
proposal, final dispatch confirmation, and result card. It renders a semantic
section/list, one visible text label per row, the worker-facing interpretation,
and the exact owner quotation when present. Source is never conveyed by color
alone.

Update `TaskCard.tsx` and `Chat.tsx` as follows:

- `QuestionCard` presents the structured question, a properly associated text
  label/input, **Answer**, and the exact **I’m not sure — you decide** secondary
  action. Enter submits the typed answer; keyboard focus reaches both buttons.
- A task proposal shows the complete intent and risks. It passes only the
  proposal ID to dispatch. There is no local “answered” state that can leave an
  old proposal runnable while Cairn interprets a reply.
- Answering, deferring, setting aside a risk, or typing a correction clears the
  old action after main accepts the owner turn. The fresh source-marked reply is
  the only route back to **Send to dispatch**.
- **Send to dispatch** is disabled while Cairn is streaming, when any risk is
  unresolved, or when the action is no longer current.
- The dispatch panel repeats the exact source-marked intent returned by main’s
  route preview above the existing provider/model/data/quota disclosure. This
  is the owner’s acceptance point.
- `ResultCardView` keeps Task 173 evidence first, then Cairn’s verified facts,
  then worker claims, then **What you asked for**, then the existing actions.
  The request section is not styled or worded as a verified outcome.
- A terminal legacy card with a task number but no attribution field says,
  “This older result did not record where its requirements came from.” It never
  guesses from old `details`. Connection-required/no-accepted-task cards omit
  the section. New accepted ERROR cards retain it.

Extend `app/src/renderer/app.css` with the already approved Lantern on Water
source tags: mint for **You said so**, dashed amber for **You weren’t sure**,
and the quiet neutral treatment for **Cairn chose**. Preserve Task 171’s face,
palette, layout, existing 1260/620 breakpoints, and reduced-motion behavior.
Rows use `min-width: 0`, `overflow-wrap: anywhere`, and `white-space: pre-wrap`;
controls wrap or stack rather than introducing a new breakpoint or horizontal
scroll.

## Authenticated card, reload, commentary, and phone

Add an optional compatibility field to `ResultCard`:

```ts
acceptedIntent?: AcceptedTaskIntent | null;
```

The three states remain distinct:

- field absent: legacy card; never infer or default before authentication;
- `null`: a new card for which no task request was accepted; and
- intent present: the exact accepted request for this run.

In `app/src/main/conductor/relay.ts`, `composeResultCard()` copies the intent
only from `SerialRunResult.composed`; `composeErrorCard()` receives the
main-retained accepted intent only after acceptance. Worker claims, renderer
values, filenames, and conversation prose are never card sources.

`app/src/main/conductor/store.ts` accepts legacy absence, strictly validates a
present value, and preserves the original object shape before `cardauth.ts`
checks its digest. A malformed present intent drops the card. Because the
existing marker covers the whole card, valid new attribution is automatically
bound to project, conversation, timestamp, and every source-marked byte.

`cardBriefing()` adds a third, explicitly separate system block:

```text
The accepted request (source-marked; not a result fact):
...
```

It does not fold the request into **verified by Cairn** or worker claims.
Task 173’s `evidenceRunId`, captions, image metadata, paths, and bytes remain
excluded.

This does not widen the connected-conductor consent category. The provider
already receives the owner messages, Cairn’s replies, task records, and the
authenticated result card used for commentary; Plan 4 adds no hidden transcript
excerpt and no new project file content. Pin the exact `DATA_SCOPE` sentence
unchanged. The worker disclosure does change because the exact task data shown
to that separately approved worker call now includes source labels.

`app/src/main/bridge/phonepage.ts` renders the same authenticated **What you
asked for** list after worker claims, using text nodes/`textContent`. It adds no
endpoint, write action, evidence metadata, or image bytes and preserves the
existing LAN disclosure. Legacy and null behavior matches desktop.

## Ordered implementation tasks

### 1. Pin the language and parser red cases

**Files:**

- `app/src/main/conductor/constitution.ts`
- `app/src/main/conductor/taskblock.ts`
- `app/tests-unit/constitution.test.ts`
- `app/tests-unit/taskblock.test.ts`
- `docs/superpowers/evals/conductor-v0.md`

Bump the constitution to `conductor-v6`. State the semantic contract above,
the standalone question fence, exact defer copy, same-turn acknowledgement,
separate uncertain/chosen rows, one-turn correction, and the attribution-not-
choice boundary. Add manual scenarios 13 (explicit delegation and choice) and
14 (hedge, acknowledgement, then correction), and add S13/S14 columns without
scoring them. The eval remains manual and paid; implementation does not run it.

Write failing unit cases for both fences, both-at-once, duplicate fences,
questions in task proposals, malformed sources, owner/Cairn `ownerText`
invariants, bounds, control characters, duplicate statements, and exact byte
preservation. Then implement the pure intent validator/parser.

### 2. Make question/proposal state one-time and main-owned

**Files:**

- `app/src/shared/ipc.ts`
- `app/src/main/conductor/service.ts`
- `app/src/main/ipc.ts`
- `app/src/preload.ts`
- `app/tests-unit/taskblock.test.ts`
- `app/tests/conductor.spec.ts`

Add `ConductorAction`, action retrieval, main-generated IDs, action-bound
answers, clear-on-every-owner-turn behavior, remount reattachment, and safe
restart absence. Pin stale ID, wrong conversation, ordinary correction,
provider/parse failure, commentary rejection, and identical replacement
proposal/new-ID cases.

### 3. Close the dispatch trust gap before touching Core

**Files:**

- `app/src/shared/ipc.ts`
- `app/src/main/tasks.ts`
- `app/src/main/adapters.ts`
- `app/src/preload.ts`
- `app/src/renderer/screens/TaskRun.tsx`
- `app/tests-unit/kimi-wiring.test.ts`
- `app/tests/routing.spec.ts`

Move route/run to `TaskIntentSource`. Add tests that invoke IPC directly with a
missing, stale, spent, wrong-conversation, risk-bearing, edited, or replayed
proposal and prove no session, evidence record, fake worker marker, Git brief,
or task record appears. Keep the real-call confirmation mismatched until the
entire accepted intent matches. Only after those red tests pass may Core receive
attribution.

### 4. Carry one frozen intent through Core and every worker adapter

**Files:**

- `core/src/intent.ts`
- `core/src/index.ts`
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

Land v3/v2 contracts, the canonical digest, brief/report rendering,
deep-freezing, disclosures, authorization, prompts, and every close path as one
vertical slice. The adapter process is not allowed to start until source-
sensitive authorization passes.

### 5. Compose and persist the envelope’s accepted-request record

**Files:**

- `app/src/shared/ipc.ts`
- `app/src/main/conductor/relay.ts`
- `app/src/main/conductor/store.ts`
- `app/tests-unit/resultcard.test.ts`
- `app/tests-unit/store.test.ts`

Add the optional compatibility field, strict read validation, DONE/STOPPED and
accepted-ERROR propagation, legacy/null behavior, card-marker tamper cases, and
the separately labelled commentary briefing. Explicitly forge worker claims
and project conversation lines containing different attribution and prove they
cannot enter the envelope field.

### 6. Put the decision and correction in front of the owner

**Files:**

- `app/src/renderer/components/QuestionCard.tsx`
- `app/src/renderer/components/TaskIntentList.tsx`
- `app/src/renderer/components/TaskCard.tsx`
- `app/src/renderer/screens/Chat.tsx`
- `app/src/renderer/app.css`
- `app/tests-unit/resultcard.test.ts`
- `app/tests-unit/evidencepresentation.test.ts`

Render the exact defer action, three source labels, quotations, replacement
flow, dispatch repetition, result section, legacy sentence, keyboard labels,
and safe wrapping. Assert evidence remains the first result-card section and
the new section is after worker claims.

### 7. Keep phone and the design lab honest

**Files:**

- `app/src/main/bridge/phonepage.ts`
- `app/lab/mock-cairn.ts`
- `app/tests-unit/bridge.test.ts`
- `app/tests/bridge.spec.ts`

Update all typed fixtures. Drive the real 390-pixel phone page through its
read-only bridge and assert the three visible labels, exact long quotation,
legacy sentence, no horizontal overflow, and unchanged evidence/LAN behavior.

### 8. Prove the complete fake-only path

**Files:**

- `app/tests/attribution.spec.ts`
- `app/tests/fixtures/fake-conductor.mjs`
- `app/tests/fixtures/fake-codex-env.ts`
- `app/tests/fixtures/fake-kimi-env.ts`
- focused existing routing/conductor fixtures as required

The Electron test uses a scripted local conductor and PATH-shim worker, never a
provider or real model. It covers:

1. a pre-proposal question with the defer control;
2. explicit delegation, same-turn “Going with 300,” and `Cairn chose`;
3. `maybe 300?`, a visible uncertainty acknowledgement, and `You weren’t
   sure`;
4. one firm correction, a fresh proposal ID, and `You said so`;
5. all three rows on the task card and byte-identical rows in confirmation;
6. stale/edited/replayed direct IPC refusal before the fake worker marker;
7. the exact labels, interpretations, and owner quotations in disclosure,
   generated brief, Codex stdin, and Kimi argv;
8. a DONE card with evidence still first and **What you asked for** after
   worker claims;
9. authenticated reload, forged-card rejection, conductor briefing separation,
   and the phone projection; and
10. keyboard operation plus 1320×820 and 760×620 views with
    `scrollWidth - clientWidth <= 1` and no new motion.

The scripted test proves wiring and deterministic custody. It does not prove a
real model notices every hedge. Constitution tests plus the unrun manual eval
scenarios are the honest boundary until the owner separately authorizes a paid
evaluation.

## Decisive checks

Run from a clean implementation lane with the app token held for Electron:

```powershell
cd core
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

Visually inspect the retained wide, narrow, and phone screenshots. Confirm the
source is readable without color, long exact owner wording wraps, the defer
button is reachable by keyboard, evidence remains first, and the result card
does not imply that accepted requirements are verified outcomes. A real screen
reader pass remains human judgment; do not claim it from DOM roles alone.

No real provider call, paid eval, credential, dependency change, external
write, publish, push, or app-controlled target project is part of verification.

## DONE boundary

DONE means every task-affecting question has a real defer answer; firm,
uncertain, and Cairn-chosen statements remain distinct and correctable; one
main-held proposal ID is required before conversation dispatch; the exact
accepted intent is source-sensitive from disclosure through worker and records;
the authenticated result card, reload, commentary, and phone show the same
request without calling it a result fact; legacy absence stays honest; Task
173 evidence remains first and private; fake-only wide/narrow/phone checks pass;
and the paid real-model eval is explicitly recorded as not run.

STOP rather than weaken the labels if implementation cannot bind conversation
dispatch to the exact accepted proposal, if a requirement can cross outside
the canonical intent, if source text can change without changing authorization,
if old history must be guessed into new attribution, or if provider data scope
would have to widen without the owner’s renewed consent.
