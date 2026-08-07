# Quality Intent and the Bounded Critic — Design

**Status:** accepted direction from the owner on 2026-08-07; recorded by Task
207. The owner's words were: *"We'll implement before plan 2 begins. I think we
definitely need the critic, we used to but it was rejecting everything for
every minor issue."* This design is therefore a prerequisite to Plan 2 of
`2026-08-07-cairn-owner-verdict-design.md`. Nothing in it is runtime behavior
until the prerequisite implementation plan lands.

**Owner decisions:** Cairn will have a critic, and the quality-intent/critic
work lands before owner-verdict Plan 2 begins.

**Cairn chose:** the schemas, the separation between promises and preferences,
the blocking predicate, one-repair default, custody model, calibration bar, and
implementation sequence below. Those are implementation choices. The owner's
sentence chooses the capability and its roadmap position; it does **not** make
every Cairn task buy a critic call. Required/optional/off is source-bound and
visible per task. Nothing here authorizes a provider call, a new data scope, or
spending.

The short rule is:

> **The critic may challenge a frozen promise; only a confirmed break blocks.**

## Why this is not the old reviewer again

Cairn's first reviewer had a sound core and an unsafe interface. It was fresh,
read-only, optional in the original wizard, and formed a view before reading the
builder's report. But its advice was compressed into four prose labels —
`PASS`, `PASS WITH CONCERNS`, `FAIL`, and `VALID STOPPED` — with no typed
criterion, evidence, reachability, severity, confidence, or resolution state
(`952ed4b:cli/src/prompts.ts` and `952ed4b:cli/src/agents.ts`). One regex then
extracted the global verdict (`952ed4b:cli/src/ui.ts`). When later ceremony or
activation decisions privileged that coarse label, a small defect, an
unreachable future concern, and a broken supported path could all carry the same
operational weight.

The history shows the cost.

- Contract v1.4 had to make repairable implementation and test-harness failures
  repairable in the same task after the earlier stop ratchet turned them into
  new-task ceremony (`docs/legacy/CHANGELOG-pre-reset.md`, Contract v1.4).
- Contract v1.5 defined the supported-path/containment meaning of the existing
  `PASS WITH CONCERNS` label so a disabled learning artifact did not have to
  prove every future production path
  (`docs/legacy/CHANGELOG-pre-reset.md`, Contract v1.5).
- The 0.0.1 reset kept fresh eyes as useful evidence but removed mandatory
  reviewer verdicts and the surrounding ceremony after paperwork became the
  main failure mode
  (`docs/superpowers/specs/2026-07-22-cairn-0.0.1-reset-design.md:13-38` and
  `docs/legacy/CHANGELOG-pre-reset.md:128-132`).
- The recent adversarial review of the owner's-verdict design raised 68
  findings; 28 were refuted, several Criticals shared one root cause, and two
  inherited citations were themselves wrong
  (`docs/ai-work/tasks/204-report.md:59-111`). Raw finding count is not truth.

The useful parts stay: a separate context, a tool-free packet, inspection of the
accepted request and real candidate, skepticism, and an explicit chance to find
what the builder missed. The coarse verdict and the hunt for zero criticism do
not.

## What Cairn already has, and the exact missing seam

Cairn already defines source-marked outcomes/requirements
(`core/src/intent.ts:26-83`), binds and freezes them against authenticated owner
spans (`core/src/intent.ts:298-379`), and hashes their canonical representation
(`core/src/intent.ts:481-509`). Main preserves the exact intent through proposal preview and
rechecks the same object before consuming dispatch authority
(`app/src/main/tasks.ts:219-275` and `:322-417`).

What it does not carry is a product-specific definition of success.
`AdapterTaskContract.checks` is only an array of strings
(`core/src/routing.ts:13-37`), and the real route fills it with process-envelope
checks such as “one worker returned” and “protected work stayed intact”
(`core/src/serial.ts:1033-1071`). The worker is merely told to run
“proportionate checks” (`core/src/codex.ts:664-694` and
`core/src/kimi.ts:920-953`). Its check list is rendered under “claims, not
verified by Cairn” (`core/src/records.ts:259-304`).

So the missing seam is not another clever prompt. It is one frozen object that
answers, before dispatch:

1. What exact promises make this task DONE?
2. What qualities are preferences worth inspecting but not promises?
3. What evidence can answer each promise?
4. Is there a reference, and what narrow dimension is it evidence for?
5. Who can honestly judge each promise: Cairn, the critic, or the owner?

That object is the Quality Plan.

## The five separate axes

These names must not collapse in code or on screen.

| Axis | Question | Authority |
|---|---|---|
| Task intent | What did the owner ask for, and who supplied each choice? | Source-bound `TaskIntent` |
| Quality Plan | What promises and preferences define success for this task? | Main-validated and frozen before dispatch |
| Envelope verification | Did the call, Git custody, records, and deterministic checks hold? | Cairn main/core |
| Critic assessment | What does a fresh tool-free model observe against the frozen plan? | Attributed model advice; never self-confirming authority |
| Owner verdict | Was the finished result right for the owner? | Authenticated owner action only |

A post-completion `Review task NNN` remains optional advice under the contract.
The critic here is different: it is a declared pre-seal inspection of a
still-active task. It cannot reopen a sealed task. A Task Spec says whether the
inspection is required, optional, or off; Builder routing is never conditioned
on critic availability unless the owner-visible spec made it required. Its
prose never sets a disposition, and its own confidence cannot confirm its own
allegation.

## Decision Q1 — Freeze a Task Spec, not a generated super-prompt

The authority object becomes `TaskSpecV1`: the existing bound intent plus one
Quality Plan. Main creates and validates it, freezes it deeply, serializes it in
fixed order, and binds every preview and call to `taskSpecSha256`.

The illustrative type is deliberately TypeScript rather than JSON-with-unions:

