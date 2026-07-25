# Task 080 — Report

The eight findings from Phase 3's whole-branch review that the owner accepted
for repair, landed as one task. Every one of them is proved by a check; six of
the eight had a check that could fail first, and each of those did.

## What changed

### Critical 1 — a worker could author a result card

**New file `app/src/main/conductor/cardauth.ts`.** Every envelope turn Cairn
appends is vouched for by a marker recorded OUTSIDE the project, under
Electron's `userData`: a SHA-256 digest over the project directory, the
conversation id, the turn's timestamp, and the card itself. `readTurns` keeps an
envelope line only when that marker file already vouches for it. Owner and Cairn
turns are untouched.

**A different mechanism than the review preferred, and why.** The review's
preferred shape was an HMAC written beside the card, keyed by a secret in
`userData`. That rests on the worker being unable to READ the key. The Codex
sandbox does not promise that: `--sandbox workspace-write` bounds where a worker
may WRITE; reads outside the workspace are permitted. The very worker this
guards against can read a key file in `userData` and sign whatever it likes.
Putting the MARKER — which is not a secret — outside the project rests on the
boundary that actually holds, needs no key to keep secret, and fails closed in
exactly the same way. It is strictly stronger on this threat model and has less
to go wrong, so it is what was built. Both constraints hold: nothing is written
inside the project, and every failure drops cards rather than trusting them.

- `app/src/main/conductor/store.ts` — `appendTurn` records the marker BEFORE
  writing an envelope line and throws if it cannot, so a card Cairn cannot
  vouch for is never written at all (a card written unvouched would show on
  screen once, through the live delta, and vanish on the next read — a worse
  account than no card). `readTurns` reads the marker set once per file and
  requires shape AND authorship.
- `app/src/main/main.ts` — points the marker store at `app.getPath("userData")`
  before any IPC is registered.
- `app/tsconfig.unit.json` — the new module joins the unit build.

**What an owner with an existing conversation will see.** Conversations written
before this task have no markers, so their result cards no longer render: the
transcript keeps every word the owner and Cairn said, in order, and the cards
between them are gone. Nothing is deleted — the lines stay in
`.cairn/conversations/NNN.jsonl` — but Cairn will not show as its own
verification anything it cannot now prove it wrote. A conversation that
contained ONLY a card lists with an empty preview. New cards, from this build
on, are unaffected.

**TDD evidence.** `app/tests-unit/resultcard.test.ts` gained a test that posts
one genuine card through `postResultCard`, appends a hand-forged envelope line
carrying a shape-perfect DONE card, and surrounds both with owner and Cairn
turns.

RED (before `store.ts` was wired to the marker check) — `npm run test:unit`,
tests 76 / pass 75 / fail 1:

```
✖ a hand-forged envelope line is dropped while the turns around it survive (repo task 080)
  AssertionError: only the card Cairn posted survives
    actual: [ 'owner', 'envelope', 'envelope', 'cairn' ]
    expected: [ 'owner', 'envelope', 'cairn' ]
```

GREEN, same command: tests 76 / pass 76 / fail 0. A second test pins the
fail-closed direction and the upgrade path together — with the marker store
removed, a card that read back a moment earlier is dropped and posting one
throws `CARD_MARKER_STORE_UNAVAILABLE`. Final: tests 77 / pass 77 / fail 0.

The pre-existing shape-guard test was kept honest rather than left to pass for a
new reason: each of its six bad lines is now MARKED as well as written, so the
shape guard is still the only thing that can drop them.

### Critical 2 — a Git failure at the worker-lane protected check

`core/src/serial.ts` gained `protectedStartingPathsOrNull`, Task 067's
`safetyCloseFacts` shape applied to its ledgered sibling, and the call site now
closes through the standard door: `restoreLogBeforeThrow` then
`recordVerificationFailed`.

**TDD evidence.** Task 067's corrupt-index recipe, aimed at the success path:
the worker forges a DONE row in the append-only log, writes garbage over
`.git/index`, and returns a valid `completed` result with a DONE claims fence.

RED — `cd core && npm test`, tests 105 / pass 104 / fail 1:

