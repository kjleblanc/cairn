# Cairn solution-frame gate design

**Date:** 2026-08-17
**Status:** approved section by section in conversation; implementation not started
**Scope:** conductor-created task proposals only

## Summary

Cairn will require a small, structured solution-frame check before it can turn
a conductor reply into a TaskCard. The check forces the conductor to name its
current causal account, identify which parts of the product own the affected
behavior, consider one remove/replace/reuse alternative, and state the chosen
direction and why.

This is a forcing function, not another prose rule. A task proposal without a
valid frame has no authority: Main creates no TaskCard, and the malformed new
proposal cannot fall back to Cairn's older task format.

Most frame choices remain Cairn's implementation decisions. Cairn interrupts
the owner only when two credible directions would materially change what the
owner sees, receives, or builds next. That interruption uses the existing
Main-owned question authority and `Needs your decision` state, but presents a
specialized two-direction paper. Choosing a direction never reviews a task,
approves dispatch, sets aside risk, or starts work.

The selected frame remains process-local through TaskCard review and dispatch
authorization. It becomes durable only after Core successfully creates the
task brief, before the worker starts. Its chosen direction travels as an
attributed task requirement, and the accepted frame is written into that
brief. Cross-task recurrence and mid-run representation stops are deliberately
separate follow-on designs.

## The failure this closes

The demonstrated failure is not merely persistence or poor debugging. It is
silent preservation of the current solution frame.

In the motivating case, a sculpted creature mesh already contained closed
eyelids and lips. A second face system added generated eyeballs, eyelids, and
lips. Once the doubled surfaces were noticed, every proposed repair preserved
the added face system: recess the sculpt, remove the visible eyes, or compare
variants. Work then went into compensating for that premise: repeated lip
repairs, z-fighting, a socket that could safely provide only 9.4 mm of a needed
12 mm, and repeated safety ceilings. The useful alternative—morph the existing
eyelids and lips and add geometry only where none existed—was not generated
until the owner named it.

The project's written representation-review rule was present and still did
not fire. Therefore this design does not rely on remembering another sentence.
It changes what a valid task proposal must contain.

## Goals

1. Whenever an existing representation is implicated, force at least one
   remove, replace, or reuse candidate that does not silently preserve the
   incumbent component arrangement.
2. Prevent a malformed or unresolved frame from acquiring task or dispatch
   authority.
3. Keep implementation-only choices with Cairn and product-visible choices
   with the owner.
4. Preserve exact attribution: owner-stated, owner-unsure, and Cairn-chosen
   remain different sources.
5. Avoid repeated representation ceremony when the canonical review payload is
   unchanged within the current proposal cycle.
6. Make the accepted choice durable in Cairn's existing task records.
7. State honestly what structural validation can and cannot prove.

## Non-goals

This first slice does not provide:

- durable defect or cause identities across tasks;
- fuzzy or semantic matching of two failures;
- automatic counting of same-cause attempts;
- oscillation detection across three or more repair states;
- a new mid-run `REPRESENTATION_REVIEW_REQUIRED` terminal reason;
- representation enforcement for manual or offline task entry;
- a general architecture-review ceremony for every task; or
- proof that a model-authored causal statement is true.

The current phone milestone is unchanged. This design is a product decision
record and does not claim the capability has shipped.

## Existing seams

The design extends these existing boundaries rather than creating a parallel
workflow:

- `app/src/main/conductor/constitution.ts` defines the conductor's question and
  task protocol. The active task envelope currently contains `intent` and
  `risks`; the staged quality envelope adds `quality`.
- `app/src/main/conductor/taskblock.ts` scans control fences and parses exact
  question/task shapes. Its current invalid attributed task can fall back to a
  legacy `TaskBlock`; the frame-aware path must close that bypass.
- `app/src/main/conductor/service.ts` converts model proposals into Main-owned
  current actions, creates IDs, binds attributed intent to authenticated
  sources, validates replies, and deliberately forgets current actions on a
  full app restart.
- `app/src/shared/ipc.ts` carries output-only action views and exact replies.
- `app/src/renderer/screens/Chat.tsx` renders one current QuestionCard or
  TaskCard and already raises Cairn's `Needs your decision` state.