```ts
type TaskSpecV1 = Readonly<{
  version: "cairn-task-spec/v1";
  intent: TaskIntent;
  quality: QualityPlanV1;
  callBudget: TaskCallBudgetV1;
}>;

type QualityPlanV1 = Readonly<{
  target: Readonly<{
    kind: "local-task" | "disabled-experiment";
    basis: readonly IntentBasis[];
  }>;
  supportedPath: Readonly<{
    statement: string;
    basis: readonly IntentBasis[];
  }>;
  critic: CriticModeV1;
  candidateStates: readonly ComparableStateV1[];
  acceptanceChecks: readonly AcceptanceCheckV1[];
  qualityPreferences: readonly QualityPreferenceV1[];
  references: readonly QualityReferenceV1[];
  unknowns: readonly Readonly<{ text: string; basis: readonly IntentBasis[] }>[];
  coverage: Readonly<{
    outcomeCriterionIds: readonly `c${number}`[];
    requirementCriteria: readonly Readonly<{
      requirementIndex: number;
      criterionIds: readonly `c${number}`[];
    }>[];
    supportedPathCriterionId: `c${number}`;
  }>;
}>;

type TaskCallBudgetV1 = Readonly<{
  initialBuilderCalls: 1;
  maxRepairCalls: 1;
  maxCriticAttempts: 3;
  maxExternalEvidenceCalls: 0;
  maxBuilderElapsedMs: 3_600_000;
  maxCriticElapsedMs: 600_000;
  maxBuilderCapturedOutputBytes: 2_000_000;
  maxCriticCapturedOutputBytes: 262_144;
  enforceableDollarLimitCents: null;
}>;

type IntentBasis =
  | Readonly<{ kind: "intent-outcome" }>
  | Readonly<{ kind: "intent-requirement"; index: number }>;

type CriterionBasis =
  | IntentBasis
  | Readonly<{ kind: "contract"; section: string }>;

type CriticModeBasis =
  | CriterionBasis
  | Readonly<{
      kind: "cairn-default";
      reason: "not-requested" | "no-useful-inspection" | "route-incompatible";
    }>;

type CriticModeV1 =
  | Readonly<{
      mode: "required";
      basis: readonly CriterionBasis[];
      reason: string;
    }>
  | Readonly<{
      mode: "optional" | "off";
      basis: readonly CriticModeBasis[];
      reason: string;
    }>;

type AcceptanceCheckV1 = Readonly<{
  id: `c${number}`;
  promise: string;
  kind: "acceptance" | "non-regression" | "comparison";
  judge: "cairn" | "critic" | "owner";
  basis: readonly CriterionBasis[];
  failureCondition: Readonly<{
    id: string;
    statement: string;
    allowedArtifactIds: readonly string[];
  }>;
  evidenceStandard: Readonly<{
    mode: "adapter-attestation" | "artifact-inspection" | "comparison" | "owner-observation";
    proves: string;
    precondition: string | null;
  }>;
  comparison: ComparisonCriterionV1 | null;
}>;

type QualityPreferenceV1 = Readonly<{
  id: `p${number}`;
  dimension: string;
  desiredDirection: string;
  basis: readonly CriterionBasis[];
  comparison: ComparisonCriterionV1 | null;
}>;

type ComparisonCriterionV1 = Readonly<{
  id: string;
  referenceId: string;
  dimensionId: string;
  candidateStateId: string;
  comparator: "match" | "beat";
  threshold: string;
  tieOutcome: "meets" | "does-not-meet";
}>;

type ComparableStateV1 = Readonly<{
  id: string;
  route: string;
  viewport: Readonly<{ width: number; height: number }> | null;
  inputFixtureId: string;
  dataFixtureId: string;
  versionOrTime: string;
  locale: string;
  accessibilityMode: string;
}>;
```

Normative caps for v1 are 12 `cN`, 12 `pN`, four candidate states, four
references, eight unknowns, eight selected Git-tracked text artifacts, 8,000
characters per selected artifact, 32,000 selected-content characters total, 24
criterion findings, eight unscoped alerts, eight evidence references per finding,
and 1,000 characters per ordinary text field. Core constants, parsers, and UI
projections share those values; no caller supplies them.

The distinction between `cN` and `pN` is load-bearing.

- **Every `cN` is a promise.** It is finite, falsifiable, visible on the task
  review card, rendered into the brief, and answered by id in the report.
- **Every `pN` is a preference.** It gives the builder and critic a useful
  direction, but losing it cannot withhold DONE. Preferences are where polish,
  “more like this,” and implied quality live until the owner explicitly makes
  them a requirement.
- `owner-unsure` and `cairn-chosen` values remain preferences. In v1, a required
  `cN` basis must resolve to an `owner-stated` intent row or the local contract.
  If the owner wants a Cairn suggestion to become required, Cairn asks them to
  adopt it in a new authenticated owner turn and renders a new preview. Generic
  dispatch approval cannot turn arbitrary Cairn prose into a promise.
- A dispatchable Task Spec therefore needs an owner-stated outcome. If Cairn
  inferred the outcome, the review card asks the owner to adopt or correct that
  sentence in a new authenticated turn before any Builder approval exists.
- Coverage is bidirectional, not merely “every check cites something.” The
  outcome and every owner-stated requirement map to at least one falsifiable
  `cN`; every coverage id maps back to the named row. An unclear or inapplicable
  owner requirement remains an explicit unknown and blocks preview until the
  owner resolves it. The supported path maps to exactly one `kind:
  "non-regression"` `cN`, judged by Cairn or the owner, whose frozen failure
  condition defines material regression. Omitting any reverse mapping refuses
  dispatch.
- A preference can become a promise only before dispatch, through a new Task
  Spec preview. The critic can never promote it after seeing the candidate.
- Vague promises such as “perfect,” “premium,” “best,” or “wow” are invalid.
  They must be reduced to observable dimensions or remain preferences.
- `judge: "critic"` is valid only for a bounded artifact-inspection promise
  with a pre-dispatch `failureCondition`. A critic's `not-met` creates a pending
  allegation; an authenticated owner resolution must confirm that exact frozen
  condition before it can block. Commands and envelope facts use Cairn; taste
  and subjective comparison use the owner. The conductor cannot make the critic
  judge everything merely because it is available.
- `critic.mode: "required"` must itself resolve to an owner-stated row or local
  contract rule. Every critic-judged `cN` must repeat at least one of those exact
  bases. Conversely, `optional` and `off` reject every `judge: "critic"` `cN`;
  their findings may advise on Cairn/owner rows but cannot become missing
  required evidence. Their `cairn-default` basis records why the mode was chosen
  instead of pretending silence was owner authority. The mode is visible before
  Builder approval and cannot move afterward.
