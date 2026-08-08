# Task 213 report - shared Task Review and Main-only owner checks, dark

**Lane:** A (the main checkout). **Base commit:**
`c77b86c06e5fe63014a6bb7886307d8fc2a0190d`.

The brief was claimed alone in commit `21861df`. This task implements
Prerequisite Q's Task Q5 only. Q6 and owner-verdict Plan 2 remain unstarted.
Task 212 remains unmerged on `lane/g` and was not modified or absorbed.

## What actually changed

Twenty-four Task 213 paths were touched across the brief-only claim and final
task commit:

- `docs/ai-work/tasks/213-brief.md` - the committed task claim and six stable
  checks.
- `core/src/critic.ts` - makes owner policy recognize the exact owner
  comparison procedure and requires both complete ordered planned artifact
  sets, so a one-sided candidate/reference observation cannot block.
- `core/test/critic.test.ts` - covers owner observation and comparison evidence
  under required, optional, and off critic modes, including missing,
  reordered, unplanned, wrong-kind, and wrong-judge evidence.
- `app/src/main/ownercheck.ts` (new) - adds Main's private pending/candidate
  Task Review authorities, exact one-use owner actions, branded owner
  observations and critic resolutions, full identity/render/evidence checks,
  and explicit invalidation.
- `app/src/shared/task-review.ts` (new) - defines and strictly parses the
  bounded output-only review and the authority-free owner action request.
- `app/src/renderer/components/TaskReview.tsx` (new) - provides the one shared
  source-marked Task Spec, evidence, owner-check, critic, preference, and
  budget view used by both owner-facing run surfaces.
- `app/src/main/conductor/qualityproposal.ts` - exports Main's existing safe
  Task Spec review recomposer so Q5 can derive display from the branded spec
  rather than trust a renderer copy.
- `app/src/shared/ipc.ts`, `app/src/preload.ts`, and `app/lab/mock-cairn.ts` -
  add only optional output review fields and one closed `dir`/opaque-action-id/
  decision call; no route or run request accepts Task Spec or evidence
  authority.
- `app/src/main/tasks.ts` - retains exact private review authority through the
  staged route lifecycle, rechecks it around asynchronous routing, consumes
  one owner action without letting a replay revoke its regenerated successor,
  invalidates it on proposal/run transitions, and keeps the worker handoff
  intent-only.
- `app/src/main/conductor/relay.ts` and `app/src/main/conductor/store.ts` -
  conditionally detach, cross-bind, authenticate, and persist an action-free
  terminal Task Review while preserving the exact legacy card object when the
  field is absent.
- `app/src/renderer/screens/Chat.tsx` and
  `app/src/renderer/screens/TaskRun.tsx` - render the same shared review in
  final review, accepted-run, and result contexts; send only the closed owner
  choice; and ignore late responses from an older or replaced preview.
- `app/tests-unit/ownercheck.test.ts`, `app/tests-unit/taskreview.test.ts`, and
  `app/tests-unit/taskreviewpaper.test.ts` (new) - cover private brands,
  project/run/spec/plan/candidate/assessment/finding/render custody, replay,
  staleness, all decision states and critic modes, hostile objects, strict IPC,
  both renderer surfaces, advisory preferences, and activation darkness.
- `app/tests-unit/resultcard.test.ts` - covers detached review round trips,
  connection-required cards, legacy omission, and forged action/request/
  criterion rejection before write and on authenticated read.
- `app/tests-unit/qualitypreviewpaper.test.ts` and
  `app/tests-unit/evidencepresentation.test.ts` - point the existing Quality
  Plan checks at the new shared component and preserve the legacy attribution
  accounting.
- `app/tsconfig.unit.json` - includes the new pure Main authority module in the
  App unit build.
- `docs/ai-work/tasks/213-report.md` - this report.
- `docs/ai-work/LOG.md` - one append-only Task 213 row.

The main implementation decisions were:

- The renderer never receives a Main brand. Its action contains exactly the
  project directory, a random opaque action id, and one closed observe/resolve
  choice. Main derives every `cN`, failure, plan, candidate, assessment,
  finding, render hash, and supporting/counterevidence relationship from its
  retained authority.
- A pending Task Spec can be shown before a candidate exists, but it has no
  action. Owner buttons appear only on the separately branded candidate seam,
  which currently has no production caller because Q6 owns the candidate
  lifecycle.
- A valid owner observation is bound to the current canonical project, run,
  branded Task Spec and Evidence Plan, candidate, owner-judged criterion,
  failure condition, procedure, complete displayed artifacts, and display
  render. Comparison observations must cover both ordered candidate and
  reference artifacts in both custody arrays.
- A critic `not-met` remains an allegation. Main can resolve it only against
  the exact branded assessment, finding, failure, full canonical finding
  render, and every supporting and counterevidence reference shown. A missing
  smallest-repair suggestion remains visibly missing rather than hiding the
  finding or inventing advice.
- One accepted action clears every token from that render and regenerates any
  remaining choices. Malformed, cross-project, stale, cloned, or replayed
  input cannot complete a row; a harmless replay also cannot destroy the new
  valid authority created by the first click.
- `pN` remains inside the source-marked plan as an advisory preference and
  never gains a criterion row or owner action. Every projection explicitly
  calls itself pre-seal evidence, not Cairn's DONE/STOPPED result or the
  owner's final verdict.
- Task Review fields are optional and conditionally assigned. With the empty
  activation registry, no production Task Spec/review is composed, route/run/
  card objects omit the fields, and `runSerialTask(dir, pending.intent, ...)`
  remains the exact worker handoff.