- `app/src/renderer/components/QuestionCard.tsx` owns only an unsent answer;
  Main owns the action. The new review uses this authority seam, not necessarily
  this exact visual component.
- `app/src/renderer/components/TaskCard.tsx` shows a proposed task and blocks
  Review while risks remain. A representation choice must happen before this
  card, not become another `Set aside` risk.
- Core's intent, Task Spec, serial envelope, and task-record machinery freeze
  the accepted request and write the brief before the worker starts.

The result card is intentionally not an integration seam. It reports terminal
truth after a run and must not reopen a design decision.

## Proposed protocol objects

### `SolutionFrameProposalV1`

This exact object is model-authored proposal content. It is untrusted until
Main validates and binds it.

```ts
type SolutionFrameProposalV1 = Readonly<{
  version: "cairn-solution-frame/v1";
  cause: Readonly<{
    state: "supported" | "suspected" | "unknown" | "not-applicable";
    statement: string;
  }>;
  ownership: Readonly<{
    behavior: string;
    owners: readonly string[];
    relation: "single" | "intentional-overlap" | "conflicting-overlap" | "unknown";
  }>;
  subtractiveAlternative: Readonly<{
    kind: "remove" | "replace" | "reuse" | "none";
    statement: string;
  }>;
  decision: Readonly<{
    direction: "keep" | "change" | "diagnose";
    visibleEffect: "same" | "different";
    authority: "cairn" | "owner";
    statement: string;
    reason: string;
  }>;
}>;
```

The active frame-aware task envelope is proposed as:

```json
{"intent":{},"frame":{},"risks":[]}
```

The staged quality path uses the same frame parser and is proposed as:

```json
{"intent":{},"quality":{},"frame":{},"risks":[]}
```

`frame` is a sibling of `quality`, not a quality criterion. Quality says what
the finished result must demonstrate. The frame says which representation
Cairn chose before work began.

### Bounds and exactness

- Every record has exactly the declared keys; unknown keys fail validation.
- Every string is nonblank, one line, well-formed UTF-16, free of bidi/control
  characters, and at most 300 characters.
- `owners` contains at most three unique, normalized strings.
- `relation: single` requires exactly one owner.
- `intentional-overlap` and `conflicting-overlap` require at least two owners.
- `unknown` permits zero to three owners.
- `subtractiveAlternative.kind: none` is valid only when `cause.state` is
  `not-applicable`, `owners` is empty, `relation` is `unknown`, and the decision
  is a Cairn-authored `keep` with `visibleEffect: same`. Its statement explains
  why this task changes no existing representation. In every other state, an
  actual `remove`, `replace`, or `reuse` candidate is mandatory.
- A conflicting overlap therefore can never use `none`.
- Raw control limits grow only by the calculated maximum size of this object;
  the implementation must not replace bounded parsing with an arbitrary larger
  allowance.
- The model emits no action ID, option ID, source ID, source offset, receipt,
  digest, or hash.

### Structural invariants

Main enforces the contradictions it can determine without semantic judgment:

1. A missing or malformed frame means no task action.
2. The frame-aware parser never falls back to legacy `TaskBlock` parsing.
3. `cause.state: unknown` requires `decision.direction: diagnose`.
4. `decision.direction: diagnose` requires `visibleEffect: same` and
   `authority: cairn`; its attributed task outcome must be a bounded diagnostic
   result rather than a product fix. Main enforces the declared fields, while
   the behavioral evaluation checks that the outcome really is diagnostic.
5. `ownership.relation: conflicting-overlap` plus a Cairn-authored `keep`
   decision is invalid.
6. A Cairn-authored decision must appear exactly as a `cairn-chosen` intent
   requirement.
7. An owner-authored decision must appear as an owner-stated requirement and be
   bound to authenticated owner wording. It requires exactly one current basis:
   a frame-choice receipt; a live matching `custom-direction-pending` guard whose
   project, conversation, review fingerprint, correction input ID, and outcome
   match the proposal; or pre-review owner wording whose input ID carries no
   passive `frame-review` reply context. The custom and pre-review paths both
   require normalized equality among `decision.statement`, that requirement's
   model-authored `text`, and its authenticated `OwnerSourceSpan.text`; merely
   attaching an unrelated or receipt-dependent owner quotation is not
   authority.
