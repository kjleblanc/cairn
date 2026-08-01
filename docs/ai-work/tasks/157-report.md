# Task 157 report — Cairn suggests follow-up tasks when a task completes

## Requested visible outcome (from the brief)

Whenever a dispatched task finishes and the envelope posts the result card,
Cairn's short comment is followed by up to three concrete next-step
suggestions as tappable chips. Tapping one sends it as the owner's own
message, starting the ordinary conversation — every dispatch gate unchanged.
The suggestions survive a reload.

## What actually changed

- `app/src/main/conductor/followups.ts` (new): the `cairn-followups` fence
  parser and the one validator (`sanitizeFollowups`) both the parser and the
  store use — 1 to 3 items, non-empty, single-line, ≤ 140 chars, trimmed,
  exact duplicates dropped; any other shape fails closed to "no suggestions".
- `app/src/main/conductor/service.ts`: `COMMENTARY_INSTRUCTION` now asks for
  the one short comment plus the fenced suggestions (imperatives the owner
  can send as-is; omit the block when nothing genuinely follows; still never
  a `cairn-task` block in this turn). `streamTurn` extracts followups after
  the task-block extraction, attaches them only to commentary turns (a reply
  emitting the fence has it stripped and dropped), persists them on the cairn
  turn, and carries them on the done delta. The TurnKind doc comments now
  record that the owner overrode the turn's founding "not a pitch for more"
  rule in this task.
- `app/src/shared/ipc.ts`: `ConductorChatTurn.followups?: string[]`;
  `ConductorDelta.followups?: string[] | null`.
- `app/src/main/conductor/store.ts`: `readTurns` re-validates a persisted
  cairn turn's `followups` fail-closed (the conversation file lives inside
  the project a worker can write to); the turn itself always survives.
- `app/src/renderer/screens/Chat.tsx` (one hunk): when the last turn is a
  cairn turn carrying followups, a labeled group of chips renders under the
  bubble; a tap calls the ordinary `send()` verbatim (Task 155 queueing,
  refusal, and retry semantics apply unchanged), and the chips step aside the
  moment the conversation moves on. Disabled while a run is active.
- `app/src/renderer/app.css` (chip styles): **reached `main` inside lane C's
  Task 156 landing commit `be248f6`** while this task's E2E ran — the working
  tree shared the hunks and their whole-file commit swept them in. Content
  verified present in `HEAD` (3 rules); attribution rides their commit.
- `app/tests-unit/followups.test.ts` (new): 9 pins — valid 1–3, >3 rejected,
  empty rejected, non-string/empty/oversized/multiline items rejected,
  trimming, dedupe, fence stripped, text preserved, sanitizer fail-closed.
- `app/tests-unit/store.test.ts`: round-trip pin — valid followups persist;
  a hand-edited malformed list is dropped on read while the turn survives.
- `app/tests/fixtures/fake-conductor.mjs`: the commentary script gains a
  well-formed `cairn-followups` fence as its final part (visible comment text
  unchanged; the usage frame is content-blind).
- `app/tests/conductor.spec.ts` (one appended test, line 1816): chips appear
  after the comment settles, no fence shows, no extra card appears; a tap
  sends the suggestion verbatim as an owner turn and the chips step aside;
  the persisted commentary turn carries the list.
- Records: this report, the brief (committed first, `2bf60d8`), and one LOG
  row (appended; `LOG.md` left uncommitted per the Task 149 precedent — the
  pending pool now holds rows 148–154, 156, 158, and 157).

## Checks run and their real results

All run in `app/` unless noted; output visible in this conversation's
transcript (and re-runnable as written).

1. `npm run typecheck` — green (also re-run after lane C's 156/158 landing:
   green).
2. `npm run test:unit` — **158/158 pass** (was 141 before this task; the new
   13 followups/store pins plus lane C's in-flight faces pins account for the
   rest; re-run post-landing: 158/158).
3. `npm run build:vite` and `npm run build:lab` — green (build:vite re-run
   post-landing: green).
4. E2E, app token held at both `app/.app-token` and `$TEMP/cairn-app-token`
   (released after):
   - Pre-landing tree: the new regression
     `conductor.spec.ts:1816` green alone (8.6 s); the full conductor file
     accounted **30/30** — 22 in `--shard=1/6` (the file's serial mode packs
     one shard), the two queue tests re-passed individually, and the six the
     shard did not cover green in two batches (`:1389/:1435/:1541`,
     `:1644/:1721/:1773`); `bridge.spec.ts` `away.spec.ts` `serial.spec.ts`
     **4/4** green.
   - Merged tree (after lane C's 156/158 landing, plus their in-flight 159
     edits present): `conductor.spec.ts:1816` + `:1133` (commentary) +
     `:1203` (queue) **3/3** green.
   - `projects.spec.ts` NOT run by this lane (protected foreign file; lane
     C's Task 158 landing repaired it and ran it 5/5 themselves).

## How to try it

1. Launch the app (`npm start` in `app/`), open a governed project, and
   connect Cairn.
2. Ask for a small change and send it to dispatch ("Run offline
   demonstration" needs no worker install).
3. When the result card lands, watch Cairn's comment: up to three dashed
   chips appear under it ("Where we could go next…"). Tap one — it becomes
   your message, and Cairn answers through the ordinary conversation. Nothing
   dispatches by itself.

## Limitations and remaining human judgment

- Suggestion QUALITY is the model's judgment: the machinery guarantees shape,
  source, and fail-closed parsing, not that a suggestion is wise. The owner
  decides each in conversation, as designed.
- The phone page (Task 143, read-only) does not render the chips; the field
  flows through its snapshot harmlessly. Phone-side display is a later task.
- Reload re-renders chips only while the commentary turn is still the
  conversation's last turn, by design.

## Disclosures (repairs and harness events inside the task)

- Mid-task, lane C landed Tasks 156 and 158 into `main` over this lane's
  uncommitted work and claimed Task 159. My commit isolates my hunks from
  their in-flight 155/159 edits in the two shared files (`Chat.tsx`: 1 of 11
  hunks; `conductor.spec.ts`: 1 of 4 hunks, via `git apply --cached` of a
  marker-selected patch); all other files carried my changes only. Their
  renumber of their brief 157→158 (commit `e0999ee`) correctly deferred to
  this task's prior claim.
- Killed 7 orphaned `electron.exe` processes (2 app instances) left behind by
  another lane's finished suite after it had released the app token — same
  orphan class Tasks 151/154 disclosed. My own runs left no orphans (verified
  after release).
- One timing flake: lane C's queue test (`:1203`) failed once under load in a
  shard re-run (`.bubble-pending` still 0 at 5 s), green in isolation twice
  and in the merged-state re-run — the task-131/137 busy-chip flake class
  Task 154's row already pins as pre-existing.
- A `--shard=1/3` run hit the 300 s shell cap and was killed; re-chunked
  smaller (same cap constraint Task 154 worked under). Its orphans are part
  of the cleanup above.
- A throwaway hunk-selection script (`.tmp-select-hunks.py`) was used and
  deleted.

Milestone moved: **NO**.

Disposition: **DONE**
