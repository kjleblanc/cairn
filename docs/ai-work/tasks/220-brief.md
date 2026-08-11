# Task 220 brief - one approved repair and one final critic round

**Lane:** A (the main checkout). **Base commit:** `0bb5a23`.

**Plan position:** Prerequisite Q, Task Q9. Q8 now supplies the dark
packet-only critic, exact call disclosure, synthetic calibration driver, and
one-use decision. This task connects the already-dark candidate lifecycle to
one bounded repair and, when the frozen critic mode requires or offers it, one
separately approved final critic round. Q10 live calibration/activation and
owner-verdict Plan 2 remain unstarted. Task 212 on `lane/g` and the unrelated
known-red CLI overload seam documented by `615f8dd` remain protected and are
not part of this task.

## Requested visible outcome

When an original required `cN` check has an authenticated owner-confirmed
blocker, Cairn can show one exact repair preview, wait for the owner's separate
approval, run one Builder repair, re-run every original check, and—only when
the Task Spec's frozen critic mode requires or offers it—show a new exact
approval for one final critic round. Advisory findings never offer or start a
repair. A dismissed critic allegation starts nothing. At the fixed cap Cairn
authors exactly one honest terminal outcome: DONE only when every original
required promise has complete evidence and no confirmed blocker remains;
otherwise STOPPED with both immutable round bundles retained and the latest
workspace left untouched.

The real desktop surfaces must make the blocker source, repair approval, round,
critic approval, remaining cap, and final reason understandable without asking
the owner to read code. All Q9 journeys remain fake-only/offline while critic
activation is empty.

## Boundary of intent

- Implement Q9 only, centred on the existing candidate/serial repair lifecycle,
  pending-run journal, task orchestrator, shared IPC/preload, both run screens,
  focused Core/App tests, and guarded fake-only Electron journeys. Do not run
  Q10 calibration, add an activation tuple, enable normal critic routing,
  implement permanent owner verdicts, repair Task 212, or touch the unrelated
  CLI overload failure.
- Repair admission requires one exact current original-`cN` blocker plus its
  predeclared failure condition and an authenticated owner confirmation. Native
  boundaries retain their existing independent authority. Critic allegations,
  prose, commands, suggested repairs, embedded prompts, severity labels, and
  renderer state are evidence only and can never become repair instructions.
- Main composes the repair instruction only from the unchanged Task Spec, the
  exact original `cN` promise/failure condition, authenticated owner resolution,
  and typed evidence artifact ids. The Task Spec, Evidence Plan except for the
  one narrow harness procedure below, reference identities, and original
  promise set cannot move between rounds.
- One repair maximum. Every original `cN` is re-evaluated after repair. A new
  unpromised finding remains advice unless it independently trips an existing
  native boundary; a repair regression blocks only by falsifying an original
  `cN` under its required resolution. Owner-judged checks still wait for the
  existing human-judgment boundary.
- Maximum three critic calls total, including at most one unavailable-call
  retry. Initial, repair, critic, timeout, output, preview, authorization,
  candidate, and route identities are distinct and monotonic. Every critic
  call, including the final round or retry, keeps its own exact Task 218
  approval; no earlier approval or renderer echo can release it.
- One proven harness error may revise only `EvidencePlanV1`, preserving both
  versions and the failed output. It requires a Main-owned pre-assertion failure
  code, an exact owner action, and one closed mechanical path/timeout/parser
  correction. A weaker standard, different command/data/provider, new risk, or
  wider scope requires a new Task Spec and cannot use this seam.
- Pending state, counters, blocker/owner-resolution custody, round bundles,
  approvals, and terminal preparation survive restart without rollback,
  replay, reset, duplicate repair, duplicate critic call, duplicate records, or
  duplicate commit. Renderer/project files cannot mint or alter authority.
- Preserve legacy task behaviour, task/calibration mutual exclusion, pending
  gates, exact-path Git custody, activation darkness, and all current Q8
  provider boundaries. Add no dependency, credential, non-injected network
  primitive, provider call, external write, push, publication, or deployment.
- **Electron precondition:** immediately before the guarded Playwright matrix,
  the owner confirms Cairn is closed and not using the shared app profile. The
  lane then acquires the repository and profile app-token locks for the whole
  run and releases both afterward. The AI never closes the owner's app.

