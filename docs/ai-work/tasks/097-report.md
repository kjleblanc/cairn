# Task 097 report — plain words in the chat experience

## What actually changed

- `app/src/renderer/screens/Chat.tsx` — owner-facing copy only; the diff is
  string literals, no logic. The result card now says "checked by Cairn, not
  written by the AI chat", "Your starting work: untouched" (was
  "byte-identical"), "Files changed (checked with Git, not taken on faith)",
  "Saved snapshot (commit)", "Who did the work", "What the worker says it
  did — Cairn hasn't checked this", and "The worker says the milestone
  moved". The dispatch panel became "start this task" with "Choosing who
  will do the work…" and plainer connection, readiness-change, and
  records-location sentences. Push flow: "saved snapshots" instead of bare
  "commits", "anyone can see them", "the publishing itself can't be taken
  back", "isn't linked to an online copy anymore", and "git's own error
  message, quoted exactly". Composer-closed: "You can type again when it
  finishes."
- `app/src/renderer/components/TaskCard.tsx` — "Your details (sent
  word-for-word)" (was "Details (sent verbatim)").
- `app/src/renderer/components/DisclosureConfirm.tsx` — "You are approving
  this one task only.", "What gets sent or can be read:", "Cost or usage
  limit:", and the checkbox "I approve this one real … call." All six
  paid-call facts remain, verbatim from the adapter's disclosure seam.
- `app/tests/conductor.spec.ts`, `app/tests/routing.spec.ts` — the E2E
  assertions pinning the old strings updated to the new wording (12 sites).
- `docs/ai-work/tasks/097-brief.md` and this report.

Not changed, deliberately: every disclosure's substance; the verified /
worker-claims separation and its visible labels; Cairn's own
record-recovery and process-failure disclosures (composed in core, carried
verbatim); all stable control labels ("Send to dispatch", "Set aside",
"Stop this task", "Open the run screen", "Start one real … call", "Run
offline demonstration"); and every model-facing string (`relay.ts`
briefing lines, `constitution.ts`), which unit tests pin.

## Checks run and their real results

1. `npm.cmd run test:unit` — 100/100 pass on the merged tree (Task 096 +
   Task 098 + these five files).
2. `npm.cmd run typecheck` — clean.
3. `npm.cmd run build:vite` — green.
4. Full-diff audit: every changed line is a string literal; no logic,
   layout, or behavioural change.
5. Playwright E2E — **partial, with a proven environmental gap** (see
   below). Runs at 01:40 and 01:52 with these changes in place passed
   every test that ran, including the updated DONE result-card assertions;
   the only failures then were stale assertion strings, all fixed. After
   ~01:56 the machine began failing E2E tests regardless of code:
   `conductor.spec.ts:126` fails **identically** on the pure committed HEAD
   and on commit `98de7d7` — the exact code this project's own Task 095
   certified green 36 hours earlier. Task 098's report independently
   documents the same failure signature in eight tests and proves it
   code-independent the same way. At commit time the suite still cannot
   complete on this machine (boot-level hangs, stream-state probes
   returning empty, timeouts across `smoke`, `projects`, `routing`,
   `conductor`, and `connect-kimi` specs).

The owner reviewed the proof chain and chose to commit without a reboot on
2026-07-28.

## Verification gap, stated plainly

The twelve updated E2E assertion strings are verified by inspection
(assertion text matches renderer text exactly) and by the 01:40–01:52
passing runs of the tests carrying several of them — but the complete
suite has not been green in one run since these edits. Re-running the full
suite on a fresh machine state is the open follow-up. Separately, the
environmental failures themselves (a test that passed on certified-green
code now failing machine-wide) deserve their own investigation task if
they survive a reboot.

Also disclosed during the task: the E2E fixtures detach and restore the
owner's real `conductor.json`; one of this task's suite runs was killed
mid-restore-cycle by a timeout. The file exists and subsequent completed
runs cycled it normally, but the owner was advised to glance at the
conductor connection in the app and reconnect if it shows a fixture.

## How to try it

```powershell
npm.cmd --prefix app start
```

Open a governed project. With the offline demo (`$env:CAIRN_MOCK = "1"`)
one full loop shows every changed surface: propose a task, read the
word-for-word details label, start it, and read the finished result card —
plain words throughout, with the same facts and the worker's claims still
visibly separated from what Cairn checked.

## Limitations and remaining human judgment

- The E2E gap above is the material one.
- Copy judgment is subjective; the brief pinned meaning-preservation, and
  the owner can adjust any sentence by the same edit-test-commit path.
- The remaining screens (run screen, settings, town detail) keep their
  existing wording; they are candidates for a follow-up copy task.

Disposition: DONE — with the E2E verification gap disclosed above and a
rerun owed on a healthy machine.