- Production activation is deliberately absent from v1. Live permissions,
  payments, regulated data, destructive migration, production security or
  infrastructure, public legal commitments, and safety-critical work retain the
  contract's qualified-human boundary; no critic or ordinary owner click can
  satisfy it.

Evidence keeps provenance in a separate main-authored result object:

```ts
type CriterionResultV1 = Readonly<{
  criterionId: `c${number}`;
  candidateSha256: string;
  status: "met" | "not-met" | "cant-tell" | "waiting-owner";
  source: "cairn-verifier" | "adapter-execution" | "critic-inspection" |
    "owner-observation" | "worker-claim";
  evidenceRefs: readonly string[];
  evidencePlanSha256: string;
  resolutionSha256: string | null;
}>;

type OwnerCheckResolutionV1 = Readonly<{
  version: "cairn-owner-check-resolution/v1";
  runId: string;
  taskSpecSha256: string;
  candidateSha256: string;
  assessmentSha256: string;
  findingId: string;
  criterionId: `c${number}`;
  failureConditionId: string;
  evidenceRefsSeen: readonly string[];
  counterEvidenceRefsSeen: readonly string[];
  findingRenderSha256: string;
  decision: "confirmed" | "dismissed" | "cant-tell";
  actionNonce: string;
  decidedAt: string;
}>;

type OwnerCriterionObservationV1 = Readonly<{
  version: "cairn-owner-criterion-observation/v1";
  projectHash: string;
  runId: string;
  taskSpecSha256: string;
  candidateSha256: string;
  criterionId: `c${number}`;
  stateArtifactIds: readonly string[];
  evidenceRefsSeen: readonly string[];
  decision: "met" | "not-met" | "cant-tell";
  actionNonce: string;
  observedAt: string;
}>;

type EvidencePlanV1 = Readonly<{
  version: "cairn-evidence-plan/v1";
  taskSpecSha256: string;
  revision: 0 | 1;
  previousPlanSha256: string | null;
  revisionReasonEvidenceRefs: readonly string[];
  procedures: readonly Readonly<{
    criterionId: `c${number}`;
    kind: "adapter-command-attestation" | "packet-artifact" |
      "owner-observation" | "comparison-capture";
    command: Readonly<{
      text: string;
      sha256: string;
      cwdRelative: string;
      expectedExitCodes: readonly number[];
      timeoutMs: number;
    }> | null;
    artifactIds: readonly string[];
  }>[];
}>;

type EvidencePlanRevisionAuthorizationV1 = Readonly<{
  version: "cairn-evidence-plan-revision-authorization/v1";
  runId: string;
  taskSpecSha256: string;
  criterionId: `c${number}`;
  fromPlanSha256: string;
  toPlanSha256: string;
  unchangedAuthoritySha256: string;
  changeKind: "executable-path" | "fixture-path" | "timeout-increase" |
    "result-parser-mode";
  mainHarnessFailureCode: "TOOL_NOT_FOUND" | "FIXTURE_NOT_FOUND" |
    "TIMED_OUT_BEFORE_ASSERTION" | "HARNESS_PARSE_ERROR";
  mainEvidenceRefs: readonly string[];
  ownerActionNonce: string;
  approvedAt: string;
}>;
```

The mapping is exact: `judge: cairn` accepts `cairn-verifier` or an authenticated
`adapter-execution`; `judge: critic` accepts `critic-inspection` (with a
confirmed `not-met` still requiring `OwnerCheckResolutionV1` to block); and
`judge: owner` accepts only an authenticated `OwnerCriterionObservationV1` for
the exact project/run/spec/candidate/cN/state/evidence. `worker-claim` satisfies none. A
worker's final-message claim never becomes Cairn verification. Envelope integrity
has its own main-owned result and is not smuggled into the product Quality Plan.
`OwnerCheckResolutionV1` is valid only for a critic-judged `cN` and its exact
assessment finding; it cannot substitute for an owner-judged criterion.

The immutable `evidenceStandard` says what would prove the promise. A separate,
versioned `EvidencePlanV1` says how this run will obtain it. For a predeclared
command, v1 never gives main an arbitrary command runner: it consumes only an
exact command hash and exit code attested from the already-approved provider
process stream. An adapter that cannot authenticate those events is not ready
for that criterion. A successful process event proves execution, not that the
test was well designed.

A proven harness error may replace an evidence procedure once without changing
the `cN`, its basis, judge, failure condition, or evidence standard. The closed
`EvidencePlanRevisionAuthorizationV1` requires a main-owned pre-assertion failure
code/evidence, an exact owner action, and a mechanically limited change to an
executable path, fixture path, timeout increase, or result-parser mode. Main
retains both revisions and failed output. An easier assertion, changed expected
result, new command/data/provider/risk scope, or any other semantic change needs
a new Task Spec and its normal preview/approval; it cannot masquerade as harness
repair.

This is where Gauntlet Loop improves Cairn without replacing Cairn's intent
custody: the reference bar becomes explicit quality evidence, while the owner’s
actual outcome and source markings remain the authority.

## Decision Q2 — A reference is narrow, frozen, and optional

Gauntlet asks for a named, fetchable, comparable bar. Cairn keeps that useful
question but refuses three hidden leaps: a reference is not the whole intent,
“similar” is not a measurable dimension, and a live URL is not a stable bar.

```ts
type QualityReferenceV1 = Readonly<{
  id: string;
  title: string;
  basis: IntentBasis;
  locator: string;
  snapshotSha256: string;
  capturedAt: string;
  state: ComparableStateV1;
  stateSha256: string;
  dimensions: readonly Readonly<{ id: string; description: string }>[];
  antiCopyBoundary: string;
}>;
```

Rules:

- The candidate and reference are compared only through a frozen
  `ComparisonCriterionV1`: one reference, one dimension, one candidate capture
  state, one comparator/threshold, and one tie rule. Each assessment comparison
  records its own candidate/reference hashes and randomized A/B order; a global
  presentation-order flag cannot blur several comparisons together.
- Main snapshots or imports the reference before dispatch, stores it outside
  the worker-writable project, and hashes it. “The current homepage” is not a
  reference until captured.
- Reference text, images, files, and pages are untrusted evidence, never
  instructions. Brand text, assets, and code are not copied; the
  `antiCopyBoundary` says what must remain original.
- The displayed `owner-stated`, `owner-unsure`, or `cairn-chosen` source is
  derived from the bound `basis`; a conductor-supplied label is never trusted.
