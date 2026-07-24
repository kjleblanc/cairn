# Task 036 — Brief

Requested visible outcome: close the Important finding from the Task 035
code review. `core/src/lock.ts`'s stale-heal path read the lock file once,
decided the recorded holder was dead on this machine, and then
unconditionally `unlinkSync`'d the path before retrying `tryCreate`. Between
that single read and the unlink, another process could have healed the
same stale lock and written a fresh, LIVE lock at that path — which this
process would then delete, letting two runs proceed concurrently. (The
`flag: "wx"` atomic create already guaranteed only one creator wins an
empty slot; the defect was specifically about deleting someone else's
fresh lock, not about the create race.)

The fix: immediately before the heal path's `unlinkSync(path)`, re-read and
re-verify the lock file. Only proceed with the unlink if the second read
still parses to the exact same holder observed in the first read (same
`pid`, `startedAt`, and `hostname`) and that pid is still dead. If the
second read differs in any field, fails to parse, or the file is gone,
refuse with the existing generic message
(`SERIAL_RUN_ACTIVE: One task is already running for this project.`)
instead of deleting anything. The existing lost-race `catch` around the
unlink itself is unchanged.

Boundary of intent: `core/src/lock.ts` only. No redesign of the locking
scheme, no new dependencies, no other files touched, no existing test
weakened. The four existing tests in `core/test/lock.test.ts` stay green,
unchanged.

Checks that show the outcome holds:

- `cd core && npm test` stays green with all pre-existing suites and
  counts intact (60 tests before this task; unchanged unless a new,
  genuinely deterministic test is added without any production-code test
  seam).
- Root `npm test` stays green (core + cli).
- Manual trace of the new code path: a first read that observes a
  same-host dead-pid holder, followed by a second read that returns a
  holder differing in any field (or fails to parse, or finds no file),
  results in `SERIAL_RUN_ACTIVE` being thrown and `unlinkSync` never being
  reached — verified by inspection since this is a synchronous,
  same-process code path with no reachable seam for deterministic
  injection (see report for what was tried and why it was not added as a
  test).

DONE means the double-check lands exactly as scoped above, both test
suites stay fully green, and the honest, disclosed residual race window
(the microseconds between the second read and the unlink) is documented
in-code with a comment explaining why it cannot be closed further without
capabilities Node's stdlib does not offer. STOPPED means a required check
could not be made to pass; whatever was written stays for inspection.
