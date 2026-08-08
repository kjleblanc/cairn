# Task 210 report - source-marked Task Spec proposal preview, dark

**Lane:** A (the main checkout). **Base commit:**
`2484be530cfeb093f24f181fa7493bd3009cbb88`.

The brief was claimed alone in commit `0b4028b`. This task implements
Prerequisite Q's Task Q3 only. Q4 and owner-verdict Plan 2 remain unstarted.

## What actually changed

Eighteen Task 210 paths were touched across the brief-only claim and final
task commit:

- `docs/ai-work/tasks/210-brief.md` - the committed task claim and six stable
  checks.
- `app/src/main/conductor/constitution.ts` - keeps the complete live v8
  constitution byte-for-byte and adds a staged v9 quality-proposal protocol.
- `app/src/main/conductor/taskblock.ts` - adds the strict staged
  `{intent,quality,risks}` control parser without changing the live v8 parser.
- `app/src/main/conductor/qualityproposal.ts` (new) - parses bounded
  content-only quality proposals, binds them to authenticated owner intent,
  assigns Main-owned ids and coverage, and returns a branded frozen Task Spec
  plus its output-only review.
- `app/src/main/conductor/service.ts` - stages conversation proposal binding,
  source reauthentication, exact proposal/spec identity checks, and set-aside
  rebinding behind the default-off activation decision.
- `app/src/main/tasks.ts` - stages the direct-task composer and preserves the
  exact Task Spec/preview identity through route review and consume, again
  behind the default-off decision.
- `app/src/shared/quality-preview.ts` (new) - defines the deliberately narrow
  owner-readable projection with no Task Spec hash, source ids or offsets,
  reference locators or hashes, state ids, or failure/artifact ids.
- `app/src/shared/ipc.ts` - adds that projection only to optional Main output;
  route and run requests accept no Task Spec or quality data.
- `app/src/renderer/screens/Chat.tsx` - renders the same source-marked Quality
  Plan vocabulary on proposal and dispatch review when Main supplies it, with
  the inactive branch's existing review and approval copy unchanged.
- `app/tests-unit/qualityproposal.test.ts` (new) - exercises strict parsing,
  exact source binding, coverage, mutation/staleness, critic mode, direct-task
  refusal, hostile objects, and the adversarial authority attacks found during
  review.
- `app/tests-unit/qualitypreviewpaper.test.ts` (new) - proves the projection is
  output-only and the renderer sends none of it back as authority.
- `app/tests-unit/taskblock.test.ts` - covers the staged exact envelope and
  confirms live v8 parsing remains invariant.
- `app/tests-unit/constitution.test.ts` - pins the unchanged v8 bytes and the
  staged source-honest/refusal rules.
- `app/tests-unit/criticactivation.test.ts` - pins the only two staged callers,
  literal-null fail-closed identities, and unchanged intent-only worker handoff.
- `app/tests-unit/evidencepresentation.test.ts` - updates the existing static
  presentation boundaries for the optional preview surface.
- `app/tsconfig.unit.json` - includes the new pure Main composer in the unit
  build.
- `docs/ai-work/tasks/210-report.md` - this report.
- `docs/ai-work/LOG.md` - one append-only Task 210 row.

The main implementation decisions were:

- A required check is not inferred from similar words. Each accepted `cN`
  cites exactly one authenticated `owner-stated` row, copies that exact owner
  span, and covers every required row exactly once. Main accepts only its fixed
  failure/proof templates, null precondition, Cairn judge, and adapter
  attestation. The supported path can designate only one of those exact rows.
  This replaced an early lexical/polarity approach after adversarial examples
  showed that action verbs, double negatives, and short implementation names
  could otherwise reverse or widen owner authority.
- Main alone assigns contiguous `cN`/`pN`, failure and artifact ids, reverse
  coverage, critic basis, the fixed whole-run budget, and the branded canonical
  Task Spec. Plain proposals, structural clones, renderer data, and altered
  authenticated sources cannot substitute for those objects.