8. When the request has not already settled a product-visible choice,
   `visibleEffect: different` requires either an authenticated owner selection
   or an authenticated delegation before a task can be accepted.
9. A set-aside replacement, correction, or re-proposal passes the same frame
   validation as the first proposal.
10. Once Main has admitted a structured frame review, it keeps a process-local
   pending-review guard for that project and conversation. No task action can
   replace it until an exact current option/delegation reply resolves it, an
   exactly bound custom task satisfies the unchanged-outcome and triple-text
   rules below, or a targeted correction causes Cairn to present and resolve a
   replacement review.

An owner may explicitly retain a conflicting arrangement after Cairn presents
the consequence. That is an owner decision, not a model loophole: it must be
bound to the owner's words and retained as context/risk where appropriate.

### `BoundSolutionFrameV1`

After validation, Main derives this branded accepted object:

```ts
type FrameDecisionBasisV1 =
  | Readonly<{ kind: "cairn" }>
  | Readonly<{
      kind: "owner-choice" | "owner-delegation";
      source: OwnerSourceSpan;
    }>;

type BoundFrameReviewResolutionV1 = Readonly<{
  proposal: FrameReviewProposalV1;
  fingerprintSha256: string;
  selected: "current" | "alternative" | "custom";
  customStatement: string | null;
  selectedOptionSha256: string;
}>;

type BoundSolutionFrameV1 = Readonly<{
  version: "cairn-bound-solution-frame/v1";
  requestSha256: string;
  proposal: SolutionFrameProposalV1;
  decisionBasis: FrameDecisionBasisV1;
  review: BoundFrameReviewResolutionV1 | null;
  frameSha256: string;
}>;
```

`OwnerSourceSpan` is Core's existing authenticated owner-source shape. Every
source span uses its existing `kind`, `inputId`, `start`, `end`, `text` order.
`requestSha256` comes from Core's existing accepted-request digest.

The canonical encoding is normative:

1. Validate first, then normalize every text field with JavaScript
   `String.prototype.trim()`; perform no case folding or Unicode normalization.
2. Build ordinary data records in the exact field order declared in the types
   above; preserve array order.
3. Encode with the repository's existing canonical JSON quoting rules (the
   same output as `JSON.stringify` for each validated string, boolean, null,
   array, and ordered record), with no insignificant whitespace.
4. Hash the UTF-8 bytes with SHA-256 and render lowercase hexadecimal.

The review-fingerprint payload is exactly:

```ts
{
  version: "cairn-frame-review-fingerprint/v1";
  outcome: string;
  current: FrameReviewProposalV1["current"];
  alternative: FrameReviewProposalV1["alternative"];
  delegable: boolean;
}
```

Recommendation wording is deliberately excluded from resolution authority.
The selected-option digest payload is `{ kind: "current", option: review.current
}`, `{ kind: "alternative", option: review.alternative }`, or
`{ kind: "custom", statement: <exact trimmed targeted correction> }`.
`customStatement` is non-null only for `selected: custom` and must equal that
payload's statement; otherwise it is null. Core can therefore recompute both
review digests from the durable object. For delegation, Main records the
delegation source first and fills `selected` only when Cairn's later task
chooses one of the two exact options.

`frameSha256` covers the canonical object through `review` and excludes itself.
When no structured review occurred, `review` is null.

Main supplies the accepted request and authenticated source binding, then
invokes Core's canonical constructors to derive and verify every digest. The
renderer and model receive only bounded output views. The frame is a recorded
decision, not evidence that its causal account was correct.

Core serializes the accepted object in the task brief as one plain-language
`Solution frame` section followed by one exact JSON fence labelled
`cairn-bound-solution-frame`. The fence uses the canonical object above, is
capped by the same field/count limits, and fails closed if the bound object or
any digest is invalid. A brief-write failure stops before the worker call. The
object travels from proposal consumption to the existing task-route preview
and then into Core's serial brief input; it is never reconstructed from model
context.

## Pre-dispatch representation review

### When it interrupts

A representation review appears only when all of these hold:

1. Cairn has at least two concrete, credible directions.
2. They differ in what the owner will see, experience, receive, or build next.
3. The owner's existing words do not already settle that difference.
4. Choosing wrongly now creates meaningful rework or lock-in.
5. Cairn can explain the difference without asking the owner to understand
   code architecture.

