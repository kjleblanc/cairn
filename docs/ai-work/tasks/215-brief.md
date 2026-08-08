# Task 215 brief - durable pending-run custody before IPC

**Lane:** A (the main checkout). **Base commit:**
`4eb11b3d73f436ca2446e37c4d5a3c37eb3b5376`.

**Plan position:** Prerequisite Q, Task Q7 only. Task 212's landed
owner-verdict safeguards are part of this base and must remain intact. Q8's
critic transport, Q9's real repair call, Q10 activation, and owner-verdict
Plan 2 remain unstarted.

## Requested visible outcome

A fake-only desktop candidate can wait across application restart under an
authenticated Main-owned journal instead of renderer or project-file state.
Boot installs the exact pending-project gate before registering IPC, and task
start, verdict copy, push preview, and push execute all independently refuse
the pending project until one authenticated terminal path closes it.

## Boundary of intent

- Implement Prerequisite Q's Task Q7 in Core/App Main and fake tests only. Do
  not add a real critic/provider/repair call, a live Q10 activation identity,
  an owner verdict, or production candidate routing from the current
  intent-only App path.
- Store bounded, secret-free pending state only under
  `userData/pending-runs/<projectHash>/<runId>/`. Renderer state and project
  files are untrusted inputs; neither may create, resume, clear, or weaken a
  pending-project gate.
- Persist the exact frozen Task Spec, evidence-plan revisions, candidate round
  bundles/hashes, base Git state, phase, route receipts without credentials,
  marker-backed assessment/resolution references, and atomic whole-run
  spent/remaining counters needed by later Q8/Q9 work. Do not invent critic
  evidence or terminal authority in Q7.
- Validate journals, project identity, HEAD, complete Git state, spec/plan,
  candidate/evidence hashes, counters, markers, topology, and bounds before
  recovery. Drift or ambiguity must preserve product work, keep the project
  gated, and offer only an honest fail-closed recovery/STOP seam.
- Treat the PID/run lock as process-lifetime authority only. Quit preserves an
  awaiting-approval journal without claiming its dead PID lock survived;
  exact restart re-establishes a fresh process lock before the run can resume.
- A v1 Builder/repair writer must have an enforced filesystem sandbox that
  excludes the canonical `userData` tree. Kimi is ineligible. Hostile writers
  must be unable to preplant, overwrite, truncate, alias, link, or delete the
  journal/marker paths, and unsafe candidate content must never be copied into
  `userData`.
- Preserve legacy/no-candidate task, verdict, push, offline, and card behavior
  byte-for-byte when no authenticated pending gate exists. Keep Q3-Q6
  activation dark and all current live worker calls intent-only.
- Use local fake/unit/build verification. Do not make a provider/model/network
  call, use a credential, install or update a dependency, touch the owner's
  real app profile, push, publish, deploy, or write to an external service.

## Checks

1. **`c1` - authenticated bounded journal.** Main alone creates an exact,
   versioned, atomic pending-run journal plus immutable round bundles under the
   canonical userData root. Every stored hash, revision, phase, counter,
   project/run identity, Task Spec/Evidence Plan, candidate/evidence binding,
   and marker relationship round-trips; clones, extra fields, sparse data,
   corruption, rollback, torn writes, aliases, and project-file forgeries fail
   closed without exposing or deleting product work.
2. **`c2` - boot-before-IPC recovery.** Startup validates every journal and
   installs the durable pending-project gate before task, verdict, evidence,
   or push IPC is registered. An exact HEAD/status/diff/spec/candidate/evidence
   restart re-establishes the live lock and resumes the same phase and counters;
   any mismatch remains gated and cannot seal.
3. **`c3` - every competing authority consults Main.** Task start, verdict copy,
   push preview, and push execute each query the canonical Main gate at their
   own mutation boundary. Renderer flags, stale previews, copied IPC payloads,
   project records, direct handler invocation, and a race between preview and
   execute cannot bypass or clear it; unrelated projects retain legacy
   behavior.
4. **`c4` - writer and bundle containment.** Only an adapter with an enforced
   project-write sandbox that provably excludes canonical `userData` is
   eligible for v1 Builder/repair work; Kimi and ambiguous capabilities refuse
   before spawn. Sensitive, credential-like, ignored, linked, binary,
   generated, dependency, unclear, oversized, or raced candidate artifacts
   are never copied into the journal, and hostile writer attempts cannot alter
   a journal or marker.
5. **`c5` - quit, recovery, and terminal exactly once.** Quit preserves a
   valid awaiting-approval journal, releases only the live PID lock, and never
   emits a false terminal result. Resume, honest recovery/STOP, finalize,
   concurrent/replayed calls, and restart races yield at most one terminal
   report, LOG row, result card, and commit; the terminal transaction clears
   the durable gate only after its authenticated journal close succeeds.
6. **`c6` - verified isolation and regression safety.** Focused journal,
   restart, task/verdict/push/direct-IPC, lock, hostile-writer, and terminal
   tests; complete Core/App suites; typecheck/build; exact diff/status;
   darkness searches; and independent adversarial audits pass. The real app
   profile, live candidate route, Q8/Q9 calls, Q10 activation, Plan 2 verdict,
   dependencies, provider/network access, and external writes remain absent.

## DONE and STOPPED

**DONE** means all six checks pass, a fake candidate survives exact restart
under Main-authenticated custody, every competing authority fails closed for
the pending project before mutation, unsafe/stale journals cannot seal or lose
product work, quit and one terminal close are honest, one report and log row
record the evidence, the Q7 paths land in one exact-path final commit, and
`main` is clean. **STOPPED** means IPC can register before recovery, a writer
can reach or influence `userData`, project/renderer state can create or clear
the gate, exact restart identity cannot be proven, a competing authority can
bypass the gate, or terminal cleanup can discard work or author twice.
