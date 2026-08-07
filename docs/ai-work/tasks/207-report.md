# Task 207 report — quality intent and a calibrated critic before Plan 2

**Lane:** A (the main checkout). **Base commit:**
`93e504d63026ea562c77fb36e68295f8c7e96827`.

The brief was claimed alone in commit `0fc01a6`. This task is the documentation
prerequisite the owner requested: it keeps a fresh critic, but gives that critic
no power to reject work for taste, polish, or a requirement it invented.

## What actually changed

Six files, all Task 207 records or design documentation. No product runtime,
contract, dependency, generated artifact, provider configuration, or consent
changed.

- `docs/ai-work/tasks/207-brief.md` — the committed task claim and its six
  stable checks.
- `docs/superpowers/specs/2026-08-07-cairn-quality-intent-and-critic-design.md`
  (new) — the complete Quality Plan, frozen Task Spec, critic protocol,
  evidence/custody model, finite repair loop, recovery rules, calibration gate,
  and owner-visible states.
- `docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md`
  (new) — ten serial implementation tasks, Q1 through Q10, with concrete files,
  tests, interfaces, commits, and stop conditions.
- `docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md` — puts
  Prerequisite Q after completed Plan 1 and before Plan 2, fixes the stale
  `197.c4` example to `c4`, makes its JSON example valid, and keeps critic
  advice separate from the owner's authenticated verdict.
- `docs/ai-work/tasks/207-report.md` — this report.
- `docs/ai-work/LOG.md` — one append-only Task 207 row.

The design credits Gauntlet Loop at upstream commit
`9b1975b0fa2a9173faaa7f55e5cc62d0117cf0a8` under CC BY 4.0. Cairn adopts the
useful pattern — explicit intent plus an independent critic — but copies no
upstream prompt and does not adopt its open-ended rejection loop.

## Checks run and real results

Each result below answers the matching id in `207-brief.md`. Terminal output was
observed in Lane A and is not saved in the repository.

- **`c1` — visible Quality Plan from intent through verification. PASSED.** The
  design defines a versioned `TaskSpecV1` and `QualityPlanV1`. Required `cN`
  promises retain owner/contract provenance; advisory `pN` preferences retain
  uncertainty instead of silently becoming gates. It also carries optional
  comparison references, per-criterion evidence methods, explicit unknowns,
  reverse coverage from every owner-stated requirement, and four separate axes:
  envelope integrity, requested-outcome acceptance, comparative quality, and
  owner judgment. An inferred outcome cannot become authority until the owner
  adopts it in a new authenticated turn.
- **`c2` — critic authority is exact, bounded, and testable. PASSED.** The
  canonical packet/request/output/assessment schemas define per-check
  `met`/`not-met`/`cant-tell`, a closed finding taxonomy, typed evidence,
  burdens of proof, canonical fingerprints, and deterministic transitions.
  A model allegation cannot block itself: a frozen required-check failure needs
  matching authenticated owner evidence or a named native verifier result.
  The five native risk/custody alerts delegate to their real verifier and cannot
  become a generic regression veto. Advisory/minor/polish findings stay visible
  but can never reject or demand repair by themselves.
- **`c3` — separation, consent, budget, and plateau behavior. PASSED.** Critic
  mode is visibly frozen per task as required, optional, or off; optional/off
  reject any critic-judged required criterion, while required mode needs an
  owner-stated or contract basis. The critic is a tool-free, text-only call over
  the existing connected-conductor transport and existing consent limits: at
  most eight tracked text files, 8,000 characters each and 32,000 selected
  characters total, with the existing credential/ignored/link/binary/generated/
  outside-project exclusions. Every paid call still pauses separately. One
  initial builder attempt, at most one repair, at most three critic attempts,
  zero external-evidence calls, exact time/output caps, honest unknown dollar
  cap, and terminal plateau states prevent an endless loop. The critic cannot
  edit files, change intent, approve risk, write an owner verdict, or seal work.
- **`c4` — owner-verdict prerequisite and schema consistency. PASSED.** The
  owner-verdict spec now names Prerequisite Q between completed Plan 1 and Plan
  2 and states that Plan 2 may neither be written nor started until Q10 is DONE.
  Decision 2 still makes the owner's verdict record-only; `adviceSeen` can pin
  at most three authenticated, actually rendered assessments without treating
  them as evidence or agreement. The example is valid JSON and uses stable
  `c4`, not stale task-numbered `197.c4`.