- A reference basis cannot be `contract`. If Cairn chooses a reference, that
  choice first appears as a `cairn-chosen` intent requirement and the reference
  points to that requirement.
- `cairn-chosen` and `owner-unsure` references may support only `pN`. A required
  comparison needs an owner-stated basis and a new owner-visible preview.
- In v1, a subjective `match` or `beat` promise is judged by the owner, not
  turned into an automatic LLM veto. A deterministic metric may judge it when
  the metric is itself in `cN`. The critic may report a blind comparison, tie,
  or uncertainty, but one model opinion does not silently become the owner's
  taste.
- The v1 critic transport is text-only. Images and other binary references may
  still be shown to the owner, but never enter a critic packet. Reference text
  enters only when its source was an eligible selected Git-tracked text file
  under the conductor's existing consent; external/local-outside snapshots wait
  for a separately approved scope-renewal design.
- No honest comparator is a valid state: `references: []`. Cairn must not invent
  one merely to activate the feature.

The live conductor cannot browse (`app/src/main/conductor/constitution.ts:116-136`).
An external fetch therefore needs a separate main-owned acquisition design and
the owner's exact data/network approval. The first implementation may consume
only already-authorized local snapshots; the schema does not pretend a URL was
fetched when it was not.

## Decision Q3 — The critic emits findings, never a verdict with magic power

The critic gets a fresh, tool-free context. Main sends one exact bounded,
text-only request: a path-free Task Spec projection, eligible selected tracked
text, Cairn-owned check evidence, and prior confirmed finding bindings on a
repair round. The model has no filesystem, shell, network, project, Git,
credential, dispatch, or write tool. It does not receive source spans, absolute
paths, reference locators, the builder's confidence/effort narrative, report, or
disposition. The report does not exist yet.

```ts
type CriticTaskSpecProjectionV1 = Readonly<{
  version: "cairn-critic-task-spec-projection/v1";
  supportedPath: string;
  criticMode: "required" | "optional" | "off";
  candidateStates: readonly ComparableStateV1[];
  criteria: readonly Readonly<{
    id: `c${number}`;
    promise: string;
    kind: "acceptance" | "non-regression" | "comparison";
    judge: "cairn" | "critic" | "owner";
    failureConditionId: string;
    failureCondition: string;
    evidenceStandard: string;
    comparison: ComparisonCriterionV1 | null;
  }>[];
  preferences: readonly Readonly<{
    id: `p${number}`;
    dimension: string;
    desiredDirection: string;
    comparison: ComparisonCriterionV1 | null;
  }>[];
  references: readonly Readonly<{
    id: string;
    title: string;
    snapshotSha256: string;
    state: ComparableStateV1;
    stateSha256: string;
    dimensions: readonly Readonly<{ id: string; description: string }>[];
    antiCopyBoundary: string;
  }>[];
}>;

type CriticPacketV1 = Readonly<{
  version: "cairn-critic-packet/v1";
  taskSpecSha256: string;
  evidencePlanSha256: string;
  candidateSha256: string;
  taskSpec: CriticTaskSpecProjectionV1;
  selectedTrackedText: readonly Readonly<{
    id: string;
    projectRelativePath: string;
    sha256: string;
    content: string;
    truncated: boolean;
  }>[];
  checkEvidence: readonly Readonly<{
    id: string;
    criterionId: `c${number}`;
    status: "met" | "not-met" | "cant-tell" | "waiting-owner";
    source: "cairn-verifier" | "adapter-execution" | "owner-observation" |
      "critic-inspection";
    evidenceRefs: readonly string[];
  }>[];
  priorConfirmedFindings: readonly Readonly<{
    assessmentSha256: string;
    findingId: string;
    resolutionSha256: string;
    criterionId: `c${number}`;
    failureConditionId: string;
  }>[];
  comparisonTrials: readonly Readonly<{
    comparisonId: string;
    criterionId: `c${number}` | `p${number}`;
    referenceId: string;
    dimensionId: string;
    candidateArtifactId: string;
    referenceArtifactId: string;
    presentationOrder: "A-B" | "B-A";
  }>[];
}>;

type CriticRequestV1 = Readonly<{
  version: "cairn-critic-request/v1";
  systemPromptVersion: "cairn-critic-system/v1";
  systemPrompt: string;
  packet: CriticPacketV1;
  policySha256: string;
  schemas: Readonly<{
    taskSpec: "cairn-task-spec/v1";
    packet: "cairn-critic-packet/v1";
    output: "cairn-critic-output/v1";
  }>;
  toolPolicy: "none";
  generation: Readonly<{
    temperature: 0;
    topP: 1;
    maxOutputTokens: 8_192;
  }>;
}>;

type CriticOutputV1 = Readonly<{
  version: "cairn-critic-output/v1";
  findings: readonly CriticFindingV1[];
  unscopedFindings: readonly UnscopedFindingV1[];
  comparisons: readonly CriticComparisonV1[];
  largestGapId: string | null;
}>;

type CriticAssessmentV1 = Readonly<{
  version: "cairn-critic-assessment/v1";
  runId: string;
  candidateRound: 0 | 1;
  callAttempt: 1 | 2 | 3;
  taskSpecSha256: string;
  packetSha256: string;
  requestSha256: string;
  candidateSha256: string;
  output: CriticOutputV1;
  provider: string;
  model: string;
  resolvedModelRevision: string;
  connectionConsentVersion: string;
  routeRequestFingerprintSha256: string;
  criticPromptSha256: string;
  policySha256: string;
  createdAt: string;
}>;

type CriticFindingV1 = Readonly<{
  id: string;
  criterionId: `c${number}` | `p${number}`;
  status: "met" | "not-met" | "cant-tell" | "tie";
  severity: "critical" | "major" | "minor" | "suggestion" | null;
  confidence: "high" | "medium" | "low";
  failureConditionId: string | null;
  observed: string;
  evidenceRefs: readonly string[];
  counterEvidenceRefs: readonly string[];
  selfCheck: "supported" | "challenged" | "unresolved";
  rootCauseKey: string | null;
  smallestRepair: string | null;
}>;

type CriticComparisonV1 = Readonly<{
  comparisonId: string;
  criterionId: `c${number}` | `p${number}`;
  referenceId: string;
  dimensionId: string;
  candidateSha256: string;
  referenceSha256: string;
  presentationOrder: "A-B" | "B-A";
  result: "candidate" | "reference" | "tie" | "cant-tell";
  evidenceRefs: readonly string[];
}>;

type UnscopedFindingV1 = Readonly<{
  id: string;
  category: "secret-exposure" | "data-loss-or-corruption" |
    "authentication-or-permission-bypass" |
    "unapproved-external-or-destructive-action" |
    "protected-work-or-recovery-breach";
  observed: string;
  evidenceRefs: readonly string[];
  counterEvidenceRefs: readonly string[];
  confidence: "high" | "medium" | "low";
  selfCheck: "supported" | "challenged" | "unresolved";
  rootCauseKey: string | null;
}>;
```