```
✖ a Git failure while verifying protected work still restores the work log (repo task 080)
  AssertionError: a Git failure in the check window is Cairn's own record failure, never a raw Git error
    actual: Error: Command failed: git diff --cached --name-only
    fatal: .git/index: index file smaller than expected
        at verifyProtectedStartingPaths (.../serial.js:405:33)
        at runSerialTask (.../serial.js:973:36)
    expected: /RECORD_VERIFICATION_FAILED/
```

GREEN, same command: tests 105 / pass 105 / fail 0. The test asserts all four
facts — the rejection is Cairn's own record failure, the log is byte-identical
to the task-start snapshot with the forged row gone, no report was written, and
the brief stays retained as evidence.

### Important 3 — the same shape in `commitExactPaths`

The call is wrapped at its site, which covers all three uncovered reads (the
HEAD read inside the helper's own catch, and the ancestry and single-commit
checks after the commit), and closes the same way.

**TDD evidence.** The stage is a worker-planted `post-commit` hook. Nothing
under `.git` is ever reported by `git status`, so the hook is invisible to every
check Cairn runs; it fires after the commit object exists, so Cairn's own commit
succeeds and the Git read after it fails.

RED — tests 106 / pass 105 / fail 1:

```
✖ a Git failure after the task commit leaves no DONE row standing (repo task 080)
  AssertionError: a Git failure after the commit is Cairn's own record failure, never a raw Git error
    actual: Error: Command failed: git rev-parse HEAD
        at commitExactPaths (.../serial.js:653:13)
        at runSerialTask (.../serial.js:1145:28)
```

GREEN, same command: tests 106 / pass 106 / fail 0, with the work log
byte-identical to the task-start snapshot.

**Deliberately not widened.** The two sites the review cleared —
`serial.ts:1241` and `serial.ts:1374` (numbering after this task's edits), both
of which run after a successful `replaceDoneRecordsWithStopped` — and the demo
lane's own scans were left exactly as they are. They are not this finding, they
face no adversary, and widening a safety change past its evidence is how a
review fix becomes an unreviewed change.

### Important 4 — Playwright could run against a stale bundle

**New file `app/playwright.global-setup.ts`.** It compares the newest mtime
under `app/src/` with the newest under `app/.vite/` and throws one line naming
`npm run test:smoke`. It builds nothing: a setup that silently rebuilt would
hide the same mistake behind a longer wait. `app/playwright.config.ts` wires it
in and now carries a comment marking `workers: 1` as load-bearing, naming
`app/tests/fixtures/conductor-connection.ts` as the dependent whose
single-detach safety argument rests on it.

**Evidence, both directions.** With `app/src` edited and the bundle stale,
`npx playwright test tests/smoke.spec.ts` refused before running anything:

```
Error: The bundle in app/.vite is missing or older than app/src — run
`npm run test:smoke`, which builds first; this setup never builds for you.
   at ..\playwright.global-setup.ts:29
```

After `npm run build:vite`, the same command ran: `1 passed (2.1s)`.

### Important 5 — no test asserted the card reaches the model

`app/tests/fixtures/fake-conductor.mjs` retains the raw body of the last
commentary request and exposes it as `lastCommentaryBody()`.
`app/tests/conductor.spec.ts`'s commentary test reads that body, parses it, and
asserts the prompt carries the verified-label preamble
("Envelope result card (verified by Cairn's runtime, not by the conversation
model)") AND two facts only the card carries (`"disposition":"DONE"` and
`"taskNumber":1`).

**Discrimination proved by mutation.** `service.ts`'s envelope mapping was
replaced with a filter that drops envelope turns from the prompt entirely, the
app rebuilt, and the test run:

```
> 763 |   expect(prompt).toContain("Envelope result card (verified by Cairn's runtime, not by the conversation model)");
  1 failed
```

Every other assertion in that test still passed under the mutation — the comment
streamed, landed as an ordinary cairn turn, and carried its usage — which is
precisely the finding. The mutation was reverted, the app rebuilt, and the test
passes again.

### Minor 7 — a false doc comment

`app/src/main/rungate.ts` claimed `runRefusal` was "the one refusal decision
`task:run` and the conductor's send gate both need". It has one caller. The
comment now says so, and says what `service.send` actually does and why its
wording differs.

