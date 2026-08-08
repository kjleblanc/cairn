# Task 214 brief - split candidate creation from terminal sealing

**Lane:** A (the main checkout). **Base commit:**
`da6a32032ec6a06928b30f527a48fbeec3d8b272`.

**Plan position:** Prerequisite Q, Task Q6 only. Task 212 belongs to the
unmerged `lane/g`; this task neither lands nor modifies it. Q7 restart custody
and owner-verdict Plan 2 remain unstarted.

## Requested visible outcome

A fake Builder can produce one frozen, hash-bound candidate without Cairn
prematurely writing DONE, a report, a log row, or a commit. Core exposes an
explicit pre-seal lifecycle, preserves lossless round 0 and optional round 1
bundles without ranking them, allows at most one fail-closed repair, and has
one honest terminal path for sealing or stopping.

## Boundary of intent

- Implement Prerequisite Q's Task Q6 in Core only. Do not add desktop restart
  persistence, a real critic/provider call, an owner verdict, a Q10 activation
  identity, or any live App production caller.
- Preserve the current intent-only/legacy one-call and offline recovery paths
  byte-for-byte when no candidate authority is present. Keep Task 210-213's
  staged/default-off behavior dark.
- Candidate creation may occur only after the Builder process, protected-work
  check, strict claims parse, exact changed-path scan, and candidate hash. It
  must never author terminal records or a commit.
- The whole run remains bounded to one Builder round, at most one repair round,
  at most three later critic attempts, and zero external-evidence calls. The
  frozen Task Spec, its `cN`/`pN`, reference snapshots, and original evidence
  plan never change during repair.
- A repair is available only when every task-owned changed or untracked path
  can be classified and captured losslessly without copying a sensitive,
  credential-like, linked, ignored, generated, dependency, unclear, or
  unbounded artifact. Repair instructions are Main-derived from frozen
  promises, failure conditions, and typed artifact ids; critic prose and
  embedded commands remain quoted advice only.
- Use fake/unit/build verification only. Do not run the shared real app/E2E
  profile, make a provider/model/network call, use a credential, install or
  update a dependency, write outside this repository, push, publish, or deploy.

## Checks

1. **`c1` - candidate creation is pre-seal only.** A Builder claiming DONE
   yields one immutable, hash-bound `SerialCandidate` only after every required
   process, protected-work, claims, path-scan, and candidate-hash check passes.
   No report, log row, commit, DONE disposition, or terminal record is written
   until an explicit terminal function is called.
2. **`c2` - explicit authenticated lifecycle.** Core represents the exact
   `awaiting-critic`, `awaiting-owner-resolution`, `awaiting-repair`,
   `ready-to-seal`, and terminal phases. Required, optional, and off critic
   modes choose only their allowed next state; stale, cloned, reordered,
   cross-run, cross-spec, cross-plan, or cross-candidate transitions fail
   closed.
3. **`c3` - lossless round custody and fail-closed repair eligibility.** Round
   0 is frozen before any repair and round 1 is a separate immutable bundle;
   each keeps its own exact manifest, bytes, and hashes, and neither is called
   "best." Sensitive, linked, ignored, generated, dependency, unclear,
   oversized, incomplete, or failed snapshots disable repair without retaining
   or copying the unsafe content.
4. **`c4` - one bounded, non-authoritative repair.** At most one repair can be
   authorized against the original frozen Task Spec and typed failure/artifact
   inputs. It cannot adopt critic prose as instructions, change `cN`/`pN`, or
   extend the call budget; after repair all Cairn/owner criteria must be rerun
   and candidate/evidence hashes refresh while original plan/reference hashes
   remain fixed.
5. **`c5` - one honest terminal authoring boundary.** Only
   `finalizeSerialCandidate` and `stopSerialCandidate` may author the final
   report/log/commit path, each at most once. DONE is unavailable until the
   complete future policy/evidence preconditions are represented as clear;
   pending or unavailable evidence stops once with an honest hash-bound record
   and leaves the latest candidate untouched.
6. **`c6` - verified isolation and regression safety.** Focused candidate and
   serial tests, the complete Core suite, build/typecheck, exact diff/status
   inspection, darkness searches, and independent adversarial audits pass.
   Existing one-call/offline/legacy recovery remains unchanged, and Q7 restart
   storage, live activation, real critic calls, owner verdicts, App production
   wiring, and Lane G's Task 212 paths remain absent.

## DONE and STOPPED

**DONE** means all six checks pass, the fake Builder demonstrably pauses at an
authenticated candidate, round custody and one-repair limits fail closed, one
terminal boundary owns all final authoring, one honest report and log row record
the evidence, the Q6 paths land in one exact-path final commit, and `main` is
clean. **STOPPED** means candidate creation can still write DONE/report/log/a
commit, round 0 cannot be captured losslessly before repair, terminal authority
can be cloned/replayed/bypassed, protected work changes, or completion would
cross the stated boundary.
