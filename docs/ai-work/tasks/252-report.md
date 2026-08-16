# Task 252 report - let the critic's findings survive the seal

**Lane:** A (the main checkout). **Base commit:** `98691d5`.
**Brief claim commit:** `98691d5`. **Part 1 commit:** `0e22486`.

## Outcome

A run that pays for a second opinion now seals with what it bought. The report
records who was asked, what they judged for each frozen row, and their exact
words - framed throughout as the reviewer's claim, never as Cairn's finding.

Before this, the findings reached the owner's screen and died with the pause.
`records.ts` had no section for them, nothing was written under `.cairn`, and
they lived only in Main's checkpoint sidecar, which is foreground-only by Slice
1's design. On 2026-08-16 that is exactly what Task 250's records show.

What a reader now sees:

```text
## The second opinion you asked for (claims, not verified by Cairn)

- You approved one review by anthropic/claude-opus-5, which read a summary of
  this task and could not change anything.
- Cairn did not check any of the statements below, and none of them changed a
  check result or this task's outcome.
- c1: the reviewer said this was **met**.
>   - In its own words: The page title changed as asked.
  - It cited: a1.
- c3: the reviewer **could not tell**.
>   - In its own words: The packet does not carry enough to decide.
  - It cited nothing for this.
```

## What actually changed

- `core/src/records.ts` - the `critique` input field, `critiqueBlock`, and the
  section, placed after the promises it judges and before the repair that may
  have followed from it, which is the order the run happened in.
- `core/src/serial.ts` - `SerialRunCritiqueRecordV1`, a strict fail-closed
  parser, the `critique` field on both pause-choice shapes, and the capture and
  threading through all three `cairnWorkerRecords` call sites.
- `core/src/index.ts` - exports the record type.
- `app/src/main/tasks.ts` - `critiqueRecordForSeal`, which reads the same
  sidecar the screen reads and hands it to Core on continue.
- `core/test/records.test.ts` and `core/test/serial.test.ts` - five added tests.

**The critic gained no authority.** Nothing added here is read to decide
anything: no judgment reaches a gate, a check result, or a disposition. The
runner records it and nothing else.

## Check results

### `c1` - red first: PASSED

The driving test was written before any production change. It first failed to
*compile* - `'critique' does not exist in type 'ComposedRecordInput'` - which is
an erroring test, not a failing one, so the type field alone was added and the
test re-run to get a true RED:

```text
✖ a report records the critic's findings when the owner paid for one
  AssertionError: the report does not record that a critic was asked at all
ℹ tests 19   ℹ pass 18   ℹ fail 1
```

**A second test passed for the wrong reason and was tightened before any code
was written.** It asserted `/not verified by Cairn/` anywhere in the report,
which matches the worker's own heading and would have proved nothing about this
section. It now asserts this section's own heading.

### `c2` - every finding is recorded with what it judged: PASSED

Row id, judgment, and the reviewer's own observation, for all three judgments.
`unclear` renders as "could not tell", and the judgment map holds whole
predicates rather than adjectives because "said this was **could not tell**" is
not a sentence.

### `c3` - it reads as an opinion, not a verification: PASSED

The heading carries `(claims, not verified by Cairn)`, the same construction the
worker's account uses, and the block states plainly that Cairn checked none of
it and that none of it changed a check result or the outcome.

The observation is quarantined exactly like every other untrusted field. Proved
adversarially: a finding whose text contains `\n## Verified by Cairn\n...` must
not produce a second Cairn heading, and the test asserts exactly one such
heading survives.

### `c4` - a run with no critic is unchanged: PASSED, mutation-proved

`composeWorkerReport` with the field absent and with an explicit `null` produce
**identical** strings, and neither grows the section.

| Mutation | Result |
|---|---|
| emit the section unconditionally | **2 failures** |
| stop quarantining the observation | **1 failure** |

`records.ts` restored byte-identical with `cmp` after each.

