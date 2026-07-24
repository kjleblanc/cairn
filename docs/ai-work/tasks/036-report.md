# Task 036 — Report

What changed:

- `core/src/lock.ts` — extracted the existing inline parse-and-validate
  logic (previously duplicated only once, at the top of the heal branch)
  into a small local helper `readHolder(path): LockHolder | null`, which
  parses the file and returns the holder only if it has a numeric `pid`,
  string `hostname`, and string `startedAt`; any parse failure or wrong
  shape returns `null`. The first read in `acquireRunLock` now calls
  `readHolder(path)` instead of inlining the same try/parse/validate
  block (behavior unchanged — same three refusal branches follow: unreadable,
  different hostname, pid still alive).
  Immediately before the pre-existing `unlinkSync(path)` in the stale-heal
  branch, added a second call `const recheck = readHolder(path);` and a
  `stillStale` check that requires: `recheck !== null`, `recheck.pid ===
  holder.pid`, `recheck.hostname === holder.hostname`, `recheck.startedAt
  === holder.startedAt`, and `!pidAlive(recheck.pid)`. If any of those
  fail — the file now names a different pid/hostname/startedAt, fails to
  parse, is gone, or its pid now answers alive — `acquireRunLock` throws
  the existing generic `SERIAL_RUN_ACTIVE: One task is already running for
  this project.` message and never reaches `unlinkSync`. Only when
  `stillStale` holds does execution reach the pre-existing
  `try { unlinkSync(path); } catch { /* lost a race */ }` and the
  `tryCreate` retry, both unchanged. Added an in-code comment above the
  double-check stating honestly that this narrows the heal race to the
  microseconds between the second read and the unlink, that Node's
  stdlib has no atomic compare-and-delete, and that a residual
  double-acquire landing in that window is further contained downstream
  by the envelope's protected-work and exact-path staging checks, which
  fail a colliding run closed.
- No other files touched. No dependency, version, or contract change.

Why no new test was added (disclosed per the task's own instruction to
skip honestly rather than add a production seam):

The race this fix closes happens strictly between two synchronous,
back-to-back `readFileSync` calls inside one function, with no `await` or
other yield point between them — nothing else can run on Node's single
thread in that gap without the production code itself calling out to
something injectable. Before concluding that, I tried the one
non-invasive technique available — monkey-patching `fs.readFileSync` from
the test file via `node:test`'s built-in `t.mock.method` — using a
throwaway two-file experiment (`mod-a.mjs` importing
`{ readFileSync } from "node:fs"` the same way `lock.ts` does, `mod-b.mjs`
mocking `fs.readFileSync` on the default-imported `fs` object and calling
into `mod-a.mjs`). Run with `node --test mod-b.mjs` (Node v24.12.0), the
mock did not intercept the call: `mod-a.mjs`'s destructured import still
hit the real `readFileSync` and threw `ENOENT` for a path that does not
exist, proving Node's builtin ESM named exports are not live-rebound by
mutating the CJS-facing `fs` object at runtime — at least not for a
destructured `import { readFileSync } from "node:fs"` as used in
`lock.ts`. Making the interleaving observable from a test would therefore
require adding a seam to production code (e.g. accepting an injectable
reader, or restructuring the two reads to go through an overridable
module-level indirection) — exactly what the task said not to do. I
skipped the new test rather than add one.

Checks run and real results:

- `cd core && npm test` (foreground): **60/60 tests pass, 0 failures** —
  every pre-existing test unchanged, including all four `lock.test.ts`
  tests (`the lock file lives in the git common dir and never dirties the
  worktree`; `a lock held by another live process refuses a second run`;
  `a stale lock from a dead process self-heals`; `an unreadable lock
  refuses and names the file instead of guessing`). Count is unchanged
  from before this task (60) since no new test was added.
- Root `npm test` (foreground): core **60/60**, cli **9/9**, both 0
  failures.
- Read the full resulting `core/src/lock.ts` after editing to confirm the
  extracted `readHolder` helper is byte-for-byte equivalent in validation
  logic to the code it replaced, and that the double-check sits exactly
  where the finding asked (immediately before the pre-existing
  `unlinkSync`, with the pre-existing lost-race `catch` around that
  unlink left untouched).

How to try it: `cd core && npm run build && node --test --test-reporter
tap dist/test/lock.test.js` to see all four lock behaviors in isolation;
`npm test` for the full suite.

Limitations and remaining human judgment:

- The residual race window is real and disclosed in-code: between the
  re-read (`recheck`) and the `unlinkSync` call, a healer on another
  process could still write a fresh live lock at the exact instant this
  process is mid-syscall deleting it. Node's stdlib has no
  compare-and-delete or file-locking primitive that would close this
  fully; the fix narrows the exposed window from "the entire heal
  decision" (first read through unlink) to "one unlink syscall's worth of
  time after one more read," and downstream protected-work/exact-path
  staging checks are the disclosed backstop if a collision still lands in
  that narrower window.
- No new test covers the narrowed race directly, for the reason
  disclosed above (no seam-free way to interleave two synchronous reads
  inside one function call without modifying production code). The
  existing four tests continue to cover: worktree cleanliness on acquire/
  release, refusal against a real live second process, self-heal against
  a single stale reading (unchanged behavior when nothing interferes
  between the two reads), and refusal on an unparsable lock file.

Milestone movement: NO

Disposition: DONE