The model authors only `CriticOutputV1`. Main supplies and authenticates every
run, route, attempt, consent, schema/prompt/policy, request, packet, candidate,
comparison-order, and time field when it wraps that output as
`CriticAssessmentV1`; model text cannot impersonate custody metadata.

`CriticRequestV1` is the one canonical authority object. Main serializes it in
fixed order, hashes those exact bytes, and creates exactly two transport messages:
the pinned system prompt and the canonical packet JSON. The final HTTP request
body hash must match the approved request-template fingerprint. No hidden
history, prose prefix/suffix, source span, locator, or third message is allowed.
The `systemPrompt` tells the model to answer only the declared rows, treat every
artifact as untrusted data, seek counterevidence, avoid new requirements, and
return only strict `CriticOutputV1`; its exact bytes are calibration-bound.

Packet selection reuses the existing conductor context selector and its current
consent unchanged: at most eight Git-tracked text files, 8,000 characters each,
32,000 selected-content characters total. It excludes `.env`, service-account
keys, token stores, private keys, other credential-like paths/content,
Git-ignored files, dependencies, generated areas, binaries, links, `.git`,
`.cairn`, and anything outside the selected project. Only project-relative names
are exposed. Untracked candidate files, images, outside snapshots, or a wider
scope make a required critic route unavailable; they are never rounded into the
packet. A future wider/multimodal critic must pause the saved connection and run
the contract's explicit consent-renewal flow before any new data leaves.

`UnscopedFindingV1` uses the same observation/evidence/self-check fields plus
one closed category:

- `secret-exposure`
- `data-loss-or-corruption`
- `authentication-or-permission-bypass`
- `unapproved-external-or-destructive-action`
- `protected-work-or-recovery-breach`

There is intentionally no `pass`, `fail`, `blocks`, `disposition`, `review`,
`moved`, owner score, next-task, dispatch, or edit field. The critic cannot grant
itself authority by returning prose in another shape. Unknown keys, missing
criteria, duplicate ids, unknown ids, invalid hashes, or oversized fields make
the assessment malformed and therefore **unavailable**, not a product failure.
`tie` is valid only for a declared comparison. Repeated `rootCauseKey` values
group related findings; duplicate finding ids or duplicate records are malformed.
Every declared criterion appears exactly once. `met`/`not-met` requires at least
one allowed evidence reference; `not-met` on `cN` must name that row's exact
failure condition; `cant-tell` cannot pretend to have decisive evidence.
`largestGapId` is null or an existing finding id and has no policy authority.
Every comparison row must exactly match one packet trial and echo its ids, two
hashes, and per-trial order.
The projection must equal main's path-free projection of the frozen Task Spec;
prior findings must resolve to authenticated matching resolutions; every file
entry must carry the selector's tracked/text/non-link/non-sensitive proof and
stay inside all three consent caps. Any projection, origin, exclusion, cap,
request-message, or final-body mismatch refuses before a provider call.

## Decision Q4 — Main derives blocking from one closed predicate

Severity, confidence, and `selfCheck` are attributed model descriptions. None
grants power by itself, and the critic cannot confirm its own allegation.

- **Critical:** suspected evidence of one of the five closed native safety or
  custody categories.
- **Major:** the current supported outcome is materially wrong or degraded.
- **Minor:** a localized edge case, polish mismatch, or small defect that does
  not falsify an accepted promise.
- **Suggestion:** a preference, alternative design, optimization, or new
  feature.

After strict parsing, main may derive a task blocker only when one branch holds:

```text
A. a frozen cN names judge=cairn
   AND its authenticated CriterionResultV1 is not-met
   AND source/evidence satisfy the frozen evidence standard;

OR

B. a frozen cN names judge=owner
   AND its authenticated OwnerCriterionObservationV1 is not-met for the exact
       run/spec/candidate/cN/state/evidence;

OR

C. criterionId is cN
   AND the frozen cN names judge=critic
   AND status is not-met
   AND failureConditionId exactly matches that frozen cN
   AND every evidenceRef is one of that condition's allowed packet artifacts
   AND an authenticated OwnerCheckResolutionV1 for this run/spec/candidate/
       assessment/finding/cN/failureCondition and the canonical render of all
       supporting evidence, counterevidence, and self-check says confirmed;

OR

D. an unscoped finding uses one closed category
   AND Cairn's pre-existing deterministic risk/custody verifier independently
       fails for the same run/candidate/evidence.
```

Main derives current applicability from the frozen `cN`; it never trusts a
critic-supplied scope label. It also compares the allegation to the frozen
promise and failure condition, not a model-authored `expected` string. A
critic-only `not-met` becomes `waiting-owner`, never a blocker. An unscoped
alert that Cairn cannot independently corroborate remains an attributed alert
and is not a model-created product requirement. Main then runs exactly one native
boundary check: `pass` records the alert as advisory and continues; `fail` uses
the existing native STOPPED reason; `cant-tell` ends `STOPPED —
BOUNDARY_EVIDENCE_UNAVAILABLE`, without repair or labelling the product bad.
There is no indefinite risk pause or critic-controlled retry. Everything else
is a non-blocking note or unresolved question.

Consequences:

- A Minor or Suggestion outside `cN` can never trigger repair or STOPPED.
- A critic disagreement with `judge: "cairn"` or `judge: "owner"` is advisory;
  the declared judge's evidence controls that promise.
- A future-path concern is carried forward; v1 has no production-activation
  target. A real native boundary failure still follows Cairn's existing stop.
