# Task 080 — Brief

Requested visible outcome: the eight findings from Phase 3's whole-branch review
that the owner accepted for repair land as one task — two Critical, three
Important, three Minor — each proved by a check that fails first where a check
can express it.

## What is being repaired

### 1. A worker could author a result card (Critical)

`.cairn/conversations/*.jsonl` lives INSIDE the project root, and the Codex
worker runs against that root with `--sandbox workspace-write --cd <root>`.
Nothing in `core/` looks at `.cairn`, and `ensureCairnExcluded` hides it from
Git, so a line written there is invisible to every verification Cairn performs:
`statusLines`, `scanChangedPaths`, `changedTaskPaths`, `protectedPathSnapshot`,
and both protected-work checks. The store's own guard checks only the SHAPE of
a card (`kind`, `disposition`, `filesChanged`), never who wrote it — so a
worker-forged line renders under "written by Cairn's runtime, not by the
conversation" and enters the next conductor turn labeled "verified by Cairn's
runtime".

The repair authenticates authorship instead of widening the shape check. Every
envelope turn Cairn appends is recorded in a marker file under Electron's
`userData` — outside the project, where a workspace-scoped worker cannot write —
and `readTurns` drops any envelope line that marker file does not vouch for.
Owner and Cairn turns are untouched. Fail-closed at every step: no marker
directory, no marker file, or an unreadable one drops every envelope line rather
than trusting it.

### 2. A Git failure at the worker-lane protected check skipped the log restore (Critical)

`verifyProtectedStartingPaths` runs before the owned-records gate, so a
worker-forged LOG.md row is still standing when it executes. A worker that
corrupts `.git/index` and then returns a valid `completed` result makes that
read throw; the raw error escapes `runSerialTask`, skipping the throw-site log
restore, and the forged row survives to earn a stone. Repo task 067 fixed
exactly this shape at the adapter-throw close; this is its ledgered sibling.

### 3. The same shape in `commitExactPaths` (Important)

The three Git calls after `git commit` run once a DONE report and log row are
written and verified. A throw there leaves a verified DONE row standing for a
run that threw. Same wrap, same fallback.

Deliberately NOT widened: the two sites the review cleared (`serial.ts:1208`
and `1323`, which run after a successful `replaceDoneRecordsWithStopped`) and
the demo lane, which faces no adversary.

### 4. Playwright could run against a stale bundle (Important)

`app/playwright.config.ts` has no `globalSetup` and no `webServer`, so a bare
`npx playwright test` tests whatever was last built. A `globalSetup` compares
the newest mtime under `app/src/` with the newest under `app/.vite/` and throws
one line naming `npm run test:smoke`. It never builds anything itself.

### 5. No test asserted the card reaches the model (Important)

The fake conductor decides a request is a commentary request by looking at the
last message — which is the instruction, not the card. Replacing the card
mapping in `service.ts` with a filter that drops envelope turns entirely would
leave every commentary test passing. The fixture now retains the request body
and the test asserts the verified-label preamble AND a fact from the card.

### 6. Two smaller truths (Minor)

- `rungate.ts`'s doc comment claims `runRefusal` is shared by `task:run` and the
  conductor's send gate. It has one caller; `service.send` checks
  `isTaskRunning` itself with its own message.
- `service.send` is not quit-gated, while `commentary` refuses a paid call in
  the same window with an explicit rationale. The code and its comment must
  agree.
- `routing.spec.ts` asserts nothing about the stored connection immediately
  before the one dispatch that carries a conversation id — process-agnostic
  protection for a developer's real provider key.

## Boundary of intent

No change to what a run decides, what a record says, or what the owner is
charged. The only owner-visible behavior changes are: a card that cannot be
authenticated no longer renders (and, on an existing conversation, cards
written before this task disappear from the transcript while every word said
stays); a message sent inside the 8-second quit drain is refused instead of
starting a paid stream the process is about to kill. No dependency is added.
No record is rewritten.

## Checks that will show it holds

- A unit test appends a hand-forged envelope line to a conversation file and
  asserts `readTurns` drops it while the owner and Cairn turns around it
  survive, and that a card Cairn itself posted round-trips.
- Repo task 067's corrupt-index recipe, aimed at the worker lane: RED as a raw
  Git error with the forged row standing, GREEN as `RECORD_VERIFICATION_FAILED`
  with the log byte-identical to the task-start snapshot.
- A worker-planted `post-commit` hook that breaks `.git/HEAD`: Cairn's own
  commit runs it, and the Git read that follows must not escape as a raw error.
- The commentary test reads the retained request body and fails if the card is
  not in it; the filter-drop mutation is staged to prove it discriminates.
- Full battery: core `npm test`, cli, app `npx tsc --noEmit`, app unit, and
  Playwright through `npm run test:smoke`.

DONE means every finding above is repaired, each repair is proved by a check
that failed first where one could express it, and the whole battery is green.

STOPPED means a repair proves larger than the finding — in particular, if
authenticating card authorship cannot be done without changing owner-visible
behavior beyond the finding.
