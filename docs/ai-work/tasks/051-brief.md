# Task 051 — Brief

Requested visible outcome: land the Phase 2 final-review fix wave — five
adversarially-verified corrections that close a forged-DONE hole, keep the run
lock when a kill can't be confirmed, make the POSIX kill a real tree kill,
follow the routed adapter for the run-time disclosure gate, and tidy three
record-honesty details — with every suite still green.

Boundary of intent: `core/src/serial.ts`, `core/src/codex.ts`,
`core/src/routing.ts`, `core/test/serial.test.ts`, `app/src/main/tasks.ts`,
`app/tests/serial.spec.ts`, `app/tests/routing.spec.ts`, `CHANGELOG.md`, and
`cli/README.md`, plus this task's three record files. No version bump (this is
a fix wave inside 0.2.0, not a release). No new dependency. No milestone
movement — these harden existing behavior, they do not add a capability.

The five fixes:

1. **A tampered brief can no longer forge a DONE record.** The task brief is
   written untracked at task start, so it is not in the protected-path
   snapshot: a worker that edits or deletes its own brief passed every check,
   and the failed byte-back left a standing dishonest `DONE | … | YES` log row
   and a report claiming a commit that never happened. Fixed in three layers:
   verify the brief byte-equals `contractMarkdown` before any DONE record is
   authored (tampered/missing → honest STOPPED); replace the two DONE-branch
   bare throws with a `replaceDoneRecordsWithStopped` fallback; and make
   `cairnWorkerRecords`' checks `existsSync`-guarded so a deleted record can
   never throw a raw ENOENT after the log row was appended.
2. **An unconfirmed kill keeps the run lock.** A watchdog/cancel force-settle
   (the child never closed after the kill) was indistinguishable from a
   confirmed kill, so the lock released and the next task could start against a
   workspace a live orphan might still be writing. `killConfirmed` now rides
   the timeout/cancel errors; when it is false the lock is deliberately left in
   place, the STOPPED report and run activity say so, and the next run is
   refused `SERIAL_RUN_ACTIVE` until the app restarts.
3. **The POSIX kill is a real tree kill.** On non-win32 the codex child now
   spawns `detached` and `killCodexProcessTree` SIGKILLs the whole process
   group; the CHANGELOG's 0.2.0 entry is corrected to state exactly what each
   platform does.
4. **The run-time disclosure gate follows the routed adapter.** `task:run`'s
   gate no longer hard-codes `codexExecDisclosure`; it resolves the routed
   adapter exactly as `task:route` does and takes `expected` from that
   adapter's own `disclosure()` seam — a real worker refuses a mismatch, a demo
   adapter (no disclosure) needs no confirmation.
5. **Record-honesty batch:** the "already spent" sentence no longer fires for a
   pre-spawn cancel (nothing was spent); the CHANGELOG lock bullet is softened
   to match the code's honest "microsecond residual window" comment; and
   `cli/README.md`'s retention sentence names the retained worker final message.

Checks that show the outcome holds:

- `cd core && npm test` — core suite green, including the new red-first FIX 1
  tests (forged-DONE and deleted-brief), the FIX 2 lock tests, and the FIX 5a
  pre-spawn-cancel test.
- Root `npm test` — core + cli green.
- `cd app && npm run typecheck && npm run test:unit && npm run build:vite &&
  npx playwright test` — all green, including the FIX 4 demo-lane assertion and
  the reattach/cancel scenarios.
- `git status --porcelain` before staging matches exactly this task's file list
  plus its three record files.

DONE means: the forged-DONE hole is closed and proven by red-first tests run
against pre-fix code; the unconfirmed-kill lock, the routed disclosure gate,
and the record-honesty fixes are in place and covered; every suite is green;
and the exact-path commit holds only the files this brief names plus the three
records. STOPPED means a gate failed, a fix could not be verified, or the
changed set held anything unexpected.