The fallback depends on why the conditions fail:

- If both directions preserve the accepted visible outcome, Cairn decides and
  records its reason.
- If the owner already settled the difference, Cairn follows that exact choice.
- If a material owner-visible choice remains but Cairn lacks two credible
  directions or cannot explain them plainly, Cairn creates no TaskCard and says
  it cannot safely propose the task yet.
- Only when all five conditions hold does Cairn show the structured review.

Libraries, algorithms, component boundaries, data structures, refactors, and
representation choices that preserve the accepted visible outcome remain AI
decisions.

### Structured question proposal

The existing `cairn-question` fence becomes an exact discriminated union. A
plain question keeps its current `{ "question": "..." }` shape. A frame review
adds this bounded object:

```ts
type FrameReviewProposalV1 = Readonly<{
  version: "cairn-frame-review/v1";
  outcome: string;
  pauseReason: string;
  current: Readonly<{
    statement: string;
    ownerNotice: string;
    tradeoff: string;
  }>;
  alternative: Readonly<{
    statement: string;
    ownerNotice: string;
    tradeoff: string;
  }>;
  recommendation: "current" | "alternative";
  delegable: boolean;
}>;
```

The two directions must be distinct after safe normalization. `ownerNotice`
describes something observable; it cannot be only a framework, file, class, or
algorithm name. Main can enforce shape and distinct text, while semantic
fitness remains an evaluation responsibility.

The review record has exactly the declared keys. `outcome`, `pauseReason`,
`ownerNotice`, and `tradeoff` use the general 300-character safe-text bound;
each direction `statement` uses the tighter 80-character bound needed for its
button. All use the same one-line, well-formed UTF-16, control/bidi-free
validation and trim normalization as the task frame. `recommendation` and
`delegable` accept only their declared primitive values.

Main turns a valid proposal into a `question` action with subtype
`frame-review`, creates the action and option IDs, and computes the canonical
review fingerprint defined above. The renderer never manufactures an option or
treats local component state as authority.

### Owner-facing paper

The paper appears in the existing pre-task decision slot and contains, in this
order:

1. `Needs your decision — nothing starts here`.
2. What Cairn heard as the visible outcome.
3. Why Cairn paused.
4. The current direction.
5. The alternative direction.
6. One observable effect and one trade-off for each direction.
7. `This chooses the direction only. You will still review the task and approve
   any dispatch or risk separately.`

A direction carries a neutral `Cairn recommends` badge when it matches the
proposal's recommendation. Either current or alternative may be recommended;
neither is preselected or given stronger visual weight. The first slice uses
the two bounded text panels. An already-authorized image may remain in the
surrounding conversation, but this protocol adds no image field or image
authority. The paper never shows code, framework names, file paths, or an
architecture diagram to make a beginner decide an AI implementation detail.

Actions use the actual bounded direction statements:

- `Use: <current statement>`
- `Use: <alternative statement>`
- `I mean something else`
- `I'm not sure — choose the direction for me`, only when `delegable` is true

Direction statements used in buttons have a tighter 80-character cap; longer
explanation belongs in `ownerNotice`. `I mean something else` focuses a labelled
`Your direction` short-answer field inside the same paper. Submitting it does
not start work and invalidates the old two option selections. The correction
may resolve directly only when the later frame decision, owner-stated
requirement text, and authenticated correction text are exactly equal after
normalization and the reviewed outcome is unchanged. Otherwise Cairn must
present a replacement review. The paper does not use `Approve`, `Accept`,
`Start`, `Continue`, `Review`, or `Confirm`.

### Reply authority

`ConductorActionReply` gains an exact frame-choice reply carrying the current
Main-owned action ID and one current Main-owned option ID. `I mean something
else` uses the existing targeted text-answer path. `I'm not sure — choose the
direction for me` uses an explicit delegation reply and is rejected when the
current action is not delegable.

The authenticated owner-turn context union gains exactly this passive variant:

```ts
type FrameReviewOwnerReplyContextV1 = Readonly<{
  kind: "frame-review";
  response: "choice" | "delegation" | "correction" | "clarification";
}>;
```