## Checks

1. **`c1` - only a confirmed original blocker can authorize one repair.** An
   exact current candidate, frozen original `cN`, predeclared failure condition,
   typed evidence ids, and authenticated owner confirmation compose one
   canonical repair preview/instruction. Advisory-only, dismissed, owner-waiting,
   malformed, stale, replayed, cross-project, cross-run, round-one, renderer-
   authored, or critic-prose inputs create no approval or repair. Approval
   decline closes honestly without a Builder or critic call.
2. **`c2` - round custody and the rubric stay immutable.** Round 0 and round 1
   have distinct preview, authorization, route, candidate, evidence, and bundle
   identities while the Task Spec, original promises/failure conditions, and
   references remain byte-identical. All original `cN` rows are re-evaluated.
   New unpromised advice never blocks; a regression of an original required
   check does. Owner-judged checks remain owner-judged.
3. **`c3` - repair and critic caps are exact and separately approved.** At most
   one repair and three critic calls including one unavailable retry can ever be
   reserved or run. Required/optional/off modes produce the exact initial,
   repair, final-critic, retry, approve/decline, and stop/continue matrix. Every
   final critic call has a fresh exact disclosure and one-use approval; stale,
   replaced, replayed, or concurrent decisions start nothing and cannot consume
   a genuine current approval.
4. **`c4` - restart and persistence cannot reset authority.** Authenticated
   pending state durably binds both round bundles, all counters, blocker and
   owner-resolution identities, Evidence Plan revisions, approvals, and
   prepared terminal action. Restart never auto-runs a repair or critic, never
   rolls a cap backward, and cannot duplicate a send, terminal report/log/result
   card, exact-path commit, or lock release. Torn, forged, replayed, or
   worker-writable state fails closed without deleting recoverable evidence.
5. **`c5` - outcomes and the narrow harness-repair seam are honest.** Required
   blocker to approved repair to final critic can reach DONE only after complete
   re-evidence and no blocker. Critic-off owner/Cairn blockers can repair and
   finish without a critic. Optional final critic may be declined without
   becoming a hidden gate. Dismissed allegations and advisory-only output cause
   no repair. A failed original `cN`, declined repair, exhausted cap, or required
   critic refusal/unavailability ends STOPPED. Only the closed Main-proven
   mechanical harness correction can revise `EvidencePlanV1`; every broader or
   weaker revision refuses.
6. **`c6` - the feature remains dark and authority-separated.** Activation is
   empty before, during, after, and across restart; no normal task advertises or
   reaches a live packet-only critic. No critic text becomes Builder instruction,
   no renderer/project file forges owner resolution or custody, and no project
   data, credential, paid call, provider traffic, dependency, or external state
   is used by the Q9 evidence.
7. **`c7` - complete regression and real desktop evidence pass.** Focused
   red-first tests, complete Core and App suites, both typechecks, Vite and lab
   builds, exact diff/status, and three independent adversarial reviews pass.
   After the owner confirms the single-tenant precondition and both app tokens
   are acquired, guarded fake-only Electron journeys prove the required repair
   to final-critic path, critic-off repair, optional decline, dismissed/advisory
   no-repair controls, repair decline, original-check regression, malicious
   critic text, narrow harness correction/refusal, restart counters, stale
   approvals, terminal caps, and exactly one terminal record set.

## DONE and STOPPED

**DONE** means all seven checks pass; one authenticated confirmed blocker can
drive at most one separately approved repair and one separately approved final
critic round under the fixed three-call cap; every original promise is
re-evaluated without rubric/reference drift; restart cannot reset or replay
authority; all terminal routes are exactly once and honest; activation remains
empty; the guarded Electron matrix runs under the confirmed precondition; one
report and one log row answer every check; the exact Task 220 paths land in one
local final commit; and `main` is clean.

**STOPPED** means any repair can start without an exact confirmed original
blocker and owner approval, critic/renderer prose can become instruction or
authority, a promise/reference can move between rounds, a cap or approval can
be reset/replayed, a hidden critic gate appears, a terminal route duplicates or
misstates its outcome, a harness change weakens/widens the Task Spec, Q9 needs a
live provider/credential/network call, the Electron precondition is not
confirmed, or durable recovery is unclear.
