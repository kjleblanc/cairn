# Task 166 — proposal cards still appear after a conversation's first dispatch

## Outcome

The owner-visible failure is fixed. In the offline fixture conversation, a
third well-formed proposal now remains the current proposal after the first
task has dispatched and completed, including when Chat is left and reopened
while that third reply is still streaming. Its **Send to dispatch** action is
enabled, the restored proposal dispatches successfully, and the already-spent
first proposal does not return.

Disposition: **DONE**

## What actually caused it

Main parsed a proposal block and sent it only on the live `done` delta. Chat
held that block only in component state. Saved conversation turns kept the
reply text but deliberately did not keep dispatch controls, so unmounting Chat
discarded a valid later proposal even though the conversation itself survived.

Task 155's result-card folding was not the cause: it acts on saved envelope
cards, while the missing control was separate transient proposal state. The
final regression still folds the first result card after the second run, so
that behavior remains covered.

## Main-process evidence

Yes — main emitted and retained a well-formed third block. The regression
listened at the preload boundary to main's `done` deltas and independently read
main's current proposal state. Both produced this exact normalized content:

- outcome: `Change the page title`
- concerns: none
- notes: empty
- details: `74, 477, 256`

Two later block events were observed after the first dispatch: the fixture's
two-concern proposal and then the details proposal above. This settles the
reported uncertainty from main-process state, not from the conversation
model's words.

The supplied records still do not establish whether proposals after Tasks 164
and 165 rendered, whether the final proposal for this bug rendered, or how Task
165 was approved. No claim about those unknown events was used in the diagnosis.

## Implementation decision

The actionable proposal now lives in a small main-process memory map keyed by
project and conversation. Main records only blocks produced by its strict
parser, exposes the current block through a read-only IPC/preload method, and
retires only an exact outcome/details match after a ready dispatch passes its
authorization gates. A pre-start failure or connection-required close restores
the trusted block; a newer proposal is never overwritten or cleared by an older
result.

This state is intentionally not written into `.cairn/conversations`. Those
files live inside the project and can be edited by a worker, so treating a
saved turn as dispatch authority would let edited history manufacture a task
control. Chat's asynchronous restore is versioned so a live delta or newer
conversation cannot be overwritten by an older read, and proposal controls are
closed synchronously as soon as dispatch enters its running phase. A stopped
reply now carries main's exact persisted partial turn on its error delta, so a
concurrent restore can deduplicate it instead of inventing a second timestamp.

## Files touched

- `docs/ai-work/tasks/166-brief.md` — claimed the task and recorded its outcome,
  boundaries, and checks in the brief-only commit.
- `app/src/main/conductor/service.ts` — owns, reads, consumes, and safely
  restores the current trusted proposal; emits the exact persisted stopped turn.
- `app/src/main/tasks.ts` — consumes an exact proposal at accepted dispatch and
  restores it when no task starts.
- `app/src/main/ipc.ts` — exposes the read-only current-proposal handler.
- `app/src/preload.ts` — carries that handler across the preload boundary.
- `app/src/shared/ipc.ts` — adds the typed `conductorProposal` API method.
- `app/src/renderer/screens/Chat.tsx` — restores main's proposal, protects the
  async conversation reattachment race, reconciles older results with newer
  proposals, deduplicates a stopped turn, and hides spent controls immediately
  while dispatch starts.
- `app/lab/mock-cairn.ts` — implements the shared API honestly; the lab's canned
  reply emits no proposal, so its answer is `null`.
- `app/tests/fixtures/fake-conductor.mjs` — adds a deterministic hold/release
  gate for leaving and reattaching during the third proposal without test sleeps.
- `app/tests/conductor.spec.ts` — extends the post-dispatch case through a third
  proposal and mid-stream Chat remount; checks exact main state, consumption,
  refused-start retention, no spent card during a run, and one persisted stopped
  turn across reload. It also updates one stale expected heading to Task 165's
  already-shipped worker-account wording.
- `docs/ai-work/tasks/166-report.md` — this report.
- `docs/ai-work/LOG.md` — one appended Task 166 row.

No dependencies, consent wording, model-effort controls, stored conversation
schema, result-card folding rules, phone behavior, or provider settings changed.

## Checks and real results

All command output was observed in this task's terminal.

- Starting evidence: `git status --short` — no output; Tasks 163–165 had no
  owed records or other leftover changes. Base was
  `144f070f945638c5e6a4af85aa15b34cba6d57ac`.
- Red-first reproduction:
  `npx.cmd playwright test tests/conductor.spec.ts:1296` — failed exactly because
  `.task-card` was absent after leaving and reopening Chat. Before navigation,
  the main-delta collector had received the well-formed later blocks.
- `npm.cmd run typecheck` — passed with no TypeScript errors.
- `npm.cmd run test:unit` — 170 passed, 0 failed.
- `npm.cmd run build:vite` — passed: main, preload, and renderer bundles built.
- `npm.cmd run build:lab` — passed: 90 modules transformed and the lab bundle
  built.
- Final affected Electron set:
  `npx.cmd playwright test tests/conductor.spec.ts:173 tests/conductor.spec.ts:204 tests/conductor.spec.ts:638 tests/conductor.spec.ts:1109 tests/conductor.spec.ts:1150 tests/conductor.spec.ts:1211 tests/conductor.spec.ts:1281 tests/conductor.spec.ts:1370`
  — 8 passed. These cover live reply reattachment, stopped-turn deduplication,
  result-card reload, no spent card on run reattachment, refused-start proposal
  retention, commentary, queued sends, and the third post-dispatch proposal.
- `git diff --check` — passed with no whitespace errors.
- Every Electron run used Cairn's `.app-token`, an isolated throwaway profile,
  the repository's fake conductor, and offline/fake-worker paths. The token was
  released after every run. No real model or paid call occurred, no app log or
  owner profile was read, and the owner's running app was not opened, stopped,
  or relaunched.

Three failed diagnostic/test runs also reported Windows `EPERM` while their
isolated throwaway profiles were being cleaned: the red reproduction, the run
that exposed Task 165's stale heading assertion, and the first serial batch
whose one-second fixture window elapsed before the remounted Stop control was
observed. No profile was inspected or changed by hand. The heading assertion
was updated, the timing assumption was replaced with a deterministic fixture
gate, and the final eight-test batch passed without either failure.

## How to try it

After the separate owner hand step that rebuilds and relaunches Cairn, continue
one conversation through a completed dispatch, then ask Cairn for another
well-formed task proposal. Leave for **Project home** while Cairn finishes and
return through **Talk with Cairn**. The later proposal card should be present,
show its own details/concerns, and enable **Send to dispatch** when it has no
unresolved concerns. Starting it should remove that spent card immediately.

For an entirely offline repeat, close any ordinary Cairn window first and run
the final Playwright command listed above from `app/`; it uses only local
fixtures.

## Limitations and remaining judgment

The trusted proposal survives renderer navigation/remounts only while the same
main process is alive. A full Cairn restart deliberately forgets an unspent
proposal. Making it restart-persistent would need authenticated app-owned
storage; replaying it from the worker-writable conversation file would weaken
the dispatch boundary and was rejected here.

The owner's currently running app was not relaunched, so it may still be using
older bundles until the separate hand rebuild/relaunch. The final feel in that
real window remains the owner's judgment. The model-effort toggle is unchanged
and remains the next separately scoped task.

Milestone moved: **NO**