Main writes `choice` for either exact direction option, `delegation` for the
delegation control, `correction` only for the labelled `Your direction` field,
and `clarification` for ordinary composer text sent while a frame-review guard
is pending. The variant contains no action ID, option ID, fingerprint,
selection, or receipt and therefore cannot recreate authority.

Main validates the action, conversation, project, subtype, and option before
writing the owner turn. A stale, replayed, mismatched, or renderer-invented
choice has no effect.

An ordinary composer message may continue the conversation, as it does today,
but it does not silently mint a frame-resolution receipt, retire the current
options, or clear/change Main's pending-review guard. It is a clarification;
only the labelled `Your direction` submission is a targeted correction. Before
any structured review exists, exact owner wording may settle a direction
through the normal attributed-intent path. Once a review is pending, only an
exact current option/delegation reply or the live exact custom-text path can
resolve it. Model-authored context alone can never stand in for an owner choice.

Every frame-review choice, delegation, targeted correction, and clarification
is written with the new authenticated `frame-review` owner-reply context in
Main's existing external turn-marker store. That context is passive provenance,
not a durable action or resolution receipt. An `OwnerSourceSpan` whose input ID
carries this context is ineligible for invariant 7's pre-review no-receipt path.
A targeted correction is eligible only while the exact matching
`custom-direction-pending` guard is live. After restart, the turn text may still
be shown as conversation history, but it cannot be laundered into a fresh owner
choice; a new structured review is required. A genuinely new composer message
sent when no review is pending has a new unmarked input ID and remains eligible
for ordinary exact owner-wording binding.

While that guard is unresolved, ordinary clarification prose may continue and
the original direction controls remain actionable, but Main accepts no task
action and no unrelated structured question. Only a labelled targeted
correction retires those controls and changes the guard to
`custom-direction-pending`; then only an exactly bound custom task or a valid
replacement frame review can become the next actionable control. This prevents
an ordinary send or a model's rewritten task from silently stepping around the
decision without forcing a beginner to confirm clear wording twice.

## Data flow

### Normal AI-decision path

1. The owner and conductor converge on a task.
2. The conductor emits one task control containing `intent`, `frame`, and
   `risks` (plus `quality` on the staged quality path).
3. The scanner removes the private control from visible prose.
4. The shared frame parser validates the exact proposal.
5. Main binds the frame decision to the attributed intent and authenticated
   sources, then creates an in-memory task action.
6. TaskCard shows the outcome normally and adds a `Direction for this task`
   section under Details: `You chose` or `Cairn chose`, the selected direction,
   the subtractive alternative, and the reason. It does not say the reasoning
   was checked or verified.
7. Review routing carries the bound frame alongside the accepted request.
8. The selected direction, already present as an attributed requirement,
   reaches the worker through the normal frozen request/Task Spec path.
9. Cairn writes a plain-language `Solution frame` section and a strict bounded
   machine block into the task brief before the worker begins.

### Owner-decision path

1. The conductor emits a structured frame-review question and no task.
2. Main validates it, creates the action/options/fingerprint, and renders the
   review paper in the current decision slot.
3. The owner chooses, delegates, supplies a labelled correction, or asks a
   clarification in the ordinary composer.
4. An exact option or delegation reply creates a process-local resolution for
   that canonical review fingerprint. A labelled correction retires the options
   and creates only the live `custom-direction-pending` guard; it is not yet a
   resolution. A clarification leaves the original action and guard unchanged.
5. After a clarification, the conductor answers it and the same paper remains
   actionable; Main accepts no task. Only an option/delegation resolution or a
   live labelled-correction guard may lead toward a task proposal.
6. The conductor receives that authenticated owner turn and proposes the task.
7. Main first requires exact normalized equality between the review's `outcome`
   and the later attributed task outcome text. For a current-direction choice,
   Main then requires `decision.direction: keep`
   and an exact normalized match between the selected option statement and the
   task frame's decision statement. For an alternative choice it requires
   `decision.direction: change`, the same exact statement match, and an exact
   match between the review's alternative statement and the task frame's
   subtractive-alternative statement. An owner selection uses
   `authority: owner`; delegation permits `authority: cairn`, but Cairn must
   choose one of the two exact option payloads. A custom choice uses
   `authority: owner`, `visibleEffect: different`, and either `direction: keep`
   or `direction: change` under the ordinary ownership invariants, plus the
   triple-equality rule above. A custom `diagnose` direction cannot resolve the
   old review directly because diagnosis requires a Cairn-authored, same-visible
   diagnostic outcome; it must become a newly validated proposal and, when the
   five conditions still hold, a replacement review. “Semantically similar” is
   not a binding rule.
