# Task 174 report - Plan 4: where answers come from

**Lane:** B

**Base commit:** `98e2f8c19053c653d6ec3a6d0e4d6561e586a0da`

**Brief commit:** `1567584`

**Milestone moved:** NO

## Outcome

Plan 4 is written, independently reviewed, corrected, and implementation-ready.
It completes the planning set behind the owner-approved **Showing, Not Asking**
design without changing product behavior.

The corrected plan gives **I’m not sure — you decide** a real structured path,
keeps a tentative answer visibly correctable, and defines the three exact
owner-facing source labels: **You said so**, **You weren’t sure**, and **Cairn
chose**. It carries the source-marked request through a main-owned one-time
preview into Core, both workers, every report path, the authenticated result
card’s **What you asked for** section, reload, commentary, and the phone.

The most important correction is the trust boundary. The first draft let the
conversation model repeat an `ownerText` string and called it verbatim. The
final plan instead makes new owner turns main-authenticated outside the
worker-writable project. The model supplies only a candidate quotation; main
must bind it to an exact source span before a proposal exists. The final Start
or offline-Run press then atomically consumes a main-held preview. What the
envelope can honestly prove is the exact owner source text, the interpretation
shown, and the source-marked request accepted for that run — not the owner’s
private state of mind.

The plan also closes the existing defect where a chat run currently continues
when trusted proposal consumption returns `null`. Missing, stale, concurrent,
edited, wrong-conversation, wrong-risk, cancelled-preview, adapter-switched,
and replayed inputs all receive explicit pre-work checks. Manual App input and
the shipped CLI use the same frozen request, so the offline path cannot bypass
the binding merely because it has no paid-call disclosure.

## What changed

- `docs/ai-work/tasks/174-brief.md` claimed Task 174 in clean lane B and fixed
  the planning outcome, compatibility, trust, consent, and review boundaries.
- `docs/superpowers/plans/2026-08-04-cairn-answer-attribution.md` preserves the
  first implementation-plan draft as review evidence.
- `docs/superpowers/plans/2026-08-04-cairn-answer-attribution-corrected.md`
  supersedes that draft with the complete corrected plan.
- This report and the Task 174 `docs/ai-work/LOG.md` row are the task memory.

No product source, runtime schema, prompt, dependency, project fact, milestone,
test, or fixture changed in Task 174.

## Review and correction record

Three independent read-only reviews challenged the first committed draft from
different angles: the data/trust/Core path; product, UI, accessibility, phone,
and E2E behavior; and a fresh end-to-end implementation audit.

Their concrete findings were corrected in the superseding plan:

- model-written quotations became authenticated owner-turn spans;
- ordinary context stopped masquerading as a sourced requirement;
- the current 2,000-character details capacity, raw manual whitespace, and
  explicit 300/301/2,000/2,001 direct-input behavior were pinned;
- acceptance moved from **Send to dispatch** to the final Start/Run consume;
- passive question memory and authenticated inert answer/risk/correction
  context were added;
- manual preview IDs, adapter binding, multiple-risk IDs, delayed-route and
  concurrent-run barriers were added;
- Core’s two report families and every close path were named;
- the App/Core/adapter/CLI signature migration became one green vertical slice;
- hostile getter/proxy/prototype validation and nested freezing were specified;
- settled announcements and all success/failure focus destinations were added;
- Kimi’s full prompt proof moved to the Core suite because the Windows E2E shim
  intentionally exposes only the first multiline argv line; and
- `core/package.json` now belongs to the plan so the new intent suite is
  enumerated and actually runs rather than merely compiling.

All three reviewers re-read the final corrected HEAD and reported **no
remaining blocker**. No reviewer edited the files.

## Checks run and real results

1. Independent plan reviews
   - Passed: three independent reviews, correction rounds, and final re-reviews
     ended with no remaining trust, product, compatibility, accessibility,
     sequencing, consent, or executable-proof blocker.
2. `cd core && npm.cmd test`
   - Passed on the locally allowed decisive run: 151 tests, 151 passed, 0
     failed. A first restricted-sandbox diagnostic held open at the known
     Windows child-process watchdog boundary and was terminated; it produced no
     contradictory test result. The same suite with its local watchdog process
     controls exited cleanly in 39.6 seconds.
3. `cd cli && npm.cmd test`
   - Passed: 18 tests, 18 passed, 0 failed.
4. `cd app && npm.cmd run test:unit`
   - Passed: 308 tests total, 306 passed, 0 failed, with the same two
     platform-specific Windows skips.
5. `cd app && npm.cmd run typecheck`
   - Passed with no TypeScript errors.
6. `cd app && npm.cmd run build:vite`
   - Passed: main, preload, and renderer production bundles built. The first
     restricted attempt could not traverse to Vite’s worktree configuration;
     the identical locally allowed command passed.
7. `cd app && npm.cmd run build:lab`
   - Passed: the design-lab production bundle built under the same local
     allowance.
8. `git diff --check`, exact-path diff inspection, and final lane status
   - Passed before writing this report. The lane was clean and its Task 174
     history contained only the brief and the two plan files. Generated build
     and unit output remained ignored.

No Electron end-to-end suite was needed to verify a plan-only task. The final
plan names the exact future fake-only Electron scenarios; running them now
would test unchanged product code rather than Plan 4’s requested visible
outcome.

No real provider, paid model, manual eval, credential, external service,
dependency change, publish, push, or external write was used.

## How to try it

1. Read
   `docs/superpowers/plans/2026-08-04-cairn-answer-attribution-corrected.md`.
   The “Ordered implementation tasks” section is the build sequence; the first
   draft is historical review evidence, not the implementation authority.
2. Start the next free task from implementation task 1: add the pure intent,
   source-span, hostile-input, canonical-digest, and request-view contract
   without replacing shipped signatures yet.
3. Keep the later App/Core/adapter/CLI signature switch as the single vertical
   task the plan names. Do not partially migrate one caller and leave another
   broken.
4. Do not run the new real-conductor scenarios 13-14 until the owner separately
   approves the named provider, model, data, and cost/quota.

## Limitations and remaining judgment

- This task planned the behavior; it did not implement it. Cairn’s current task
  cards, worker briefs, and result cards do not yet carry the three source
  labels.
- Fake tests can prove source custody, replay refusal, exact worker bytes, and
  accessible controls. They cannot prove an unevaluated real model will notice
  every hedge or always emit the standalone question fence.
- A real screen-reader listen-through remains human judgment even after the
  specified DOM, announcement, focus, keyboard, and overflow tests pass.
- Unaccepted proposals deliberately remain main-memory-only and disappear on a
  full app relaunch. Their passive question text stays readable; durable source
  marking begins when an exact preview is accepted and written into task/card
  records.
- The plan deliberately refuses direct App/CLI inputs over 2,000 raw code units
  before route detection rather than truncating them. Inputs from 301 through
  2,000 keep the exact source text and use one fixed short routing summary.
- Whether the final source labels and **What you asked for** section feel as
  calm and useful as the approved mockup remains owner judgment after
  implementation.

Disposition: **DONE**
