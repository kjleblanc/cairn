# Task 077 — Report

The closing fix on Phase 3 Task 11's push surface. One Important, one union
extension, two record corrections, one cheap logging addition. No `core/`
changes.

## IMPORTANT E — main bounds what the push sends, not only where it goes

Both refspec halves now pass a shape check before anything runs, in
`push.ts` beside the existing remote guard:

- `HEAD_OBJECT = /^[0-9a-f]{7,64}$/` — a hex object name and nothing else.
- `REF_COMPONENT = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/`, plus explicit rejection of
  `..`, a `.lock` suffix, and a trailing `/` or `.`. Written as an allowlist
  rather than a denylist, so a character nobody thought of is refused rather
  than waved through, and wide enough for every ordinary branch name
  (`main`, `feature/x-y`, `release/1.2.3`).

`pushRefusal(dir, preview)` holds the whole pre-flight and returns the reason
or null. Shape is checked before the remote, so a malformed target costs no git
call — asserted directly, with an injected exec that stands ready and is never
asked. It is also defensive about the argument itself: a caller that sends
something other than a preview is refused rather than throwing.

**The exploits were real.** Verified first against real git 2.52 in throwaway
repositories: `+<sha>:refs/heads/main` reported "(forced update)" and moved the
origin's tip from `two` back to `one`; `:refs/heads/main` was read as a
deletion and stopped only by the receiving repository's `denyDeleteCurrent`.

Staged RED, shape guard disabled, tests unchanged:

```
✖ a forced-update refspec is refused, and the origin is not rewound
  AssertionError: Expected values to be strictly equal:
    actual: true, expected: false          (assert.equal(result.ok, false))

✖ an empty head — which git reads as a branch deletion — is refused
  AssertionError: Expected values to be strictly equal:
    actual: 'other', expected: 'refused'
```

The first is the sharper of the two: the push **succeeded**, and it could only
have succeeded *because* it was forced — the same rewind without `+` is exactly
what a bare origin rejects. The second shows the deletion really reaching git
and being classified from git's own refusal. Both tests drive a local
`guardedPush` helper that mirrors the handler (`pushRefusal(...) ??
pushExecute(...)`), so a missing guard genuinely hands the target to git; a
test that called `pushRefusal` alone would have asserted nothing about the
origin.

## The union extension — `kind: "refused"`

Added to `PushResult` per the coordinator's ruling, and both pre-flight
refusals now carry it. The plan-fixed union had no honest slot for "Cairn
declined before running git": `other` renders an owner-facing label saying the
sentence ends with git's own words, and git was never run, so that label would
have stated a falsehood; `no-remote` is simply the wrong statement about a
malformed refspec.

This is a deliberate, recorded extension rather than a deviation. The design
spec enumerated the honest outcomes it knew about — success, no remote, auth
refused, remote ahead — and never contemplated a pre-flight refusal, which only
became possible once task 075 pinned the refspec from caller-supplied values.
Adding the case completes the spec's honesty rule instead of departing from it.

Neither refusal names the offending value. Those strings came from outside the
main process, and putting them on screen would put words there Cairn did not
choose.

## (H) The refused target is logged

The `push:execute` handler calls `logError("push:execute", …)` with the remote,
branch and head it refused, JSON-quoted. It stays off the screen and is no
longer lost — it goes exactly where `ErrorCard` already tells owners the
technical details go.

## (F) Correction to task 076's report

076 presents `conductor.spec.ts`'s post-settle `.push-confirm` count as proving
the panel no longer carries the in-progress line. It does not: it is taken
after settle, when the panel is gone by construction, so it would have passed
before the move as well. The judgement it accompanied is right and stands — a
`file://` push settles in milliseconds, so waiting for the transient text would
be a race. What actually proves the move is the code: `pushAnnouncement` is the
region's only producer, and the panel's JSX no longer contains the string at
all. The spec's comment has been corrected in place to say so; the 076 report
is left as written, and this paragraph is its correction.

## (G) Correction to task 076's `no-remote` statement

076 said "`no-remote` is reachable again". That conflated two different things:

- The **kind** `no-remote` was reachable again, but only because task 076's
  handler guard produced it — and that producer has now moved to `refused`.
- The **classifier branch** inside `pushExecute` that returns `no-remote` has
  been unreachable from real git since task 075 pinned the refspec, exactly as
  075 disclosed, and still is.

The clean statement as of this task: `no-remote` has one producer again, the
classifier branch inside `pushExecute`; that branch is unreachable from real
git because git only emits "No configured push destination" for a bare push;
it is retained because the union is plan-fixed, its message stays true whenever
it fires, and an injected-exec test keeps it from rotting.

## Verification

Run through `npm run test:smoke`, which rebuilds all three bundles before
Playwright — per task 075's stale-bundle finding.

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **70 / 70** (66 before, 4 new).
- `npm run test:smoke` (app; builds, then Playwright) — **39 passed**, one
  clean run.
- `cd core && npm test` — **104 / 104**. No `core/` changes.

Files touched: `app/src/main/push.ts`, `app/src/main/ipc.ts`,
`app/src/shared/ipc.ts`, `app/tests-unit/push.test.ts`,
`app/tests/conductor.spec.ts`, `docs/ai-work/LOG.md`,
`docs/ai-work/tasks/077-brief.md`, `docs/ai-work/tasks/077-report.md`.

The renderer needed no change: its git-words label already keys off
`kind === "other"`, so a `refused` outcome renders in Cairn's own words with no
label — which is the whole reason the variant exists.

## Limitations and remaining human judgment

- `REF_COMPONENT` is narrower than git's own `check-ref-format`. A legal but
  unusual branch name — one containing a non-ASCII character, say — would be
  refused rather than pushed. Refusal is the safe direction, and the failure is
  visible and plain, but it is a real narrowing and is stated rather than left
  to be discovered.
- The in-progress announcement remains verified by construction, not by a test
  (see correction F).
- The `gone` phase and the short-subject-list note remain unexercised by any
  Playwright fixture, as disclosed in task 075.
- Milestone movement: NO.

Disposition: DONE
