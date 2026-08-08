# Task 211 brief - bind worker Task Spec, evidence, claims, and records

**Lane:** A (the main checkout). **Base commit:**
`da37d9f135914660197295f94626673bb40ff477`.

## Requested visible outcome

Implement Prerequisite Q's Task Q4 only: a fake compatible worker receives and
returns the same authenticated Task Spec hash, while adapter events, worker
claims, the report, the saved record, and the result-card data answer the same
`cN` ids without confusing worker assertions, criterion evidence, or Cairn's
envelope verification.

## Boundary of intent

- Preserve Task 210's default-off production behavior and every existing
  intent-only route while the activation registry is empty. Do not activate a
  Quality Plan, a critic call, a candidate/repair loop, or a new live UI path.
- Change only Q4's worker contract, evidence, claim, record, adapter-capability,
  and corresponding fake/unit-test seams. Q5-Q10 and owner-verdict Plan 2 stay
  unstarted.
- Main may authenticate only predeclared exact command hashes and exits that
  arise from a compatible adapter's real process-event stream. Evidence prose
  is inert data and is never executed. Kimi stays ineligible when a required
  criterion needs an event it cannot authenticate.
- Keep worker assertions and envelope results distinct from
  `CriterionResultV1`; no worker or renderer payload may mint Cairn, critic,
  owner, seal, disposition, or record authority.
- Preserve legacy record readability without letting a legacy record appear
  Task-Spec-bound or critic-ready. Do not add or update dependencies, make a
  provider/model/network call, run the shared real app/E2E profile, use a
  credential, or write outside this repository.

## Checks

1. **`c1` - Task Spec custody across the worker envelope.** The staged
   `cairn-serial-task/v4` authorization, disclosure, request, `worker-result/v3`,
   claim, and record shapes carry and recheck one exact `taskSpecSha256` as
   well as the request hash; missing, wrong, substituted, cloned, or legacy
   hashes cannot validate as the new path.
2. **`c2` - source-honest brief and result vocabulary.** `briefText()` renders
   every required `cN` and a visibly separate advisory `pN` section, and the
   fake worker, claims, report/card projection, and record preserve the same
   ids without treating preferences as DONE gates.
3. **`c3` - authenticated command-event evidence.** Only a predeclared exact
   command hash plus its real compatible-adapter process event and exit can
   produce an attestation. Forged claims, missing events, wrong hashes,
   duplicate attestations, altered exits, unchosen successful commands, and
   executable-looking evidence prose fail closed or remain explicitly
   unauthenticated claims.
4. **`c4` - adapter eligibility and authority separation.** Routing refuses an
   adapter, including today's Kimi stream, when a required `cN` needs an event
   that adapter cannot authenticate. Worker-authored envelope, critic,
   criterion-result, verdict, seal, or disposition fields are rejected or
   retained only as non-authoritative worker claims; Main never promotes them
   to Cairn verification.
5. **`c5` - records and compatibility.** New records retain exact Task Spec,
   request, criterion, claim, and envelope-result custody. Legacy records still
   load under their historical schema but expose no Task Spec/critic readiness
   and cannot be parsed or upgraded as the new authenticated record merely by
   structural resemblance.
6. **`c6` - verified isolation and regression safety.** Focused and full Core
   tests, focused App adapter/evidence/card tests, App/Core typechecks and
   builds as applicable, diff/status inspection, dark-path searches, and
   independent adversarial/integration reviews pass with the activation
   registry empty and Q5/Plan 2 absent.

## DONE and STOPPED

**DONE** means all six checks pass, one honest report and one append-only log
row record the evidence, the Q4 paths land in one exact-path final commit, and
main is clean. **STOPPED** means any result can validate against intent while
losing the Quality Plan hash, any adapter/worker assertion is promoted to Cairn
verification without authenticated process evidence, protected work changes,
or completing the task would cross the stated boundary.
