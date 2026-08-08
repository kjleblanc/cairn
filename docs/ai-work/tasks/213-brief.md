# Task 213 brief - carry Task Spec evidence through both owner-facing run surfaces

**Lane:** A (the main checkout). **Base commit:**
`c77b86c06e5fe63014a6bb7886307d8fc2a0190d`.

**Plan position:** Prerequisite Q, Task Q5 only. Task 212 belongs to the
unmerged `lane/g`; this task neither lands nor modifies it. Q6 and
owner-verdict Plan 2 remain unstarted.

## Requested visible outcome

Chat and manual Task Run receive and render the same accepted Task Spec,
criterion evidence state, owner-check confirmation state, critic mode, and
whole-run budget. Main alone authenticates owner observations and exact owner
resolutions; renderer choices remain display input and can never become
criterion, critic, seal, or verdict authority.

## Boundary of intent

- Implement Prerequisite Q's Task Q5 only. Do not enable a model/critic call,
  candidate or repair lifecycle, sealing, a verdict, or the empty Q10
  activation registry.
- Preserve Task 210/211's default-off production behavior and every legacy
  route/run/card byte when no authenticated Task Spec is present. Keep the live
  worker handoff intent-only until a later task owns activation.
- Main may mint an owner criterion observation only for the exact current
  project/run/Task Spec/candidate/criterion and may mint an owner resolution
  only against the exact current assessment/finding/failure/render and the full
  evidence set actually shown. One-sided, stale, replayed, duplicate, forged,
  cross-project, cross-run, or cross-candidate input fails closed.
- Owner observations and resolutions are pre-seal criterion evidence, not an
  owner's verdict. A critic `not-met` remains an allegation until the exact
  owner confirmation exists; `pN` remains advisory under required, optional,
  and off critic modes.
- Renderer and preload expose only bounded display/action vocabulary. They
  never receive a Main brand and never send a Task Spec, CriterionResult,
  finding, assessment, resolution hash, policy result, disposition, seal, or
  verdict object back across IPC.
- Use fake/unit/build verification only. Do not run the shared real app/E2E
  profile, make a provider/model/network call, use a credential, install or
  update a dependency, write outside this repository, push, publish, or deploy.

## Checks

1. **`c1` - one output-only review vocabulary on both surfaces.** One bounded
   Main projection carries the exact source-marked Task Spec, every required
   `cN`, advisory `pN`, per-criterion evidence/owner state, critic mode and
   reason, and every whole-run budget cap to both Chat and manual Task Run.
   Pure/static renderer tests prove the same rows and labels appear in both;
   absent authority preserves each legacy response/render shape.
2. **`c2` - Main-authenticated owner observations.** Only Main can mint a
   deeply frozen owner observation for an owner-judged `cN` against the exact
   current project, run, Task Spec, candidate, evidence plan, criterion,
   failure condition, render, and shown supporting/counterevidence. Wrong ids,
   omitted or one-sided evidence, structural clones, stale displays, and
   cross-project/run/candidate actions cannot complete a row.
3. **`c3` - exact owner resolution of critic allegations.** A critic `not-met`
   finding remains an allegation until Main mints one exact, replay-safe owner
   resolution bound to the current assessment/finding/render and every shown
   evidence ref. Dismissal, confirmation, and `cant-tell` follow the closed
   states; double-clicks, stale previews, wrong hashes, invented evidence, and
   direct IPC bypass cannot resolve or block anything.
4. **`c4` - policy and semantic separation.** Owner-judged rows can complete
   under required, optional, or off critic modes without a critic assessment;
   advisory preferences never become DONE gates; critic fields cannot prefill
   an owner observation, resolution, or future verdict; and every owner record
   remains explicitly pre-seal evidence rather than an envelope disposition.
5. **`c5` - strict IPC lifecycle and staleness.** Main retains and rechecks the
   exact branded authority behind each output projection, accepts only bounded
   display-choice actions, consumes an action at most once, and invalidates it
   on proposal/run/spec/candidate/assessment/finding/evidence/render mutation.
   Preload and both route/run validators reject extra authority fields while
   legacy callers remain byte-compatible.
6. **`c6` - verified isolation and regression safety.** Focused authority,
   owner-check, IPC, result-card, and renderer tests; complete App unit suite;
   App typecheck and production build; Core regression suite as needed;
   darkness searches; exact diff/status inspection; and independent
   adversarial/integration audits pass with Q6, activation, model calls, and
   Lane G's Task 212 paths absent.

## DONE and STOPPED

**DONE** means all six checks pass, Chat and Task Run demonstrably share one
source-honest output vocabulary, renderer actions cannot create or replay
authority, one honest report and log row record the evidence, the Q5 paths land
in one exact-path final commit, and `main` is clean. **STOPPED** means either
surface omits or changes criterion state, any renderer/worker/model payload can
mint owner or verdict authority, any stale/partial/replayed action resolves a
row, protected work changes, or completion would cross the stated boundary.