## Checks run and real results

Each result below answers the matching id in `213-brief.md`. Terminal output
was observed in Lane A and is not saved in the repository.

- **`c1` - one output-only review vocabulary on both surfaces. PASSED.** One
  strict `cairn-task-review/v1` projection wraps the exact source-marked Task
  Spec and adds every ordered `cN` state, evidence labels, and owner/critic
  state. The shared component renders it in Chat, manual Task Run, and result
  cards, including advisory `pN`, critic mode/reason, references/unknowns, and
  every fixed whole-run call/time/output/dollar-limit field. Plan-only,
  connection-required, accepted-run, and durable-card tests passed; absent
  authority omits every new property and retains the legacy render/card JSON.
- **`c2` - Main-authenticated owner observations. PASSED.** Candidate tests
  prove only the exact Main authority can mint a deeply frozen branded owner
  observation. Wrong/cloned spec or plan, project/run/candidate change,
  incomplete artifact registry, forged source, unplanned evidence, hidden
  fields, accessors, symbols, sparse arrays, and Proxies fail closed. Core now
  rejects omitted, one-sided, reordered, wrong-kind, and wrong-judge owner
  comparison evidence under all three critic modes.
- **`c3` - exact owner resolution of critic allegations. PASSED.** Confirm,
  dismiss, and `cant-tell` each mint one privately branded resolution bound to
  the exact assessment/finding/failure/render and complete ordered supporting
  and counterevidence. Until then the row says allegation and waits for the
  owner. Replay, old sibling tokens, direct authority fields, cross-project
  actions, structural clones, changed assessment/run/candidate custody, and
  late renderer responses cannot resolve or replace the current review.
- **`c4` - policy and semantic separation. PASSED.** Main-bound tests show an
  owner row completing without any assessment under required, optional, and
  off critic modes. A real `p1` remains visible only as an advisory preference
  and creates no criterion or action. Cairn/adapter/worker results cannot
  prefill an owner row; critic comments on non-critic rows create no action;
  and owner evidence exposes no disposition, seal, policy result, or verdict.
- **`c5` - strict IPC lifecycle and staleness. PASSED.** The shared parsers
  enforce exact dense records, contiguous `cN`/`pN`, Core's full v1 source and
  dimension caps, valid UTF-16, fixed budgets, unique actions, judge/state
  relationships, and no hidden/accessor/Proxy data. Main checks exact authority
  before run both before and after asynchronous route work, retires it at
  acceptance or replacement, and persists no action token. Chat and Task Run
  bind asynchronous action responses to the current route generation/preview
  and suppress duplicate in-flight choices.
- **`c6` - verified isolation and regression safety. PASSED.** The complete
  Core command passed 254/254. App typecheck passed; the complete App unit run
  reported 650 tests: 648 passed, 0 failed, and the same 2 Windows-only cases
  skipped. Main, preload, and renderer production bundles built. Focused Q5
  authority/parser/persistence/renderer tests passed 43/43. `git diff --check`,
  exact status/path inspection, darkness searches, and two independent final
  read-only audits passed with no blocker and no Task 212 path in the diff.

The decisive commands and final results were:

```powershell
cd core
npm.cmd test
# pass; 254 tests, 254 passed, 0 failed

cd ..\app
npm.cmd run typecheck
# pass

npm.cmd run test:unit
# pass; 650 total, 648 passed, 2 platform skips, 0 failed

npm.cmd run build:vite
# pass; Main, preload, and renderer production bundles built

cd ..
git diff --check
# exit 0; no output

rg -n 'QUALITY_PREVIEW_ACTIVATION_IDENTITY|composeCandidateTaskReviewAuthority|runSerialTask\(dir, pending\.intent' `
  app/src/main/tasks.ts app/src/main/ownercheck.ts app/src/main/criticactivation.ts
# activation identity remains literal null; candidate authority has no
# production caller; the live worker handoff remains intent-only
```

The first Vite attempt inside the restricted filesystem view could not read
the repository's parent/config path. The required rerun used the same local
build command with filesystem sandbox elevation, exited zero, and made no
tracked source change.

No dependency/install, provider/model/network call, credential use, real app
or E2E run, external write, push, publish, or deployment occurred.

## How to try it

There is intentionally no visible production change yet. The critic activation
registry is empty and Q6 has not supplied a candidate authority, so opening
Cairn follows the existing v8 proposal and intent-only worker route. A
maintainer can safely run the Core and App commands above. The fake/unit tests
show the same accepted Task Spec on Chat and manual Task Run, then exercise the
exact owner observation and critic-resolution buttons without contacting a
provider.

## Limitations and remaining human judgment

- Q5 is deliberately dark. The accepted plan-only review is staged behind
  Q3's inactive Task Spec route; owner actions remain unavailable until Q6
  supplies a real current candidate, evidence plan/results, and artifact
  display registry.
- This task creates pre-seal evidence only. It does not decide evidence
  completeness, run a critic, repair a candidate, derive a final seal, change
  Cairn's envelope disposition, or record the owner's later verdict.
- Terminal cards persist an action-free review. Live one-use owner actions
  belong only to the current Main authority and are intentionally not replayed
  from project-owned conversation storage.
- The task intentionally used fake/unit/build checks only, not the shared real
  app/E2E profile.
- Task 212 remains on `lane/g`; owner-verdict Plan 2 has not begun.

**Disposition: DONE**
