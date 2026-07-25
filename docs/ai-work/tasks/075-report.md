# Task 075 — Report

Review fixes on Task 074 (Phase 3 Task 11). Two Importants closed, three Minors
closed, four Minors ledgered untouched by the reviewer's own instruction. No
`core/` change.

## IMPORTANT 1 — the push is pinned to what was disclosed

`pushExecute(dir, exec?)` became `pushExecute(dir, remote, branch, exec?)`, and
the one invocation is now `["push", remote, "HEAD:" + branch]` instead of a
bare `["push"]`. The IPC surface widened with it: `CairnApi.pushExecute` in
`shared/ipc.ts`, the preload bridge, and the `push:execute` handler all carry
the remote and branch. `Chat.tsx` hands `approvePush` the panel's OWN preview —
the object the render the owner read was built from — so nothing is re-derived
at execute time.

The defect this closes is real, not theoretical. Staged RED, with the argv
reverted to a bare push while the tests stayed as written:

```
AssertionError: Expected values to be strictly deep-equal:
    actual: [ [ 'push' ] ],
  expected: [ [ 'push', 'origin', 'HEAD:main' ] ]

AssertionError: Expected values to be strictly equal:
    actual: 'bef47edf7d4b2f441a714fe170524b5a93a5bd29',
  expected: 'f5320baef46e6af24262c92220735df86db64980'
```

The second one is the finding itself: in a fixture with `push.default=matching`
and a second branch (`side`) that exists on the origin and is ahead locally, a
bare push moved `side` on the origin — publishing commits the confirmation
panel never listed. With the refspec pinned, `side` is byte-identical
afterward and only the named branch moves. Verified against real git before
writing the test.

**Consequence, disclosed.** Git only says `No configured push destination` for
a bare push, so pinning makes that stderr unreachable from real git. The
`no-remote` kind and its message are kept unchanged — the `kind` union is fixed
by the plan, and the sentence stays true whenever it fires — and the classifier
is now proven by an injected-exec test so it cannot rot unnoticed. The real
failure for a remote that does not exist (`fatal: '<remote>' does not appear to
be a git repository`) is a different statement, and it now lands in `other`,
which reports git's own words instead of asserting more than git did. That
replaces the old real-git no-remote test, which asserted a classification the
new argv can no longer produce.

## IMPORTANT 2 — the pause is focused, and the outcome is announced

**Focus.** The confirmation panel takes `tabIndex={-1}`, `role="group"` and an
`aria-labelledby` pointing at its own heading, and an effect focuses it when
the phase becomes `confirm`. Staged RED (guard changed so the effect never
fires): `expect(locator).toBeFocused() failed — Expected: focused, Received:
inactive`.

**Live region.** `PushFlowView` was restructured around one persistent
`<div className="push-outcome" role="status">` that is mounted with the flow
and never replaced; only its CONTENT swaps, from empty to the outcome. It is
empty and zero-height until there is something true to say, and only then does
it take the card styling. This is the repo task 065 pattern, adopted
deliberately: a region that appears already holding its message is the case
screen readers announce least reliably. The test marks the region's DOM node
during the CHIP phase with `data-live-region-probe`, an attribute React never
writes, and asserts it is still there when the outcome arrives — so a region
that had been remounted would be caught. Staged RED (region rendered only when
it has an announcement, the anti-pattern): `expect(locator).toHaveAttribute()
failed — Expected: "status", Error: element(s) not found`, failing at the mark
itself because there was nothing to mark.

While staging that second RED, an unbalanced-JSX edit made the renderer bundle
fail to build while the two earlier bundles succeeded, and Playwright ran
against a stale renderer. It produced a plausible-looking failure for the wrong
reason. Caught by grepping the build output for `error` rather than trusting
the tail of it; both REDs above were then re-observed against a bundle that
really built. Recorded because a stale-bundle pass would have been indis-
tinguishable from a real one in a report.

## The three Minors

- **MINOR 5.** The press-time re-read now distinguishes two findings. A null
  preview gives a new `gone` phase — "This branch no longer has an upstream to
  push to. Nothing was pushed." — which deliberately says less than the
  `nothing` sentence, because a lost upstream means the previous preview's
  remote is exactly what Cairn just stopped being able to check. `nothing` (the
  upstream is there, nothing is ahead) keeps naming the remote, but from the
  FRESH preview rather than the stale one.
- **MINOR 6.** The effect line now leads with the count — "this push publishes
  1 commit. Their subjects, as git reports them:" — and adds one line when the
  list is shorter than the count, naming the empty-message cause. A new unit
  test proves the underlying behaviour is real: an empty-message commit gives
  `ahead: 2` with a single subject.
- **MINOR 7.** Both failure sentences dropped "then try the push again" and now
  read "... Nothing was published. <what to put right> before the next push."
  A unit test asserts neither message contains the old clause and both contain
  "Nothing was published."; the Playwright test asserts the settled outcome
  contains no button at all.

## Ledgered, not fixed (per the review's own instruction)

MINOR 3 (write gated on the render closure rather than a phase-mirroring ref),
MINOR 4 (silent dead Push button if a new card lands mid-push), MINOR 8
(`advanceUpstream` ambient-branch dependence — fails loudly, not vacuously),
MINOR 9 (plural chip copy untested).

## Correction to Task 074's report (append-only, per repo tasks 059/069/071)

`074-report.md` calls the refused-push test "the no-retry/no-force proof at the
UI level". That overstates it. The test proves **no-force** end to end — HEAD,
the ahead count, and the upstream tip are all asserted unchanged after the
refusal. **No-retry** is proven by Task 072's call-counted unit test, which
asserts the injected exec was invoked exactly once, not by that Playwright
test. The 074 report is left as written; this paragraph is the correction.

## Verification

- `npm run typecheck` (app) — clean.
- `npm run test:unit` (app) — **64 / 64** (59 before, 5 new).
- `npx playwright test` (app) — **38 passed**, one clean run.
- `cd core && npm test` — **104 / 104**. No `core/` changes.

Files touched: `app/src/main/push.ts`, `app/src/main/ipc.ts`,
`app/src/preload.ts`, `app/src/shared/ipc.ts`,
`app/src/renderer/screens/Chat.tsx`, `app/src/renderer/app.css`,
`app/tests-unit/push.test.ts`, `app/tests/conductor.spec.ts`,
`docs/ai-work/LOG.md`, `docs/ai-work/tasks/075-brief.md`,
`docs/ai-work/tasks/075-report.md`.

## Limitations and remaining human judgment

- The `gone` phase and the short-subject-list note are both unexercised by a
  Playwright fixture. The behaviour each one reports is proven at unit level
  (`pushPreview` returns null with no upstream; an empty-message commit gives a
  short subject list); the render branches themselves are not.
- The `no-remote` kind is now unreachable from real git, as described above. It
  is retained rather than removed because the plan fixes the union.
- Milestone movement: NO.

Disposition: DONE