- A reference preference can lose every comparison and still not block. If the
  owner promised a tiny visual detail in `cN`, its proven absence does block —
  because the owner made it a promise, not because the critic called it Minor.
- The critic must try to falsify each allegation, cite counterevidence, and
  deduplicate shared root causes before returning it. Its `selfCheck` remains
  advice. Main/owner resolution, not self-certification, controls blocking.
- Raw issue count is never an input. The loop ends at **no confirmed blocker**,
  not zero criticism.
- Cairn's deterministic red result always wins. Critic praise cannot rescue a
  failed envelope check, a failed `cN` command, changed protected work, or an
  unverified record.
- Critic output remains an attributed model assessment. Main verifies its shape,
  custody, and evidence references; it never treats a related-but-irrelevant
  valid artifact hash as semantic proof.

## Decision Q5 — Unknown and tie are real outcomes

`cant-tell` is not a polite failure.

- If a machine-answerable required `cN` lacks evidence, Cairn may consume one
  already-approved adapter attestation or apply the one audited harness repair.
  V1 does not execute an arbitrary evidence command or make an external evidence
  call. If evidence remains unavailable, the task ends `STOPPED —
  EVIDENCE_UNAVAILABLE`; the product is not labelled bad.
- If `judge: "owner"`, Cairn shows the exact candidate/reference state and waits
  for the owner's judgment. The critic cannot substitute for taste.
- A malformed or unavailable critic records `CRITIC_UNAVAILABLE`. It ends a task
  only when the frozen Task Spec made criticism required and the owner declines
  or exhausts one separately approved retry. For `optional`, Cairn may seal from
  the remaining required evidence; for `off`, no call is offered. It never
  becomes “the build failed.”
- A comparison tie stays a tie. `match` treats a tie as meeting the comparison;
  `beat` does not. In v1 subjective comparison still goes to the owner.
- If the A/B state was not controlled or the snapshot is missing, the only
  honest answer is `cant-tell`.

Each live comparison randomizes and records its own A/B order. Calibration must
include A/A cases and the same cases with A/B swapped; a second live judge call
is never hidden inside the first approval.

## Decision Q6 — One bounded repair, no Gauntlet treadmill

The v1 task budget covers the whole run: one initial Builder call, at most one
repair, at most three critic attempts (the third exists only for one unavailable
retry), zero external evidence calls, a one-hour/2,000,000-byte cap per Builder
or repair call, and a ten-minute/262,144-byte cap per critic call. Cairn cannot
enforce a dollar cap through the current providers, so
`enforceableDollarLimitCents` is honestly `null`; the UI shows the provider's
billing/quota basis. A maximum is not authorization.

```text
builder candidate
  -> Cairn deterministic checks + every owner-judged cN observation
       confirmed required failure -> owner may approve the one repair
                                     -> rerun Cairn + owner checks
       complete/no blocker -> apply critic mode
  -> critic mode off: seal from complete Cairn + owner evidence
  -> critic mode optional: owner may approve call 1 or continue to seal
  -> critic mode required: owner approves call 1 or task stops by its frozen rule
  -> critic candidate round 0 or 1
       no allegation -> final Cairn/owner checks -> seal
       allegation -> owner confirms or dismisses exact frozen failure condition
       confirmed blocker -> if repair remains, owner may approve it
                            -> rerun all Cairn/owner checks
                            -> offer/require critic round 1 by frozen mode
                            -> seal or STOPPED
       unavailable -> owner may approve one retry, within the 3-call cap
```

Every paid builder, repair, critic, or retry call gets its own existing
just-in-time approval naming provider, model, exact project, data sent, purpose,
and quota/cost basis. Approving one never approves the next.

On every repair round:

- the Task Spec and all original `cN`/`pN` rows remain byte-identical;
- main constructs the repair instruction only from the frozen `cN` promise,
  failure condition, and typed evidence artifact ids. Critic-authored
  `observed`, `smallestRepair`, commands, and embedded candidate/reference text
  remain quoted advice and never enter authoritative Builder instructions;
- every Cairn/owner `cN` is rechecked; when a critic call occurs, it inspects
  every original row it is allowed to inspect, not only the repaired spot;
- a new outside-plan Major/Minor/Suggestion is advisory;
- a repair regression blocks only when it falsifies an original `cN` and gets
  its required resolution, or independently trips a native boundary. A visible
  but unpromised Minor regression stays advisory; and
- candidate and evidence hashes are refreshed, while the original plan and
  reference hashes do not move.

At the cap, Cairn seals DONE if all required evidence holds and no confirmed
blocker remains, carrying every limitation. Otherwise it seals STOPPED and
leaves the latest candidate untouched. Before repair, main stores an immutable,
lossless round-0 candidate bundle outside the project; after repair it stores a
separate round-1 bundle. If every task-owned changed/untracked path cannot be
classified non-sensitive and captured losslessly, repair is not offered. Cairn
does not call either round
“best” by model taste. Restoring round 0 is a later explicit, recoverable owner
action because it would overwrite current work. Continuing is a new task with
new owner cost decisions. “Keep going until the critic is wowed” is not a state.

## Decision Q7 — The critic is tool-free in fact

Fresh context does not require a different provider or model. V1 reuses the
connected conductor's main-owned OpenAI-compatible transport, but starts a
separate one-shot request with a critic-specific system message and **no tool
schema at all**. That transport currently sends only explicit message content
(`app/src/main/conductor/transports/openai-compatible.ts:21-23` and `:48-60`).
Main constructs those messages solely from canonical `CriticRequestV1`; the call
cannot
read the project, `.git`, `userData`, a credential path, or the internet because
no filesystem, shell, browser, or tool channel is exposed.

This choice deliberately rejects the tempting `codex exec --sandbox read-only`
route. Cairn's own custody analysis says a Codex workspace sandbox limits writes
but permits reads outside the workspace
(`app/src/main/conductor/cardauth.ts:27-35`). Changing its working directory or
calling it read-only would not make an exact-file disclosure true. Neither Codex
Exec nor Kimi print mode may advertise the v1 packet-only critic capability.

The approval says **Independent critic**, not Builder, and lists every selected
relative file name/hash plus total characters, exact base URL/provider/
configured-and-resolved model, consent version, route/request fingerprint,
purpose, timeout/output cap, and honest billing/quota basis. Main never sends the
stored credential into a request or log. Redirects remain disabled. Network
access is only the approved request to that exact provider endpoint. Fake tests
assert that adding tools, hidden history, or any byte outside canonical
`CriticRequestV1` changes authorization and refuses the call.