- **`c5` — executable serial plan with real boundaries. PASSED.** Q1–Q9 are
  dark/offline implementation tasks covering schemas, intent compilation,
  evidence planning, packet custody, parsing/policy, repair/recovery, durable
  pending gates, UI, and the calibration harness. Each names concrete files,
  tests, commands, commit boundaries, and a stop condition. Q10 is the only
  paid/data-bearing calibration step: it requires the owner's approval of the
  exact route, resolved model, preregistered synthetic fixture hashes, at-most
  16 one-fixture calls, caps, and billing basis. A decline or any held-out
  failure stops Q10 and leaves Plan 2 unstarted. Production activation and
  wider/reference acquisition remain future owner decisions.
- **`c6` — citations, independent review, and repository hygiene. PASSED.** A
  base-commit validator extracted 36 explicit `path:line[-line]` citations from
  the three documents; all 36 paths existed at the base commit and every range
  was within that file. The remaining path, history, license, and upstream
  citations were read directly while drafting. Three independent read-only
  reviews challenged the design. Their findings drove repairs to self-blocking,
  reverse coverage, mode provenance, consent limits, owner observations,
  canonical request custody, calibration isolation, restart/push gates, Kimi
  custody, preservation, advice authentication, and citation accuracy. Two
  final reviews against the exact current hashes found no blocker against
  `c1`–`c6`; one additionally confirmed the last two line wraps were semantic
  no-ops. No reviewer edited the files.

The decisive read-only commands and their results were:

```powershell
git diff --check
# exit 0; no output

$paths = @(
  'docs/superpowers/specs/2026-08-07-cairn-quality-intent-and-critic-design.md',
  'docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md',
  'docs/superpowers/specs/2026-08-07-cairn-owner-verdict-design.md'
)
foreach ($path in $paths) {
  (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash
  (Select-String -LiteralPath $path -Pattern '^```').Count
  (Select-String -LiteralPath $path -Pattern '[ \t]+$').Count
}
# SHA-256: F967DED7…FA34, F1C5BF6E…BAA, E20E6CF1…104D
# fences: 12, 0, 2 (balanced); trailing-whitespace matches: 0, 0, 0

git diff --no-index --check -- NUL docs/superpowers/specs/2026-08-07-cairn-quality-intent-and-critic-design.md
git diff --no-index --check -- NUL docs/superpowers/plans/2026-08-07-cairn-quality-intent-and-critic-prerequisite.md
# the expected no-index "different" status, with zero whitespace diagnostics
```

The citation validator used base
`93e504d63026ea562c77fb36e68295f8c7e96827`, extracted references with
`[A-Za-z0-9_./-]+\.[A-Za-z0-9]+:[0-9]+(?:-[0-9]+)?`, read each path through
`git show <base>:<path>`, and checked each cited endpoint against its line
count: **36 references, 0 failures**. A stale-form scan across the three
documents found **0 matches** for `197.c4`, Q1–Q7/Q7-DONE sequencing, the old
six-alert taxonomy, a generic regression escape hatch, automatic "best local"
recovery, a claimed hard dollar quota, a Codex critic, or physical-read-only
claims.

No runtime test suite was run because this task changes documentation only. No
network/provider/model call, dependency action, external write, or push was
performed.

## How to try it

Read the quality-intent design first, then the Q1–Q10 prerequisite plan. The
safe next implementation unit is Q1 only. Do not begin owner-verdict Plan 2
until Q10 has a DONE report. Task 206 remains entirely in Lane E and can land
serially after this task leaves `main` clean.

## Limitations and remaining human judgment

- This task makes the critic implementable; it does not activate or call one.
- V1 deliberately supports only consented tracked text. Images, untracked
  evidence, wider file scope, and external-reference acquisition require a
  later owner decision and, where applicable, connection-scope renewal.
- Q10's live calibration is a future paid/data-bearing boundary. Passing it is
  necessary for this route and model tuple to become eligible; production
  activation remains excluded from the prerequisite.
- The owner-verdict Plan 2 implementation has not begun.
- Task 206 was not merged, amended, staged, or otherwise touched.

**Disposition: DONE**