### Minor 8 — `send` is not quit-gated

Gated, rather than explained away. `service.send` now refuses inside the quit
drain, checked FIRST for the same reason `runRefusal` checks it first, with a
message about messaging rather than about tasks. The owner asked for this call,
so unlike a comment it is refused out loud; and the refusal happens before the
message is persisted, so nothing sits in the transcript looking sent.

### Minor 12 — a one-line assertion routed and never added

`app/tests/routing.spec.ts` asserts `existsSync(conductorFile()) === false`
immediately before the one dispatch that carries a conversation id — the
dispatch whose result card triggers the envelope's own paid comment call.
Process-agnostic protection for a developer's real provider key.

## Checks run (all real, this session)

- `npm test` at the repo root — core: **tests 106 / pass 106 / fail 0** (104 at
  branch head, plus this task's 2). cli: **tests 9 / pass 9 / fail 0**.
- `cd app && npx tsc --noEmit` — clean.
- `cd app && npm run test:unit` — **tests 77 / pass 77 / fail 0** (75 at branch
  head, plus this task's 2).
- `cd app && npm run test:smoke` — **39 passed (2.4m)**, the whole Playwright
  suite, built first by that script.
- Single-test runs used along the way, in full and uninterrupted:
  `npx playwright test tests/smoke.spec.ts` for the stale-bundle gate, and
  `npx playwright test tests/conductor.spec.ts -g "the conductor comments on
  the card"` for the mutation proof.

Files touched: `app/src/main/conductor/cardauth.ts` (new),
`app/src/main/conductor/store.ts`, `app/src/main/conductor/service.ts`,
`app/src/main/main.ts`, `app/src/main/rungate.ts`,
`app/playwright.global-setup.ts` (new), `app/playwright.config.ts`,
`app/tsconfig.unit.json`, `app/tests-unit/resultcard.test.ts`,
`app/tests/conductor.spec.ts`, `app/tests/routing.spec.ts`,
`app/tests/fixtures/fake-conductor.mjs`, `core/src/serial.ts`,
`core/test/serial.test.ts`, `docs/ai-work/tasks/080-brief.md`,
`docs/ai-work/tasks/080-report.md`, `docs/ai-work/LOG.md`.

## How to try it

Open a project, connect a brain, and dispatch a task from chat. The result card
appears as before and the conductor comments on it as before. Then, with the app
closed, hand-append a line to `.cairn/conversations/001.jsonl` copying the
card's own shape — reopen the project and the hand-written card is not there,
while everything said around it is.

## Limitations and remaining human judgment

- **Existing conversations lose their cards.** Stated in full above. It is the
  honest reading of "Cairn cannot prove it wrote this", and it is one-way: no
  earlier card can be re-vouched for.
- **A moved or renamed project directory drops its cards too.** The digest binds
  the project path, which is what stops a genuine card being replayed out of
  another project. Move the folder and the cards in its conversations stop
  verifying, exactly as an upgraded conversation does. The conversation text is
  unaffected.
- **A worker can still duplicate a card Cairn itself wrote** for that same
  conversation, because a byte-identical copy of a genuine line is genuine. That
  shows one of Cairn's own cards twice, carrying its original timestamp; it
  cannot manufacture a claim Cairn never made. Recorded, not fixed.
- **Minor 8 has no automated check.** The quit drain is entered from a native
  `dialog.showMessageBoxSync`, which Playwright cannot drive, and no IPC exposes
  `beginQuitDrain`. Widening the IPC surface to make a Minor testable is a worse
  trade than the gate itself; the gate is three lines and reads the same flag
  `commentary` already reads.
- **Important 3, when the throw lands after a successful commit,** leaves that
  commit in history while the working-tree log is restored to the task-start
  snapshot. The run is must-inspect and the DONE row earns no stone; reconciling
  a commit made by a run that then threw is the owner's judgment, not Cairn's.
- **The `moved`-column/stone finding is out of scope** by the owner's decision
  and was not touched.

Milestone movement: NO. This is a safety and honesty repair on Phase 3's own
branch; no new owner-visible capability landed.

Disposition: DONE