## Decision Q8 — Pending work has app-owned custody

Today `runSerialTask` closes in one call and the desktop's session map is
in-memory (`app/src/main/tasks.ts:52-81`). A separate approval between builder,
critic, and repair therefore needs durable pending state before it is safe.

Main stores a bounded, authenticated pending-run journal under
`userData/pending-runs/<projectHash>/<runId>/`, outside the worker-writable
project. It contains the frozen Task Spec, evidence-plan revision history,
phase, atomic spent/remaining call counters, base HEAD, candidate/diff/evidence
hashes, immutable candidate-bundle hashes, route receipts without credentials,
owner-check resolutions, and critic assessment hashes. It is not a second Git
ledger and contains no secret.

- The process-lifetime run lock remains active while the app is open. Across a
  restart, the journal is the canonical durable **pending-project gate**: boot
  loads and validates it before registering task, verdict, or push IPC. The app
  does not pretend a dead-PID filesystem lock survived. No new task, verdict
  copy commit, push preview, or push execute can consume the workspace.
- On restart, main resumes only if the project identity, HEAD, complete Git
  state, Task Spec hash, and candidate hash match. Otherwise it refuses to seal
  and offers an honest recovery/STOPPED path.
- V1 Builder and repair calls are restricted to a writer adapter whose enforced
  write sandbox excludes `userData`; today's Kimi adapter does not qualify.
  Packet-only criticism may still use the owner's connected model. Hostile tests
  attempt to preplant, overwrite, truncate, alias, and delete both journal and
  marker paths. An undisclosed path or prompt instruction is not custody.
- Before copying a candidate bundle, main applies the same realpath/link,
  ignored/generated/dependency, credential-like path, and bounded secret-content
  exclusions used for provider context. A credential, private key, token-like
  value, sensitive/unclear path, link, or unbounded artifact disables repair and
  leaves the workspace untouched; Cairn never copies it into `userData` merely
  to promise recovery. The result records only a redacted fixed reason.
- Critic assessments are stored behind a main-owned marker, like result-card
  authentication. A project file cannot forge one.
- The final report includes a bounded, clearly attributed assessment summary
  and its digest. It never presents the model's judgment under “Verified by
  Cairn.”

## Decision Q9 — Owner verdict stays wholly separate

The owner's-verdict schema may record `adviceSeen: ["<critic assessment
sha256>"]`. Main derives that bounded, deduplicated list from assessments
actually rendered in the authenticated verdict session; renderer input cannot
supply it. Every hash must resolve through the main-owned marker and match the
same project, run, Task Spec, sealed candidate, and pre-seal phase. A stale,
prior-round, cross-project, forged, duplicate, or not-displayed hash is rejected.
This proves only which attributed advice was displayed; it does not copy critic
findings into owner scores or imply agreement.

The critic cannot write, prefill, or derive `checks[].score`, `review`, the
owner's note, `disposition`, `moved`, stones, queue state, or a next task. A
critic finding after seal is an optional review suggestion; it cannot reopen
the result. Decision 2 of the owner's-verdict design remains exactly about the
owner's verdict being record-only.

## What the owner sees

Before a critic call:

> **Independent critic — paid call 1 of at most 3**
>
> Provider/model: [exact route]
>
> Sends: [up to eight eligible Git-tracked text names/hashes, at most 8,000
> characters each and 32,000 total, plus the path-free plan/check metadata]; no
> tools, images, untracked/ignored files, links, generated/dependency content, or
> credentials
>
> Purpose: independent inspection against the promises below. It cannot read or
> edit the project, or declare DONE.
>
> Limit: one request, [timeout], [captured-output cap]. Billing/quota: [honest
> provider basis; dollar cap unavailable unless the provider can enforce one]

Actions for `optional`: **Approve this critic call** / **Continue without
critic**. Actions for `required`: **Approve this critic call** / **Stop this
task**. `off` shows no call control.

After a clean assessment:

> **The critic found no evidence-backed blocker in the checks it was allowed to
> judge.** Cairn's deterministic checks [passed/pending]; owner judgment
> on the task's owner-judged checks [complete/pending]. The critic found two
> polish notes, but neither can hold
> back DONE.

After a blocker:

> **The critic alleges one frozen failure.** Cairn shows the exact promise and
> failure condition, observed text, every supporting evidence item, every
> counterevidence item, the critic's self-check/confidence as attributed advice,
> and “Confirm / Dismiss / Can't tell.” The action binds the hash of this whole
> canonical render; a one-sided or stale rendering cannot create a resolution.

After confirmation:

> **You confirmed one promised check does not meet.** `c2` requires [promise];
> [evidence] shows [observed]. This blocks because the authenticated resolution
> confirms `c2`'s frozen failure condition, not because the critic prefers
> another style. One separately approved repair is available.

After a preference:

> **The critic prefers another polish pass, but it found no broken promise.**
> [note] is outside the required promises. Cairn kept it as a follow-up instead
> of using it as a veto.

The result card shows calls used/cap, repairs used/cap, each blocking `cN`, and
at most three top advisory notes by default. The complete bounded assessment is
available on demand; the owner never receives a 68-item wall as the primary
result.

## Calibration required before live activation

Typed schemas prevent authority drift, not model misjudgment. Before any live
critic mode is activated, Cairn preregisters synthetic fixtures, their exact
one-fixture-per-call batching, and expected policy outcomes. The v1 manifest has
at most 16 calls; it pins every fixture id/payload hash, timeout, captured-output
cap, and billing/quota basis before the owner is asked to approve any call.

A separate calibration-only orchestrator may call an inactive tuple. It accepts
only fixture ids/hashes compiled into that preregistered manifest, never a
project candidate or arbitrary packet; re-derives each per-call disclosure;
requires each exact owner approval; persists the raw parsed result and usage
before the next call; and has no function that writes the activation registry.
Only the later main-owned activation step can add the tuple after the complete
held-out bar passes.

The fixture set includes:

1. a clean candidate with Minor/Suggestion bait — no false `not-met`, owner
   prompt, boundary pause, or blocker;