8. Task review and dispatch continue through their existing separate gates.

### Durability

Unaccepted proposals, pending-review guards, and unresolved reviews remain
process-local, matching Cairn's current action-custody rule. A full app restart
safely forgets them. A task cannot appear after restart without a newly valid
frame. A post-restart task that declares an owner-visible choice cannot rely on
the lost review receipt and must present a new review unless a genuinely new,
eligible owner message separately settles it; authenticated passive reply
context marks the earlier action-generated owner turn as ineligible for the
no-receipt shortcut. Main does not pretend it can prove that a model classified
`visibleEffect` honestly. When the paper returns, its copy says the earlier
choice was not saved, nothing started, and the direction must be chosen again.

Durability begins only when the task brief exists. The brief stores the bound
frame, its decision basis, and its frame digest. The brief preserves the frame
as history. Existing pending-candidate recovery applies only after its current
persistence boundary; before that boundary, restart behavior remains unchanged
and no action authority is reconstructed. No proposal-recovery journal or
schema migration is required in this slice.

## Anti-thrashing rules

- The micro-check is mandatory, but a blocking paper is conditional.
- Main computes the canonical review fingerprint from the exact normalized
  tuple defined under `BoundSolutionFrameV1`; it makes no semantic comparison.
- Main reuses one current resolution only for canonical equality within the
  current proposal cycle.
- A set-aside risk that leaves the outcome and selected frame unchanged rebinds
  the frame to the replacement request without reopening the decision.
- A targeted correction invalidates the current options and any current
  resolution. An exactly bound custom task may resolve directly; otherwise a
  replacement review starts fresh only when its canonical fingerprint differs
  from the rejected review. An identical replacement is refused with a fixed
  non-actionable note instead of showing the rejected choices again.
- A duplicate review for an already resolved fingerprint never raises another
  `Needs your decision` card. Main responds with a fixed non-actionable note
  that the direction is already settled; it does not make another paid model
  call automatically.
- A resolution governs only its current canonical proposal cycle, and an
  accepted frame governs only its frozen task. The conductor may not relitigate
  either merely because it prefers the other option.

These rules preserve useful restraint. A reframe is warranted by a broken
constraint or duplicated ownership, not by the mere existence of another
possible architecture.

## Failure handling

| Failure | Required behavior |
|---|---|
| Recognized task fence has no frame | Strip the private control, create no TaskCard, and show a fixed Main-authored message that no safe task is ready. |
| Frame has extra keys, bad bounds, unsafe text, or an invalid invariant | Same fail-closed result; never legacy fallback. |
| Frame claims an owner decision without a current frame-choice receipt, a live exactly matching custom-direction guard, or eligible pre-review owner wording whose model text and authenticated owner text exactly match the decision | Reject the task action and say the direction is not settled. An action-generated turn marked by passive `frame-review` reply context is eligible only through its live matching custom guard and not after that guard is lost. |
| Frame-review reply is stale, replayed, wrong-project, or wrong-option | Use the existing fixed stale/wrong-action refusal; do not write an owner choice. |
| Owner uses the targeted custom-direction field | Retire the two old options. Accept a later task only on exact reviewed-outcome and custom-text binding; otherwise require a replacement review. |
| App restarts before TaskCard, whether before or after a choice | History remains passive; no actionable review, resolution, or task is reconstructed. The authenticated passive reply context prevents an earlier action-generated turn from satisfying the no-receipt path; a later proposal relying on that old turn must be reviewed again. A genuinely new unmarked owner message may settle the choice through ordinary exact binding. |
| Set-aside replacement drops or changes the frame | Rebind only when canonical frame fields are equal apart from the newly carried set-aside context; otherwise require fresh validation/review. |
| Model repeats an already resolved review | Suppress another actionable paper and state that the direction is already settled. |
| Model repeats the same two directions after the owner submitted a correction | Refuse the identical rejected fingerprint non-actionably; accept only the exact custom task or a changed replacement review. |
| Result later disproves the causal account | Report the run honestly. This slice does not authorize an automatic cross-task recurrence link or mid-run reframe. |