### `c5` - the findings reach the report through the live path: PASSED, with one honest gap

Driven end to end through `runSerialTask`: the choice returned from
`onUnsealedCandidate` carries the critique, the runner captures and threads it,
and the assertion is on `result.reportText` - not on an input handed to the
composer.

A malformed critique is refused rather than half-recorded: an undefined judgment
yields no section **and does not cost the run its seal**, because recording is
all this does, so the worst a bad parse can cost is an absent section.

| Mutation | Result |
|---|---|
| never capture what the critic said | **1 failure** |
| accept a malformed critique | **1 failure** |

`serial.ts` restored byte-identical.

**Disclosed: part 2 was implemented before its test.** Part 1 was strict
red-green; the threading was not - I wired it and then wrote the tests, so I
never watched them fail first. The mutations above are the remedy and prove the
tests catch the absence, but they are not the same thing as having seen RED, and
the record should say so.

**Honest gap: Main's half has no test.** `critiqueRecordForSeal` is proved by
the typecheck and by construction - it reads the same sidecar the screen reads,
so the record cannot say something the owner was not shown - but nothing
exercises it. The Core seam is fully covered; the app seam is not. A paper guard
asserting the continue branch calls it would close this cheaply.

### `c6` - nothing else regressed: PASSED

| Command | Result |
|---|---|
| `npm test -w @cairn/core` | **518 tests, 508 pass, 0 fail, 10 skipped** |
| `npm run typecheck` (root) | **PASS** |
| `npm run build` (root) | **PASS** |
| `npm run test:unit` from `app/` | **943 tests, 932 pass, 9 fail, 2 skipped** |

Core was 513 / 503 / 0 / 10 before this task and is 518 / 508 now: **the five
tests this task adds, and no other movement.** Zero Core failures. The app unit
count is unchanged at 943 / 932, because this task adds no app test - which is
the gap `c5` names - and its failure set was sorted and diffed against the
pre-task run: **identical**, the nine pre-existing Builder failures.

**Disclosed: the first Core run was discarded.** I started the full suite in the
background and then kept editing `core/src`, so it was measuring a tree that no
longer existed. It was stopped and re-run on the final tree; only the second run
is reported. Starting a long suite before the edits were finished was a process
mistake, and catching it late cost about twenty minutes.

### `c7` - the two already-working halves are verified, not assumed: PASSED

The brief claimed the `cN` rows and Cairn's own check results already survived
and should not be rebuilt. Checked rather than asserted: `serial.test.ts:7829`
and `:7856` already assert `## Promises and how each was answered` on a real
sealed report, and `:7832` and `:7857` assert Cairn's own line naming the
command and whether it passed. Task 250's report lacked that section because
that run carried no rows - not because the rendering was missing.

## Limitations and remaining human judgment

- **A second review replaces the first, on purpose.** The plan allows two critic
  calls, initial and post-repair. The seal records the later one, because the
  earlier judged a tree that no longer exists. A reader wanting both would need
  a list, and that is a design change rather than a bug.
- **Main's half is untested.** See `c5`.
- **Nothing here has run against a real critic.** The path is proved by tests
  and by construction; the next real gate-3 run is what will show it working,
  and that run is the point of this task.
- **The result card is untouched.** This carries findings into the sealed
  *report*. Whether the on-screen result card should also carry them was not in
  scope and is not done.
- No provider, model, credential, network call, dependency install, external
  write, push, or deployment occurred, and no Cairn run was made.

## Disposition

**Disposition: DONE - `c1` through `c7` pass with their real output recorded
above.**

Two things a later reader should carry rather than discover: part 2 was written
test-after and is backed by mutation proofs instead of a watched RED, and Main's
half of the path has no test at all. Both are stated in `c5` rather than left to
be found.

The milestone does not move. The next real gate-3 run will now leave evidence
that outlives the window, which is what this task existed to make true.
