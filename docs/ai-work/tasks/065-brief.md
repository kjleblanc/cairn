# Task 065 — Brief

Requested visible outcome: fix two findings from the Task 064 review — one
Important, one paired Minor — in the chat status strip.

**1 (Important). The strip's last-resort terminal line invents records.**
`Chat.tsx` fell back to "This task closed. Its records are in this project's
docs/ai-work." whenever a closed session carried neither a thrown error nor a
Result activity. There is a reachable close of exactly that shape: core
returns `connection-required` from the route itself
(`core/src/serial.ts:841`), before a task number, a brief, or a log row
exists. The session stays closed-but-present, so chat would name three files
that were never written — and contradict its own dispatch panel one line
above, which says "No task records or model call were created." After this
task the strip claims no filesystem fact it cannot support: the
connection-required close says what the run screen says about it
(`TaskRun.tsx:92`), and the unreachable remainder says only "This task
closed."

**2 (Minor, same pass).** The terminal line's `role="status"` element was
mounted together with its content, which is the case screen readers announce
least reliably — so the announcement that matters most, how the run ended, was
likely silent. After this task the strip has ONE live region that mounts with
it and is never replaced; only its text swaps, from the stage word to the
terminal line.

Boundary of intent: `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/app.css`, `app/tests/conductor.spec.ts`, plus this task's
three record files. No change to `core/`, to the IPC surface, or to the main
process.

Checks that will show the outcome holds:

- `cd app && npx playwright test tests/conductor.spec.ts` — RED first on a new
  test that drives a real `connection-required` close and reads the strip,
  then GREEN.
- The live-region fix is asserted, not asserted-about: the test marks the
  region's DOM node with an attribute React never writes, then reads it back
  after the terminal state. Neutering the fix back to two conditional spans
  must fail that assertion.
- `cd app && npx tsc --noEmit`, `npm run test:unit`, `npm run test:smoke` —
  all green.

Staging note: the readiness-changed race is staged by overwriting the fake
Codex shim in place so it stops answering `--version`, NOT by deleting it.
Deleting it would let PATH resolution fall through to a real Codex install on
the machine running the test — the one paid call this lane exists to prevent.

DONE means: no strip state claims records that do not exist; the
connection-required close renders the run screen's own sentence; one
persistent live region carries both states and a neutering proves the
assertion discriminating; all suites green. STOPPED means any of those does
not hold.