- `owner-unsure` and `cairn-chosen` rows remain preferences or unknowns. They
  cannot enter the required-check set, and ordinary proposal approval creates
  no promotion path.
- Critic required/optional/off is independently derived from exact owner text.
  Silence stays optional; contradictory wording and global approval/veto power
  refuse; the conductor cannot assign an owner or critic judge to a required
  row. A required critic remains a separate future inspection, not a global
  seal verdict.
- Q3 has no authenticated reference-snapshot seam, so every nonempty reference
  request refuses instead of inventing a locator or hash. Common unavailable
  screenshot, mockup, Figma, URL-copy, and named-reference wording is also
  rejected by direct composition.
- Both staged production callers pass literal `null` into Task 208's private
  activation registry. Because its registry is empty, service uses the exact
  v8 prompt/parser and tasks omit every new optional field. The worker call is
  still exactly `runSerialTask(dir, pending.intent, ...)`; count, environment,
  feature-flag, and caller-supplied activation shortcuts do not exist.
- The renderer receives only a structured-cloned review. It never receives the
  branded Task Spec and cannot put quality data in `TaskRouteRequest` or
  `TaskRunRequest`. A dispatch review accepts its preview only from Main's exact
  route response, never by copying the proposal card.
- Conversation route/run re-read authenticated history and validate the frozen
  spec hash. Proposal replacement, source edits, risk settlement, route
  generation changes, object substitution, and consume all stale the old
  review. Set-aside preserves the exact quality proposal and rebinds it to the
  replacement intent instead of letting a model silently rewrite quality.

## Checks run and real results

Each result below answers the matching id in `210-brief.md`. Terminal output was
observed in Lane A and is not saved in the repository.

- **`c1` - strict content-only conductor protocol. PASSED.** The staged parser
  accepts one exact versioned shape and rejects extra authority keys, ids,
  hashes, offsets, source labels, verdicts, custody, accessors, hidden keys,
  symbols, Proxies, sparse arrays, malformed UTF-16, oversized text/arrays,
  invalid judge/evidence pairs, and nonempty reference requests. The staged
  constitution asks or refuses for vague/delegated quality, missing standards,
  unavailable references, or unsupported global critic power. The live v8
  constitution hash/length and parser results remain pinned.
- **`c2` - authenticated conversation binding and stale previews. PASSED.**
  Main requires one exact owner-span promise per owner-stated row, complete
  unique reverse coverage, one exact supported-path row, fixed failure/proof,
  and Main-closed judge/evidence. It assigns contiguous ids, binds a branded
  frozen Task Spec, preserves exact source quotes in the review, and rejects
  plain/cloned proposals, owner-unsure/Cairn-chosen checks, unrelated material,
  inverted verbs or polarity, double negation, model-selected owner/critic
  judges, altered proposal bytes, and edited authenticated history.
- **`c3` - direct manual proposal. PASSED.** A branded direct intent produces
  exactly one owner-sourced non-regression `c1`, no inferred preference,
  reference, or unknown, the fixed budget, and optional critic unless exact
  owner words require or switch it off. Vague taste, open-ended delegation,
  cross-dimension standards, unavailable screenshots/mockups/designs, global
  critic verdicts, forged intent clones, and ambiguous critic wording refuse;
  bounded latency, WCAG, explicit transformations, literal UI copy,
  self-hosting contract words, and ordinary links/settings remain usable.
- **`c4` - output-only owner-readable review. PASSED.** The shared projection
  and pure Chat view show request/source, supported path, every required `cN`,
  advisory `pN`, reference/unknown vocabulary, critic mode/reason, evidence
  meaning, and every fixed call/time/output/dollar-limit field in plain
  language. Static IPC tests prove route/run inputs contain no Task Spec,
  quality, criteria, or preference field and the view exposes no internal
  hashes, ids, offsets, locators, or custody.
- **`c5` - empty-registry darkness and legacy invariance. PASSED.** The exact
  activation allowlist contains only `service.ts` and `tasks.ts`; each calls
  `criticActivationStatus` once with literal null. No activation count, switch,
  environment input, mutator, or Q4 critic/candidate/repair caller exists.
  Inactive prompt, parser, action/route output keys, approvals, and the
  intent-only serial worker handoff remain on the existing path.