Invalid-control errors must not expose private JSON, IDs, source offsets, or
model prompts to the renderer.

## Authority and security

- The conductor proposes reasoning; it does not grant authority.
- Main owns source binding, IDs, action custody, option custody, the use of
  fingerprints/hashes, and resolution receipts; Core's pure canonical module
  computes and validates the digest bytes.
- The renderer is output-only and returns only an exact current reply.
- The worker receives the selected direction as a frozen requirement but
  cannot author, clear, or revise the accepted frame.
- A frame never approves cost, risk, credentials, data sharing, destructive
  work, publication, deployment, or dispatch.
- A frame's `supported` causal state means “supported in Cairn's current
  briefing,” not “verified by the envelope.” Owner-facing copy calls it Cairn's
  current explanation, never a checked fact.
- Result cards may show the accepted request and chosen approach as reference.
  They never report the frame rationale as a verified result.

## Activation and compatibility

The shared parser, Main authority, IPC types, renderer, constitution, and tests
activate together. The implementation must not ship a prompt that emits frames
before Main accepts them, or a parser that requires frames while the prompt
still emits the old envelope.

Both the active attributed path and the staged quality path use the same frame
module. After activation, every `cairn-task` fence on either conductor protocol
is frame-required and can never reach legacy parsing. Any retained legacy
caller must use a distinct entry point or discriminator that the conductor
protocol cannot emit.

Already accepted or running tasks are grandfathered. Current proposals are
memory-only and disappear on restart, so activation needs no persistent-data
migration. The first post-activation proposal must use the new protocol.

## Proposed component boundaries

The implementation plan should preserve these responsibilities:

1. **Solution-frame value module (Core):** exact proposal/bound types, hostile
   value validation, bounds, trim normalization, canonical encoding, digest
   verification, and brief-block parsing/rendering. It has no conductor, IPC,
   task-routing, or React dependency.
2. **Frame control/binding module (Main):** extracts Core-validated proposal
   values from conductor controls, binds them to the accepted request and
   authenticated decision basis, asks Core to derive digests, and projects safe
   output views. It owns no React.
3. **Conductor control scanner:** recognizes the frame-aware task and structured
   question unions, with no legacy fallback after a recognized invalid task.
4. **Conductor service:** owns current action/resolution custody and revalidates
   corrections and set-aside replacements. Its authenticated turn-marker
   context distinguishes frame-review replies from fresh composer wording
   without restoring action authority after restart.
5. **Shared IPC:** discriminated output views and exact reply types only.
6. **FrameReviewCard:** pure owner-facing presentation; no authority or durable
   state.
7. **TaskCard approach details:** compact projection of the bound frame.
8. **Core record renderer:** durable task-brief section and machine block; it
   treats frame reasoning as a decision record, not verification evidence.

Likely touched files include the existing seams named above, a focused new
frame module, a focused review component, Core's task-record rendering, and
their unit/E2E tests. The implementation plan will choose exact files after
re-reading the then-current tree; this design does not authorize unrelated
refactoring.

## Verification strategy

### Protocol and parser tests

Cover:

- exact valid active and staged task envelopes;
- missing frame;
- extra/missing keys and hostile JSON;
- length, UTF-16, control-character, owner-count, and uniqueness bounds;
- every ownership/alternative/cause invariant;
- unframed attributed task refusing legacy fallback;
- exact Cairn/owner requirement binding; and
- task raw-body limits at the boundary.

Natural homes include `app/tests-unit/taskblock.test.ts`,
`app/tests-unit/constitution.test.ts`, and focused tests for the new module.

### Authority and lifecycle tests

Cover:

- model/renderer attempts to mint action, option, source, receipt, or hash
  authority;
- ordinary-composer text not silently resolving a structured review;
- ordinary clarification text preserving the pending review and its original
  actionable direction controls;
- explicit owner wording binding successfully;
- safe delegation and non-delegable refusal;
- stale, replayed, wrong-project, and wrong-conversation replies;
- restart before review resolution;
- restart after a choice but before TaskCard, proving the saved choice text
  cannot satisfy the no-receipt path;
