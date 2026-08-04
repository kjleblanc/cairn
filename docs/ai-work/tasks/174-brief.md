# Task 174 brief - Plan 4: where answers come from

**Lane:** B

**Base commit:** `98e2f8c19053c653d6ec3a6d0e4d6561e586a0da`

## Requested visible outcome

Write and independently review the fourth and final implementation plan from
the owner-approved **Showing, Not Asking** design. Plan 4 must turn Decisions
5-6 into an implementation-ready sequence against Cairn's current code after
Tasks 169-173:

- an owner can answer **I'm not sure - you decide** without being forced to
  manufacture certainty;
- Cairn can notice a hedged answer, say that interpretation aloud, and leave it
  easy to correct;
- every task requirement records whether **You said so**, **You weren't sure**,
  or **Cairn chose**;
- that source marking survives conversation persistence and reaches the exact
  worker brief without changing the owner's wording; and
- the result card gains the source-marked **What you asked for** section that
  Decision 1 deliberately deferred from Task 173.

The plan must reconcile the existing constitution's "Never invent values"
rule with the approved boundary: Cairn may choose when the owner delegates a
choice, but may never attribute its own value to the owner.

## Boundary of intent - what must not change

- **Plan only.** No product source, runtime behavior, schema, prompt, test, or
  dependency changes in this task.
- **Approved design.** The nine decisions in
  `docs/superpowers/specs/2026-08-02-cairn-showing-not-asking-design.md` remain
  the product authority. The plan may resolve implementation details but may
  not silently make a new owner decision.
- **Verbatim owner input.** Existing owner words and exact requested values
  remain intact. Attribution is additional provenance, never a rewrite.
- **Trust boundary.** The conductor may propose and classify; only Cairn's
  deterministic envelope may authenticate what reaches the result card and
  worker task. A model-authored label alone cannot become verified provenance.
- **Risk and dispatch.** Provider consent, paid-call approval, task dispatch,
  serial execution, Git verification, result-card authorship, and every
  concrete-risk pause remain unchanged.
- **Compatibility.** Existing conversations, proposals, result cards, task
  records, and phone snapshots must remain readable. Missing attribution must
  be shown honestly, not guessed or upgraded.
- **Task 173 custody.** Checked pictures, album paging, terminal capture timing,
  and evidence disclosure boundaries remain intact.
- **Appearance.** Task 171's Lantern on Water layout, approved palette, face
  geometry, existing breakpoints, and reduced-motion behavior remain intact.
- **External actions.** No real or paid model call, eval run, credential use,
  publish, push, dependency change, or external write is part of this task.

## Plan for this planning task (AI decisions)

1. Trace the live path from owner turn and follow-up question through proposal,
   accepted dispatch, Core task details, worker prompt, envelope-authored card,
   persistence, phone projection, and conductor commentary.
2. Identify the smallest authenticated data shape that can preserve verbatim
   requirements and their source without treating free-form model output as
   trusted state.
3. Write Plan 4 as ordered, red/green implementation steps with exact files,
   seams, compatibility rules, and focused checks.
4. Test the written plan against adversarial cases: hedging that is not
   delegation, delegation without a value, Cairn choosing a value, edited or
   replayed proposals, stale conversations, missing provenance, forged worker
   claims, and narrow/phone/result-card presentation.
5. Ask independent reviewers to challenge product fidelity, trust/custody,
   migration behavior, sequencing, and whether each claimed check would prove
   the visible outcome. Correct every concrete defect or record an unresolved
   owner decision and stop.

## Checks that will show the outcome holds

1. The plan maps every part of Decisions 1, 5, and 6 to current files and an
   executable check, while naming what remains out of scope.
2. The plan names one authoritative source for each attribution fact and shows
   how it crosses every persistence/process boundary without trusting renderer
   or worker claims.
3. Legacy/missing data, malformed data, duplicate or stale turns, hedged-but-
   not-delegated wording, explicit delegation, and conductor choice all have
   fail-closed behavior and tests.
4. Existing provider-data consent and Task 172 briefing limits are analyzed;
   the plan does not widen data sent to a provider without naming the consent
   consequence.
5. Result-card, narrow-window, accessibility, phone, reload, and worker-brief
   behavior have concrete unit or fake-only Electron checks.
6. At least two independent reviews report no remaining concrete blocker after
   corrections. `git diff --check` is clean and final status contains only the
   disclosed Task 174 plan and record paths.

## DONE and STOPPED

- **DONE:** an implementation-ready, independently reviewed and corrected Plan
  4 is committed with this brief, one report, and one log row; it preserves all
  boundaries above and changes no product source.
- **STOPPED:** a required behavior still depends on an unmade owner decision,
  current code cannot carry attribution without widening an unapproved risk or
  data boundary, reviewers find an unresolved trust or migration defect, or
  the task cannot be isolated from protected work. The exact smallest owner
  choice or follow-up is recorded.