- **`c6` - focused/full/build/isolation/review. PASSED.** The final focused Q3
  run passed 128/128. App typecheck passed. The final complete App unit run
  reported 619 tests: 617 passed, 0 failed, and the same 2 Windows-only cases
  skipped. The production Main, preload, and renderer Vite build passed. `git
  diff --check`, exact status/diff review, darkness searches, and two
  independent read-only audits passed. The composer audit repeatedly found and
  drove repairs for borrowed material, polarity/action inversion, unbound
  artifact descriptions, critic copy/negation/global-verdict wording,
  reference/standard gaps, failure/evidence inversion, vague conversation
  rows, and model-selected judges before reporting no remaining blocker; the
  integration audit reported no activation or renderer-authority escape.

The decisive commands and final results were:

```powershell
cd app
npx.cmd tsc -p tsconfig.unit.json
node --test dist-unit/tests-unit/qualityproposal.test.js `
  dist-unit/tests-unit/taskblock.test.js `
  dist-unit/tests-unit/constitution.test.js `
  dist-unit/tests-unit/criticactivation.test.js `
  dist-unit/tests-unit/qualitypreviewpaper.test.js `
  dist-unit/tests-unit/evidencepresentation.test.js
# pass; 128 tests, 0 failures

npm.cmd run typecheck
# pass

npm.cmd run test:unit
# pass; 619 total, 617 passed, 2 platform skips, 0 failures

npm.cmd run build:vite
# pass; Main, preload, and renderer production bundles built

cd ..
git diff --check
# exit 0; no output

rg -n 'composeCriticRequest|composeCriticAssessment|deriveCriticPolicy|candidateRound|activeCriticActivationCount' `
  app/src/main/conductor/service.ts app/src/main/tasks.ts
# exit 1; no Q4+ or count-gate caller
```

The first Vite attempt inside the restricted filesystem view could not read
the repository's parent/config path. The required final rerun used the same
local build command with filesystem sandbox elevation, exited zero, and made no
tracked source change. No dependency/install, network/provider/model call,
credential use, real app/E2E run, external write, push, publish, or deployment
occurred.

The final primary implementation evidence was:

```text
39C5BCF56545114D3A850F4C2469FAA1A909399D8AEAD74E7CED9688779E1085  app/src/main/conductor/qualityproposal.ts
6A6CA00AFB15BCF7E9F9324434AB4DC9539C3C227742B0C7221D618602B1E01F  app/tests-unit/qualityproposal.test.ts
E5D7EE14EEA54AE471C5822E310DBE2FA42CFA2FECCEAD79C269CC618B8A4BBB  app/src/shared/quality-preview.ts
```

## How to try it

There is intentionally no visible production change yet: Task 208's activation
registry is empty, so opening Cairn follows the existing v8 proposal and task
route. A maintainer can safely rerun the focused and full commands above. The
new pure composer tests show both conversation and direct proposals producing
the same source-marked frozen preview without making a provider call.

## Limitations and remaining human judgment

- Q3 is deliberately dark. A later calibrated exact activation identity is
  required before the staged prompt/parser or either Task Spec producer can be
  reached in normal use; a count or feature flag is not sufficient.
- Required quality is intentionally conservative: only exact authenticated
  owner words can become `cN`. A conductor refinement remains advisory or
  unresolved until the owner adopts it in a new authenticated turn.
- Reference capture, worker evidence contracts/claims, repairs, critic packet
  selection, run-surface evidence UI, held-out paid calibration, and activation
  belong to Q4-Q10 and are not implemented here.
- Direct inspectability is a fail-closed local language boundary, not a model
  judgment. Requests that depend on taste, a missing standard, or an external
  reference should go through conversation and may still need an owner answer.
- The task intentionally ran fake/unit/build checks only, not the real app or
  E2E profile shared with the owner.
- Owner-verdict Plan 2 has not begun.

**Disposition: DONE**