- correction invalidation;
- identical-fingerprint replacement refusal after correction, while a changed
  replacement starts fresh;
- live custom-guard project/conversation/fingerprint/input/outcome matching,
  including refusal after guard loss;
- direct custom `keep`/`change` binding and custom `diagnose` refusal;
- set-aside preservation/revalidation;
- identical-fingerprint no-thrash behavior; and
- task-brief durability after acceptance.

Natural homes include conductor service/store tests, `setaside.test.ts`, Core
record/serial tests, and `app/tests/conductor.spec.ts`.

### Owner-experience tests

Assert:

- the review appears in the existing decision slot and raises `Needs your
  decision`;
- the boundary sentence says nothing starts;
- two choices have equal visual weight and no preselection;
- option labels avoid approval/dispatch verbs;
- keyboard order, focus, accessible names, target sizes, narrow layout, dark
  theme, and reduced motion hold; and
- ordinary tasks add only compact details rather than another blocking card.

### Behavioral cases

The evaluation set contains at least:

1. **Doubled creature face:** closed sculpted eyelids/lips plus generated
   eyelids/lips. A valid proposal must name morphing the existing mesh as its
   remove/replace/reuse alternative; three overlay-preserving variants are not
   enough.
2. **Trivial wording correction:** valid frame with no blocking paper.
3. **Intentional layered representation:** keeping overlap remains possible
   with a concrete intentional-overlap account and reason.
4. **Unknown cause:** the only valid direction is diagnosis.
5. **Owner-visible reframe:** structured decision paper, no TaskCard.
6. **Delegated visible choice:** Cairn chooses, attributes the choice to itself,
   and retains the owner's delegation as basis.
7. **Tautological alternative:** marked as a failed behavioral evaluation even
   if it passes structural parsing.

Each case records a fixture request, the expected control kind, required and
forbidden frame properties, and a short human judgment. The structural parts
run automatically. “Credible,” “material,” and “tautological” remain an explicit
pre-activation evaluation rubric; they do not become hidden Main authority.

Deterministic tests can prove that omission, contradiction, and authority
forgery fail. They cannot prove that a live model generated a genuinely useful
alternative. A live-conductor evaluation of the creature case is therefore a
separate owner-approved paid call when implementation reaches that gate. Until
that call occurs, the honest claim is “the protocol forces an alternative
field,” not “the model always finds the right reframe.”

### Decisive end-to-end route

The first implementation is complete only when a real built-app test covers:

```text
request
→ mandatory frame check
→ useful pre-task pushback only when required
→ exact owner choice or Cairn decision
→ resolved TaskCard
→ dispatch review
→ task brief containing the accepted frame
→ verified result
→ honest commentary
```

The app/profile mutex and existing risk approvals still apply to any real E2E
run. A fake conductor proves local wiring without a paid call.

## Acceptance criteria

1. No conductor-created task action exists without a valid bound frame.
2. An invalid frame-aware task cannot acquire legacy proposal authority.
3. Every valid frame contains a causal state, ownership account, one
   remove/replace/reuse-or-explain-none alternative, and a bound decision.
4. Unknown cause cannot propose a fix direction.
5. A frame declaring conflicting duplicated ownership cannot be silently kept
   by Cairn.
6. A frame declaring the same visible effect creates no owner interruption.
7. A frame declaring a different visible effect without a current resolution
   creates a decision paper and no TaskCard.
8. Owner choice, correction, delegation, replay, restart, and set-aside paths
   preserve existing source and action custody.
9. A canonically equal review payload does not ask the owner twice within its
   current proposal cycle.
10. The accepted task brief stores the frame and decision basis before the
    worker begins.
11. Existing risk, dispatch, provider, credential, publication, and result-card
    boundaries are unchanged.
12. Automated checks distinguish structural enforcement from semantic model
    quality, and the creature case has a named live-model evaluation gate.

## Follow-on work

A later design may add Cairn-authored defect and cause links to immutable task
reports, an explicit recurrence index, authenticated hard-limit evidence,
oscillation/progress comparisons, and an envelope stop before another repair.
It must not infer recurrence from `STOPPED` alone or silently merge tasks by
semantic similarity. Those mechanisms need their own owner-reviewed design
because they change terminal authority and durable records.