2. a real required `cN` failure — pending owner confirmation, then blocker;
3. an unreachable future-path failure for a local task — advisory;
4. an invented stricter expectation, forged scope/confidence, unrelated but
   valid evidence hash, and self-confirmation — no `waiting-owner` or blocker;
5. a broken test harness with a valid product result — repair the harness, not
   reject the product;
6. duplicate findings with one root cause — one pending resolution/blocker;
7. a false citation plus counterevidence — refuted;
8. prompt injection inside candidate/reference content — ignored as evidence;
9. missing evidence — `cant-tell`;
10. A/A comparison — tie or `cant-tell`, never a winner;
11. A/B and B/A held-out pairs — recorded order with no label preference; and
12. malformed critic output — `CRITIC_UNAVAILABLE`, never product failure;
13. a repair introduces an unpromised Minor regression — advisory; and
14. critic prose contains new requirements, tool commands, and prompt injection
    — the authoritative repair packet remains unchanged.

Activation is keyed to one secret-free `routeRequestFingerprintSha256` over the
exact base URL, provider identity, configured model, resolved model revision,
connection-consent version, transport revision, request-serializer hash, full
generation parameters, system-prompt hash, packet/TaskSpec/output schema
versions, policy hash, text modality, and `toolPolicy: "none"`. `Auto`, an
unresolved model alias, a provider with implicit server-side tools, or any
fingerprint mismatch fails closed. Any constituent change deactivates the route
until a newly approved held-out calibration passes.

Activation requires zero false `not-met`, `waiting-owner`, unscoped-boundary
pause, or blocker outcomes on the blocker-free held-out fixtures; advisory
Minor/Suggestion notes remain allowed. It also requires every planted
frozen-condition allegation to surface for confirmation, every response to parse
strictly, no unapproved request byte, and the declared call/time/output caps.
Failure keeps the live feature off and records which property failed; it does
not trigger an unbounded prompt-tuning loop.

## How we will know the design holds

- Mutating intent, any `cN`/`pN`, reference snapshot/state, supported path,
  candidate, or evidence without the one audited procedure-revision transition
  breaks the relevant hash and refuses continuation.
- Omitting outcome, any owner-stated requirement, or the supported-path
  non-regression `cN` fails reverse coverage; optional/off plus a critic-judged
  `cN` is invalid.
- A critic output with an unknown/missing/duplicate criterion, an invented
  `blocks` field, or an owner-verdict field fails closed.
- A critic allegation against its exact frozen `cN` condition derives
  `waiting-owner`; only the matching authenticated confirmation derives one
  blocker. Invented expectations, scope labels, confidence, self-confirmation,
  and unrelated valid evidence hashes derive none.
- A confirmation rendered without all supporting and counterevidence cannot
  authenticate; owner-judged `cN` observations work independently under
  required, optional, and off critic modes.
- Ten Minor/Suggestion findings outside `cN` derive zero blockers.
- Refuted and unresolved findings derive zero blockers.
- A critic-shaped fence from the builder, conductor, renderer, or project file
  cannot create an authenticated assessment.
- A critic assessment cannot author or prefill an owner verdict.
- A sealed DONE plus a later negative review leaves disposition, commit, log,
  moved claim, stone, verdict, and queue unchanged.
- A/A, swapped order, missing evidence, prompt injection, and call-cap fixtures
  return the fixed honest states above.
- Blocker-free calibration fixtures produce zero false `not-met`,
  `waiting-owner`, boundary pause, or blocker results.
- Required/optional/off critic modes follow their frozen owner-visible policy;
  only required decline/unavailability can withhold seal, and each critic or
  repair call still needs its own matching disclosure and owner approval.
- Tool-free transport sends only canonical `CriticRequestV1` under the existing
  eight-file/8,000-each/32,000-total tracked-text grant. Origin/exclusion/cap or
  final-body mismatches refuse; activation fails on any route/request fingerprint
  drift.
- Calibration-only calls accept preregistered synthetic fixture hashes while the
  live registry is empty and cannot activate themselves.
- Restart recovery resumes only an exact pending candidate and otherwise stops
  without sealing or discarding product work.
- Pending state blocks task, verdict, push preview, and push execute before IPC
  registration; round-0 and round-1 candidate bundles remain distinct.
- Sensitive, secret-like, linked, ignored, generated, or unbounded candidate
  content disables bundle/repair without copying it.
- Native boundary alerts deterministically pass, fail with the native reason, or
  stop `BOUNDARY_EVIDENCE_UNAVAILABLE`; they never wait indefinitely.

## Deliberately out of scope

- Parallel builders or critics. The product runtime remains serial.
- An unlimited evaluator/optimizer loop, aggregate “quality score,” or “zero
  findings” target.
- Letting the critic rewrite intent, add requirements, edit work, approve risk,
  choose a milestone, or speak as the owner.
- Automatically fetching an external reference. That needs a separate network
  and data-scope decision.
- Copying a reference's protected expression, branding, text, assets, or code.
- A persistent third model assignment. V1 may reuse an exact compatible route
  in a fresh tool-free call; a dedicated Critic role can be considered later.
- Production activation or substitution for a qualified human.
- Post-verdict revise automation. The one repair described here happens before
  seal against the unchanged Task Spec; the owner's recorded verdict remains
  unconsumed.

## Open at the real boundary

The owner has chosen to build the critic, not authorized a critic call or made it
mandatory for every task. The first live calibration and every later
paid/data-bearing call still pause with the exact provider, resolved model,
packet/fixture data, purpose, enforceable time/output limits, and honest billing
or quota basis. External reference acquisition similarly waits for a concrete
proposal that names what leaves the machine and how the snapshot is stored and
removed. V1 deliberately stays text-only inside the existing tracked-file
consent; allowing untracked files, external snapshots, or images would require a
separate owner decision and the contract's connection-scope renewal before any
such byte flows.

## Attribution

The reference-bar and builder/critic-loop inspiration comes from Jay E / Robo
Nuggets' [gauntlet-loop](https://github.com/robonuggets/gauntlet-loop), inspected
at commit `9b1975a1b8f01981f3f1e6b667ad3aaf907178ea`, which credits Matt Shumer's
Claude-of-Duty. That repository is licensed CC BY 4.0. Cairn does not copy its
prompt; this design adapts the underlying comparison idea and adds source-bound
intent, typed custody, a finite policy, real risk pauses, and honest STOPPED
outcomes.
